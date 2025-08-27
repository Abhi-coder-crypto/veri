import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { UserPlus, CheckCircle, AlertCircle, Camera, Upload, User, ArrowLeft } from 'lucide-react';
import { useCandidateContext } from '../context/CandidateContext';
import { apiRequest, queryClient } from '../lib/queryClient';
import ImageCropper from '../components/ImageCropper';

const RegistrationPage = () => {
  const [, setLocation] = useLocation();
  const { currentCandidate, verifiedMobile } = useCandidateContext();
  
  console.log("🏁 RegistrationPage rendered - currentCandidate:", currentCandidate);
  console.log("🏁 RegistrationPage rendered - verifiedMobile:", verifiedMobile);
  
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    mobile: '',
    aadhar: '',
    gender: '',
    address: '',
    program: '',
    center: '',
    trainer: '',
    duration: '',

    joiningDate: new Date().toISOString().split('T')[0], // Today's date as default
    currentPhase: 'Theory',
    progress: '0'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [candidateId, setCandidateId] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [showImageCropper, setShowImageCropper] = useState(false);
  const [originalImageUrl, setOriginalImageUrl] = useState<string>('');

  const genders = ['Male', 'Female', 'Other'];

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
    console.log("🔍 RegistrationPage useEffect - currentCandidate:", currentCandidate);
    console.log("🔍 RegistrationPage useEffect - verifiedMobile:", verifiedMobile);
    
    if (currentCandidate && Object.keys(currentCandidate).length > 0) {
      console.log("✅ Setting form data from currentCandidate, gender:", currentCandidate.gender);
      setFormData(prev => ({
        ...prev,
        name: currentCandidate.name || '',
        dob: currentCandidate.dob || '',
        mobile: verifiedMobile || currentCandidate.mobile || '',
        aadhar: currentCandidate.aadhar || '',
        gender: currentCandidate.gender || ''
      }));
    } else if (verifiedMobile) {
      // If no extracted data but we have verified mobile, pre-fill it
      console.log("⚠️ No currentCandidate data, only setting mobile");
      setFormData(prev => ({
        ...prev,
        mobile: verifiedMobile
      }));
    }
  }, [currentCandidate, verifiedMobile]);

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file');
      return;
    }

    setImageUploading(true);
    setError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      setOriginalImageUrl(imageUrl);
      setShowImageCropper(true);
      setImageUploading(false);
    };
    reader.onerror = () => {
      setError('Failed to read image file');
      setImageUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedImageUrl: string) => {
    setProfileImage(croppedImageUrl);
    setShowImageCropper(false);
  };

  // Registration mutation
  const registerMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      console.log('Sending registration data:', data);
      return await apiRequest('/api/candidates', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          profileImage,
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

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 relative" style={{backgroundImage: 'url(/images/Registration.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat'}}>
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
          {/* Back Button */}
          <div className="mb-6">
            <button
              onClick={() => setLocation('/verification')}
              className="inline-flex items-center text-gray-600 hover:text-gray-800 transition-colors duration-200"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Verification
            </button>
          </div>
          
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
                  Aadhar Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="aadhar"
                  value={formData.aadhar}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="gender"
                  value={formData.gender}
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

              {/* Profile Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profile Photo
                </label>
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center border-2 border-dashed border-gray-300 overflow-hidden">
                    {profileImage ? (
                      <img 
                        src={profileImage} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="profile-upload"
                      disabled={imageUploading}
                    />
                    <label
                      htmlFor="profile-upload"
                      className="cursor-pointer inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200 text-sm"
                    >
                      {imageUploading ? (
                        <>
                          <Upload className="w-4 h-4 mr-2 animate-pulse" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4 mr-2" />
                          Choose Photo
                        </>
                      )}
                    </label>
                    <p className="text-xs text-gray-500 mt-1">Max 5MB, JPG/PNG only</p>
                  </div>
                </div>
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



              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Joining Date
                </label>
                <input
                  type="date"
                  name="joiningDate"
                  value={formData.joiningDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
      
      {/* Image Cropper Modal */}
      <ImageCropper
        isOpen={showImageCropper}
        onClose={() => setShowImageCropper(false)}
        onCropComplete={handleCropComplete}
        imageUrl={originalImageUrl}
      />
    </div>
  );
};

export default RegistrationPage;