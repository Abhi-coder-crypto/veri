import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Search, User, BookOpen, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { apiRequest } from '../lib/queryClient';
import type { Candidate } from '@shared/schema';

const StatusPage: React.FC = () => {
  const [searchType, setSearchType] = useState<'aadhar' | 'mobile'>('aadhar');
  const [searchValue, setSearchValue] = useState('');
  const [searchResults, setSearchResults] = useState<Candidate | null>(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  // Mutation for searching candidates
  const searchMutation = useMutation({
    mutationFn: async ({ aadhar, mobile }: { aadhar?: string; mobile?: string }) => {
      return await apiRequest('/api/candidates/search', {
        method: 'POST',
        body: JSON.stringify({ aadhar, mobile })
      });
    },
    onSuccess: (data) => {
      setSearchResults(data);
      setSearched(true);
    },
    onError: (error: any) => {
      setSearchResults(null);
      setSearched(true);
      setError(error.message || 'Candidate not found');
    }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!searchValue.trim()) {
      setError('Please enter a search value');
      return;
    }

    if (searchType === 'aadhar' && searchValue.length !== 12) {
      setError('Aadhar number must be 12 digits');
      return;
    }

    if (searchType === 'mobile' && searchValue.length !== 10) {
      setError('Mobile number must be 10 digits');
      return;
    }

    searchMutation.mutate({
      aadhar: searchType === 'aadhar' ? searchValue : undefined,
      mobile: searchType === 'mobile' ? searchValue : undefined
    });
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'Enrolled':
        return <Clock className="w-5 h-5 text-blue-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen py-8 bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Search className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
              Training Status Check
            </h2>
            <p className="text-gray-600 text-lg">Search by Aadhar number or mobile number to check training status</p>
          </div>

          {/* Search Form */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search By
                </label>
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value as 'aadhar' | 'mobile')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="aadhar">Aadhar Number</option>
                  <option value="mobile">Mobile Number</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {searchType === 'aadhar' ? 'Aadhar Number' : 'Mobile Number'}
                </label>
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder={searchType === 'aadhar' ? 'Enter 12-digit Aadhar number' : 'Enter 10-digit mobile number'}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={searchType === 'aadhar' ? 12 : 10}
                />
              </div>
            </div>

            <div className="text-center">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200"
              >
                <Search className="w-5 h-5 mr-2 inline" />
                Search Status
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          )}
        </div>

        {/* Search Results */}
        {searched && (
          <div className="mb-8">
            {searchResults ? (
              <div className="bg-white border rounded-lg shadow-sm p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mr-4">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800">{searchResults.name}</h3>
                      <p className="text-gray-600">Candidate ID: {searchResults.id}</p>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-full border font-semibold flex items-center ${getStatusColor(searchResults.status)}`}>
                    {getStatusIcon(searchResults.status)}
                    <span className="ml-2">{searchResults.status}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-800 flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      Personal Information
                    </h4>
                    <div className="pl-6 space-y-2">
                      <p><span className="font-medium">Date of Birth:</span> {new Date(searchResults.dob).toLocaleDateString()}</p>
                      <p><span className="font-medium">Mobile:</span> {searchResults.mobile}</p>
                      <p><span className="font-medium">Aadhar:</span> {searchResults.aadhar}</p>
                      {searchResults.address && (
                        <p><span className="font-medium">Address:</span> {searchResults.address}</p>
                      )}
                    </div>
                  </div>

                  {searchResults.program && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-800 flex items-center">
                        <BookOpen className="w-4 h-4 mr-2" />
                        Training Information
                      </h4>
                      <div className="pl-6 space-y-2">
                        <p><span className="font-medium">Program:</span> {searchResults.program}</p>
                        {searchResults.center && (
                          <p><span className="font-medium">Center:</span> {searchResults.center}</p>
                        )}
                        {searchResults.trainer && (
                          <p><span className="font-medium">Trainer:</span> {searchResults.trainer}</p>
                        )}
                        {searchResults.duration && (
                          <p><span className="font-medium">Duration:</span> {searchResults.duration}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-6 rounded-lg text-center">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                <h3 className="font-semibold mb-2">No Record Found</h3>
                <p>No candidate found with the provided {searchType === 'aadhar' ? 'Aadhar number' : 'mobile number'}.</p>
                <p className="text-sm mt-2">Please check the number and try again, or proceed with verification to register as a new candidate.</p>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">How to Search</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
            <div className="bg-white rounded-lg p-4">
              <div className="font-medium text-gray-800 mb-2">By Aadhar Number</div>
              <div>Enter your 12-digit Aadhar number to check training status</div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="font-medium text-gray-800 mb-2">By Mobile Number</div>
              <div>Enter your 10-digit mobile number used during registration</div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default StatusPage;