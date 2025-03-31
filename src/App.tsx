import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import {
  School2,
  ClipboardList,
  UserCheck,
  BarChart3,
  UserPlus,
  LogIn,
  Users,
  Calendar,
  TrendingUp,
  Menu,
  X,
  Home,
  Settings,
  Shield,
  ChevronDown,
  BookOpen,
  Bell,
  FileText,
  UserCog,
  Mail,
  LogOut,
  Image
} from 'lucide-react';
import ViolationEntry from './pages/ViolationEntry';
import DetentionAttendance from './pages/DetentionAttendance';
import DetentionManagement from './pages/DetentionManagement';
import TeacherSignup from './pages/TeacherSignup';
import TeacherAuth from './pages/TeacherAuth';
import TeacherApproval from './pages/TeacherApproval';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Login from './pages/Login';
import StudentManagement from './pages/StudentManagement';
import HomePage from './pages/HomePage';
import UserProfile from './pages/UserProfile';
import PageTitles from './pages/PageTitles';
import ParentPortal from './pages/ParentPortal';
import ParentAccounts from './pages/ParentAccounts';
import EmailTemplates from './pages/EmailTemplates';
import MediaLibrary from './pages/MediaLibrary';
import Footer from './components/Footer';
import { supabase } from './lib/supabase';

const navGroups = {
  monitoring: [
    { to: '/violations', icon: ClipboardList, label: 'Record Violation', description: 'Record and manage student violations' },
    { to: '/attendance', icon: UserCheck, label: 'Attendance', description: 'Track detention attendance' },
    { to: '/detention', icon: Calendar, label: 'Schedule', description: 'Manage detention schedules and assignments' },
  ],
  management: [
    { to: '/students', icon: Users, label: 'Students', description: 'Manage student records and information' },
    { to: '/teacher-signup', icon: School2, label: 'Monitor Signup', description: 'Sign up for detention monitoring duty' },
  ],
  insights: [
    { to: '/dashboard', icon: BarChart3, label: 'Dashboard', description: 'View key metrics and summaries' },
    { to: '/analytics', icon: TrendingUp, label: 'Analytics', description: 'View behavior trends and statistics' },
  ],
  account: [
    { to: '/profile', icon: Settings, label: 'Profile', description: 'Manage your account settings' },
    { to: '/register', icon: UserPlus, label: 'Register', description: 'Create a new teacher account' },
    { to: '/login', icon: LogIn, label: 'Login', description: 'Access your account' },
    { to: '/logout', icon: LogOut, label: 'Logout', description: 'Sign out of your account' }
  ],
  admin: [
    { to: '/teacher-approval', icon: Shield, label: 'Approvals', description: 'Manage teacher account approvals' },
    { to: '/page-titles', icon: FileText, label: 'Page Titles', description: 'Manage page titles and descriptions' },
    { to: '/email-templates', icon: Mail, label: 'Email Templates', description: 'Manage system email templates' },
    { to: '/parent-accounts', icon: UserCog, label: 'Parent Accounts', description: 'Manage parent portal access' },
    { to: '/media-library', icon: Image, label: 'Media Library', description: 'Manage images and media files' }
  ]
};

export const navLinks = [
  ...navGroups.monitoring,
  ...navGroups.management,
  ...navGroups.insights,
  ...navGroups.account,
  ...navGroups.admin
];

interface DropdownProps {
  label: string;
  icon: React.ElementType;
  items: Array<{
    to: string;
    icon: React.ElementType;
    label: string;
  }>;
  isOpen: boolean;
  onClick: () => void;
  onItemClick: (to: string) => void;
}

function Dropdown({ label, icon: Icon, items, isOpen, onClick, onItemClick }: DropdownProps) {
  return (
    <div className="dropdown relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="flex items-center px-3 py-2 rounded-md hover:bg-tmechs-sage/20 focus:outline-none"
      >
        <Icon className="h-5 w-5 mr-1" />
        <span>{label}</span>
        <ChevronDown className={`h-4 w-4 ml-1 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
          <div className="py-1">
            {items.map((item) => (
              <button
                key={item.to}
                onClick={(e) => {
                  e.stopPropagation();
                  onItemClick(item.to);
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-tmechs-sage/10"
              >
                <item.icon className="h-4 w-4 mr-2" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [visiblePages, setVisiblePages] = useState<Set<string>>(new Set());

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      if (session?.user) {
        checkAdminStatus(session.user.id);
      } else {
        setIsAdmin(false);
      }
    });

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      if (session?.user) {
        checkAdminStatus(session.user.id);
      }
    });

    // Fetch visible pages
    fetchVisiblePages();

    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target as Element).closest('.dropdown')) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('click', handleClickOutside);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const fetchVisiblePages = async () => {
    try {
      const { data: pageTitles, error } = await supabase
        .from('page_titles')
        .select('path, is_visible');

      if (error) throw error;

      const visibleSet = new Set<string>();
      
      // Add all nav links by default
      navLinks.forEach(link => visibleSet.add(link.to));
      
      // Remove any that are explicitly set to not visible
      pageTitles?.forEach(title => {
        if (!title.is_visible) {
          visibleSet.delete(title.path);
        }
      });

      setVisiblePages(visibleSet);
    } catch (error) {
      console.error('Error fetching page visibility:', error);
    }
  };

  const checkAdminStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('teachers')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setIsAdmin(data?.role === 'admin');
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  const getVisibleLinks = (links: typeof navLinks) => {
    return links.filter(link => visiblePages.has(link.to));
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleDropdownClick = (dropdownName: string) => {
    setOpenDropdown(openDropdown === dropdownName ? null : dropdownName);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
      setOpenDropdown(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleNavItemClick = (to: string) => {
    if (to === '/logout') {
      handleLogout();
    } else {
      navigate(to);
      setOpenDropdown(null);
    }
  };

  return (
    <div className="min-h-screen bg-tmechs-light flex flex-col">
      <nav className="bg-tmechs-forest text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex-shrink-0 flex items-center">
              <img 
                src="https://zgrxawyginizrshjmkum.supabase.co/storage/v1/object/public/site-assets/TMECHS%20Logo%20Small.png"
                alt="TMECHS Logo"
                className="h-8 w-8 mr-2"
              />
              <span className="font-bold text-xl">TMECHS Monitor</span>
            </div>

            <div className="hidden md:flex space-x-4">
              <Link
                to="/"
                className="flex items-center px-3 py-2 rounded-md hover:bg-tmechs-sage/20"
              >
                <Home className="h-5 w-5 mr-1" />
                <span>Home</span>
              </Link>

              <Dropdown
                label="Monitoring"
                icon={BookOpen}
                items={getVisibleLinks(navGroups.monitoring)}
                isOpen={openDropdown === 'monitoring'}
                onClick={() => handleDropdownClick('monitoring')}
                onItemClick={handleNavItemClick}
              />

              <Dropdown
                label="Management"
                icon={Users}
                items={getVisibleLinks(navGroups.management)}
                isOpen={openDropdown === 'management'}
                onClick={() => handleDropdownClick('management')}
                onItemClick={handleNavItemClick}
              />

              <Dropdown
                label="Insights"
                icon={BarChart3}
                items={getVisibleLinks(navGroups.insights)}
                isOpen={openDropdown === 'insights'}
                onClick={() => handleDropdownClick('insights')}
                onItemClick={handleNavItemClick}
              />

              {isAuthenticated ? (
                <Dropdown
                  label="Account"
                  icon={Settings}
                  items={[...getVisibleLinks([navGroups.account[0]]), navGroups.account[3]]}
                  isOpen={openDropdown === 'account'}
                  onClick={() => handleDropdownClick('account')}
                  onItemClick={handleNavItemClick}
                />
              ) : (
                <div className="flex space-x-2">
                  {getVisibleLinks(navGroups.account.slice(1, 3)).map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="flex items-center px-3 py-2 rounded-md hover:bg-tmechs-sage/20"
                    >
                      <item.icon className="h-5 w-5 mr-1" />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
              )}

              {isAdmin && (
                <Dropdown
                  label="Admin"
                  icon={Shield}
                  items={getVisibleLinks(navGroups.admin)}
                  isOpen={openDropdown === 'admin'}
                  onClick={() => handleDropdownClick('admin')}
                  onItemClick={handleNavItemClick}
                />
              )}
            </div>

            <div className="md:hidden">
              <button
                onClick={toggleMenu}
                className="inline-flex items-center justify-center p-2 rounded-md hover:bg-tmechs-sage/20 focus:outline-none"
              >
                {isMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className={`md:hidden ${isMenuOpen ? 'block' : 'hidden'}`}>
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              to="/"
              className="flex items-center px-3 py-2 rounded-md hover:bg-tmechs-sage/20 text-white"
              onClick={() => setIsMenuOpen(false)}
            >
              <Home className="h-5 w-5 mr-2" />
              <span>Home</span>
            </Link>

            {Object.entries(navGroups).map(([group, items]) => {
              // Skip account section for unauthenticated users
              if (!isAuthenticated && group === 'account') {
                return (
                  <div key={group} className="space-y-1">
                    <div className="px-3 py-2 text-sm font-medium text-tmechs-sage/60 uppercase">
                      Account
                    </div>
                    {items.slice(1, 3).map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        className="flex items-center px-3 py-2 rounded-md hover:bg-tmechs-sage/20 text-white"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <item.icon className="h-5 w-5 mr-2" />
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                );
              }

              // Skip admin section for non-admins
              if (group === 'admin' && !isAdmin) {
                return null;
              }

              return (
                <div key={group} className="space-y-1">
                  <div className="px-3 py-2 text-sm font-medium text-tmechs-sage/60 uppercase">
                    {group}
                  </div>
                  {getVisibleLinks(items).map((item) => {
                    if (item.to === '/logout') {
                      return (
                        <button
                          key={item.to}
                          onClick={() => {
                            setIsMenuOpen(false);
                            handleLogout();
                          }}
                          className="flex items-center px-3 py-2 rounded-md hover:bg-tmechs-sage/20 text-white w-full"
                        >
                          <item.icon className="h-5 w-5 mr-2" />
                          <span>{item.label}</span>
                        </button>
                      );
                    }
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className="flex items-center px-3 py-2 rounded-md hover:bg-tmechs-sage/20 text-white"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <item.icon className="h-5 w-5 mr-2" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="flex-grow max-w-7xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/violations" element={<ViolationEntry />} />
          <Route path="/attendance" element={<DetentionAttendance />} />
          <Route path="/students" element={<StudentManagement />} />
          <Route path="/detention" element={<DetentionManagement />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/teacher-signup" element={<TeacherSignup />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/register" element={<TeacherAuth />} />
          <Route path="/login" element={<Login />} />
          <Route path="/teacher-approval" element={<TeacherApproval />} />
          <Route path="/page-titles" element={<PageTitles />} />
          <Route path="/parent-portal" element={<ParentPortal />} />
          <Route path="/parent-accounts" element={<ParentAccounts />} />
          <Route path="/email-templates" element={<EmailTemplates />} />
          <Route path="/media-library" element={<MediaLibrary />} />
        </Routes>
      </main>

      <Footer />
      <Toaster position="top-right" />
    </div>
  );
}

export default App;