import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Basic validation
      const email = formData.email.trim().toLowerCase();
      const password = formData.password.trim();

      if (!email || !password) {
        toast.error('Please enter both email and password');
        setIsLoading(false);
        return;
      }

      // Clear any existing session
      await supabase.auth.signOut();

      // Attempt to sign in
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('Sign in error:', signInError);
        
        if (signInError.message.includes('Invalid login credentials')) {
          toast.error('Invalid email or password. Please try again.');
        } else if (signInError.message.includes('Email not confirmed')) {
          toast.error('Please confirm your email address before logging in.');
        } else {
          toast.error('Login failed. Please try again.');
        }
        setIsLoading(false);
        return;
      }

      if (!signInData?.user) {
        toast.error('No user data returned. Please try again.');
        setIsLoading(false);
        return;
      }

      // Get fresh session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('Session error:', sessionError);
        toast.error('Failed to establish session. Please try again.');
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      // Verify teacher record exists
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('id, name, is_approved')
        .eq('id', signInData.user.id)
        .maybeSingle();

      if (teacherError) {
        console.error('Teacher verification error:', teacherError);
        toast.error('Failed to verify teacher profile. Please try again.');
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      if (!teacherData) {
        toast.error('Teacher profile not found. Please register first.');
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      if (!teacherData.is_approved) {
        toast.error('Your account is pending approval. Please wait for administrator approval.');
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      // Force refresh user data
      const { data: { user: refreshedUser }, error: refreshError } = await supabase.auth.getUser();
      
      if (refreshError || !refreshedUser) {
        console.error('Error refreshing user:', refreshError);
        toast.error('Failed to refresh user data. Please try again.');
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      toast.success(`Welcome back, ${teacherData.name}!`);
      navigate('/');
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="flex flex-col items-center mb-8">
          <img 
            src="https://zgrxawyginizrshjmkum.supabase.co/storage/v1/object/public/site-assets/TMECHS%20Logo%20Small.png"
            alt="TMECHS Logo"
            className="h-12 w-12 text-tmechs-forest mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-gray-600 text-center mt-2">
            Sign in to continue monitoring student behavior
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="pl-10 w-full rounded-md border border-gray-300 shadow-sm focus:border-tmechs-forest focus:ring-1 focus:ring-tmechs-forest"
                placeholder="your.email@tmechs.edu"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="pl-10 pr-10 w-full rounded-md border border-gray-300 shadow-sm focus:border-tmechs-forest focus:ring-1 focus:ring-tmechs-forest"
                placeholder="••••••••"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="bg-tmechs-sage/10 p-4 rounded-md">
            <div className="flex items-start">
              <AlertCircle className="text-tmechs-forest mt-1 mr-3" />
              <div className="text-sm text-tmechs-forest">
                <p className="font-medium mb-1">Available Test Accounts:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Superadmin: dhohnholt@gmail.com / superuser123</li>
                  <li>Teacher: smith.john@tmechs.edu / password123</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full btn-primary ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="text-tmechs-forest hover:text-tmechs-forest/80 text-sm font-medium"
              disabled={isLoading}
            >
              Need an account? Register here
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}