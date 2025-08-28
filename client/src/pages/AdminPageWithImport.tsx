import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, User, Eye, EyeOff, LogIn, Search, Download, Filter, Users, RefreshCw, Trash2, AlertTriangle, Camera, Edit, Calendar, Award, Upload, FileSpreadsheet } from 'lucide-react';
import { apiRequest } from '../lib/queryClient';
import type { Candidate } from '@shared/schema';
import CandidateEditModal from '../components/CandidateEditModal';

const AdminPage = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [searchFilter, setSearchFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [statusSearchTerm, setStatusSearchTerm] = useState('');
  const [statusSearchResult, setStatusSearchResult] = useState<Candidate | null>(null);
  const [statusSearchLoading, setStatusSearchLoading] = useState(false);
  const [statusSearchError, setStatusSearchError] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'status' | 'import'>('dashboard');
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);

  const queryClient = useQueryClient();

  // Fetch all candidates when logged in with auto-refresh
  const { data: candidates = [], isLoading, error: queryError, refetch } = useQuery<Candidate[]>({
    queryKey: ['/api/candidates'],
    queryFn: async () => {
      return await apiRequest('/api/candidates');
    },
    enabled: isLoggedIn,
    retry: false,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: isLoggedIn ? 5000 : false,
    staleTime: 0,
    gcTime: 0
  });

  // Delete candidate mutation
  const deleteMutation = useMutation({
    mutationFn: async (candidateId: number) => {
      return await apiRequest(`/api/candidates/${candidateId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      setDeleteConfirm(null);
    },
    onError: (error: any) => {
      console.error('Delete failed:', error);
    }
  });

  // Bulk import mutation
  const importMutation = useMutation({
    mutationFn: async (candidates: any[]) => {
      return await apiRequest('/api/candidates/bulk-import', {
        method: 'POST',
        body: JSON.stringify({ candidates })
      });
    },
    onSuccess: (data) => {
      setImportResults(data);
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      setImporting(false);
    },
    onError: (error: any) => {
      console.error('Import failed:', error);
      setImporting(false);
    }
  });

  // Search mutation for individual candidates
  const searchMutation = useMutation({
    mutationFn: async ({ aadhar, mobile }: { aadhar?: string; mobile?: string }) => {
      return await apiRequest('/api/candidates/search', {
        method: 'POST',
        body: JSON.stringify({ aadhar, mobile })
      });
    }
  });

  // Filter candidates based on search term and filter
  const filteredCandidates = useMemo(() => {
    if (!candidates) return [];
    
    let filtered = candidates;
    
    // Apply status filter
    if (searchFilter !== 'all') {
      filtered = filtered.filter(candidate => 
        candidate.status.toLowerCase().replace(' ', '') === searchFilter
      );
    }
    
    // Apply search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(candidate =>
        candidate.name.toLowerCase().includes(term) ||
        candidate.candidateId.toLowerCase().includes(term) ||
        candidate.mobile.includes(term) ||
        candidate.aadhar.includes(term) ||
        (candidate.location && candidate.location.toLowerCase().includes(term))
      );
    }
    
    return filtered;
  }, [candidates, searchFilter, searchTerm]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loginForm.username === 'admin' && loginForm.password === 'admin123') {
      setIsLoggedIn(true);
      setLoginError('');
    } else {
      setLoginError('Invalid credentials');
    }
  };

  const handleDelete = (candidateId: number) => {
    deleteMutation.mutate(candidateId);
  };

  const handleStatusSearch = async () => {
    if (!statusSearchTerm.trim()) {
      setStatusSearchError('Please enter Aadhar number or mobile number');
      return;
    }

    setStatusSearchLoading(true);
    setStatusSearchError('');
    setStatusSearchResult(null);

    try {
      let result;
      if (statusSearchTerm.length === 12 && /^\d+$/.test(statusSearchTerm)) {
        // Search by Aadhar if 12 digits
        result = await searchMutation.mutateAsync({ aadhar: statusSearchTerm });
      } else if (statusSearchTerm.length === 10 && /^\d+$/.test(statusSearchTerm)) {
        // Search by mobile if 10 digits
        result = await searchMutation.mutateAsync({ mobile: statusSearchTerm });
      } else {
        throw new Error('Invalid format. Enter 12-digit Aadhar or 10-digit mobile number');
      }
      
      setStatusSearchResult(result);
    } catch (error: any) {
      setStatusSearchError(error.message || 'Candidate not found');
    } finally {
      setStatusSearchLoading(false);
    }
  };

  const handleExcelImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      alert('Please select an Excel file (.xlsx or .xls)');
      return;
    }

    setImporting(true);
    setImportResults(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error('Could not read file');

        // Import XLSX library dynamically
        const XLSX = await import('xlsx');
        
        // Parse the Excel file
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) {
          throw new Error('No data found in Excel file');
        }

        // Map Excel data to our candidate format
        const candidates = jsonData.map((row: any) => {
          // Convert dates to strings
          let dob = row['Date of Birth'] || '';
          if (dob && typeof dob === 'number') {
            // Excel date number to JS date
            const date = new Date((dob - 25569) * 86400 * 1000);
            dob = date.toISOString().split('T')[0];
          } else if (dob) {
            dob = new Date(dob).toISOString().split('T')[0];
          }

          let assessmentDate = row['Assessment Date'] || '';
          if (assessmentDate && typeof assessmentDate === 'number') {
            const date = new Date((assessmentDate - 25569) * 86400 * 1000);
            assessmentDate = date.toISOString().split('T')[0];
          } else if (assessmentDate) {
            assessmentDate = new Date(assessmentDate).toISOString().split('T')[0];
          }

          let licenseExpiry = row['LICENSE EXPIRY DATE'] || '';
          if (licenseExpiry && typeof licenseExpiry === 'number') {
            const date = new Date((licenseExpiry - 25569) * 86400 * 1000);
            licenseExpiry = date.toISOString().split('T')[0];
          } else if (licenseExpiry) {
            licenseExpiry = new Date(licenseExpiry).toISOString().split('T')[0];
          }

          return {
            srNo: String(row['Sr No'] || ''),
            location: String(row['Location'] || ''),
            name: String(row['NAME'] || ''),
            aadhar: String(row['Aadharno'] || '').replace(/[^0-9]/g, ''),
            dob,
            gender: String(row['Gender'] || ''),
            religion: String(row['Religion'] || ''),
            vulnerability: String(row['Vulnerability'] || ''),
            annualIncome: String(row['Annual Income'] || ''),
            educationalQualification: String(row['Educational Qualification'] || ''),
            mobile: String(row['Contact no of Trainee'] || '').replace(/[^0-9]/g, ''),
            assessmentDate,
            dlNo: String(row['DL No'] || ''),
            dlType: String(row['DL Type'] || ''),
            licenseExpiryDate: licenseExpiry,
            dependentFamilyMembers: String(row['No. Of Dependent Family Members'] || ''),
            ownerDriver: String(row['Owner / Driver'] || ''),
            abhaNo: String(row['ABHA noNO'] || ''),
            jobRole: String(row['Job Role'] || ''),
            jobCode: String(row['Job code'] || ''),
            emailAddress: String(row['Email Address of Trainee'] || ''),
            youTube: String(row['You Tube'] || 'No'),
            facebook: String(row['Facebook'] || 'No'),
            instagram: String(row['Instagram'] || 'No'),
            ekycStatus: String(row['EKYC STATUS'] || ''),
            personalEmailAddress: String(row['Email Address of Trainee.1'] || ''),
            trained: false,
            status: 'Enrolled'
          };
        });

        console.log(`Parsed ${candidates.length} candidates from Excel`);
        
        // Send to bulk import API
        await importMutation.mutateAsync(candidates);
        
      } catch (error: any) {
        console.error('Import error:', error);
        alert(`Import failed: ${error.message}`);
        setImporting(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const exportToCsv = () => {
    if (!candidates || candidates.length === 0) {
      alert('No data to export');
      return;
    }

    // Create CSV headers
    const headers = [
      'Sr No', 'Candidate ID', 'Name', 'Location', 'Aadhar', 'DOB', 'Gender', 'Religion',
      'Category', 'Annual Income', 'Education', 'Mobile', 'Assessment Date', 'DL No',
      'DL Type', 'License Expiry', 'Dependents', 'Owner/Driver', 'ABHA No', 'Job Role',
      'Job Code', 'Email', 'Personal Email', 'YouTube', 'Facebook', 'Instagram',
      'EKYC Status', 'Status', 'Created At'
    ];

    // Create CSV rows
    const rows = candidates.map(candidate => [
      candidate.srNo || '',
      candidate.candidateId,
      candidate.name,
      candidate.location || '',
      candidate.aadhar,
      candidate.dob,
      candidate.gender || '',
      candidate.religion || '',
      candidate.vulnerability || '',
      candidate.annualIncome || '',
      candidate.educationalQualification || '',
      candidate.mobile,
      candidate.assessmentDate || '',
      candidate.dlNo || '',
      candidate.dlType || '',
      candidate.licenseExpiryDate || '',
      candidate.dependentFamilyMembers || '',
      candidate.ownerDriver || '',
      candidate.abhaNo || '',
      candidate.jobRole || '',
      candidate.jobCode || '',
      candidate.emailAddress || '',
      candidate.personalEmailAddress || '',
      candidate.youTube || '',
      candidate.facebook || '',
      candidate.instagram || '',
      candidate.ekycStatus || '',
      candidate.status,
      candidate.createdAt ? new Date(candidate.createdAt).toLocaleDateString() : ''
    ]);

    // Create CSV content
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `candidates_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (!isLoggedIn) {
    return (
      <div 
        className="min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center"
        style={{
          backgroundImage: `url('/images/Adminlogin.jpg')`
        }}
      >
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <Shield className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900">Admin Portal</h1>
            <p className="text-gray-600 mt-2">Training Management System</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginForm.password}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                <span className="text-red-700">{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <LogIn className="w-5 h-5 mr-2" />
              Login to Admin Panel
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Demo Credentials:</p>
            <p className="font-mono">Username: admin | Password: admin123</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url('/images/Verification.jpg')`
      }}
    >
      <div className="min-h-screen bg-gradient-to-br from-green-50/90 via-white/95 to-blue-50/90">
        <div className="container mx-auto px-4 py-6">
          <div className="bg-white rounded-xl shadow-lg">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Shield className="w-8 h-8 mr-3" />
                  <div>
                    <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                    <p className="text-green-100">Training Management System</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-green-100">Welcome, Admin</span>
                  <button
                    onClick={() => setIsLoggedIn(false)}
                    className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm ${
                    activeTab === 'dashboard'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Users className="w-5 h-5 inline mr-2" />
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('status')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm ${
                    activeTab === 'status'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Search className="w-5 h-5 inline mr-2" />
                  Status Check
                </button>
                <button
                  onClick={() => setActiveTab('import')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm ${
                    activeTab === 'import'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Upload className="w-5 h-5 inline mr-2" />
                  Import Data
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'dashboard' && (
              <div className="p-6">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg">
                    <div className="flex items-center">
                      <Users className="w-8 h-8 mr-3" />
                      <div>
                        <p className="text-blue-100">Total Candidates</p>
                        <p className="text-2xl font-bold">{candidates.length}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg">
                    <div className="flex items-center">
                      <Award className="w-8 h-8 mr-3" />
                      <div>
                        <p className="text-green-100">Enrolled</p>
                        <p className="text-2xl font-bold">
                          {candidates.filter(c => c.status === 'Enrolled').length}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg">
                    <div className="flex items-center">
                      <Calendar className="w-8 h-8 mr-3" />
                      <div>
                        <p className="text-purple-100">Completed</p>
                        <p className="text-2xl font-bold">
                          {candidates.filter(c => c.status === 'Completed').length}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-lg">
                    <div className="flex items-center">
                      <AlertTriangle className="w-8 h-8 mr-3" />
                      <div>
                        <p className="text-orange-100">Not Enrolled</p>
                        <p className="text-2xl font-bold">
                          {candidates.filter(c => c.status === 'Not Enrolled').length}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col lg:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        placeholder="Search by name, ID, mobile, or Aadhar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <select
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Status</option>
                      <option value="enrolled">Enrolled</option>
                      <option value="completed">Completed</option>
                      <option value="notenrolled">Not Enrolled</option>
                    </select>

                    <button
                      onClick={() => refetch()}
                      disabled={isLoading}
                      className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                    >
                      <RefreshCw className={`w-5 h-5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>

                    <button
                      onClick={exportToCsv}
                      className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                    >
                      <Download className="w-5 h-5 mr-2" />
                      Export CSV
                    </button>
                  </div>
                </div>

                {/* Candidates Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Photo
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Candidate Details
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Contact & Location
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Training Info
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredCandidates.map((candidate) => (
                          <tr key={candidate.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              {candidate.profileImage ? (
                                <img
                                  src={candidate.profileImage}
                                  alt={candidate.name}
                                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                                />
                              ) : (
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
                                  <User className="w-10 h-10 text-white" />
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">{candidate.name}</div>
                              <div className="text-sm text-gray-500">ID: {candidate.candidateId}</div>
                              <div className="text-sm text-gray-500">Aadhar: {candidate.aadhar}</div>
                              <div className="text-sm text-gray-500">DOB: {candidate.dob}</div>
                              {candidate.gender && (
                                <div className="text-sm text-gray-500">Gender: {candidate.gender}</div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">📱 {candidate.mobile}</div>
                              {candidate.location && (
                                <div className="text-sm text-gray-500">📍 {candidate.location}</div>
                              )}
                              {candidate.emailAddress && (
                                <div className="text-sm text-gray-500">✉️ {candidate.emailAddress}</div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {candidate.jobRole && (
                                <div className="text-sm text-gray-900">{candidate.jobRole}</div>
                              )}
                              {candidate.dlType && (
                                <div className="text-sm text-gray-500">DL: {candidate.dlType}</div>
                              )}
                              {candidate.assessmentDate && (
                                <div className="text-sm text-gray-500">Assessment: {candidate.assessmentDate}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                candidate.status === 'Completed' 
                                  ? 'bg-green-100 text-green-800'
                                  : candidate.status === 'Enrolled'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {candidate.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => {
                                    console.log('Edit clicked for:', candidate.name);
                                    setEditingCandidate(candidate);
                                  }}
                                  className="text-blue-600 hover:text-blue-900"
                                  title="Edit candidate"
                                >
                                  <Edit className="w-5 h-5" />
                                </button>
                                {deleteConfirm === candidate.id ? (
                                  <div className="flex space-x-1">
                                    <button
                                      onClick={() => handleDelete(candidate.id)}
                                      className="text-red-600 hover:text-red-900 text-xs px-2 py-1 bg-red-100 rounded"
                                    >
                                      Confirm
                                    </button>
                                    <button
                                      onClick={() => setDeleteConfirm(null)}
                                      className="text-gray-600 hover:text-gray-900 text-xs px-2 py-1 bg-gray-100 rounded"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setDeleteConfirm(candidate.id)}
                                    className="text-red-600 hover:text-red-900"
                                    title="Delete candidate"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {filteredCandidates.length === 0 && (
                    <div className="text-center py-12">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No candidates found matching your criteria</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'status' && (
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Candidate Status Check</h2>
                
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                  <div className="flex gap-4 mb-4">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Enter 12-digit Aadhar or 10-digit mobile number"
                        value={statusSearchTerm}
                        onChange={(e) => setStatusSearchTerm(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={handleStatusSearch}
                      disabled={statusSearchLoading}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                    >
                      {statusSearchLoading ? (
                        <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <Search className="w-5 h-5 mr-2" />
                      )}
                      Search
                    </button>
                  </div>

                  {statusSearchError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-center">
                      <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                      <span className="text-red-700">{statusSearchError}</span>
                    </div>
                  )}

                  {statusSearchResult && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-green-900 mb-4">Candidate Found</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p><strong>Name:</strong> {statusSearchResult.name}</p>
                          <p><strong>Candidate ID:</strong> {statusSearchResult.candidateId}</p>
                          <p><strong>Mobile:</strong> {statusSearchResult.mobile}</p>
                          <p><strong>Aadhar:</strong> {statusSearchResult.aadhar}</p>
                        </div>
                        <div>
                          <p><strong>Status:</strong> 
                            <span className={`ml-2 px-2 py-1 rounded text-sm ${
                              statusSearchResult.status === 'Completed' 
                                ? 'bg-green-100 text-green-800'
                                : statusSearchResult.status === 'Enrolled'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {statusSearchResult.status}
                            </span>
                          </p>
                          {statusSearchResult.location && (
                            <p><strong>Location:</strong> {statusSearchResult.location}</p>
                          )}
                          {statusSearchResult.jobRole && (
                            <p><strong>Job Role:</strong> {statusSearchResult.jobRole}</p>
                          )}
                          <p><strong>Created:</strong> {new Date(statusSearchResult.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'import' && (
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Import Excel Data</h2>
                
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                  <div className="text-center py-8">
                    <FileSpreadsheet className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Excel File</h3>
                    <p className="text-gray-600 mb-6">
                      Select an Excel file (.xlsx or .xls) containing candidate data to import
                    </p>
                    
                    <label className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
                      <Upload className="w-5 h-5 mr-2" />
                      {importing ? 'Importing...' : 'Choose Excel File'}
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleExcelImport}
                        className="hidden"
                        disabled={importing}
                      />
                    </label>
                  </div>

                  {importResults && (
                    <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <h4 className="text-lg font-semibold text-green-900 mb-2">Import Results</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{importResults.imported}</div>
                          <div className="text-sm text-green-700">Successfully Imported</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">{importResults.errorCount || importResults.errors || 0}</div>
                          <div className="text-sm text-red-700">Errors</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {importResults.imported + (importResults.errorCount || importResults.errors || 0)}
                          </div>
                          <div className="text-sm text-blue-700">Total Processed</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-md font-semibold text-blue-900 mb-2">Expected Excel Format</h4>
                    <p className="text-sm text-blue-700 mb-2">
                      Your Excel file should contain the following columns:
                    </p>
                    <div className="text-xs text-blue-600 grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div>• Sr No</div>
                      <div>• Location</div>
                      <div>• NAME</div>
                      <div>• Aadharno</div>
                      <div>• Date of Birth</div>
                      <div>• Gender</div>
                      <div>• Religion</div>
                      <div>• Vulnerability</div>
                      <div>• Annual Income</div>
                      <div>• Educational Qualification</div>
                      <div>• Contact no of Trainee</div>
                      <div>• Assessment Date</div>
                      <div>• DL No</div>
                      <div>• DL Type</div>
                      <div>• LICENSE EXPIRY DATE</div>
                      <div>• No. Of Dependent Family Members</div>
                      <div>• Owner / Driver</div>
                      <div>• ABHA noNO</div>
                      <div>• Job Role</div>
                      <div>• Job code</div>
                      <div>• Email Address of Trainee</div>
                      <div>• You Tube</div>
                      <div>• Facebook</div>
                      <div>• Instagram</div>
                      <div>• EKYC STATUS</div>
                      <div>• Email Address of Trainee.1</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {editingCandidate && (
        <CandidateEditModal
          candidate={editingCandidate}
          isOpen={!!editingCandidate}
          onClose={() => setEditingCandidate(null)}
        />
      )}
    </div>
  );
};

export default AdminPage;