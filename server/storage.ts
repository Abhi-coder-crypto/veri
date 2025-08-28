import { candidates, type Candidate, type InsertCandidate } from "@shared/schema";

export interface IStorage {
  getCandidate(id: number): Promise<Candidate | undefined>;
  getCandidateById(candidateId: string): Promise<Candidate | undefined>;
  getCandidateByAadhar(aadhar: string): Promise<Candidate | undefined>;
  getCandidateByMobile(mobile: string): Promise<Candidate | undefined>;
  createCandidate(candidate: InsertCandidate, candidateId: string): Promise<Candidate>;
  updateCandidate(id: number, updates: Partial<InsertCandidate>): Promise<Candidate | undefined>;
  deleteCandidate(id: number): Promise<boolean>;
  getAllCandidates(): Promise<Candidate[]>;
}

export class MemStorage implements IStorage {
  private candidates: Map<number, Candidate>;
  currentId: number;

  constructor() {
    this.candidates = new Map();
    this.currentId = 1;
    // No mock data - start with empty database
  }

  async getCandidate(id: number): Promise<Candidate | undefined> {
    return this.candidates.get(id);
  }

  async getCandidateById(candidateId: string): Promise<Candidate | undefined> {
    return Array.from(this.candidates.values()).find(
      (candidate) => candidate.candidateId === candidateId,
    );
  }

  async getCandidateByAadhar(aadhar: string): Promise<Candidate | undefined> {
    return Array.from(this.candidates.values()).find(
      (candidate) => candidate.aadhar === aadhar,
    );
  }

  async getCandidateByMobile(mobile: string): Promise<Candidate | undefined> {
    return Array.from(this.candidates.values()).find(
      (candidate) => candidate.mobile === mobile,
    );
  }

  async createCandidate(insertCandidate: InsertCandidate, candidateId: string): Promise<Candidate> {
    const id = this.currentId++;
    const candidate: Candidate = { 
      ...insertCandidate,
      candidateId,
      id, 
      createdAt: new Date(),
      // Set defaults for optional fields based on actual schema
      srNo: insertCandidate.srNo ?? null,
      religion: insertCandidate.religion ?? null,
      vulnerability: insertCandidate.vulnerability ?? null,
      annualIncome: insertCandidate.annualIncome ?? null,
      educationalQualification: insertCandidate.educationalQualification ?? null,
      assessmentDate: insertCandidate.assessmentDate ?? null,
      dlNo: insertCandidate.dlNo ?? null,
      dlType: insertCandidate.dlType ?? null,
      licenseExpiryDate: insertCandidate.licenseExpiryDate ?? null,
      dependentFamilyMembers: insertCandidate.dependentFamilyMembers ?? null,
      ownerDriver: insertCandidate.ownerDriver ?? null,
      abhaNo: insertCandidate.abhaNo ?? null,
      jobRole: insertCandidate.jobRole ?? null,
      jobCode: insertCandidate.jobCode ?? null,
      emailAddress: insertCandidate.emailAddress ?? null,
      youTube: insertCandidate.youTube ?? null,
      facebook: insertCandidate.facebook ?? null,
      instagram: insertCandidate.instagram ?? null,
      ekycStatus: insertCandidate.ekycStatus ?? null,
      personalEmailAddress: insertCandidate.personalEmailAddress ?? null,
      trained: insertCandidate.trained ?? false,
      status: insertCandidate.status ?? 'Not Enrolled',
      profileImage: insertCandidate.profileImage ?? null
    };
    this.candidates.set(id, candidate);
    return candidate;
  }

  async updateCandidate(id: number, updates: Partial<InsertCandidate>): Promise<Candidate | undefined> {
    const candidate = this.candidates.get(id);
    if (!candidate) return undefined;

    const updated: Candidate = { ...candidate, ...updates };
    this.candidates.set(id, updated);
    return updated;
  }

  async deleteCandidate(id: number): Promise<boolean> {
    return this.candidates.delete(id);
  }

  async getAllCandidates(): Promise<Candidate[]> {
    return Array.from(this.candidates.values());
  }
}

export const storage = new MemStorage();