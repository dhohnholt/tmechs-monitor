import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Upload, Download, AlertCircle, Save } from 'lucide-react';
import Papa from 'papaparse';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

interface BulkViolation {
  barcode: string;
  violation_type: string;
  detention_date: string;
}

export default function BulkViolationEntry() {
  const [violations, setViolations] = useState<BulkViolation[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop()?.toLowerCase();

    if (fileExt === 'csv') {
      Papa.parse(file, {
        complete: (results) => {
          const violations = results.data.slice(1).map((row: any) => ({
            barcode: row[0],
            violation_type: row[1],
            detention_date: row[2],
          }));
          setViolations(violations);
          toast.success(`Loaded ${violations.length} violations`);
        },
        header: true,
      });
    } else if (fileExt === 'xlsx' || fileExt === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const violations = XLSX.utils.sheet_to_json(sheet);
        setViolations(violations as BulkViolation[]);
        toast.success(`Loaded ${violations.length} violations`);
      };
      reader.readAsBinaryString(file);
    }
  };

  const downloadTemplate = () => {
    const template = [
      ['barcode', 'violation_type', 'detention_date'],
      ['12345', 'No ID', '2025-04-01'],
      ['67890', 'Tardy', '2025-04-01'],
    ];

    const csv = Papa.unparse(template);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'violation_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleSubmit = async () => {
    if (violations.length === 0) {
      toast.error('No violations to submit');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Process violations in batches of 10
      const batchSize = 10;
      for (let i = 0; i < violations.length; i += batchSize) {
        const batch = violations.slice(i, i + batchSize);
        
        // Get student IDs for the batch
        const { data: students, error: studentError } = await supabase
          .from('students')
          .select('id, barcode')
          .in('barcode', batch.map(v => v.barcode));

        if (studentError) throw studentError;

        // Create violation records
        const violationRecords = batch.map(violation => {
          const student = students?.find(s => s.barcode === violation.barcode);
          if (!student) return null;

          return {
            student_id: student.id,
            violation_type: violation.violation_type,
            detention_date: violation.detention_date,
            teacher_id: user.id,
            status: 'pending'
          };
        }).filter(Boolean);

        const { error: insertError } = await supabase
          .from('violations')
          .insert(violationRecords);

        if (insertError) throw insertError;
      }

      toast.success('All violations recorded successfully');
      setViolations([]);
    } catch (error) {
      console.error('Error submitting violations:', error);
      toast.error('Failed to record violations');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-tmechs-dark mb-4">Bulk Violation Entry</h2>

      <div className="flex space-x-4 mb-6">
        <label className="flex items-center px-4 py-2 bg-tmechs-forest text-white rounded-md hover:bg-tmechs-forest/90 cursor-pointer">
          <Upload className="h-5 w-5 mr-2" />
          Upload File
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleFileUpload}
          />
        </label>
        <button
          onClick={downloadTemplate}
          className="flex items-center px-4 py-2 bg-tmechs-sage/20 text-tmechs-forest rounded-md hover:bg-tmechs-sage/30"
        >
          <Download className="h-5 w-5 mr-2" />
          Download Template
        </button>
      </div>

      {violations.length > 0 && (
        <>
          <div className="overflow-x-auto mb-6">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Barcode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Violation Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Detention Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {violations.map((violation, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {violation.barcode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {violation.violation_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {violation.detention_date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center text-tmechs-gray">
              <AlertCircle className="h-5 w-5 mr-2" />
              {violations.length} violations ready to submit
            </div>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`flex items-center px-4 py-2 bg-tmechs-forest text-white rounded-md hover:bg-tmechs-forest/90 ${
                isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Save className="h-5 w-5 mr-2" />
              {isSubmitting ? 'Submitting...' : 'Submit All'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}