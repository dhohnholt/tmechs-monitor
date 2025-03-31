import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  User,
  Mail,
  Bell,
  Lock,
  Save,
  Trash2,
  LogOut,
  CheckSquare,
  AlertCircle,
  ArrowLeft,
  Home,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { applyTheme } from '../lib/theme';

interface UserPreferences {
  emailNotifications: boolean;
  detentionReminders: boolean;
  violationAlerts: boolean;
  weeklyReports: boolean;
  theme: 'light' | 'dark' | 'system';
}

interface TeacherProfile {
  id: string;
  name: string;
  email: string;
  classroom_number: string | null;
  preferences: UserPreferences;
  is_approved: boolean;
  is_admin: boolean;
}

function UserProfile() {
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const path = `${user.id}/profile.png`;
      const { uploadImage } = await import('../lib/storage');
      const url = await uploadImage(file, path, 'user-uploads');
      setProfileImage(url);
      toast.success('Profile image uploaded!');
    } catch (err) {
      console.error('Upload error', err);
      toast.error('Failed to upload image');
    }
  };

  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    classroom_number: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [preferences, setPreferences] = useState<UserPreferences>({
    emailNotifications: true,
    detentionReminders: true,
    violationAlerts: true,
    weeklyReports: true,
    theme: 'system',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        navigate('/login');
        return;
      }

      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (teacherError) {
        throw teacherError;
      }

      if (!teacherData) {
        toast.error('Teacher profile not found. Please contact support.');
        navigate('/login');
        return;
      }

      setProfile(teacherData);
      setEditForm({
        name: teacherData.name,
        email: teacherData.email,
        classroom_number: teacherData.classroom_number || '',
      });
      if (teacherData.preferences) {
        setPreferences(teacherData.preferences);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const validateEmail = (email: string) => {
    const re = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    return re.test(email);
  };

  const validateClassroomNumber = (number: string) => {
    if (!number) return true; // Optional field
    return /^[A-Z][0-9]{3}$/.test(number);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Validate email
      if (!validateEmail(editForm.email)) {
        toast.error('Please enter a valid email address');
        return;
      }

      // Validate classroom number
      if (!validateClassroomNumber(editForm.classroom_number)) {
        toast.error('Classroom number must be in format: C101, A203, etc.');
        return;
      }

      const { error: updateError } = await supabase
        .from('teachers')
        .update({
          name: editForm.name,
          email: editForm.email,
          classroom_number: editForm.classroom_number || null,
        })
        .eq('id', profile?.id);

      if (updateError) throw updateError;

      if (editForm.email !== profile?.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: editForm.email,
        });

        if (emailError) throw emailError;
        toast.success('Email update confirmation sent. Please check your inbox.');
      }

      toast.success('Profile updated successfully');
      setIsEditing(false);
      fetchProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (passwordForm.newPassword.length < 8) {
        toast.error('Password must be at least 8 characters long');
        return;
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        toast.error('New passwords do not match');
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });

      if (error) throw error;

      toast.success('Password updated successfully');
      setShowPasswordForm(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePreferences = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('teachers')
        .update({
          preferences,
        })
        .eq('id', profile?.id);

      if (error) throw error;

      toast.success('Preferences updated successfully');
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Failed to update preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you absolutely sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    setSaving(true);
    try {
      const { error: deleteError } = await supabase
        .from('teachers')
        .delete()
        .eq('id', profile?.id);

      if (deleteError) throw deleteError;

      const { error: authError } = await supabase.auth.signOut();
      if (authError) throw authError;

      toast.success('Account deleted successfully');
      navigate('/login');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
    try {
      // Update preferences in database
      const { error } = await supabase
        .from('teachers')
        .update({
          preferences: {
            ...preferences,
            theme: newTheme
          }
        })
        .eq('id', profile?.id);

      if (error) throw error;

      // Update local state
      setPreferences(prev => ({
        ...prev,
        theme: newTheme
      }));

      // Apply theme
      applyTheme(newTheme);
      
      toast.success('Theme updated successfully');
    } catch (error) {
      console.error('Error updating theme:', error);
      toast.error('Failed to update theme');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-tmechs-forest" />
      </div>
    );
  }

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
        <h1 className="text-2xl font-bold text-gray-800">User Profile</h1>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-tmechs-dark">User Profile</h1>
            <p className="text-sm text-tmechs-gray mt-1">
              {profile?.is_admin ? 'Administrator' : 'Teacher'} •{' '}
              {profile?.is_approved ? (
                <span className="text-green-600">Approved</span>
              ) : (
                <span className="text-yellow-600">Pending Approval</span>
              )}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center px-4 py-2 text-red-600 hover:bg-red-50 rounded-md"
          >
            <LogOut className="h-5 w-5 mr-2" />
            Sign Out
          </button>
        </div>

        <div className="space-y-6">
          {/* Profile Information */}
          <div className="border-b border-tmechs-sage/20 pb-6">
            <h2 className="text-lg font-semibold text-tmechs-dark mb-4 flex items-center">
              <User className="h-5 w-5 mr-2" />
              Profile Information
            </h2>
            
            {isEditing ? (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-tmechs-gray mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full rounded-md border border-tmechs-sage focus:border-tmechs-forest focus:ring focus:ring-tmechs-forest/20"
                    required
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-tmechs-gray mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full rounded-md border border-tmechs-sage focus:border-tmechs-forest focus:ring focus:ring-tmechs-forest/20"
                    required
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-tmechs-gray mb-1">
                    Classroom Number
                  </label>
                  <div className="relative">
                    <Home className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={editForm.classroom_number}
                      onChange={(e) => setEditForm({ ...editForm, classroom_number: e.target.value.toUpperCase() })}
                      className="pl-10 w-full rounded-md border border-tmechs-sage focus:border-tmechs-forest focus:ring focus:ring-tmechs-forest/20"
                      placeholder="C101"
                      pattern="[A-Z][0-9]{3}"
                      title="Format: C101, A203, etc."
                      disabled={saving}
                    />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Format: C101, A203, etc. Leave blank if no assigned classroom.
                  </p>
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center px-4 py-2 bg-tmechs-forest text-white rounded-md hover:bg-tmechs-forest/90 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-5 w-5 mr-2" />
                    )}
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    disabled={saving}
                    className="px-4 py-2 text-tmechs-gray hover:text-tmechs-dark disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-tmechs-gray mb-1">
                    Full Name
                  </label>
                  <p className="text-tmechs-dark">{profile?.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-tmechs-gray mb-1">
                    Email Address
                  </label>
                  <p className="text-tmechs-dark">{profile?.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-tmechs-gray mb-1">
                    Classroom Number
                  </label>
                  <p className="text-tmechs-dark">
                    {profile?.classroom_number || 'No classroom assigned'}
                  </p>
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center px-4 py-2 text-tmechs-forest hover:bg-tmechs-sage/10 rounded-md"
                >
                  <Mail className="h-5 w-5 mr-2" />
                  Edit Profile
                </button>
              </div>
            )}
          </div>

          {/* Password Section */}
          <div className="border-b border-tmechs-sage/20 pb-6">
            <h2 className="text-lg font-semibold text-tmechs-dark mb-4 flex items-center">
              <Lock className="h-5 w-5 mr-2" />
              Password
            </h2>
            
            {showPasswordForm ? (
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-tmechs-gray mb-1">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      className="w-full rounded-md border border-tmechs-sage focus:border-tmechs-forest focus:ring focus:ring-tmechs-forest/20 pr-10"
                      required
                      disabled={saving}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-tmechs-gray mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full rounded-md border border-tmechs-sage focus:border-tmechs-forest focus:ring focus:ring-tmechs-forest/20"
                    required
                    minLength={8}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-tmechs-gray mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="w-full rounded-md border border-tmechs-sage focus:border-tmechs-forest focus:ring focus:ring-tmechs-forest/20"
                    required
                    minLength={8}
                    disabled={saving}
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center px-4 py-2 bg-tmechs-forest text-white rounded-md hover:bg-tmechs-forest/90 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-5 w-5 mr-2" />
                    )}
                    Update Password
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPasswordForm(false)}
                    disabled={saving}
                    className="px-4 py-2 text-tmechs-gray hover:text-tmechs-dark disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowPasswordForm(true)}
                className="flex items-center px-4 py-2 text-tmechs-forest hover:bg-tmechs-sage/10 rounded-md"
              >
                <Lock className="h-5 w-5 mr-2" />
                Change Password
              </button>
            )}
          </div>

          {/* Notification Preferences */}
          <div className="border-b border-tmechs-sage/20 pb-6">
            <h2 className="text-lg font-semibold text-tmechs-dark mb-4 flex items-center">
              <Bell className="h-5 w-5 mr-2" />
              Notification Preferences
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-tmechs-dark">Email Notifications</p>
                  <p className="text-sm text-tmechs-gray">Receive general email notifications</p>
                </div>
                <button
                  onClick={() => {
                    setPreferences(prev => ({
                      ...prev,
                      emailNotifications: !prev.emailNotifications
                    }));
                    handleUpdatePreferences();
                  }}
                  disabled={saving}
                  className={`p-2 rounded-md transition-colors ${
                    preferences.emailNotifications
                      ? 'bg-tmechs-forest text-white'
                      : 'bg-tmechs-sage/20 text-tmechs-gray'
                  } disabled:opacity-50`}
                >
                  <CheckSquare className="h-5 w-5" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-tmechs-dark">Detention Reminders</p>
                  <p className="text-sm text-tmechs-gray">Get reminded about upcoming detention duty</p>
                </div>
                <button
                  onClick={() => {
                    setPreferences(prev => ({
                      ...prev,
                      detentionReminders: !prev.detentionReminders
                    }));
                    handleUpdatePreferences();
                  }}
                  disabled={saving}
                  className={`p-2 rounded-md transition-colors ${
                    preferences.detentionReminders
                      ? 'bg-tmechs-forest text-white'
                      : 'bg-tmechs-sage/20 text-tmechs-gray'
                  } disabled:opacity-50`}
                >
                  <CheckSquare className="h-5 w-5" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-tmechs-dark">Violation Alerts</p>
                  <p className="text-sm text-tmechs-gray">Receive alerts about new violations</p>
                </div>
                <button
                  onClick={() => {
                    setPreferences(prev => ({
                      ...prev,
                      violationAlerts: !prev.violationAlerts
                    }));
                    handleUpdatePreferences();
                  }}
                  disabled={saving}
                  className={`p-2 rounded-md transition-colors ${
                    preferences.violationAlerts
                      ? 'bg-tmechs-forest text-white'
                      : 'bg-tmechs-sage/20 text-tmechs-gray'
                  } disabled:opacity-50`}
                >
                  <CheckSquare className="h-5 w-5" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-tmechs-dark">Weekly Reports</p>
                  <p className="text-sm text-tmechs-gray">Receive weekly behavior reports</p>
                </div>
                <button
                  onClick={() => {
                    setPreferences(prev => ({
                      ...prev,
                      weeklyReports: !prev.weeklyReports
                    }));
                    handleUpdatePreferences();
                  }}
                  disabled={saving}
                  className={`p-2 rounded-md transition-colors ${
                    preferences.weeklyReports
                      ? 'bg-tmechs-forest text-white'
                      : 'bg-tmechs-sage/20 text-tmechs-gray'
                  } disabled:opacity-50`}
                >
                  <CheckSquare className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Theme Preferences */}
          <div className="border-b border-tmechs-sage/20 pb-6">
            <h2 className="text-lg font-semibold text-tmechs-dark mb-4">Theme</h2>
            <div className="flex space-x-4">
              {(['light', 'dark', 'system'] as const).map((theme) => (
                <button
                  key={theme}
                  onClick={() => handleThemeChange(theme)}
                  disabled={saving}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    preferences.theme === theme
                      ? 'bg-tmechs-forest text-white dark:bg-tmechs-sage dark:text-gray-900'
                      : 'bg-tmechs-sage/20 text-tmechs-gray hover:bg-tmechs-sage/30 dark:text-gray-300 dark:hover:bg-gray-700'
                  } disabled:opacity-50`}
                >
                  {theme.charAt(0).toUpperCase() + theme.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Account Deletion */}
          <div>
            <h2 className="text-lg font-semibold text-red-600 mb-4 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              Delete Account
            </h2>
            <p className="text-sm text-tmechs-gray mb-4">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <button
              onClick={handleDeleteAccount}
              disabled={saving}
              className="flex items-center px-4 py-2 text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-5 w-5 mr-2" />
              )}
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserProfile;