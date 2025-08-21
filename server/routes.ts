import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { MongoStorage } from "./mongoStorage";
import { database } from "./database";
import { insertCandidateSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  let activeStorage;
  let mongoStorage: MongoStorage | null = null;

  // Try to initialize MongoDB connection
  try {
    if (process.env.MONGODB_URI) {
      await database.connect();
      await database.ensureIndexes();
      mongoStorage = new MongoStorage();
      activeStorage = mongoStorage;
      console.log('✓ MongoDB connected successfully');
      console.log('✓ Database ready with duplicate prevention enabled');
    } else {
      console.log('⚠️ MONGODB_URI not provided, using in-memory storage');
      activeStorage = storage;
    }
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    console.log('🔄 Falling back to in-memory storage');
    activeStorage = storage;
  }
  // Get all candidates
  app.get("/api/candidates", async (req, res) => {
    try {
      const candidates = await activeStorage.getAllCandidates();
      res.json(candidates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch candidates" });
    }
  });

  // Get candidate by ID
  app.get("/api/candidates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid candidate ID" });
      }

      const candidate = await activeStorage.getCandidate(id);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      res.json(candidate);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch candidate" });
    }
  });

  // Search candidates by Aadhar or Mobile
  app.post("/api/candidates/search", async (req, res) => {
    try {
      const { aadhar, mobile } = req.body;

      let candidate;
      if (aadhar) {
        candidate = await activeStorage.getCandidateByAadhar(aadhar);
      } else if (mobile) {
        candidate = await activeStorage.getCandidateByMobile(mobile);
      } else {
        return res.status(400).json({ error: "Either aadhar or mobile is required" });
      }

      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      res.json(candidate);
    } catch (error) {
      res.status(500).json({ error: "Failed to search candidate" });
    }
  });

  // Create new candidate
  app.post("/api/candidates", async (req, res) => {
    try {
      console.log("Received candidate data:", req.body);
      const validatedData = insertCandidateSchema.parse(req.body);
      
      // Check if candidate already exists by Aadhar
      const existingCandidateByAadhar = await activeStorage.getCandidateByAadhar(validatedData.aadhar);
      if (existingCandidateByAadhar) {
        return res.status(409).json({ error: "Candidate with this Aadhar already exists" });
      }

      // Check if candidate already exists by mobile number
      const existingCandidateByMobile = await activeStorage.getCandidateByMobile(validatedData.mobile);
      if (existingCandidateByMobile) {
        return res.status(409).json({ error: "Candidate with this mobile number already exists" });
      }

      // Generate unique candidate ID
      const candidateId = `TRN${String(Date.now()).slice(-6)}`;
      
      const candidate = await activeStorage.createCandidate(validatedData, candidateId);

      res.status(201).json(candidate);
    } catch (error) {
      console.error("Validation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid candidate data", 
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Failed to create candidate" });
    }
  });

  // Update candidate
  app.put("/api/candidates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid candidate ID" });
      }

      const updates = req.body;
      const candidate = await activeStorage.updateCandidate(id, updates);

      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      res.json(candidate);
    } catch (error) {
      res.status(500).json({ error: "Failed to update candidate" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
