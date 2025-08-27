import { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Phone, FileText, Shield, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { useCandidateContext } from '../context/CandidateContext';
import { smsService } from '../services/smsService';
import { otpService } from '../services/otpService';
import { ocrService } from '../services/ocrService';
import { apiRequest } from '../lib/queryClient';
import type { AadharData } from '../services/ocrService';

const VerificationPage = () => {
  const [, setLocation] = useLocation();
  const { setCurrentCandidate, setIsVerified, setVerifiedMobile } = useCandidateContext();
  
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [aadharUploaded, setAadharUploaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [canResendOTP, setCanResendOTP] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const [extractedAadharData, setExtractedAadharData] = useState<AadharData | null>(null);

  // Mutation for checking duplicate candidates
  const checkDuplicateMutation = useMutation({
    mutationFn: async ({ aadhar, mobile }: { aadhar: string; mobile: string }) => {
      try {
        const response = await apiRequest('/api/candidates/search', {
          method: 'POST',
          body: JSON.stringify({ aadhar })
        });
        return response;
      } catch (error: any) {
        if (error.message.includes('not found')) {
          return null; // No duplicate found, proceed to registration
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      if (data) {
        setError(`This candidate is already registered with ID: ${data.candidateId}. Status: ${data.status}`);
        setSuccess('');
      } else {
        // No duplicate found, proceed to registration
        setIsVerified(true);
        setVerifiedMobile(mobile);
        setLocation('/registration');
      }
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to check for duplicate registration');
    }
  });

  // Use server-side OTP sending
  const sendOtpMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      return await apiRequest('/api/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber })
      });
    },
    onSuccess: (data) => {
      setOtpSent(true);
      setSuccess(data.message || 'OTP sent successfully!');
      setError('');
      
      // If demo mode, show the OTP
      if (data.demoOtp) {
        setSuccess(`Demo Mode: Your OTP is ${data.demoOtp}. In production, this would be sent via SMS.`);
      }
      
      // Start resend timer
      setCanResendOTP(false);
      setResendTimer(30);
      const timer = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setCanResendOTP(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to send OTP');
      setSuccess('');
    }
  });

  // Use server-side OTP verification
  const verifyOtpMutation = useMutation({
    mutationFn: async ({ phoneNumber, otp }: { phoneNumber: string; otp: string }) => {
      return await apiRequest('/api/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber, otp })
      });
    },
    onSuccess: () => {
      setOtpVerified(true);
      setIsVerified(true);
      setVerifiedMobile(mobile);
      setSuccess('Mobile number verified successfully!');
      setError('');
    },
    onError: (error: any) => {
      setError(error.message || 'Invalid OTP. Please try again.');
      setOtpAttempts(prev => prev + 1);
    }
  });

  const handleSendOTP = async () => {
    if (!mobile || mobile.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // First check if this mobile number is already registered
      let existingCandidate = null;
      
      try {
        existingCandidate = await apiRequest('/api/candidates/search', {
          method: 'POST',
          body: JSON.stringify({ mobile })
        });
      } catch (searchError: any) {
        // 404 means candidate not found, which is expected for new registrations
        if (searchError.status === 404 || searchError.message?.includes('not found') || searchError.message?.includes('Candidate not found')) {
          existingCandidate = null; // No existing candidate, continue with verification
        } else {
          // Some other error occurred during search
          throw searchError;
        }
      }

      if (existingCandidate) {
        setError(`This mobile number is already registered with Candidate ID: ${existingCandidate.candidateId}. Status: ${existingCandidate.status}. You cannot register again with the same mobile number.`);
        setLoading(false);
        return;
      }
      
      // Send OTP using the new server-side mutation
      sendOtpMutation.mutate(mobile);
    } catch (error) {
      setError('Failed to send OTP. Please try again.');
      console.error('OTP sending error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResendOTP) return;
    setOtp('');
    setError('');
    sendOtpMutation.mutate(mobile);
  };

  const handleVerifyOTP = () => {
    if (!otp || otp.length !== 4) {
      setError('Please enter a valid 4-digit OTP');
      return;
    }
    
    verifyOtpMutation.mutate({ phoneNumber: mobile, otp });
  };

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    if (value.length <= 10) {
      setMobile(value);
      
      // Reset OTP state if mobile number changes
      if (otpSent && value !== mobile) {
        setOtpSent(false);
        setOtpVerified(false);
        setOtp('');
        otpService.clearOTP(mobile);
      }
    }
  };

  const handleOTPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    if (value.length <= 4) {
      setOtp(value);
      setError(''); // Clear error when user starts typing
    }
  };

  const formatPhoneDisplay = (phone: string) => {
    if (phone.length >= 10) {
      return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
    }
    return phone;
  };

  const handleProceed = () => {
    if (!otpVerified) {
      setError('Please complete mobile verification first.');
      return;
    }

    if (!aadharUploaded || !extractedAadharData) {
      setError('Please upload and verify your Aadhar document first.');
      return;
    }

    // Data extracted successfully - proceed without validation

    // Check for duplicate registration via API
    checkDuplicateMutation.mutate({
      aadhar: extractedAadharData.aadhar,
      mobile: mobile
    });
  };

  const handleAadharUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("🎯 File input triggered!");
    
    const file = event.target.files?.[0];
    console.log("📎 File selected:", file ? {
      name: file.name,
      type: file.type,
      size: file.size
    } : "No file selected");
    
    if (!file) {
      console.log("❌ No file selected, returning");
      return;
    }

    console.log("🔄 Starting processing workflow...");
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log("📞 Calling OCR service...");
      // Process the uploaded document
      const result = await ocrService.processAadharDocument(file);
      console.log("🔍 OCR service result:", result);
      
      if (result.success && result.data) {
        console.log("✅ Processing successful, updating state...");
        setExtractedAadharData(result.data);
        setAadharUploaded(true);
        
        // Format date from DD/MM/YYYY to YYYY-MM-DD for HTML date input
        const formatDateForInput = (dateStr: string): string => {
          if (!dateStr) return '';
          
          // Handle DD/MM/YYYY format
          const ddmmyyyy = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
          if (ddmmyyyy) {
            const [, day, month, year] = ddmmyyyy;
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
          
          // Handle DD-MM-YYYY format
          const ddmmyyyy2 = dateStr.match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
          if (ddmmyyyy2) {
            const [, day, month, year] = ddmmyyyy2;
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
          
          // Handle YYYY-MM-DD format (already correct)
          if (dateStr.match(/\d{4}-\d{2}-\d{2}/)) {
            return dateStr;
          }
          
          return dateStr; // Return as-is if format not recognized
        };
        
        const candidateData = {
          ...result.data,
          dob: formatDateForInput(result.data.dob),
          aadhar: result.data.aadhar.replace(/\s/g, ''), // Remove spaces from Aadhar number
          gender: result.data.gender, // Explicitly include gender
          mobile
        };
        
        console.log("✅ Setting candidate data with gender:", candidateData);
        setCurrentCandidate(candidateData);
        setSuccess('Aadhar document processed and verified successfully!');
      } else {
        console.log("❌ Processing failed:", result.error);
        setError(result.error || 'Failed to process Aadhar document. Please try again.');
      }
    } catch (error) {
      console.error('💥 Exception in handleAadharUpload:', error);
      setError('An error occurred while processing the document. Please try again.');
    } finally {
      console.log("🏁 Processing workflow completed, setting loading to false");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-8 relative" style={{backgroundImage: 'url(/images/Verification.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat'}}>
      <div className="max-w-2xl mx-auto relative z-10">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              Candidate Verification
            </h2>
            <p className="text-gray-600 text-lg">Complete mobile and document verification to proceed</p>
          </div>

        {/* Mobile Verification */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Phone className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-800">Mobile Verification</h3>
            {otpVerified && <CheckCircle className="w-5 h-5 text-green-500 ml-2" />}
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mobile Number
              </label>
              <input
                type="tel"
                value={mobile}
                onChange={handleMobileChange}
                placeholder="Enter 10-digit mobile number"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                maxLength={10}
                disabled={otpVerified}
              />
            </div>

            {!otpSent && (
              <button
                onClick={handleSendOTP}
                disabled={loading || !mobile}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            )}

            {otpSent && !otpVerified && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-700">
                    OTP sent to <span className="font-semibold">{formatPhoneDisplay(mobile)}</span>
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Valid for 5 minutes • Attempts: {otpAttempts}/3
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter OTP
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={handleOTPChange}
                    placeholder="Enter 4-digit OTP"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                    maxLength={4}
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={handleVerifyOTP}
                    disabled={!otp || otp.length !== 4}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Verify OTP
                  </button>
                  <button
                    onClick={handleResendOTP}
                    disabled={!canResendOTP || loading}
                    className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {canResendOTP ? 'Resend OTP' : `Resend in ${resendTimer}s`}
                  </button>
                </div>
              </div>
            )}

            {otpVerified && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-700 flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mobile number verified successfully!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Document Verification */}
        {otpVerified && (
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <FileText className="w-5 h-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-800">Aadhar Document Verification</h3>
              {aadharUploaded && <CheckCircle className="w-5 h-5 text-green-500 ml-2" />}
            </div>
            
            {!aadharUploaded ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors duration-200">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Upload your Government Aadhar Card for verification</p>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleAadharUpload}
                  className="hidden"
                  id="aadhar-upload"
                />
                <label
                  htmlFor="aadhar-upload"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg cursor-pointer transition-colors duration-200 inline-block"
                >
                  {loading ? 'Processing...' : 'Choose File'}
                </label>
                <p className="text-xs text-gray-500 mt-2">Accepted format: PDF only (UIDAI e-Aadhaar PDF documents)</p>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-2">Document Verified</h4>
                {extractedAadharData && (
                  <div className="space-y-2 text-sm font-mono bg-white p-4 rounded border">
                    <p><strong>Name:</strong> {extractedAadharData.name}</p>
                    <p><strong>DOB:</strong> {extractedAadharData.dob.split('-').reverse().join('/')}</p>
                    <p><strong>Aadhar:</strong> {extractedAadharData.aadhar.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3')}</p>
                    <p><strong>Gender:</strong> {extractedAadharData.gender}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            {success}
          </div>
        )}

        {/* Proceed Button */}
        {otpVerified && aadharUploaded && (
          <div className="text-center">
            <button
              onClick={handleProceed}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-lg transition-colors duration-200 text-lg"
            >
              Proceed to Registration
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default VerificationPage;