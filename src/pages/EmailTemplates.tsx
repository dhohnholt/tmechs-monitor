import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft,
  Mail,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  Eye,
  Save,
  X,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  variables: Array<{
    name: string;
    description: string;
  }>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function EmailTemplates() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    fetchTemplates();
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

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('name');

      if (error) throw error;
      setTemplates(data);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load email templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    try {
      const { error } = await supabase
        .from('email_templates')
        .upsert({
          id: editingTemplate.id,
          name: editingTemplate.name,
          subject: editingTemplate.subject,
          html_content: editingTemplate.html_content,
          variables: editingTemplate.variables,
          is_active: editingTemplate.is_active
        });

      if (error) throw error;

      toast.success('Template saved successfully');
      setEditingTemplate(null);
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Template deleted successfully');
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const previewTemplate = (template: EmailTemplate) => {
    // Replace variables with sample values
    let preview = template.html_content;
    template.variables.forEach(variable => {
      const regex = new RegExp(`{{${variable.name}}}`, 'g');
      preview = preview.replace(regex, `<span class="bg-yellow-100">[${variable.name}]</span>`);
    });
    setPreviewHtml(preview);
    setShowPreview(true);
  };

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
        <h1 className="text-2xl font-bold text-gray-800">Email Templates</h1>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <Mail className="h-6 w-6 text-tmechs-forest" />
            <h2 className="text-lg font-semibold text-gray-800">Manage Email Templates</h2>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => setEditingTemplate({
                id: crypto.randomUUID(),
                name: '',
                subject: '',
                html_content: '',
                variables: [],
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })}
              className="btn-primary flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              New Template
            </button>
            <button
              onClick={fetchTemplates}
              className="text-tmechs-forest hover:text-tmechs-forest/80"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-tmechs-forest" />
          </div>
        ) : (
          <div className="space-y-6">
            {templates.map(template => (
              <div
                key={template.id}
                className="border border-gray-200 rounded-lg p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {template.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {template.subject}
                    </p>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => previewTemplate(template)}
                      className="text-tmechs-forest hover:text-tmechs-forest/80"
                      title="Preview template"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setEditingTemplate(template)}
                      className="text-tmechs-forest hover:text-tmechs-forest/80"
                      title="Edit template"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete template"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Available Variables:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {template.variables.map((variable, index) => (
                      <div
                        key={index}
                        className="bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-700"
                        title={variable.description}
                      >
                        {`{{${variable.name}}}`}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Modal */}
        {editingTemplate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingTemplate.id ? 'Edit Template' : 'New Template'}
                  </h2>
                  <button
                    onClick={() => setEditingTemplate(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Template Name
                    </label>
                    <input
                      type="text"
                      value={editingTemplate.name}
                      onChange={(e) => setEditingTemplate({
                        ...editingTemplate,
                        name: e.target.value
                      })}
                      className="w-full rounded-md border border-gray-300 shadow-sm focus:border-tmechs-forest focus:ring-1 focus:ring-tmechs-forest"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject Line
                    </label>
                    <input
                      type="text"
                      value={editingTemplate.subject}
                      onChange={(e) => setEditingTemplate({
                        ...editingTemplate,
                        subject: e.target.value
                      })}
                      className="w-full rounded-md border border-gray-300 shadow-sm focus:border-tmechs-forest focus:ring-1 focus:ring-tmechs-forest"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      HTML Content
                    </label>
                    <textarea
                      value={editingTemplate.html_content}
                      onChange={(e) => setEditingTemplate({
                        ...editingTemplate,
                        html_content: e.target.value
                      })}
                      rows={15}
                      className="w-full rounded-md border border-gray-300 shadow-sm focus:border-tmechs-forest focus:ring-1 focus:ring-tmechs-forest font-mono text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Variables (JSON)
                    </label>
                    <textarea
                      value={JSON.stringify(editingTemplate.variables, null, 2)}
                      onChange={(e) => {
                        try {
                          const variables = JSON.parse(e.target.value);
                          setEditingTemplate({
                            ...editingTemplate,
                            variables
                          });
                        } catch (error) {
                          // Invalid JSON, ignore
                        }
                      }}
                      rows={5}
                      className="w-full rounded-md border border-gray-300 shadow-sm focus:border-tmechs-forest focus:ring-1 focus:ring-tmechs-forest font-mono text-sm"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingTemplate.is_active}
                      onChange={(e) => setEditingTemplate({
                        ...editingTemplate,
                        is_active: e.target.checked
                      })}
                      className="rounded border-gray-300 text-tmechs-forest focus:ring-tmechs-forest"
                    />
                    <label className="ml-2 text-sm text-gray-700">
                      Template is active
                    </label>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setEditingTemplate(null)}
                      className="px-4 py-2 text-gray-700 hover:text-gray-900"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary flex items-center"
                    >
                      <Save className="h-5 w-5 mr-2" />
                      Save Template
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {showPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    Template Preview
                  </h2>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowPreview(false)}
                    className="btn-primary"
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 bg-yellow-50 p-4 rounded-md">
          <div className="flex items-start">
            <AlertTriangle className="text-yellow-500 mt-1 mr-3" />
            <div className="text-sm text-yellow-700">
              <p className="font-medium mb-1">Template Guidelines:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Use HTML for formatting email content</li>
                <li>Variables are enclosed in double curly braces: {'{{variable_name}}'}</li>
                <li>Test templates thoroughly before activating</li>
                <li>Keep mobile responsiveness in mind</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}