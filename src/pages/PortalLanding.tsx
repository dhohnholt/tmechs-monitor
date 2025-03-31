import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserCircle, School2 } from 'lucide-react';

export default function PortalLanding() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="max-w-4xl w-full px-4">
        <div className="text-center mb-12">
          <img 
            src="https://zgrxawyginizrshjmkum.supabase.co/storage/v1/object/public/site-assets/TMECHS%20Logo%20Gradient.png"
            alt="TMECHS Logo"
            className="h-24 w-24 mx-auto mb-6"
          />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome to TMECHS Monitor
          </h1>
          <p className="text-xl text-gray-600">
            Choose your portal to continue
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Teacher Portal */}
          <button
            onClick={() => navigate('/login')}
            className="bg-white rounded-lg shadow-md p-6 text-left hover:shadow-lg transition-shadow group"
          >
            <div className="flex items-center mb-4">
              <School2 className="h-8 w-8 text-tmechs-forest group-hover:text-tmechs-forest/80" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Teacher Portal
            </h2>
            <p className="text-gray-600">
              Access violation records, manage detentions, and view analytics.
            </p>
            <div className="mt-4 text-tmechs-forest group-hover:text-tmechs-forest/80">
              Sign in as teacher →
            </div>
          </button>

          {/* Parent Portal */}
          <button
            onClick={() => navigate('/parent-portal')}
            className="bg-white rounded-lg shadow-md p-6 text-left hover:shadow-lg transition-shadow group"
          >
            <div className="flex items-center mb-4">
              <Users className="h-8 w-8 text-tmechs-forest group-hover:text-tmechs-forest/80" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Parent Portal
            </h2>
            <p className="text-gray-600">
              Monitor your student's behavior records and detention schedule.
            </p>
            <div className="mt-4 text-tmechs-forest group-hover:text-tmechs-forest/80">
              Access parent portal →
            </div>
          </button>

          {/* Student Portal */}
          <button
            onClick={() => navigate('/student-portal')}
            className="bg-white rounded-lg shadow-md p-6 text-left hover:shadow-lg transition-shadow group"
          >
            <div className="flex items-center mb-4">
              <UserCircle className="h-8 w-8 text-tmechs-forest group-hover:text-tmechs-forest/80" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Student Portal
            </h2>
            <p className="text-gray-600">
              View your violations, check detention schedule, and stay informed.
            </p>
            <div className="mt-4 text-tmechs-forest group-hover:text-tmechs-forest/80">
              Access student portal →
            </div>
          </button>
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            Need help? Contact the school office at (915) 780-1858
          </p>
        </div>
      </div>
    </div>
  );
}