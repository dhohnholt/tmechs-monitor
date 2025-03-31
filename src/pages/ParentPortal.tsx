import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  Search,
  AlertCircle,
  Calendar,
  Clock,
  MapPin,
  User,
  Mail,
  Key,
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface StudentData {
  id: string;
  name: string;
  grade: number;
  email: string;
  violations: StudentViolation[];
}

interface StudentViolation {
  id: string;
  violation_type: string;
  assigned_date: string;
  detention_date: string;
  status: string;
  teachers: {
    name: string;
  };
}

export default function ParentPortal() {
  const navigate = useNavigate();
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState<StudentData | null>(null);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    // Check if already verified
    const storedCode = localStorage.getItem('parentAccessCode');
    if (storedCode) {
      verifyAccessCode(storedCode);
    }
  }, []);

  const verifyAccessCode = async (code: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          name,
          grade,
          email,
          violations (
            id,
            violation_type,
            assigned_date,
            detention_date,
            status,
            teachers (
              name
            )
          )
        `)
        .eq('parent_access_code', code.toUpperCase())
        .single();

      if (error) throw error;

      if (data) {
        // Update verification status if not already verified
        if (!data.parent_verified) {
          await supabase
            .from('students')
            .update({
              parent_verified: true,
              parent_verified_at: new Date().toISOString()
            })
            .eq('id', data.id);
        }

        setStudent(data);
        setVerified(true);
        localStorage.setItem('parentAccessCode', code);
        toast.success('Access verified successfully');
      } else {
        toast.error('Invalid access code');
      }
    } catch (error) {
      console.error('Error verifying access:', error);
      toast.error('Failed to verify access code');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode) {
      toast.error('Please enter an access code');
      return;
    }
    verifyAccessCode(accessCode);
  };

  const handleLogout = () => {
    localStorage.removeItem('parentAccessCode');
    setStudent(null);
    setVerified(false);
    setAccessCode('');
  };

  if (!verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <div className="flex flex-col items-center mb-8">
            <img 
              src="https://zgrxawyginizrshjmkum.supabase.co/storage/v1/object/public/site-assets/TMECHS%20Logo%20Gradient.png"
              alt="TMECHS Logo"
              className="h-12 w-12 mb-4"
            />
            <h1 className="text-2xl font-bold text-gray-900">Parent Portal</h1>
            <p className="text-gray-600 text-center mt-2">
              Enter your access code to view your student's information
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Access Code
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  className="pl-10 w-full rounded-md border border-gray-300 shadow-sm focus:border-tmechs-forest focus:ring-1 focus:ring-tmechs-forest"
                  placeholder="Enter code (e.g., AB123456)"
                  pattern="[A-Z]{2}[0-9]{6}"
                  maxLength={8}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="bg-tmechs-sage/10 p-4 rounded-md">
              <div className="flex items-start">
                <AlertCircle className="text-tmechs-forest mt-1 mr-3" />
                <div className="text-sm text-tmechs-forest">
                  <p className="font-medium mb-1">Access Code Format:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>2 letters followed by 6 numbers</li>
                    <li>Found in violation notification emails</li>
                    <li>Case insensitive</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full btn-primary ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Access Portal'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!student) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Student Information</h1>
        <button
          onClick={handleLogout}
          className="text-sm text-red-600 hover:text-red-800"
        >
          Sign Out
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <User className="h-5 w-5 mr-2" />
              Student Details
            </h2>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="text-sm text-gray-900">{student.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Grade</dt>
                <dd className="text-sm text-gray-900">{student.grade}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="text-sm text-gray-900">{student.email}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              Summary
            </h2>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Total Violations</dt>
                <dd className="text-sm text-gray-900">{student.violations.length}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Pending Detentions</dt>
                <dd className="text-sm text-gray-900">
                  {student.violations.filter(v => v.status === 'pending').length}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Completed Detentions</dt>
                <dd className="text-sm text-gray-900">
                  {student.violations.filter(v => v.status === 'attended').length}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Violation History</h2>
        
        {student.violations.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No violations recorded</p>
        ) : (
          <div className="space-y-4">
            {student.violations.map((violation) => (
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
                        {new Date(violation.detention_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Clock className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-gray-600">3:45 PM</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-gray-600">Room 204</span>
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
                    Assigned: {new Date(violation.assigned_date).toLocaleDateString()}
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