import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Shield, User, Eye, EyeOff, LogIn, Search, Download, Filter, Users, RefreshCw, Database } from 'lucide-react';
import { apiRequest } from '../lib/queryClient';
import type { Candidate } from '@shared/schema';
import { getMockCandidates, MOCK_CANDIDATES_COUNT } from '../data/mockCandidates';

const AdminPage = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [searchFilter, setSearchFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Candidate[]>([]);
  const [useMockData, setUseMockData] = useState(true);
  const [mockCandidates, setMockCandidates] = useState<Candidate[]>(() => {
    try {
      // 🔥 IMMEDIATE LOADING: Load mock data synchronously on component init
      console.log('🔥 LOADING 50,000 CANDIDATES IMMEDIATELY ON COMPONENT INIT');
      const mockData = getMockCandidates();
      console.log(`🔥 LOADED ${mockData.length} CANDIDATES SYNCHRONOUSLY!`);
      console.log('First candidate sample:', mockData[0]);
      return mockData;
    } catch (error) {
      console.error('❌ Error loading mock data:', error);
      return [];
    }
  });

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
    refetchInterval: isLoggedIn ? 5000 : false, // Only refresh when logged in
    staleTime: 0, // Always consider data stale
    gcTime: 0 // Don't cache data
  });

  // EMERGENCY MOCK DATA LOADING - Multiple attempts  
  useEffect(() => {
    console.log('🚨 EMERGENCY MOCK DATA LOADING');
    console.log('Current mockCandidates length:', mockCandidates.length);
    
    // Force loading every time component mounts
    const attemptLoading = () => {
      try {
        console.log('Attempting to load mock candidates...');
        const mockData = getMockCandidates();
        if (mockData && mockData.length > 0) {
          setMockCandidates(mockData);
          console.log(`✅ SUCCESS: Loaded ${mockData.length} candidates`);
          console.log('Sample candidate:', mockData[0]);
        } else {
          console.error('❌ Mock data is empty or null');
        }
      } catch (error) {
        console.error('❌ Error in attemptLoading:', error);
      }
    };
    
    // Try immediately
    attemptLoading();
    
    // Try again after 100ms
    setTimeout(attemptLoading, 100);
    
    // Try again after 500ms  
    setTimeout(attemptLoading, 500);
  }, []);

  // PRIORITIZE mock data - ensure it's always included
  const allCandidates = useMockData 
    ? mockCandidates.length > 0 
      ? [...mockCandidates, ...candidates]  // Mock data first
      : candidates
    : candidates;

  // Initialize search results with all candidates when data is loaded
  useEffect(() => {
    console.log('Setting search results, candidates count:', allCandidates.length);
    setSearchResults(allCandidates);
  }, [allCandidates]);

  // Note: Auto-refresh is handled by React Query's refetchInterval

  // Enhanced debug logging with detailed info
  useEffect(() => {
    console.log('=== ADMIN DASHBOARD DEBUG ===');
    console.log('Real candidates from API:', candidates.length);
    console.log('Mock candidates loaded:', mockCandidates.length);
    console.log('All candidates total:', allCandidates.length);
    console.log('useMockData flag:', useMockData);
    console.log('Search results length:', searchResults.length);
    console.log('Query error:', queryError);
    console.log('Is loading:', isLoading);
    console.log('Mock candidates sample:', mockCandidates.slice(0, 2));
    console.log('================================');
    
    // Force update if mock data exists but search results are empty
    if (mockCandidates.length > 0 && searchResults.length === 0) {
      console.log('🔥 FORCING SEARCH RESULTS UPDATE WITH MOCK DATA');
      setSearchResults(mockCandidates);
    }
  }, [candidates, mockCandidates, allCandidates, queryError, isLoading, searchResults]);

  // Search mutation for individual candidates
  const searchMutation = useMutation({
    mutationFn: async ({ aadhar, mobile }: { aadhar?: string; mobile?: string }) => {
      return await apiRequest('/api/candidates/search', {
        method: 'POST',
        body: JSON.stringify({ aadhar, mobile })
      });
    },
    onSuccess: (data) => {
      setSearchResults([data]);
    },
    onError: () => {
      setSearchResults([]);
    }
  });

  // Admin credentials (in production, this would be handled securely)
  const ADMIN_USERNAME = 'admin';
  const ADMIN_PASSWORD = 'admin123';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (loginForm.username === ADMIN_USERNAME && loginForm.password === ADMIN_PASSWORD) {
      setIsLoggedIn(true);
      
      // 🔥 FORCE IMMEDIATE MOCK DATA LOADING ON LOGIN
      console.log('🔥 Admin login successful - forcing mock data load');
      if (useMockData && mockCandidates.length === 0) {
        const mockData = getMockCandidates();
        setMockCandidates(mockData);
        console.log(`🔥 LOADED ${mockData.length} MOCK CANDIDATES ON LOGIN!`);
      }
    } else {
      setLoginError('Invalid username or password');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchTerm.trim()) {
      setSearchResults(allCandidates);
      return;
    }

    if (searchFilter === 'aadhar' && !useMockData) {
      // Only use API search for real data
      searchMutation.mutate({ aadhar: searchTerm });
    } else if (searchFilter === 'mobile' && !useMockData) {
      // Only use API search for real data  
      searchMutation.mutate({ mobile: searchTerm });
    } else {
      // Search all fields locally (works for both real and mock data)
      const results = allCandidates.filter((candidate: Candidate) => 
        candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.aadhar.includes(searchTerm) ||
        candidate.mobile.includes(searchTerm) ||
        candidate.candidateId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.program?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.center?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSearchResults(results);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Enrolled':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const exportData = () => {
    const csvContent = [
      'Candidate ID,Name,DOB,Mobile,Aadhar,Program,Center,Status,Created',
      ...searchResults.map(candidate => [
        candidate.candidateId || '',
        candidate.name,
        candidate.dob,
        candidate.mobile,
        candidate.aadhar,
        candidate.program || '',
        candidate.center || '',
        candidate.status,
        candidate.createdAt ? new Date(candidate.createdAt).toLocaleDateString() : ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'candidates.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <Shield className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Admin Login</h2>
            <p className="text-gray-600">Access admin dashboard</p>
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
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Enter username"
                  required
                  data-testid="input-username"
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
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Enter password"
                  required
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              data-testid="button-login"
            >
              <LogIn className="w-5 h-5 mr-2 inline" />
              Login
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Demo credentials:</p>
            <p><strong>Username:</strong> admin</p>
            <p><strong>Password:</strong> admin123</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Admin Dashboard</h2>
            <p className="text-gray-600">
              Manage candidates and view training status 
              {useMockData && <span className="text-purple-600 font-medium ml-2">(Including {MOCK_CANDIDATES_COUNT.toLocaleString()} mock entries)</span>}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 lg:gap-4">
            <button
              onClick={() => setUseMockData(!useMockData)}
              className={`font-semibold py-2 px-4 rounded-lg transition-colors duration-200 ${
                useMockData 
                  ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                  : 'bg-orange-500 hover:bg-orange-600 text-white'
              }`}
              data-testid="button-toggle-mock-data"
            >
              <Database className="w-4 h-4 mr-2 inline" />
              {useMockData ? `Hide Mock Data (${MOCK_CANDIDATES_COUNT.toLocaleString()})` : `Load Mock Data (${MOCK_CANDIDATES_COUNT.toLocaleString()})`}
            </button>
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 inline ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={exportData}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
              data-testid="button-export"
            >
              <Download className="w-4 h-4 mr-2 inline" />
              Export CSV
            </button>
            <button
              onClick={() => setIsLoggedIn(false)}
              className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
              data-testid="button-logout"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-blue-50 p-6 rounded-lg">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <h3 className="text-2xl font-bold text-blue-800">
                  {(() => {
                    const total = allCandidates.length;
                    console.log('🔢 STATISTICS: Total candidates being displayed:', total);
                    console.log('🔢 allCandidates array:', allCandidates.slice(0, 2));
                    return total.toLocaleString();
                  })()}
                </h3>
                <p className="text-blue-600">Total Candidates</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 p-6 rounded-lg">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <h3 className="text-2xl font-bold text-green-800">
                  {allCandidates.filter(c => c.status === 'Completed').length.toLocaleString()}
                </h3>
                <p className="text-green-600">Completed</p>
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 p-6 rounded-lg">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-yellow-600" />
              <div className="ml-4">
                <h3 className="text-2xl font-bold text-yellow-800">
                  {allCandidates.filter(c => c.status === 'Enrolled').length.toLocaleString()}
                </h3>
                <p className="text-yellow-600">Enrolled</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-gray-600" />
              <div className="ml-4">
                <h3 className="text-2xl font-bold text-gray-800">
                  {allCandidates.filter(c => c.status === 'Not Enrolled').length.toLocaleString()}
                </h3>
                <p className="text-gray-600">Not Enrolled</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Filter
                </label>
                <select
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  data-testid="select-filter"
                >
                  <option value="all">All Fields</option>
                  <option value="aadhar">Aadhar Number</option>
                  <option value="mobile">Mobile Number</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Term
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search candidates..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  data-testid="input-search"
                />
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                type="submit"
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                data-testid="button-search"
              >
                <Search className="w-5 h-5 mr-2 inline" />
                Search
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSearchResults(candidates);
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                data-testid="button-reset"
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        {/* Results Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left p-4 font-semibold text-gray-700">Candidate ID</th>
                <th className="text-left p-4 font-semibold text-gray-700">Name</th>
                <th className="text-left p-4 font-semibold text-gray-700">Mobile</th>
                <th className="text-left p-4 font-semibold text-gray-700">Aadhar</th>
                <th className="text-left p-4 font-semibold text-gray-700">Program</th>
                <th className="text-left p-4 font-semibold text-gray-700">Status</th>
                <th className="text-left p-4 font-semibold text-gray-700">Created</th>
              </tr>
            </thead>
            <tbody>
              {searchResults.map((candidate) => (
                <tr key={candidate.id} className="border-b border-gray-200 hover:bg-gray-50" data-testid={`row-candidate-${candidate.id}`}>
                  <td className="p-4 font-mono text-blue-600" data-testid={`text-candidate-id-${candidate.id}`}>
                    {candidate.id || 'N/A'}
                  </td>
                  <td className="p-4 font-medium" data-testid={`text-name-${candidate.id}`}>{candidate.name}</td>
                  <td className="p-4" data-testid={`text-mobile-${candidate.id}`}>{candidate.mobile}</td>
                  <td className="p-4 font-mono" data-testid={`text-aadhar-${candidate.id}`}>
                    {candidate.aadhar.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3')}
                  </td>
                  <td className="p-4" data-testid={`text-program-${candidate.id}`}>{candidate.program || 'Not Assigned'}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(candidate.status)}`} data-testid={`status-${candidate.id}`}>
                      {candidate.status}
                    </span>
                  </td>
                  <td className="p-4 text-gray-600" data-testid={`text-created-${candidate.id}`}>
                    {candidate.createdAt ? new Date(candidate.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {searchResults.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No candidates found matching your search criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;