import { useState, useRef } from 'react';
import { X, Save, Calendar, User, Phone, Award, CheckCircle, Clock, Camera, Upload } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '../lib/queryClient';
import ImageCropper from './ImageCropper';
import type { Candidate } from '../../../shared/schema';

interface CandidateEditModalProps {
  candidate: Candidate;
  isOpen: boolean;
  onClose: () => void;
}

const CandidateEditModal = ({ candidate, isOpen, onClose }: CandidateEditModalProps) => {
  const [formData, setFormData] = useState({
    name: candidate.name || '',
    mobile: candidate.mobile || '',
    location: candidate.location || '',
    emailAddress: candidate.emailAddress || '',
    personalEmailAddress: candidate.personalEmailAddress || '',
    jobRole: candidate.jobRole || '',
    jobCode: candidate.jobCode || '',
    status: candidate.status || 'Not Enrolled',
    aadhar: candidate.aadhar || '',
    dob: candidate.dob || '',
    gender: candidate.gender || '',
    religion: candidate.religion || '',
    vulnerability: candidate.vulnerability || '',
    annualIncome: candidate.annualIncome || '',
    educationalQualification: candidate.educationalQualification || '',
    assessmentDate: candidate.assessmentDate || '',
    dlNo: candidate.dlNo || '',
    dlType: candidate.dlType || '',
    licenseExpiryDate: candidate.licenseExpiryDate || '',
    dependentFamilyMembers: candidate.dependentFamilyMembers || '',
    ownerDriver: candidate.ownerDriver || '',
    abhaNo: candidate.abhaNo || '',
    youTube: candidate.youTube || '',
    facebook: candidate.facebook || '',
    instagram: candidate.instagram || '',
    ekycStatus: candidate.ekycStatus || '',
    trained: candidate.trained || false,
    profileImage: candidate.profileImage || null
  });

  const [error, setError] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [showImageCropper, setShowImageCropper] = useState(false);
  const [originalImageUrl, setOriginalImageUrl] = useState<string>('');
  
  // Simple state management - only these 3 states
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const submitRef = useRef(false);


  const validateDrivingLicense = (dlNumber: string): boolean => {
    // Indian DL format: AA-NN-NNNN-NNNNNNN (16 characters including hyphens)
    // AA = 2 letter state code, NN = 2 digit RTO code, NNNN = 4 digit year, NNNNNNN = 7 digit unique number
    const dlPattern = /^[A-Z]{2}-\d{2}-\d{4}-\d{7}$/;
    return dlPattern.test(dlNumber);
  };

  const validateAbhaNumber = (abhaNumber: string): boolean => {
    // ABHA number: 14-digit number
    const abhaPattern = /^\d{14}$/;
    return abhaPattern.test(abhaNumber.replace(/\s|-/g, ''));
  };

  const validateJobCode = (jobCode: string): boolean => {
    // Job codes: 2-8 characters (digits or alphanumeric for Indian classification systems)
    const jobCodePattern = /^[A-Za-z0-9\/]{2,12}$/;
    return jobCodePattern.test(jobCode);
  };

  const formatDrivingLicense = (value: string): string => {
    // Remove all non-alphanumeric characters
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    // Apply formatting: AA-NN-NNNN-NNNNNNN
    if (cleaned.length <= 2) {
      return cleaned;
    } else if (cleaned.length <= 4) {
      return `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;
    } else if (cleaned.length <= 8) {
      return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 4)}-${cleaned.slice(4)}`;
    } else if (cleaned.length <= 15) {
      return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8)}`;
    } else {
      // Truncate if too long
      return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8, 15)}`;
    }
  };

  const formatAbhaNumber = (value: string): string => {
    // Remove all non-numeric characters
    const cleaned = value.replace(/[^0-9]/g, '');
    // Limit to 14 digits
    return cleaned.slice(0, 14);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    // Special handling for driving license number
    if (name === 'dlNo') {
      const formattedValue = formatDrivingLicense(value);
      setFormData(prev => ({ ...prev, [name]: formattedValue }));
      return;
    }

    // Special handling for ABHA number
    if (name === 'abhaNo') {
      const formattedValue = formatAbhaNumber(value);
      setFormData(prev => ({ ...prev, [name]: formattedValue }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
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
    setFormData(prev => ({ ...prev, profileImage: croppedImageUrl }));
    setShowImageCropper(false);
  };

  const handleSaveClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Bulletproof prevention of multiple submissions
    if (submitRef.current || isSaving || showSaved) {
      return;
    }
    
    submitRef.current = true;
    setIsSaving(true);
    setError('');
    
    try {
      const response = await apiRequest(`/api/candidates/${candidate.id}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
      
      // Show "Saved!" immediately
      setIsSaving(false);
      setShowSaved(true);
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      
      // Close modal after showing "Saved!" for 2 seconds
      setTimeout(() => {
        setShowSaved(false);
        submitRef.current = false;
        onClose();
      }, 2000);
      
    } catch (error: any) {
      setError(error.message || 'Failed to update candidate');
      setIsSaving(false);
      setShowSaved(false);
      submitRef.current = false;
    }
  };

  if (!isOpen) return null;

  const statusOptions = ['Not Enrolled', 'Enrolled', 'In Progress', 'Completed', 'Suspended'];
  const genderOptions = ['Male', 'Female', 'Other'];
  const religionOptions = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Other'];
  const vulnerabilityOptions = ['General', 'OBC', 'SC', 'ST', 'EWS', 'Other'];
  const dlTypeOptions = ['LMV', 'HMV', 'MCWG', 'MCWOG', 'Others'];
  const ownerDriverOptions = ['Owner', 'Driver', 'Both'];
  const ekycOptions = ['Completed', 'Pending', 'Failed', 'Not Started'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Edit Candidate Details</h2>
              <p className="text-sm text-gray-600">Candidate ID: {candidate.candidateId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="h-full">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Profile Image Section */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">Profile Photo</h3>
              <div className="flex items-center space-x-6">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center border-2 border-dashed border-gray-300 overflow-hidden shadow-sm">
                  {formData.profileImage ? (
                    <img 
                      src={formData.profileImage} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="profile-upload-edit"
                    disabled={imageUploading}
                  />
                  <label
                    htmlFor="profile-upload-edit"
                    className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors duration-200 text-sm font-medium"
                  >
                    {imageUploading ? (
                      <>
                        <Upload className="w-4 h-4 mr-2 animate-pulse" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4 mr-2" />
                        Change Photo
                      </>
                    )}
                  </label>
                  <p className="text-xs text-gray-500 mt-1">Max 5MB, JPG/PNG only</p>
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Personal Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
                <input
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Aadhar Number</label>
                <input
                  type="text"
                  name="aadhar"
                  value={formData.aadhar}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                <input
                  type="text"
                  name="dob"
                  value={formData.dob}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {genderOptions.map(gender => (
                    <option key={gender} value={gender}>{gender}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Religion</label>
                <select
                  name="religion"
                  value={formData.religion}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Religion</option>
                  {religionOptions.map(religion => (
                    <option key={religion} value={religion}>{religion}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  name="vulnerability"
                  value={formData.vulnerability}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Category</option>
                  {vulnerabilityOptions.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Contact & Location */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Contact & Location</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  name="emailAddress"
                  value={formData.emailAddress}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Personal Email</label>
                <input
                  type="email"
                  name="personalEmailAddress"
                  value={formData.personalEmailAddress}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Annual Income</label>
                <input
                  type="text"
                  name="annualIncome"
                  value={formData.annualIncome}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Educational Qualification</label>
                <input
                  type="text"
                  name="educationalQualification"
                  value={formData.educationalQualification}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dependent Family Members</label>
                <input
                  type="text"
                  name="dependentFamilyMembers"
                  value={formData.dependentFamilyMembers}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Job Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Job Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Job Role</label>
                <input
                  type="text"
                  name="jobRole"
                  value={formData.jobRole}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Job Code</label>
                <input
                  type="text"
                  name="jobCode"
                  value={formData.jobCode}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assessment Date</label>
                <input
                  type="text"
                  name="assessmentDate"
                  value={formData.assessmentDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Owner/Driver</label>
                <select
                  name="ownerDriver"
                  value={formData.ownerDriver}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Type</option>
                  {ownerDriverOptions.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {statusOptions.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="trained"
                  checked={formData.trained}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label className="text-sm font-medium text-gray-700">Training Completed</label>
              </div>
            </div>

            {/* License & Documents */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">License & Documents</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">DL Number</label>
                <input
                  type="text"
                  name="dlNo"
                  value={formData.dlNo || ''}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formData.dlNo && !validateDrivingLicense(formData.dlNo) 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-300'
                  }`}
                  placeholder="AA-NN-NNNN-NNNNNNN (e.g., MH-12-2020-1234567)"
                  maxLength={18}
                />
                {formData.dlNo && !validateDrivingLicense(formData.dlNo) && (
                  <p className="text-red-500 text-sm mt-1">
                    Please enter a valid Indian driving license format: AA-NN-NNNN-NNNNNNN
                  </p>
                )}
                <p className="text-gray-500 text-xs mt-1">
                  Format: State Code-RTO Code-Year-Unique Number
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">DL Type</label>
                <select
                  name="dlType"
                  value={formData.dlType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select DL Type</option>
                  {dlTypeOptions.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">License Expiry Date</label>
                <input
                  type="text"
                  name="licenseExpiryDate"
                  value={formData.licenseExpiryDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ABHA Number</label>
                <input
                  type="text"
                  name="abhaNo"
                  value={formData.abhaNo}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">eKYC Status</label>
                <select
                  name="ekycStatus"
                  value={formData.ekycStatus}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Status</option>
                  {ekycOptions.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Social Media */}
            <div className="space-y-4 col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Social Media</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">YouTube</label>
                  <input
                    type="text"
                    name="youTube"
                    value={formData.youTube}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Facebook</label>
                  <input
                    type="text"
                    name="facebook"
                    value={formData.facebook}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Instagram</label>
                  <input
                    type="text"
                    name="instagram"
                    value={formData.instagram}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

            <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveClick}
                disabled={isSaving || showSaved}
                className={`px-6 py-3 text-white rounded-lg transition-all duration-300 flex items-center space-x-2 ${
                  showSaved
                    ? 'bg-green-600 cursor-not-allowed' 
                    : isSaving
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {showSaved ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>
                  {isSaving 
                    ? 'Saving...' 
                    : showSaved 
                    ? 'Saved!' 
                    : 'Save Changes'
                  }
                </span>
              </button>
            </div>
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
    </div>
  );
};

export default CandidateEditModal;