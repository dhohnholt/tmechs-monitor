import React from 'react';
import { Link } from 'react-router-dom';
import { School2, Mail, Phone, FileText, HelpCircle } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-tmechs-sage/20">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* School Info */}
          <div>
            <div className="flex items-center mb-4">
              <img 
                src="https://zgrxawyginizrshjmkum.supabase.co/storage/v1/object/public/site-assets//TMECHS_Logo_Gradient.png"
                alt="TMECHS Logo"
                className="h-6 w-6 mr-2"
              />
              <span className="font-bold text-tmechs-dark">TMECHS Monitor</span>
            </div>
            <p className="text-tmechs-gray text-sm">
              Transmountain Early College High School
              <br />
              9570 Gateway N Blvd
              <br />
              El Paso, TX 79924
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-tmechs-dark mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/violations" className="text-tmechs-gray hover:text-tmechs-forest">
                  Record Violation
                </Link>
              </li>
              <li>
                <Link to="/attendance" className="text-tmechs-gray hover:text-tmechs-forest">
                  Detention Attendance
                </Link>
              </li>
              <li>
                <Link to="/analytics" className="text-tmechs-gray hover:text-tmechs-forest">
                  View Analytics
                </Link>
              </li>
              <li>
                <Link to="/teacher-signup" className="text-tmechs-gray hover:text-tmechs-forest">
                  Monitor Signup
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold text-tmechs-dark mb-4">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="flex items-center text-tmechs-gray hover:text-tmechs-forest">
                  <FileText className="h-4 w-4 mr-2" />
                  Student Handbook
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center text-tmechs-gray hover:text-tmechs-forest">
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center text-tmechs-gray hover:text-tmechs-forest">
                  <FileText className="h-4 w-4 mr-2" />
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-tmechs-dark mb-4">Contact</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="tel:+19157801858" className="flex items-center text-tmechs-gray hover:text-tmechs-forest">
                  <Phone className="h-4 w-4 mr-2" />
                  (915) 780-1858
                </a>
              </li>
              <li>
                <a href="mailto:support@tmechs.edu" className="flex items-center text-tmechs-gray hover:text-tmechs-forest">
                  <Mail className="h-4 w-4 mr-2" />
                  support@tmechs.edu
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-tmechs-sage/20">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-tmechs-gray">
              © {new Date().getFullYear()} TMECHS Monitor. All rights reserved.
            </p>
            <div className="mt-4 md:mt-0">
              <img 
                src="https://zgrxawyginizrshjmkum.supabase.co/storage/v1/object/public/site-assets/EPISD%20Logo.png"
                alt="EPISD Logo"
                className="h-8"
              />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}