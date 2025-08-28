import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, User, Eye, EyeOff, LogIn, Search, Download, Filter, Users, RefreshCw, Trash2, AlertTriangle, Camera, Edit, Calendar, Award } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'status'>('dashboard');
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);

  const queryClient = useQueryClient();

  // Fetch all candidates when logged in with auto-refresh (FIXED infinite update)
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

  // Search mutation for individual candidates
  const searchMutation = useMutation({
    mutationFn: async ({ aadhar, mobile }: { aadhar?: string; mobile?: string }) => {
      return await apiRequest('/api/candidates/search', {
        method: 'POST',
        body: JSON.stringify({ aadhar, mobile })
      });
    }
  });

  // Filter candidates based on search term and filter (FIXED - using useMemo to prevent infinite updates)
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
        (candidate.jobRole && candidate.jobRole.toLowerCase().includes(term)) ||
        (candidate.location && candidate.location.toLowerCase().includes(term))
      );
    }
    
    return filtered;
  }, [candidates, searchFilter, searchTerm]);

  const ADMIN_USERNAME = 'admin';
  const ADMIN_PASSWORD = 'admin123';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (loginForm.username === ADMIN_USERNAME && loginForm.password === ADMIN_PASSWORD) {
      setIsLoggedIn(true);
    } else {
      setLoginError('Invalid username or password');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setLoginForm({ username: '', password: '' });
    setSearchFilter('all');
    setSearchTerm('');
  };

  const handleDeleteCandidate = (candidateId: number) => {
    setDeleteConfirm(candidateId);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteMutation.mutate(deleteConfirm);
    }
  };

  const handleStatusSearch = async () => {
    if (!statusSearchTerm.trim()) return;
    
    setStatusSearchLoading(true);
    setStatusSearchError('');
    setStatusSearchResult(null);

    try {
      const searchValue = statusSearchTerm.trim();
      
      // Determine if it's Aadhar (12 digits) or mobile (10 digits)
      const isAadhar = /^\d{12}$/.test(searchValue);
      const isMobile = /^\d{10}$/.test(searchValue);
      
      const searchBody = isAadhar ? { aadhar: searchValue } : 
                        isMobile ? { mobile: searchValue } :
                        { aadhar: searchValue }; // Default to aadhar search for any other format
      
      const response = await apiRequest('/api/candidates/search', {
        method: 'POST',
        body: JSON.stringify(searchBody)
      });
      
      setStatusSearchResult(response);
    } catch (error: any) {
      if (error.message?.includes('not found') || error.message?.includes('404')) {
        setStatusSearchError('Candidate not found with this Aadhar number or mobile number');
      } else {
        setStatusSearchError('Error searching for candidate. Please try again.');
      }
    } finally {
      setStatusSearchLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!filteredCandidates.length) return;

    const headers = ['Candidate ID', 'Name', 'DOB', 'Mobile', 'Aadhar', 'Job Role', 'Location', 'Email', 'Status', 'Trained', 'Created At'];
    const csvContent = [
      headers.join(','),
      ...filteredCandidates.map(candidate => [
        candidate.candidateId,
        `"${candidate.name}"`,
        candidate.dob,
        candidate.mobile,
        candidate.aadhar,
        `"${candidate.jobRole || ''}"`,
        `"${candidate.location || ''}"`,
        `"${candidate.emailAddress || ''}"`,
        candidate.status,
        candidate.trained ? 'Yes' : 'No',
        new Date(candidate.createdAt).toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `candidates_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Enrolled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'Not Enrolled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen py-8 flex items-center justify-center relative" style={{backgroundImage: 'url(/images/Adminlogin.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat'}}>
        <div className="w-full max-w-md mx-auto px-4 relative z-10">
          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Shield className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-green-500 to-green-700 bg-clip-text text-transparent mb-2">
                Admin Panel
              </h1>
              <p className="text-gray-600">Secure access to candidate management</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={loginForm.username}
                    onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent"
                    placeholder="Enter username"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent"
                    placeholder="Enter password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-700">{loginError}</p>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 flex items-center justify-center"
              >
                <LogIn className="w-5 h-5 mr-2" />
                Login to Admin Panel
              </button>
            </form>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Demo Credentials:</strong>
              </p>
              <p className="text-sm text-blue-600">Username: admin</p>
              <p className="text-sm text-blue-600">Password: admin123</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 relative" style={{backgroundImage: 'url(/images/Verification.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat'}}>
      <div className="container mx-auto px-4 relative z-10">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 p-6">
          
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-8 pb-6 border-b border-gray-200">
            <div className="mb-4 lg:mb-0">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-green-500 to-green-700 bg-clip-text text-transparent">
                    Admin Dashboard
                  </h1>
                  <p className="text-gray-600">Manage candidates and training programs</p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                    activeTab === 'dashboard' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('status')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                    activeTab === 'status' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Status Check
                </button>
              </div>
              <button
                onClick={() => refetch()}
                disabled={isLoading}
                className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={exportToCSV}
                disabled={!filteredCandidates.length}
                className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'dashboard' && (
            <>
              {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Candidates</p>
                  <p className="text-3xl font-bold">{candidates.length}</p>
                </div>
                <Users className="w-8 h-8 text-blue-200" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Completed</p>
                  <p className="text-3xl font-bold">{candidates.filter(c => c.status === 'Completed').length}</p>
                </div>
                <Shield className="w-8 h-8 text-green-200" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Enrolled</p>
                  <p className="text-3xl font-bold">{candidates.filter(c => c.status === 'Enrolled').length}</p>
                </div>
                <Users className="w-8 h-8 text-blue-200" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-gray-500 to-gray-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-100 text-sm">Not Enrolled</p>
                  <p className="text-3xl font-bold">{candidates.filter(c => c.status === 'Not Enrolled').length}</p>
                </div>
                <Filter className="w-8 h-8 text-gray-200" />
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name, ID, mobile, Aadhar, or program..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="lg:w-64">
                <select
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="enrolled">Enrolled</option>
                  <option value="completed">Completed</option>
                  <option value="notenrolled">Not Enrolled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Candidates Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-slate-600" />
                <p className="text-gray-600">Loading candidates...</p>
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">No candidates found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Photo</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Info</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCandidates.map((candidate) => (
                      <tr key={candidate.id} className="hover:bg-gray-50 transition-colors duration-200">
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center">
                            {candidate.profileImage ? (
                              <img 
                                src={candidate.profileImage} 
                                alt={candidate.name}
                                className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 shadow-sm"
                              />
                            ) : (
                              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center border-2 border-gray-200">
                                <User className="w-10 h-10 text-green-600" />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-gray-900">{candidate.name}</div>
                            <div className="text-sm text-gray-500">ID: {candidate.candidateId}</div>
                            <div className="text-sm text-gray-500">DOB: {candidate.dob}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{candidate.mobile}</div>
                          <div className="text-sm text-gray-500">{candidate.aadhar}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{candidate.jobRole || 'No job role'}</div>
                          <div className="text-sm text-gray-500">{candidate.location || 'No location'}</div>
                          <div className="text-sm text-gray-500">{candidate.emailAddress || 'No email'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(candidate.status)}`}>
                            {candidate.status}
                          </span>
                          {candidate.trained && (
                            <div className="text-xs text-green-600 mt-1">Training Completed</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setEditingCandidate(candidate)}
                              className="text-blue-600 hover:text-blue-900 transition-colors duration-200 p-2 hover:bg-blue-50 rounded-lg"
                              title="Edit Candidate"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCandidate(candidate.id)}
                              className="text-red-600 hover:text-red-900 transition-colors duration-200 p-2 hover:bg-red-50 rounded-lg"
                              title="Delete Candidate"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
            </>
          )}

          {/* Status Check Tab */}
          {activeTab === 'status' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Search className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Status Check</h2>
                <p className="text-gray-600">Search for candidates by Aadhar number or mobile number</p>
              </div>

              <div className="max-w-md mx-auto mb-8">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={statusSearchTerm}
                    onChange={(e) => setStatusSearchTerm(e.target.value)}
                    placeholder="Enter Aadhar number or mobile number"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent"
                    onKeyPress={(e) => e.key === 'Enter' && handleStatusSearch()}
                  />
                  <button
                    onClick={handleStatusSearch}
                    disabled={statusSearchLoading || !statusSearchTerm.trim()}
                    className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 flex items-center"
                  >
                    {statusSearchLoading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Search className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {statusSearchError && (
                <div className="max-w-md mx-auto mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {statusSearchError}
                </div>
              )}

              {statusSearchResult && (
                <div className="max-w-2xl mx-auto bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6">
                  <div className="flex items-center mb-4">
                    {statusSearchResult.profileImage ? (
                      <img 
                        src={statusSearchResult.profileImage} 
                        alt={statusSearchResult.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-green-200 shadow-sm mr-4"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                        <User className="w-6 h-6 text-green-600" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800">{statusSearchResult.name}</h3>
                      <p className="text-sm text-gray-600">ID: {statusSearchResult.candidateId}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Date of Birth</p>
                      <p className="font-medium text-gray-800">{statusSearchResult.dob}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Mobile</p>
                      <p className="font-medium text-gray-800">{statusSearchResult.mobile}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Aadhar</p>
                      <p className="font-medium text-gray-800">{statusSearchResult.aadhar}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(statusSearchResult.status)}`}>
                        {statusSearchResult.status}
                      </span>
                    </div>
                    {statusSearchResult.jobRole && (
                      <div>
                        <p className="text-sm text-gray-600">Job Role</p>
                        <p className="font-medium text-gray-800">{statusSearchResult.jobRole}</p>
                      </div>
                    )}
                    {statusSearchResult.location && (
                      <div>
                        <p className="text-sm text-gray-600">Location</p>
                        <p className="font-medium text-gray-800">{statusSearchResult.location}</p>
                      </div>
                    )}
                    {statusSearchResult.emailAddress && (
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-medium text-gray-800">{statusSearchResult.emailAddress}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deleteConfirm && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Delete Candidate</h3>
                    <p className="text-sm text-gray-600">This action cannot be undone</p>
                  </div>
                </div>
                
                <p className="text-gray-700 mb-6">
                  Are you sure you want to delete this candidate? All their data will be permanently removed.
                </p>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={deleteMutation.isPending}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50"
                  >
                    {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
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