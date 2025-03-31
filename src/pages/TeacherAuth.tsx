import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function TeacherAuth() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate email domain
      if (!formData.email.endsWith('@episd.org')) {
        toast.error('Please use your school email address (@episd.org)');
        return;
      }

      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('No user data returned');
      }

      // Create teacher profile
      const { error: profileError } = await supabase
        .from('teachers')
        .insert({
          id: authData.user.id,
          name: formData.name,
          email: formData.email,
        });

      if (profileError) {
        // Cleanup: delete auth user if profile creation fails
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw profileError;
      }

      toast.success('Account created successfully! You can now sign in.');
      navigate('/');
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="flex flex-col items-center mb-8">
          <img 
            src="https://zgrxawyginizrshjmkum.supabase.co/storage/v1/object/public/site-assets/TMECHS%20Logo%20Gradient.png"
            alt="TMECHS Logo"
            className="h-12 w-12 mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-900">Teacher Registration</h1>
          <p className="text-gray-600 text-center mt-2">
            Create your account to start monitoring student behavior
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="pl-10 w-full rounded-md border border-gray-300 shadow-sm focus:border-tmechs-forest focus:ring-1 focus:ring-tmechs-forest"
                placeholder="John Smith"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              School Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="pl-10 w-full rounded-md border border-gray-300 shadow-sm focus:border-tmechs-forest focus:ring-1 focus:ring-tmechs-forest"
                placeholder="smith.john@episd.org"
                required
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
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="pl-10 w-full rounded-md border border-gray-300 shadow-sm focus:border-tmechs-forest focus:ring-1 focus:ring-tmechs-forest"
                placeholder="••••••••"
                minLength={8}
                required
              />
            </div>
          </div>

          <div className="bg-tmechs-sage/10 p-4 rounded-md flex items-start">
            <AlertCircle className="text-tmechs-forest mt-1 mr-3 flex-shrink-0" />
            <div className="text-sm text-tmechs-forest">
              <p className="font-medium mb-1">Important Notes:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Use your official school email (@episd.org)</li>
                <li>Password must be at least 8 characters</li>
                <li>You'll need admin approval to access all features</li>
              </ul>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-tmechs-forest text-white py-2 px-4 rounded-md hover:bg-tmechs-forest/90 focus:outline-none focus:ring-2 focus:ring-tmechs-forest focus:ring-offset-2 transition-colors ${
              isLoading ? 'opacity-75 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}