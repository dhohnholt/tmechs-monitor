import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import { toast } from 'react-hot-toast';
import {
  Search,
  Calendar,
  AlertCircle,
  Plus,
  X,
  Scan,
  Printer,
  ToggleLeft,
  ToggleRight,
  ArrowLeft,
  AlertTriangle,
  Shield,
  User,
  ChevronDown,
  ChevronRight,
  Loader2,
  Camera,
  UserPlus,
  Mail,
  Hash
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import PrintManager from '../components/PrintManager';
import BulkViolationEntry from '../components/BulkViolationEntry';
import BarcodeScanner from '../components/BarcodeScanner';
import "react-datepicker/dist/react-datepicker.css";

const DEFAULT_VIOLATIONS = [
  { id: 'no_id', label: 'No Id or ID not Displayed' },
  { id: 'phone_use', label: 'Improper Phone Use' },
  { id: 'tardy', label: 'Tardy' },
  { id: 'disrespectful', label: 'Disrespectful Behavior' }
];

const WARNING_LIMIT = 2;

interface Warning {
  id: string;
  violation_type: string;
  issued_date: string;
  teachers: {
    name: string;
  };
}

interface WarningCount {
  violation_type: string;
  count: number;
}

interface Student {
  id: string;
  name: string;
  grade: number;
  barcode: string;
}

interface NewStudent {
  name: string;
  email: string;
  barcode: string;
  grade: number;
  parent_email: string;
}

export default function ViolationEntry() {
  const navigate = useNavigate();
  const [barcode, setBarcode] = useState('');
  const [selectedViolation, setSelectedViolation] = useState('');
  const [customViolation, setCustomViolation] = useState('');
  const [showCustomViolation, setShowCustomViolation] = useState(false);
  const [detentionDate, setDetentionDate] = useState<Date | null>(null);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedStudent, setScannedStudent] = useState<Student | null>(null);
  const [showBulkEntry, setShowBulkEntry] = useState(false);
  const [lastViolation, setLastViolation] = useState<any>(null);
  const [autoPrint, setAutoPrint] = useState(false);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [warningCounts, setWarningCounts] = useState<WarningCount[]>([]);
  const [isWarning, setIsWarning] = useState(false);
  const [showWarnings, setShowWarnings] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudent, setNewStudent] = useState<NewStudent>({
    name: '',
    email: '',
    barcode: '',
    grade: 9,
    parent_email: ''
  });
  const barcodeBuffer = useRef('');
  const barcodeTimeout = useRef<number | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeout = useRef<number | null>(null);

  useEffect(() => {
    const fetchAvailableDates = async () => {
      try {
        const { data, error } = await supabase
          .from('detention_slots')
          .select('date, current_count, capacity')
          .gt('date', new Date().toISOString())
          .lt('date', new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString())
          .order('date');

        if (error) throw error;

        const availableDates = data
          .filter(slot => slot.current_count < slot.capacity)
          .map(slot => new Date(slot.date));

        setAvailableDates(availableDates);
      } catch (error) {
        console.error('Error fetching available dates:', error);
        toast.error('Failed to load available dates');
      }
    };

    fetchAvailableDates();
  }, []);

  const fetchWarnings = async (studentId: string) => {
    try {
      const { data: warningData, error: warningError } = await supabase
        .from('warnings')
        .select(`
          *,
          teachers (name)
        `)
        .eq('student_id', studentId)
        .order('issued_date', { ascending: false });

      if (warningError) throw warningError;

      // Always set the warnings array, even if empty
      setWarnings(warningData || []);
      
      // Only show warnings section if there are warnings
      setShowWarnings(warningData && warningData.length > 0);

      // Calculate warning counts if there are warnings
      if (warningData && warningData.length > 0) {
        const counts = warningData.reduce((acc: { [key: string]: number }, warning: Warning) => {
          acc[warning.violation_type] = (acc[warning.violation_type] || 0) + 1;
          return acc;
        }, {});

        setWarningCounts(
          Object.entries(counts).map(([type, count]) => ({
            violation_type: type,
            count
          }))
        );
      } else {
        // Reset warning counts if no warnings
        setWarningCounts([]);
      }
    } catch (error) {
      console.error('Error fetching warnings:', error);
      // Only show error toast if there was an actual error
      if (error instanceof Error) {
        toast.error('Failed to load warnings');
      }
      // Reset states on error
      setWarnings([]);
      setWarningCounts([]);
      setShowWarnings(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!barcode || (!selectedViolation && !customViolation)) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!isWarning && !detentionDate) {
      toast.error('Please select a detention date');
      return;
    }

    const violationType = showCustomViolation ? customViolation : selectedViolation;

    try {
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, email, name, barcode')
        .eq('barcode', barcode)
        .single();

      if (studentError || !student) {
        toast.error('Student not found');
        return;
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        toast.error('Please log in again');
        return;
      }

      // Check warning count for this violation type
      const warningCount = warningCounts.find(w => w.violation_type === violationType)?.count || 0;
      const shouldWarn = isWarning || warningCount < WARNING_LIMIT;

      if (shouldWarn) {
        // Record warning
        const { error: warningError } = await supabase
          .from('warnings')
          .insert({
            student_id: student.id,
            teacher_id: user.id,
            violation_type: violationType,
            issued_date: new Date().toISOString()
          });

        if (warningError) {
          toast.error('Failed to record warning');
          return;
        }

        toast.success('Warning recorded');
        await fetchWarnings(student.id);
      } else {
        // Record violation with detention
        const { data: violation, error: violationError } = await supabase
          .from('violations')
          .insert({
            student_id: student.id,
            violation_type: violationType,
            detention_date: detentionDate?.toISOString(),
            teacher_id: user.id,
            assigned_date: new Date().toISOString(),
            is_warning: false
          })
          .select()
          .single();

        if (violationError) {
          toast.error('Failed to record violation');
          return;
        }

        try {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/violation-notification`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ violationId: violation.id })
            }
          );

          if (!response.ok) {
            console.error('Failed to send notification');
          }
        } catch (emailError) {
          console.error('Error sending notification:', emailError);
        }

        setLastViolation({
          ...violation,
          student_name: student.name,
          student_barcode: student.barcode
        });

        toast.success(`Violation recorded${autoPrint ? ' and label printed' : ''}`);
      }

      setBarcode('');
      setSelectedViolation('');
      setCustomViolation('');
      setShowCustomViolation(false);
      setDetentionDate(null);
      setScannedStudent(null);
      setIsWarning(false);
    } catch (error) {
      toast.error('An error occurred');
      console.error('Error:', error);
    }
  };

  const searchStudents = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, name, grade, barcode')
        .ilike('name', `%${query}%`)
        .order('name')
        .limit(5);

      if (error) throw error;
      setSearchResults(data || []);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Error searching students:', error);
      toast.error('Failed to search students');
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (searchQuery.trim()) {
      searchTimeout.current = window.setTimeout(() => {
        searchStudents(searchQuery);
      }, 300);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchQuery]);

  const selectStudent = (student: Student) => {
    setBarcode(student.barcode);
    setScannedStudent(student);
    setSearchQuery('');
    setShowSearchResults(false);
    fetchWarnings(student.id);
  };

  const fetchStudentByBarcode = async (barcode: string) => {
    try {
      const { data: student, error } = await supabase
        .from('students')
        .select('id, name, grade, barcode')
        .eq('barcode', barcode)
        .single();

      if (error) {
        toast.error('Student not found');
        setScannedStudent(null);
        setShowAddStudentModal(true);
      } else if (student) {
        setScannedStudent(student);
        toast.success(`Found: ${student.name}`);
        await fetchWarnings(student.id);
      }
    } catch (error) {
      console.error('Error fetching student:', error);
      toast.error('Error looking up student');
    }
  };

  useEffect(() => {
    const handleKeyPress = async (e: KeyboardEvent) => {
      if (!isScanning) return;

      if (barcodeTimeout.current) {
        window.clearTimeout(barcodeTimeout.current);
      }

      if (e.key !== 'Enter') {
        barcodeBuffer.current += e.key;
      }

      barcodeTimeout.current = window.setTimeout(async () => {
        if (barcodeBuffer.current) {
          setBarcode(barcodeBuffer.current);
          await fetchStudentByBarcode(barcodeBuffer.current);
          barcodeBuffer.current = '';
          setIsScanning(false);
        }
      }, 100);
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      if (barcodeTimeout.current) {
        window.clearTimeout(barcodeTimeout.current);
      }
    };
  }, [isScanning]);

  useEffect(() => {
    if (barcode && !isScanning) {
      fetchStudentByBarcode(barcode);
    }
  }, [barcode]);

  const startScanning = () => {
    setIsScanning(true);
    barcodeBuffer.current = '';
    toast.success('Scanning mode activated');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-tmechs-forest hover:text-tmechs-forest/80"
          >
            <ArrowLeft className="h-6 w-6" />
            <span className="ml-1">Back</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Record Student Violation</h1>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setAutoPrint(!autoPrint)}
            className="flex items-center space-x-2 text-sm text-tmechs-forest hover:text-tmechs-forest/80"
          >
            {autoPrint ? (
              <ToggleRight className="h-6 w-6" />
            ) : (
              <ToggleLeft className="h-6 w-6" />
            )}
            <span>Auto Print {autoPrint ? 'On' : 'Off'}</span>
          </button>
          <button
            onClick={() => setShowBulkEntry(!showBulkEntry)}
            className="text-sm text-tmechs-forest hover:text-tmechs-forest/80"
          >
            {showBulkEntry ? 'Single Entry' : 'Bulk Entry'}
          </button>
        </div>
      </div>

      {showBulkEntry ? (
        <BulkViolationEntry />
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Student ID Barcode or Name
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                {barcode ? (
                  <div className="flex">
                    <input
                      type="text"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      className="pl-10 w-full rounded-l-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="Scan or enter student ID"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setBarcode('');
                        setScannedStudent(null);
                        setSearchQuery('');
                      }}
                      className="px-3 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md hover:bg-gray-200"
                    >
                      <X className="h-5 w-5 text-gray-500" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-full rounded-l-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="Search by student name..."
                    />
                    <div className="absolute inset-y-0 right-0 flex">
                      <button
                        type="button"
                        onClick={() => setShowScanner(true)}
                        className="px-3 bg-gray-100 border-y border-gray-300 hover:bg-gray-200"
                        title="Scan with camera"
                      >
                        <Camera className="h-5 w-5 text-gray-500" />
                      </button>
                      <button
                        type="button"
                        onClick={startScanning}
                        className={`px-3 border border-gray-300 rounded-r-md ${
                          isScanning ? 'bg-green-100 text-green-700' : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                        title="Scan with barcode scanner"
                      >
                        <Scan className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 animate-spin text-gray-400" />
                )}
              </div>
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-forest rounded-md shadow-lg border border-gray-200">
                  {searchResults.map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => selectStudent(student)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium">{student.name}</div>
                        <div className="text-sm text-gray-500">ID: {student.barcode}</div>
                      </div>
                      <div className="text-sm text-gray-500">
                        Grade {student.grade}
                      </div>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowAddStudentModal(true)}
                    className="w-full px-4 py-2 text-left hover:bg-tmechs-sage/10 flex items-center text-tmechs-forest"
                  >
                    <UserPlus className="h-5 w-5 mr-2" />
                    Add New Student
                  </button>
                </div>
              )}
              {scannedStudent && (
                <div className="mt-2 p-3 bg-tmechs-sage/10 rounded-md">
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-tmechs-forest mr-2" />
                    <div>
                      <p className="text-sm font-medium text-tmechs-forest">
                        {scannedStudent.name}
                      </p>
                      <p className="text-xs text-tmechs-forest/80">
                        Grade {scannedStudent.grade}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {isScanning && (
                <div className="mt-2 p-2 bg-green-50 rounded-md">
                  <p className="text-sm text-green-700">
                    Scanning mode active - Ready to scan student ID
                  </p>
                </div>
              )}
            </div>

            {warnings.length > 0 && (
              <div className="bg-yellow-50 rounded-md overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowWarnings(!showWarnings)}
                  className="w-full flex items-center justify-between p-4 text-left focus:outline-none"
                >
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-yellow-800 mr-2" />
                    <h3 className="text-sm font-medium text-yellow-800">
                      Previous Warnings ({warnings.length})
                    </h3>
                  </div>
                  {showWarnings ? (
                    <ChevronDown className="h-5 w-5 text-yellow-800" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-yellow-800" />
                  )}
                </button>
                
                {showWarnings && (
                  <div className="px-4 pb-4">
                    <div className="space-y-4">
                      {warningCounts.map((count, index) => (
                        <div key={index} className="flex justify-between items-center text-sm text-yellow-700">
                          <span>{count.violation_type}</span>
                          <span className="font-medium">
                            {count.count}/{WARNING_LIMIT} warnings
                          </span>
                        </div>
                      ))}
                      <div className="border-t border-yellow-200 pt-2 mt-2">
                        <div className="space-y-2">
                          {warnings.map((warning, index) => (
                            <div key={index} className="text-sm text-yellow-700">
                              <div className="flex justify-between items-center">
                                <span className="font-medium">
                                  {new Date(warning.issued_date).toLocaleDateString()}
                                </span>
                                <span className="text-yellow-600 text-xs">
                                  by {warning.teachers.name}
                                </span>
                              </div>
                              <p className="mt-0.5">{warning.violation_type}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-forest-700">
                  Violation Type
                </label>
                <button
                  type="button"
                  onClick={() => setShowCustomViolation(!showCustomViolation)}
                  className="text-sm text-tmechs-forest hover:text-tmechs-forest/80 flex items-center"
                >
                  {showCustomViolation ? (
                    <>
                      <X className="h-4 w-4 mr-1" />
                      Use preset violation
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-1" />
                      Add custom violation
                    </>
                  )}
                </button>
              </div>
              
              {showCustomViolation ? (
                <input
                  type="text"
                  value={customViolation}
                  onChange={(e) => setCustomViolation(e.target.value)}
                  className="w-full rounded-md border border-gray-300 shadow-sm focus:border-tmechs-forest focus:ring-1 focus:ring-tmechs-forest"
                  placeholder="Enter custom violation"
                />
              ) : (
                <select
                  value={selectedViolation}
                  onChange={(e) => setSelectedViolation(e.target.value)}
                  className="w-full rounded-md border border-gray-300 shadow-sm focus:border-tmechs-forest focus:ring-1 focus:ring-tmechs-forest"
                >
                  <option value="">Select violation type</option>
                  {DEFAULT_VIOLATIONS.map(violation => (
                    <option key={violation.id} value={violation.id}>
                      {violation.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isWarning}
                  onChange={(e) => {
                    setIsWarning(e.target.checked);
                    if (e.target.checked) {
                      setDetentionDate(null);
                    }
                  }}
                  className="rounded border-gray-300 text-tmechs-forest focus:ring-tmechs-forest"
                />
                <span className="text-sm text-gray-700">Issue Warning</span>
                <Shield className="h-4 w-4 text-tmechs-forest" />
              </label>
              {selectedViolation && warningCounts.find(w => w.violation_type === selectedViolation)?.count === WARNING_LIMIT && (
                <span className="text-sm text-red-600">
                  Warning limit reached for this violation type
                </span>
              )}
            </div>

            {!isWarning && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Detention Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <DatePicker
                    selected={detentionDate}
                    onChange={(date) => setDetentionDate(date)}
                    includeDates={availableDates}
                    placeholderText="Select detention date"
                    className="pl-10 w-full rounded-md border border-gray-300 shadow-sm focus:border-tmechs-forest focus:ring-1 focus:ring-tmechs-forest"
                    dateFormat="MMMM d, yyyy"
                    minDate={new Date()}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Only dates with available detention slots are selectable
                </p>
              </div>
            )}

            <div className="bg-tmechs-sage/10 p-4 rounded-md flex items-start">
              <AlertCircle className="text-tmechs-forest mt-1 mr-3" />
              <p className="text-sm text-tmechs-forest">
                {isWarning ? (
                  'A warning will be recorded and tracked. After 2 warnings of the same type, detention will be required.'
                ) : (
                  <>
                    An email will be automatically sent to the student with detention details once submitted.
                    {autoPrint && ' A detention label will be printed automatically.'}
                  </>
                )}
              </p>
            </div>

            <button
              type="submit"
              className="w-full btn-primary"
            >
              {isWarning ? 'Record Warning' : `Record Violation${autoPrint ? ' & Print Label' : ''}`}
            </button>
          </form>

          {lastViolation && !isWarning && (
            <div className="mt-4 p-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Last Recorded Violation</h3>
                {!autoPrint && (
                  <PrintManager
                    type="detention"
                    data={{
                      name: lastViolation.student_name,
                      barcode: lastViolation.student_barcode,
                      violation_type: lastViolation.violation_type,
                      detention_date: lastViolation.detention_date
                    }}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Student Modal */}
      {showAddStudentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <UserPlus className="h-5 w-5 mr-2" />
              Add New Student
            </h2>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const { data, error } = await supabase
                  .from('students')
                  .insert([newStudent])
                  .select()
                  .single();

                if (error) throw error;

                toast.success('Student added successfully');
                setShowAddStudentModal(false);
                setBarcode(data.barcode);
                setScannedStudent(data);
                
                setNewStudent({
                  name: '',
                  email: '',
                  barcode: '',
                  grade: 9,
                  parent_email: ''
                });
              } catch (error) {
                console.error('Error adding student:', error);
                toast.error('Failed to add student');
              }
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Student Name
                  </label>
                  <input
                    type="text"
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Student Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={newStudent.email}
                      onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                      className="pl-10 mt-1 block w-full rounded-md border border-gray-300"
                      placeholder="student@tmechs.edu"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Parent Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={newStudent.parent_email}
                      onChange={(e) => setNewStudent({ ...newStudent, parent_email: e.target.value })}
                      className="pl-10 mt-1 block w-full rounded-md border border-gray-300"
                      placeholder="parent@example.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Student ID
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={newStudent.barcode}
                      onChange={(e) => setNewStudent({ ...newStudent, barcode: e.target.value })}
                      className="pl-10 mt-1 block w-full rounded-md border border-gray-300"
                      placeholder="Enter student ID"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Grade Level
                  </label>
                  <select
                    value={newStudent.grade}
                    onChange={(e) => setNewStudent({ ...newStudent, grade: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-md border border-gray-300"
                  >
                    {[9, 10, 11, 12].map(grade => (
                      <option key={grade} value={grade}>Grade {grade}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex items-center"
                >
                  <UserPlus className="h-5 w-5 mr-2" />
                  Add Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Camera Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onScan={(barcode) => {
            setBarcode(barcode);
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}