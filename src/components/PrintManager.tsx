import React from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Printer, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface PrintManagerProps {
  type: 'detention' | 'analytics' | 'attendance';
  data: any;
}

export default function PrintManager({ type, data }: PrintManagerProps) {
  const printDetentionSlip = (student: any) => {
    const doc = new jsPDF();
    
    // Add school logo
    doc.addImage('path_to_logo', 'PNG', 15, 15, 30, 30);
    
    // Header
    doc.setFontSize(20);
    doc.text('TMECHS Detention Notice', 105, 30, { align: 'center' });
    
    // Student Info
    doc.setFontSize(12);
    doc.text(`Student: ${student.name}`, 20, 50);
    doc.text(`ID: ${student.barcode}`, 20, 60);
    doc.text(`Date: ${format(new Date(student.detention_date), 'MMMM d, yyyy')}`, 20, 70);
    doc.text(`Time: 3:45 PM`, 20, 80);
    doc.text(`Location: Room 204`, 20, 90);
    doc.text(`Violation: ${student.violation_type}`, 20, 100);
    
    // Footer
    doc.setFontSize(10);
    doc.text('Please arrive on time. Multiple absences may result in additional disciplinary action.', 20, 120);
    
    // Print using Brother QL-810W
    const pdfData = doc.output('arraybuffer');
    printToBrotherPrinter(pdfData);
  };

  const printAttendanceSheet = (date: string, students: any[]) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(16);
    doc.text(`Detention Attendance Sheet - ${format(new Date(date), 'MMMM d, yyyy')}`, 105, 20, { align: 'center' });
    
    // Table
    (doc as any).autoTable({
      head: [['Student Name', 'ID', 'Violation', 'Present', 'Notes']],
      body: students.map(student => [
        student.name,
        student.barcode,
        student.violation_type,
        '□',
        ''
      ]),
      startY: 30,
    });
    
    doc.save(`attendance_sheet_${date}.pdf`);
  };

  const printAnalyticsReport = (analyticsData: any) => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.text('Behavior Analytics Report', 105, 20, { align: 'center' });
    
    // Summary
    doc.setFontSize(12);
    doc.text(`Total Violations: ${analyticsData.totalViolations}`, 20, 40);
    doc.text(`Students Involved: ${analyticsData.totalStudents}`, 20, 50);
    doc.text(`Attendance Rate: ${analyticsData.attendanceRate}%`, 20, 60);
    
    // Violations by Type
    doc.text('Violations by Type:', 20, 80);
    (doc as any).autoTable({
      head: [['Type', 'Count']],
      body: analyticsData.violationsByType.map((v: any) => [v.type, v.count]),
      startY: 90,
    });
    
    doc.save('analytics_report.pdf');
  };

  const printToBrotherPrinter = async (data: ArrayBuffer) => {
    try {
      const printer = new (window as any).BrotherPrinter('QL-810W');
      await printer.print(data);
      toast.success('Printed successfully');
    } catch (error) {
      console.error('Printing error:', error);
      toast.error('Failed to print. Please check printer connection.');
    }
  };

  return (
    <div className="flex space-x-2">
      {type === 'detention' && (
        <button
          onClick={() => printDetentionSlip(data)}
          className="flex items-center px-3 py-2 bg-tmechs-forest text-white rounded-md hover:bg-tmechs-forest/90"
        >
          <Printer className="h-4 w-4 mr-2" />
          Print Slip
        </button>
      )}
      
      {type === 'attendance' && (
        <button
          onClick={() => printAttendanceSheet(data.date, data.students)}
          className="flex items-center px-3 py-2 bg-tmechs-forest text-white rounded-md hover:bg-tmechs-forest/90"
        >
          <FileText className="h-4 w-4 mr-2" />
          Print Sheet
        </button>
      )}
      
      {type === 'analytics' && (
        <button
          onClick={() => printAnalyticsReport(data)}
          className="flex items-center px-3 py-2 bg-tmechs-forest text-white rounded-md hover:bg-tmechs-forest/90"
        >
          <FileText className="h-4 w-4 mr-2" />
          Export PDF
        </button>
      )}
    </div>
  );
}