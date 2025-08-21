import { Collection, ObjectId } from 'mongodb';
import { database } from './database';
import { Candidate, InsertCandidate } from '@shared/schema';
import { IStorage } from './storage';

export class MongoStorage implements IStorage {
  private collection: Collection<Candidate>;

  constructor() {
    this.collection = database.getCandidatesCollection();
  }

  async getCandidate(id: number): Promise<Candidate | undefined> {
    const candidate = await this.collection.findOne({ id });
    return candidate || undefined;
  }

  async getCandidateById(candidateId: string): Promise<Candidate | undefined> {
    const candidate = await this.collection.findOne({ candidateId });
    return candidate || undefined;
  }

  async getCandidateByAadhar(aadhar: string): Promise<Candidate | undefined> {
    const candidate = await this.collection.findOne({ aadhar });
    return candidate || undefined;
  }

  async getCandidateByMobile(mobile: string): Promise<Candidate | undefined> {
    const candidate = await this.collection.findOne({ mobile });
    return candidate || undefined;
  }

  async createCandidate(insertCandidate: InsertCandidate, candidateId: string): Promise<Candidate> {
    // Get next ID by counting existing documents
    const count = await this.collection.countDocuments();
    const id = count + 1;
    
    const candidate: Candidate = {
      ...insertCandidate,
      candidateId,
      id,
      createdAt: new Date(),
      address: insertCandidate.address ?? null,
      program: insertCandidate.program ?? null,
      center: insertCandidate.center ?? null,
      trainer: insertCandidate.trainer ?? null,
      duration: insertCandidate.duration ?? null,
      trained: insertCandidate.trained ?? false,
      status: insertCandidate.status ?? 'Not Enrolled'
    };

    await this.collection.insertOne(candidate);
    return candidate;
  }

  async updateCandidate(id: number, updates: Partial<InsertCandidate>): Promise<Candidate | undefined> {
    const result = await this.collection.findOneAndUpdate(
      { id },
      { $set: updates },
      { returnDocument: 'after' }
    );
    return result || undefined;
  }

  async getAllCandidates(): Promise<Candidate[]> {
    return await this.collection.find({}).toArray();
  }
}