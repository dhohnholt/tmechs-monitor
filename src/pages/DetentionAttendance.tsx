import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import { Calendar, Check, X, AlertCircle, Scan, Search, RefreshCw, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import "react-datepicker/dist/react-datepicker.css";

interface DetentionStudent {
  id: string;
  name: string;
  violation: string;
  status: 'present' | 'absent' | 'pending' | 'reassigned';
  barcode: string;
  violation_id: string;
}

export default function DetentionAttendance() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [students, setStudents] = useState<DetentionStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const barcodeBuffer = useRef('');
  const barcodeTimeout = useRef<number | null>(null);

  const fetchStudents = async (date: Date) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('violations')
        .select(`
          id,
          violation_type,
          status,
          students (
            id,
            name,
            barcode
          )
        `)
        .eq('detention_date', date.toISOString().split('T')[0]);

      if (error) throw error;

      const formattedStudents = data.map(record => ({
        id: record.students.id,
        name: record.students.name,
        violation: record.violation_type,
        status: record.status,
        barcode: record.students.barcode,
        violation_id: record.id
      }));

      setStudents(formattedStudents);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      fetchStudents(selectedDate);
    }
  }, [selectedDate]);

  useEffect(() => {
    const handleKeyPress = async (e: KeyboardEvent) => {
      if (!isScanning) return;

      if (barcodeTimeout.current) {
        window.clearTimeout(barcodeTimeout.current);
      }

      if (e.key !== 'Enter') {
        barcodeBuffer.current += e.key;
      }

      barcodeTimeout.current = window.setTimeout(async () => {
        if (barcodeBuffer.current) {
          const scannedBarcode = barcodeBuffer.current;
          const student = students.find(s => s.barcode === scannedBarcode);

          if (student) {
            await markAttendance(student.violation_id, 'present');
            toast.success(`${student.name} marked present`);
          } else {
            toast.error('Student not found for this detention session');
          }

          barcodeBuffer.current = '';
          setIsScanning(false);
        }
      }, 100);
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      if (barcodeTimeout.current) {
        window.clearTimeout(barcodeTimeout.current);
      }
    };
  }, [isScanning, students]);

  const handleReschedule = async (violationId: string) => {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auto-reschedule`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ violationId })
      });

      if (!response.ok) {
        throw new Error('Failed to reschedule detention');
      }

      const data = await response.json();
      toast.success(`Student rescheduled for ${new Date(data.newDate).toLocaleDateString()}`);
      
      if (selectedDate) {
        fetchStudents(selectedDate);
      }
    } catch (error) {
      console.error('Error rescheduling:', error);
      toast.error('Failed to reschedule detention');
    }
  };

  const markAttendance = async (violationId: string, status: 'present' | 'absent') => {
    try {
      const { error } = await supabase
        .from('violations')
        .update({ status })
        .eq('id', violationId);

      if (error) throw error;

      setStudents(students.map(student =>
        student.violation_id === violationId
          ? { ...student, status }
          : student
      ));

      toast.success(`Attendance marked ${status}`);

      if (status === 'absent') {
        await handleReschedule(violationId);
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast.error('Failed to mark attendance');
    }
  };

  const startScanning = () => {
    setIsScanning(true);
    barcodeBuffer.current = '';
    toast.success('Scanning mode activated');
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.barcode.includes(searchTerm)
  );

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-tmechs-forest hover:text-tmechs-forest/80"
          >
            <ArrowLeft className="h-6 w-6" />
            <span className="ml-1">Back</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Detention Attendance</h1>
        </div>
        <button
          onClick={startScanning}
          className={`flex items-center px-4 py-2 rounded-md ${
            isScanning
              ? 'bg-green-100 text-green-700'
              : 'bg-tmechs-forest text-white hover:bg-tmechs-forest/90'
          }`}
        >
          <Scan className="h-5 w-5 mr-2" />
          {isScanning ? 'Scanning...' : 'Start Scanning'}
        </button>
      </div>
      
      <div className="flex space-x-4 mb-6">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Detention Date
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <DatePicker
              selected={selectedDate}
              onChange={(date) => setSelectedDate(date)}
              className="pl-10 w-full rounded-md border border-gray-300 shadow-sm focus:border-tmechs-forest focus:ring-1 focus:ring-tmechs-forest"
              dateFormat="MMMM d, yyyy"
            />
          </div>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Students
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full rounded-md border border-gray-300 shadow-sm focus:border-tmechs-forest focus:ring-1 focus:ring-tmechs-forest"
              placeholder="Search by name or barcode..."
            />
          </div>
        </div>
      </div>

      {isScanning && (
        <div className="mb-6 p-4 bg-green-50 rounded-md flex items-center">
          <Scan className="h-5 w-5 text-green-500 mr-2" />
          <p className="text-green-700">
            Ready to scan student IDs. Please scan the barcode on the student's ID card.
          </p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Violation
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto text-gray-400" />
                </td>
              </tr>
            ) : filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                  No students scheduled for detention on this date
                </td>
              </tr>
            ) : (
              filteredStudents.map((student) => (
                <tr key={student.violation_id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{student.name}</div>
                    <div className="text-sm text-gray-500">ID: {student.barcode}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{student.violation}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                      ${student.status === 'present' ? 'bg-green-100 text-green-800' : 
                        student.status === 'absent' ? 'bg-red-100 text-red-800' : 
                        student.status === 'reassigned' ? 'bg-purple-100 text-purple-800' :
                        'bg-yellow-100 text-yellow-800'}`}>
                      {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => markAttendance(student.violation_id, 'present')}
                        className={`text-green-600 hover:text-green-900 ${
                          student.status === 'present' || student.status === 'reassigned'
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                        }`}
                        disabled={student.status === 'present' || student.status === 'reassigned'}
                      >
                        <Check className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => markAttendance(student.violation_id, 'absent')}
                        className={`text-red-600 hover:text-red-900 ${
                          student.status === 'absent' || student.status === 'reassigned'
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                        }`}
                        disabled={student.status === 'absent' || student.status === 'reassigned'}
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 bg-yellow-50 p-4 rounded-md flex items-start">
        <AlertCircle className="text-yellow-500 mt-1 mr-3" />
        <div className="text-sm text-yellow-700">
          <p className="font-medium mb-1">Important Notes:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Students marked as absent will automatically be rescheduled</li>
            <li>Use the barcode scanner for quick check-in</li>
            <li>Manual attendance marking is available if needed</li>
            <li>Rescheduled students will receive email notifications</li>
          </ul>
        </div>
      </div>
    </div>
  );
}