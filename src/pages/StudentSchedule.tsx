import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Clock, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

interface DetentionSlot {
  date: string;
  location: string;
  teachers: {
    name: string;
  };
}

export default function StudentSchedule() {
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState<DetentionSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data, error } = await supabase
        .from('violations')
        .select(`
          detention_slots (
            date,
            location,
            teachers (
              name
            )
          )
        `)
        .eq('student_id', user.id)
        .eq('status', 'pending')
        .order('detention_date');

      if (error) throw error;
      setSchedule(data?.map(v => v.detention_slots) || []);
    } catch (error) {
      console.error('Error fetching schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center space-x-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-tmechs-forest hover:text-tmechs-forest/80"
        >
          <ArrowLeft className="h-6 w-6" />
          <span className="ml-1">Back</span>
        </button>
        <h1 className="text-2xl font-bold text-gray-800">My Detention Schedule</h1>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : schedule.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            No upcoming detentions scheduled
          </div>
        ) : (
          <div className="space-y-4">
            {schedule.map((slot, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-gray-900">
                        {format(new Date(slot.date), 'MMMM d, yyyy')}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-gray-900">3:45 PM</span>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-gray-900">{slot.location}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">
                      Monitor: {slot.teachers.name}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}