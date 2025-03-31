import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  School2,
  ClipboardList,
  UserCheck,
  UserPlus,
  LogIn,
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { navLinks } from '../App';

export default function HomePage() {
  const [visibleLinks, setVisibleLinks] = useState(navLinks);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVisibleLinks = async () => {
      try {
        const { data: pageTitles, error } = await supabase
          .from('page_titles')
          .select('path, is_visible');

        if (error) throw error;

        const visibilityMap = (pageTitles || []).reduce((acc: Record<string, boolean>, title) => {
          acc[title.path] = title.is_visible;
          return acc;
        }, {});

        const filteredLinks = navLinks.filter(link => {
          return visibilityMap[link.to] === undefined || visibilityMap[link.to];
        });

        setVisibleLinks(filteredLinks);
      } catch (error) {
        console.error('Error fetching page visibility:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVisibleLinks();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-tmechs-forest" />
      </div>
    );
  }

  return (
    <div className="min-h-[80vh]">
      {/* Hero Section */}
      <div className="relative text-center mb-12">
        <div className="relative h-[400px] rounded-lg overflow-hidden">
          <img 
            src="https://zgrxawyginizrshjmkum.supabase.co/storage/v1/object/public/site-assets/tmechs.jpg"
            alt="TMECHS Building"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/70 flex items-center justify-center">
            <div className="text-white p-6">
              <div className="flex justify-center mb-8">
                <img 
                  src="https://zgrxawyginizrshjmkum.supabase.co/storage/v1/object/public/site-assets/TMECHS%20Logo%20Gradient.png"
                  alt="TMECHS Logo"
                  className="h-32 w-32 object-contain"
                />
              </div>
              <h1 className="text-4xl font-bold mb-4">
                Welcome to TMECHS Behavior Monitor
              </h1>
              <p className="text-xl max-w-2xl mx-auto">
                Your comprehensive platform for managing student behavior, detention scheduling, and attendance tracking.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleLinks.map((link) => {
          if (link.to === '/login' || link.to === '/register') return null;
          
          const Icon = link.icon;
          return (
            <Link
              key={link.to}
              to={link.to}
              className="group bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
            >
              <div className="flex items-center mb-4">
                <div className="p-2 rounded-lg bg-tmechs-sage/20 group-hover:bg-tmechs-sage/30 transition-colors">
                  <Icon className="h-6 w-6 text-tmechs-forest" />
                </div>
                <h2 className="text-xl font-semibold text-tmechs-dark ml-3">
                  {link.label}
                </h2>
              </div>
              <p className="text-tmechs-gray">
                {link.description}
              </p>
              <div className="mt-4 text-tmechs-forest group-hover:text-tmechs-forest/80 font-medium">
                Access {link.label} →
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="mt-12 bg-tmechs-sage/20 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-tmechs-dark mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/violations"
            className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <ClipboardList className="h-5 w-5 text-tmechs-forest mr-3" />
              <span className="text-tmechs-dark">Record New Violation</span>
            </div>
            <span className="text-tmechs-forest">→</span>
          </Link>
          <Link
            to="/attendance"
            className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <UserCheck className="h-5 w-5 text-tmechs-forest mr-3" />
              <span className="text-tmechs-dark">Mark Attendance</span>
            </div>
            <span className="text-tmechs-forest">→</span>
          </Link>
        </div>
      </div>

      {/* Help Section */}
      <div className="mt-12 text-center">
        <h2 className="text-2xl font-bold text-tmechs-dark mb-4">Need Help?</h2>
        <p className="text-tmechs-gray mb-6">
          New to the system? Check out our quick start guides or contact support.
        </p>
        <div className="flex justify-center space-x-4">
          <Link
            to="/register"
            className="inline-flex items-center px-6 py-3 bg-tmechs-forest text-white rounded-lg hover:bg-tmechs-forest/90 transition-colors"
          >
            <UserPlus className="h-5 w-5 mr-2" />
            Create Account
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center px-6 py-3 bg-white text-tmechs-forest border border-tmechs-forest rounded-lg hover:bg-tmechs-sage/10 transition-colors"
          >
            <LogIn className="h-5 w-5 mr-2" />
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}