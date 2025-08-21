import type { Candidate } from '@shared/schema';

// Mock data generators
const indianNames = [
  'Aadhya Sharma', 'Aarav Patel', 'Abhay Singh', 'Abhijeet Rane', 'Aditi Gupta', 'Advait Kumar', 'Ahaan Shah', 'Aisha Khan',
  'Akash Verma', 'Akshara Joshi', 'Ananya Reddy', 'Aniket Rane', 'Ansh Agarwal', 'Anshika Tiwari', 'Arjun Malhotra', 'Arya Nair',
  'Ashwin Iyer', 'Avani Desai', 'Ayaan Kapoor', 'Ayush Pandey', 'Bhavya Mehta', 'Darsh Chandra', 'Dev Sinha', 'Diya Bansal',
  'Eesha Rao', 'Fatima Ali', 'Gaurav Mishra', 'Harsh Saxena', 'Ishaan Chopra', 'Jiya Bhatt', 'Kabir Jain', 'Kavya Bhargava',
  'Kiran Pillai', 'Krishna Menon', 'Lavanya Kulkarni', 'Manav Thakur', 'Meera Sood', 'Mohammed Rahman', 'Naina Kohli', 'Naman Goyal',
  'Navya Bhat', 'Om Shukla', 'Parth Dixit', 'Pooja Singhal', 'Pranav Sethi', 'Priya Khanna', 'Rachit Aggarwal', 'Rajesh Kumar',
  'Ravi Shankar', 'Rhea Ghosh', 'Ridhima Bajaj', 'Rishabh Choudhary', 'Riya Dutta', 'Rudra Prasad', 'Saanvi Arora', 'Sameer Jha',
  'Sanya Malhotra', 'Sara Sheikh', 'Sarvesh Tiwari', 'Shaurya Gupta', 'Shivani Rajput', 'Shreya Mathur', 'Tanvi Sharma', 'Uday Patel',
  'Varun Nanda', 'Vedant Mittal', 'Vihaan Shah', 'Yash Agarwal', 'Zara Ahmed', 'Zeeshan Khan', 'Advika Singh', 'Agastya Rao',
  'Akansha Verma', 'Alok Kumar', 'Amrita Joshi', 'Anirudh Patel', 'Ankit Sharma', 'Anushka Gupta', 'Arpit Mishra', 'Ashutosh Singh',
  'Avantika Reddy', 'Bharat Kumar', 'Chinmay Shah', 'Deepak Agarwal', 'Dhruv Malhotra', 'Divya Nair', 'Ekansh Iyer', 'Garima Desai',
  'Hemant Kapoor', 'Indira Pandey', 'Jatin Mehta', 'Kartik Chandra', 'Lakshmi Sinha', 'Madhuri Bansal', 'Neha Rao', 'Omkar Ali',
  'Pallavi Mishra', 'Raghav Saxena', 'Ritika Chopra', 'Sahil Bhatt', 'Tanya Jain', 'Utkarsh Bhargava', 'Vansh Pillai', 'Yuvraj Menon'
];

const cities = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow',
  'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Pimpri', 'Patna', 'Vadodara', 'Ghaziabad',
  'Ludhiana', 'Agra', 'Nashik', 'Faridabad', 'Meerut', 'Rajkot', 'Kalyan', 'Vasai', 'Varanasi', 'Srinagar'
];

const programs = [
  'Light Motor Vehicle (LMV)', 'Heavy Motor Vehicle (HMV)', 'Transport Vehicle (TV)', 'Two Wheeler (2W)',
  'Three Wheeler (3W)', 'Commercial Vehicle (CV)', 'Private Car License', 'Motorcycle License',
  'Bus Driving License', 'Truck Driving License', 'Auto Rickshaw License', 'Taxi Driving License'
];

const centers = [
  'Mumbai Central Training Center', 'Delhi Driving School', 'Bangalore Motor Training Institute', 
  'Chennai Driving Academy', 'Pune Skills Center', 'Hyderabad Training Hub', 'Kolkata Motor School',
  'Jaipur Driving Institute', 'Lucknow Training Center', 'Ahmedabad Motor Academy'
];

const trainers = [
  'Rajesh Kumar', 'Suresh Patel', 'Mohan Singh', 'Arvind Sharma', 'Deepak Gupta', 'Santosh Yadav',
  'Ravi Shankar', 'Vinod Kumar', 'Ashok Singh', 'Manoj Tiwari', 'Ramesh Chandra', 'Prakash Joshi'
];

const statuses = ['Not Enrolled', 'Enrolled', 'In Progress', 'Completed', 'Suspended'];
const phases = ['Theory', 'Practical', 'Road Test'];
const genders = ['Male', 'Female'];

// Helper functions
function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateMobile(): string {
  // Generate realistic Indian mobile numbers (starting with 6, 7, 8, or 9)
  const firstDigit = [6, 7, 8, 9][Math.floor(Math.random() * 4)];
  const remaining = Math.floor(Math.random() * 900000000) + 100000000;
  return `${firstDigit}${remaining.toString().substring(0, 8)}`;
}

function generateAadhar(): string {
  // Generate 12-digit Aadhar number
  let aadhar = '';
  for (let i = 0; i < 12; i++) {
    aadhar += Math.floor(Math.random() * 10).toString();
  }
  return aadhar;
}

function generateDOB(): string {
  const year = getRandomNumber(1970, 2005);
  const month = getRandomNumber(1, 12).toString().padStart(2, '0');
  const day = getRandomNumber(1, 28).toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function generateCandidateId(index: number): string {
  return `DBS${(index + 1).toString().padStart(6, '0')}`;
}

function generateAddress(city: string): string {
  const houseNo = getRandomNumber(1, 999);
  const streets = ['Main Road', 'Park Street', 'Station Road', 'Gandhi Road', 'MG Road', 'Ring Road', 'Link Road'];
  const areas = ['Central', 'East', 'West', 'North', 'South', 'Extension', 'Colony', 'Nagar'];
  
  return `${houseNo}, ${getRandomElement(streets)}, ${getRandomElement(areas)} ${city}`;
}

function generateJoiningDate(): string {
  const start = new Date(2020, 0, 1);
  const end = new Date(2025, 7, 21);
  const randomDate = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return randomDate.toISOString().split('T')[0];
}

function generateCompletionDate(joiningDate: string, status: string): string | null {
  if (status !== 'Completed') return null;
  
  const joining = new Date(joiningDate);
  const completionDays = getRandomNumber(30, 180); // 1-6 months after joining
  const completion = new Date(joining);
  completion.setDate(completion.getDate() + completionDays);
  
  return completion.toISOString().split('T')[0];
}

function generateProgress(status: string): string {
  switch (status) {
    case 'Not Enrolled': return '0';
    case 'Enrolled': return getRandomNumber(0, 25).toString();
    case 'In Progress': return getRandomNumber(26, 75).toString();
    case 'Completed': return '100';
    case 'Suspended': return getRandomNumber(10, 50).toString();
    default: return '0';
  }
}

function generateInstructorNotes(): string {
  const notes = [
    'Good performance in theory classes',
    'Needs improvement in parking skills',
    'Excellent road sense and awareness',
    'Regular attendance, good progress',
    'Completed practical training successfully',
    'Ready for road test',
    'Needs more practice with lane changes',
    'Good understanding of traffic rules',
    'Confident in city driving',
    'Requires additional training hours'
  ];
  
  return Math.random() > 0.3 ? getRandomElement(notes) : '';
}

// Generate 50,000 mock candidates
export function generateMockCandidates(count: number = 50000): Candidate[] {
  const candidates: Candidate[] = [];
  const usedAadhars = new Set<string>();
  const usedMobiles = new Set<string>();
  
  console.log(`Generating ${count} mock candidates...`);
  
  for (let i = 0; i < count; i++) {
    let aadhar: string;
    let mobile: string;
    
    // Ensure unique Aadhar numbers
    do {
      aadhar = generateAadhar();
    } while (usedAadhars.has(aadhar));
    usedAadhars.add(aadhar);
    
    // Ensure unique mobile numbers  
    do {
      mobile = generateMobile();
    } while (usedMobiles.has(mobile));
    usedMobiles.add(mobile);
    
    const city = getRandomElement(cities);
    const status = getRandomElement(statuses);
    const joiningDate = generateJoiningDate();
    const name = getRandomElement(indianNames);
    
    const candidate: Candidate = {
      id: i + 1,
      candidateId: generateCandidateId(i),
      name: name,
      dob: generateDOB(),
      mobile: mobile,
      aadhar: aadhar,
      address: generateAddress(city),
      program: getRandomElement(programs),
      center: getRandomElement(centers),
      trainer: getRandomElement(trainers),
      duration: `${getRandomNumber(1, 6)} months`,
      trained: status === 'Completed',
      status: status,
      profileImage: null, // No profile images for mock data
      joiningDate: joiningDate,
      completionDate: generateCompletionDate(joiningDate, status),
      progress: generateProgress(status),
      currentPhase: getRandomElement(phases),
      instructorNotes: generateInstructorNotes(),
      medicalCertificate: Math.random() > 0.2, // 80% have medical certificate
      createdAt: new Date(joiningDate)
    };
    
    candidates.push(candidate);
    
    // Progress logging
    if ((i + 1) % 10000 === 0) {
      console.log(`Generated ${i + 1}/${count} candidates`);
    }
  }
  
  console.log(`Successfully generated ${count} mock candidates`);
  return candidates;
}

// Singleton instance to avoid regenerating data
let mockCandidatesCache: Candidate[] | null = null;

export function getMockCandidates(): Candidate[] {
  if (!mockCandidatesCache) {
    mockCandidatesCache = generateMockCandidates(50000);
  }
  return mockCandidatesCache;
}

// Export count for reference
export const MOCK_CANDIDATES_COUNT = 50000;