import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { UserPlus, CheckCircle, AlertCircle } from 'lucide-react';
import { useCandidateContext } from '../context/CandidateContext';
import { apiRequest, queryClient } from '../lib/queryClient';

const RegistrationPage = () => {
  const [, setLocation] = useLocation();
  const { currentCandidate } = useCandidateContext();
  
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    mobile: '',
    aadhar: '',
    address: '',
    program: '',
    center: '',
    trainer: '',
    duration: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [candidateId, setCandidateId] = useState('');

  const programs = [
    { id: 'category1', name: 'Category 1', duration: '3 months' },
    { id: 'category2', name: 'Category 2', duration: '4 months' },
    { id: 'category3', name: 'Category 3', duration: '6 months' },
    { id: 'category4', name: 'Category 4', duration: '2 months' }
  ];

  const centers = [
    'Delhi Training Center',
    'Mumbai Training Center',
    'Bangalore Training Center',
    'Chennai Training Center',
    'Hyderabad Training Center',
    'Pune Training Center'
  ];

  const trainers = [
    'Mr. Rajesh Kumar',
    'Ms. Sunita Verma',
    'Mr. Arjun Reddy',
    'Ms. Priya Sharma',
    'Mr. Amit Singh',
    'Ms. Kavya Nair'
  ];

  useEffect(() => {
    if (currentCandidate) {
      setFormData(prev => ({
        ...prev,
        name: currentCandidate.name || '',
        dob: currentCandidate.dob || '',
        mobile: currentCandidate.mobile || '',
        aadhar: currentCandidate.aadhar || ''
      }));
    }
  }, [currentCandidate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Auto-fill duration when program is selected
    if (name === 'program') {
      const selectedProgram = programs.find(p => p.name === value);
      if (selectedProgram) {
        setFormData(prev => ({ ...prev, duration: selectedProgram.duration }));
      }
    }
  };

  // Registration mutation
  const registerMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      console.log('Sending registration data:', data);
      return await apiRequest('/api/candidates', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          trained: false,
          status: 'Enrolled'
        })
      });
    },
    onSuccess: (data) => {
      setCandidateId(data.candidateId);
      setLoading(false);
      
      // Invalidate candidates cache to update admin dashboard
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
    },
    onError: (error: any) => {
      setError(error.message || 'Registration failed');
      setLoading(false);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name || !formData.address || !formData.program || !formData.center || !formData.trainer) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    registerMutation.mutate(formData);
  };

  if (candidateId) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Registration Successful!</h2>
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-semibold text-green-800 mb-2">Candidate ID Generated</h3>
            <p className="text-2xl font-mono font-bold text-green-700">{candidateId}</p>
          </div>
          <p className="text-gray-600 mb-6">
            Please save this Candidate ID for future reference. You can use it to check your training status.
          </p>
          <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
            <button
              onClick={() => setLocation('/verification')}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              Register Another Candidate
            </button>
            <button
              onClick={() => setLocation('/status')}
              className="w-full sm:w-auto bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              Check Status
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <UserPlus className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Training Registration</h2>
          <p className="text-gray-600">Complete your registration for training program</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Personal Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Enter complete address"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Training Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Training Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Program Category <span className="text-red-500">*</span>
                </label>
                <select
                  name="program"
                  value={formData.program}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Program</option>
                  {programs.map(program => (
                    <option key={program.id} value={program.name}>
                      {program.name} ({program.duration})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Training Center <span className="text-red-500">*</span>
                </label>
                <select
                  name="center"
                  value={formData.center}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Center</option>
                  {centers.map(center => (
                    <option key={center} value={center}>{center}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assigned Trainer <span className="text-red-500">*</span>
                </label>
                <select
                  name="trainer"
                  value={formData.trainer}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Trainer</option>
                  {trainers.map(trainer => (
                    <option key={trainer} value={trainer}>{trainer}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration
                </label>
                <input
                  type="text"
                  name="duration"
                  value={formData.duration}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                  readOnly
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          )}

          <div className="text-center pt-6">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-12 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {loading ? 'Registering...' : 'Save & Generate Candidate ID'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegistrationPage;