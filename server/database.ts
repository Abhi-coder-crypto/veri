import { MongoClient, Db, Collection } from 'mongodb';
import { Candidate, InsertCandidate } from '@shared/schema';

class Database {
  private client: MongoClient;
  private db: Db | null = null;
  private candidates: Collection<Candidate> | null = null;

  constructor() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI environment variable is required');
    }
    this.client = new MongoClient(uri);
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.db = this.client.db('training_portal');
      this.candidates = this.db.collection<Candidate>('candidates');
      console.log('Connected to MongoDB successfully');
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }

  getCandidatesCollection(): Collection<Candidate> {
    if (!this.candidates) {
      throw new Error('Database not connected');
    }
    return this.candidates;
  }

  async ensureIndexes(): Promise<void> {
    if (!this.candidates) return;
    
    // Create unique indexes for candidateId and aadhar
    await this.candidates.createIndex({ candidateId: 1 }, { unique: true });
    await this.candidates.createIndex({ aadhar: 1 }, { unique: true });
    await this.candidates.createIndex({ mobile: 1 });
  }
}

export const database = new Database();