import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Calendar, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

interface Violation {
  id: string;
  violation_type: string;
  assigned_date: string;
  detention_date: string;
  status: string;
  teachers: {
    name: string;
  };
}

export default function StudentViolations() {
  const navigate = useNavigate();
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchViolations();
  }, []);

  const fetchViolations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data, error } = await supabase
        .from('violations')
        .select(`
          *,
          teachers (name)
        `)
        .eq('student_id', user.id)
        .order('assigned_date', { ascending: false });

      if (error) throw error;
      setViolations(data || []);
    } catch (error) {
      console.error('Error fetching violations:', error);
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
        <h1 className="text-2xl font-bold text-gray-800">My Violations</h1>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : violations.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            No violations found
          </div>
        ) : (
          <div className="space-y-4">
            {violations.map((violation) => (
              <div
                key={violation.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {violation.violation_type}
                    </p>
                    <p className="text-sm text-gray-500">
                      Assigned by {violation.teachers.name}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-gray-600">
                        {format(new Date(violation.detention_date), 'MMMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex justify-between items-center">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    violation.status === 'attended'
                      ? 'bg-green-100 text-green-800'
                      : violation.status === 'absent'
                      ? 'bg-red-100 text-red-800'
                      : violation.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {violation.status.charAt(0).toUpperCase() + violation.status.slice(1)}
                  </span>
                  <span className="text-xs text-gray-500">
                    Assigned: {format(new Date(violation.assigned_date), 'MMMM d, yyyy')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}