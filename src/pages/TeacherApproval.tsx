import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft,
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  ChevronDown,
  UserCog
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Teacher {
  id: string;
  name: string;
  email: string;
  is_approved: boolean;
  role: string;
  created_at: string;
}

export default function TeacherApproval() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState<string | null>(null);

  useEffect(() => {
    checkAdminStatus();
    fetchTeachers();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: teacherData, error } = await supabase
        .from('teachers')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error || teacherData?.role !== 'admin') {
        toast.error('Unauthorized access');
        navigate('/');
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error('Error checking admin status:', error);
      navigate('/');
    }
  };

  const fetchTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTeachers(data);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      toast.error('Failed to load teachers');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (teacherId: string, approve: boolean) => {
    try {
      const { error } = await supabase
        .from('teachers')
        .update({ is_approved: approve })
        .eq('id', teacherId);

      if (error) throw error;

      toast.success(`Teacher ${approve ? 'approved' : 'unapproved'} successfully`);
      fetchTeachers();

      // Send notification email
      try {
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/teacher-notifications`;
        await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: approve ? 'approval' : 'unapproval',
            teacherId
          })
        });
      } catch (emailError) {
        console.error('Failed to send notification:', emailError);
      }
    } catch (error) {
      console.error('Error updating teacher:', error);
      toast.error('Failed to update teacher status');
    }
  };

  const handleRoleChange = async (teacherId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('teachers')
        .update({ role: newRole })
        .eq('id', teacherId);

      if (error) throw error;

      toast.success(`Teacher role updated to ${newRole}`);
      setShowRoleDropdown(null);
      fetchTeachers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  const filteredTeachers = teachers.filter(teacher =>
    teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center space-x-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-tmechs-forest hover:text-tmechs-forest/80"
        >
          <ArrowLeft className="h-6 w-6" />
          <span className="ml-1">Back</span>
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Teacher Approval</h1>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search teachers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-md border border-gray-300 focus:ring-tmechs-forest focus:border-tmechs-forest"
              />
            </div>
          </div>
          <button
            onClick={fetchTeachers}
            className="flex items-center text-tmechs-forest hover:text-tmechs-forest/80"
          >
            <RefreshCw className="h-5 w-5 mr-1" />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <RefreshCw className="h-8 w-8 animate-spin text-tmechs-forest" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registration Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTeachers.map((teacher) => (
                  <tr key={teacher.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Shield className={`h-5 w-5 mr-2 ${
                          teacher.is_approved ? 'text-green-500' : 'text-gray-400'
                        }`} />
                        <div className="text-sm font-medium text-gray-900">
                          {teacher.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{teacher.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(teacher.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        teacher.is_approved
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {teacher.is_approved ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="relative">
                        <button
                          onClick={() => setShowRoleDropdown(showRoleDropdown === teacher.id ? null : teacher.id)}
                          className="flex items-center text-sm text-gray-700 hover:text-gray-900"
                        >
                          <UserCog className="h-4 w-4 mr-1" />
                          {teacher.role}
                          <ChevronDown className="h-4 w-4 ml-1" />
                        </button>
                        
                        {showRoleDropdown === teacher.id && (
                          <div className="absolute z-10 mt-1 w-36 bg-white rounded-md shadow-lg">
                            <div className="py-1">
                              <button
                                onClick={() => handleRoleChange(teacher.id, 'teacher')}
                                className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
                              >
                                Teacher
                              </button>
                              <button
                                onClick={() => handleRoleChange(teacher.id, 'admin')}
                                className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
                              >
                                Admin
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {teacher.is_approved ? (
                        <button
                          onClick={() => handleApproval(teacher.id, false)}
                          className="text-red-600 hover:text-red-900"
                          title="Revoke Approval"
                        >
                          <XCircle className="h-5 w-5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleApproval(teacher.id, true)}
                          className="text-green-600 hover:text-green-900"
                          title="Approve Teacher"
                        >
                          <CheckCircle2 className="h-5 w-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 bg-yellow-50 p-4 rounded-md">
          <div className="flex items-start">
            <AlertTriangle className="text-yellow-500 mt-1 mr-3" />
            <div className="text-sm text-yellow-700">
              <p className="font-medium mb-1">Important Notes:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Only approved teachers can assign detentions and sign up for monitoring</li>
                <li>Teachers will be notified by email when their status changes</li>
                <li>Review teacher information carefully before approval</li>
                <li>Admin users have full system access and can manage other users</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}