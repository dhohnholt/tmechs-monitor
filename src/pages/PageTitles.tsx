import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft,
  Edit2,
  Save,
  X,
  Loader2,
  FileText,
  ChevronRight,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { navLinks } from '../App';
import { supabase } from '../lib/supabase';

interface PageTitle {
  id?: string;
  path: string;
  label: string;
  description: string;
  is_visible: boolean;
}

export default function PageTitles() {
  const navigate = useNavigate();
  const [editingTitle, setEditingTitle] = useState<PageTitle | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customTitles, setCustomTitles] = useState<Record<string, PageTitle>>({});
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    fetchCustomTitles();
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
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (error || !teacherData?.is_admin) {
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

  const fetchCustomTitles = async () => {
    try {
      const { data, error } = await supabase
        .from('page_titles')
        .select('*');

      if (error) throw error;

      const titleMap = (data || []).reduce((acc: Record<string, PageTitle>, title) => {
        acc[title.path] = title;
        return acc;
      }, {});

      setCustomTitles(titleMap);
    } catch (error) {
      console.error('Error fetching custom titles:', error);
      toast.error('Failed to load custom titles');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTitle) return;

    setSaving(true);
    try {
      const { path, label, description, is_visible } = editingTitle;
      
      if (editingTitle.id) {
        // Update existing title
        const { error } = await supabase
          .from('page_titles')
          .update({ label, description, is_visible })
          .eq('id', editingTitle.id);

        if (error) throw error;
      } else {
        // Insert new title
        const { error } = await supabase
          .from('page_titles')
          .insert({ path, label, description, is_visible });

        if (error) throw error;
      }

      toast.success('Page title updated successfully');
      setEditingTitle(null);
      fetchCustomTitles();
    } catch (error) {
      console.error('Error updating page title:', error);
      toast.error('Failed to update page title');
    } finally {
      setSaving(false);
    }
  };

  const toggleVisibility = async (path: string, currentVisibility: boolean) => {
    setSaving(true);
    try {
      const customTitle = customTitles[path];
      
      if (customTitle) {
        // Update existing title
        const { error } = await supabase
          .from('page_titles')
          .update({ is_visible: !currentVisibility })
          .eq('id', customTitle.id);

        if (error) throw error;
      } else {
        // Create new title with default values and toggled visibility
        const defaultTitle = navLinks.find(link => link.to === path);
        if (!defaultTitle) throw new Error('Page not found');

        const { error } = await supabase
          .from('page_titles')
          .insert({
            path,
            label: defaultTitle.label,
            description: defaultTitle.description,
            is_visible: !currentVisibility
          });

        if (error) throw error;
      }

      toast.success(`Page ${currentVisibility ? 'hidden' : 'visible'}`);
      fetchCustomTitles();
    } catch (error) {
      console.error('Error toggling visibility:', error);
      toast.error('Failed to update visibility');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = async (path: string) => {
    if (!window.confirm('Reset this page title to default?')) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('page_titles')
        .delete()
        .eq('path', path);

      if (error) throw error;

      toast.success('Reset to default title');
      fetchCustomTitles();
    } catch (error) {
      console.error('Error resetting title:', error);
      toast.error('Failed to reset title');
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-tmechs-forest" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center space-x-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-tmechs-forest hover:text-tmechs-forest/80"
        >
          <ArrowLeft className="h-6 w-6" />
          <span className="ml-1">Back</span>
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Page Titles</h1>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="space-y-6">
          {navLinks.map((page) => {
            const customTitle = customTitles[page.to];
            const currentTitle = customTitle || page;
            const isVisible = customTitle ? customTitle.is_visible : true;

            return (
              <div
                key={page.to}
                className="border-b border-gray-200 last:border-0 pb-6 last:pb-0"
              >
                {editingTitle?.path === page.to ? (
                  <form onSubmit={handleSave} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Page Title
                      </label>
                      <input
                        type="text"
                        value={editingTitle.label}
                        onChange={(e) => setEditingTitle({
                          ...editingTitle,
                          label: e.target.value
                        })}
                        className="w-full rounded-md border border-gray-300 shadow-sm focus:border-tmechs-forest focus:ring-1 focus:ring-tmechs-forest"
                        required
                        disabled={saving}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={editingTitle.description}
                        onChange={(e) => setEditingTitle({
                          ...editingTitle,
                          description: e.target.value
                        })}
                        className="w-full rounded-md border border-gray-300 shadow-sm focus:border-tmechs-forest focus:ring-1 focus:ring-tmechs-forest"
                        required
                        disabled={saving}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`show-home-${page.to}`}
                        checked={editingTitle.is_visible}
                        onChange={(e) => setEditingTitle({
                          ...editingTitle,
                          is_visible: e.target.checked
                        })}
                        className="rounded border-gray-300 text-tmechs-forest focus:ring-tmechs-forest"
                        disabled={saving}
                      />
                      <label
                        htmlFor={`show-home-${page.to}`}
                        className="text-sm text-gray-700"
                      >
                        Show page
                      </label>
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
                        onClick={() => setEditingTitle(null)}
                        disabled={saving}
                        className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md disabled:opacity-50"
                      >
                        <X className="h-5 w-5 mr-2" />
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-start justify-between group">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-tmechs-forest mr-2" />
                        <h3 className="text-lg font-medium text-gray-900">
                          {currentTitle.label}
                          {customTitle && (
                            <span className="ml-2 text-xs text-tmechs-forest bg-tmechs-sage/20 px-2 py-0.5 rounded">
                              Custom
                            </span>
                          )}
                        </h3>
                      </div>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <span className="font-mono">{page.to}</span>
                        <ChevronRight className="h-4 w-4 mx-2" />
                        <span>{currentTitle.description}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => toggleVisibility(page.to, isVisible)}
                        disabled={saving}
                        className={`p-2 rounded-full hover:bg-gray-100 ${
                          isVisible
                            ? 'text-green-600 hover:text-green-700'
                            : 'text-gray-400 hover:text-gray-500'
                        }`}
                        title={isVisible ? 'Hide page' : 'Show page'}
                      >
                        {isVisible ? (
                          <Eye className="h-5 w-5" />
                        ) : (
                          <EyeOff className="h-5 w-5" />
                        )}
                      </button>
                      {customTitle && (
                        <button
                          onClick={() => resetToDefault(page.to)}
                          disabled={saving}
                          className="p-2 text-gray-400 hover:text-tmechs-forest rounded-full hover:bg-gray-100"
                          title="Reset to default"
                        >
                          <RefreshCw className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={() => setEditingTitle({
                          id: customTitle?.id,
                          path: page.to,
                          label: currentTitle.label,
                          description: currentTitle.description,
                          is_visible: isVisible
                        })}
                        disabled={saving}
                        className="p-2 text-gray-400 hover:text-tmechs-forest rounded-full hover:bg-gray-100"
                        title="Edit title"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}