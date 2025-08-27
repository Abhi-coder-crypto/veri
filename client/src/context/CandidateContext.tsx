import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Candidate {
  id?: string;
  name: string;
  dob: string;
  mobile: string;
  aadhar: string;
  gender?: string;
  address?: string;
  program?: string;
  center?: string;
  trainer?: string;
  duration?: string;
  trained: boolean;
  status: 'Enrolled' | 'Completed' | 'Not Enrolled';
}

interface CandidateContextType {
  candidates: Candidate[];
  currentCandidate: Partial<Candidate>;
  setCurrentCandidate: (candidate: Partial<Candidate>) => void;
  addCandidate: (candidate: Candidate) => string;
  findCandidate: (aadhar: string, mobile: string) => Candidate | undefined;
  isAlreadyTrained: (aadhar: string, mobile: string) => boolean;
  isVerified: boolean;
  setIsVerified: (verified: boolean) => void;
  verifiedMobile: string;
  setVerifiedMobile: (mobile: string) => void;
}

const CandidateContext = createContext<CandidateContextType | undefined>(undefined);

// Mock database with sample data
const initialCandidates: Candidate[] = [
  {
    id: 'TRN001',
    name: 'Rahul Sharma',
    dob: '1995-03-15',
    mobile: '9876543210',
    aadhar: '123456789012',
    address: 'Delhi, India',
    program: 'Category 1',
    center: 'Delhi Training Center',
    trainer: 'Mr. Rajesh Kumar',
    duration: '3 months',
    trained: true,
    status: 'Completed'
  },
  {
    id: 'TRN002',
    name: 'Priya Singh',
    dob: '1998-07-20',
    mobile: '9123456780',
    aadhar: '234567890123',
    address: 'Mumbai, India',
    program: 'Category 2',
    center: 'Mumbai Training Center',
    trainer: 'Ms. Sunita Verma',
    duration: '4 months',
    trained: true,
    status: 'Completed'
  },
  {
    id: 'TRN003',
    name: 'Amit Patel',
    dob: '1992-11-08',
    mobile: '9234567890',
    aadhar: '345678901234',
    address: 'Bangalore, India',
    program: 'Category 3',
    center: 'Bangalore Training Center',
    trainer: 'Mr. Arjun Reddy',
    duration: '6 months',
    trained: false,
    status: 'Enrolled'
  }
];

export const CandidateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
  const [currentCandidate, setCurrentCandidate] = useState<Partial<Candidate>>({});
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [verifiedMobile, setVerifiedMobile] = useState<string>('');

  const addCandidate = (candidate: Candidate): string => {
    // Check for duplicates before adding
    const existingByAadhar = findCandidate(candidate.aadhar, '');
    const existingByMobile = findCandidate('', candidate.mobile);
    
    if (existingByAadhar || existingByMobile) {
      throw new Error('Candidate already exists with this Aadhar or mobile number');
    }

    const candidateId = `TRN${String(candidates.length + 1).padStart(3, '0')}`;
    const newCandidate = { 
      ...candidate, 
      id: candidateId, 
      status: 'Enrolled' as const,
      createdAt: new Date()
    };
    setCandidates([...candidates, newCandidate]);
    return candidateId;
  };

  const findCandidate = (aadhar: string, mobile: string): Candidate | undefined => {
    return candidates.find(c => c.aadhar === aadhar || c.mobile === mobile);
  };

  const isAlreadyTrained = (aadhar: string, mobile: string): boolean => {
    const candidate = findCandidate(aadhar, mobile);
    return candidate ? candidate.trained : false;
  };

  return (
    <CandidateContext.Provider value={{
      candidates,
      currentCandidate,
      setCurrentCandidate,
      addCandidate,
      findCandidate,
      isAlreadyTrained,
      isVerified,
      setIsVerified,
      verifiedMobile,
      setVerifiedMobile
    }}>
      {children}
    </CandidateContext.Provider>
  );
};

export const useCandidateContext = () => {
  const context = useContext(CandidateContext);
  if (!context) {
    throw new Error('useCandidateContext must be used within a CandidateProvider');
  }
  return context;
};