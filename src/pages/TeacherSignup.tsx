import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import { Calendar, Users, Clock, ArrowLeft, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import "react-datepicker/dist/react-datepicker.css";

interface BlockedDate {
  date: Date;
  teacherName: string;
}

export default function TeacherSignup() {
  const navigate = useNavigate();
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [capacity, setCapacity] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [hoveredDate, setHoveredDate] = useState<BlockedDate | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        toast.error('Please log in first');
        navigate('/login');
        return;
      }

      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('id')
        .eq('id', user.id);

      if (teacherError || !teacherData?.length) {
        toast.error('Teacher profile not found. Please register first.');
        navigate('/register');
      }
    };

    checkAuth();
    fetchBlockedDates();
  }, [navigate]);

  const fetchBlockedDates = async () => {
    try {
      const { data, error } = await supabase
        .from('detention_slots')
        .select(`
          date,
          teachers (
            name
          )
        `)
        .gte('date', new Date().toISOString())
        .order('date');

      if (error) throw error;

      setBlockedDates(
        data.map(slot => ({
          date: new Date(slot.date),
          teacherName: slot.teachers.name
        }))
      );
    } catch (error) {
      console.error('Error fetching blocked dates:', error);
      toast.error('Failed to load schedule');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDates.length === 0) {
      toast.error('Please select at least one date');
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error('Please log in first');
        navigate('/login');
        return;
      }

      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('id')
        .eq('id', user.id);

      if (teacherError || !teacherData?.length) {
        toast.error('Teacher profile not found. Please register first.');
        navigate('/register');
        return;
      }

      const slotsPromises = selectedDates.map(date => 
        supabase
          .from('detention_slots')
          .insert({
            date: date.toISOString().split('T')[0],
            teacher_id: user.id,
            capacity
          })
          .select()
      );

      const results = await Promise.allSettled(slotsPromises);
      const failures = results.filter(result => result.status === 'rejected');

      if (failures.length > 0) {
        console.error('Some slots failed to create:', failures);
        toast.error('Some dates could not be scheduled');
        return;
      }

      try {
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/monitor-notifications`;
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'signup',
            teacherId: user.id,
            dates: selectedDates.map(date => date.toISOString())
          })
        });

        if (!response.ok) {
          throw new Error('Failed to send confirmation email');
        }
      } catch (emailError) {
        console.error('Email error:', emailError);
        toast.error('Signed up successfully, but confirmation email could not be sent');
        return;
      }

      toast.success('Successfully signed up for detention duty');
      setSelectedDates([]);
      setCapacity(20);
      fetchBlockedDates();
    } catch (error) {
      console.error('Signup error:', error);
      toast.error('Failed to sign up. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (date: Date | null) => {
    if (!date) return;

    const isBlocked = blockedDates.some(
      blockedDate => blockedDate.date.toDateString() === date.toDateString()
    );

    if (isBlocked) {
      const blockedDate = blockedDates.find(
        d => d.date.toDateString() === date.toDateString()
      );
      if (blockedDate) {
        setHoveredDate(blockedDate);
      }
      return;
    }

    const dateExists = selectedDates.some(
      selectedDate => selectedDate.toDateString() === date.toDateString()
    );

    if (dateExists) {
      setSelectedDates(selectedDates.filter(
        selectedDate => selectedDate.toDateString() !== date.toDateString()
      ));
    } else {
      setSelectedDates([...selectedDates, date]);
    }
  };

  const isDateBlocked = (date: Date): boolean => {
    return blockedDates.some(
      blockedDate => blockedDate.date.toDateString() === date.toDateString()
    );
  };

  const handleMonthChange = (date: Date) => {
    setCurrentMonth(date);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center space-x-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-tmechs-forest hover:text-tmechs-forest/80"
        >
          <ArrowLeft className="h-6 w-6" />
          <span className="ml-1">Back</span>
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Detention Monitor Signup</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Available Dates
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <DatePicker
              selected={null}
              onChange={handleDateChange}
              className="pl-10 w-full rounded-md border border-gray-300 shadow-sm focus:border-tmechs-forest focus:ring-1 focus:ring-tmechs-forest"
              dateFormat="MMMM d, yyyy"
              placeholderText="Select dates for monitoring"
              highlightDates={selectedDates}
              inline
              minDate={new Date()}
              showMonthDropdown
              showYearDropdown
              dropdownMode="select"
              onMonthChange={handleMonthChange}
              monthsShown={1}
              fixedHeight
              dayClassName={date => {
                if (isDateBlocked(date)) {
                  return "bg-red-100 text-red-800 cursor-not-allowed";
                }
                if (selectedDates.some(d => d.toDateString() === date.toDateString())) {
                  return "bg-tmechs-forest/20 text-tmechs-forest hover:bg-tmechs-forest/30";
                }
                return "";
              }}
              filterDate={date => {
                const day = date.getDay();
                return day !== 0 && day !== 6; // Exclude weekends
              }}
            />
          </div>
          {hoveredDate && (
            <div className="mt-2 p-2 bg-red-50 rounded-md">
              <p className="text-sm text-red-700 flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                Date already assigned to {hoveredDate.teacherName}
              </p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Student Capacity
          </label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(parseInt(e.target.value))}
              min="1"
              max="50"
              className="pl-10 w-full rounded-md border border-gray-300 shadow-sm focus:border-tmechs-forest focus:ring-1 focus:ring-tmechs-forest"
            />
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-md space-y-4">
          <h3 className="font-medium text-gray-900 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-gray-500" />
            Selected Dates ({selectedDates.length})
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {selectedDates.map((date, index) => (
              <div key={index} className="text-sm text-gray-600">
                {date.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric'
                })}
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full btn-primary ${
            isLoading ? 'opacity-75 cursor-not-allowed' : ''
          }`}
        >
          {isLoading ? 'Signing Up...' : 'Confirm Signup'}
        </button>
      </form>
    </div>
  );
}