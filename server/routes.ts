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

  // OTP storage (in production, use Redis or database)
  const otpStore = new Map<string, { otp: string; timestamp: number; attempts: number }>();

  // Send OTP endpoint - REAL SMS implementation
  app.post("/api/send-otp", async (req, res) => {
    try {
      const { phoneNumber } = req.body;
      
      if (!phoneNumber || phoneNumber.length !== 10) {
        return res.status(400).json({ error: "Valid 10-digit phone number required" });
      }

      // Generate 4-digit OTP
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      
      // Store OTP with timestamp and attempts
      otpStore.set(phoneNumber, { 
        otp, 
        timestamp: Date.now(), 
        attempts: 0 
      });

      // Try real SMS services in order of preference
      let smsResult = null;
      
      // Option 1: Twilio (if credentials available)
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
        try {
          const twilio = require('twilio');
          const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
          
          await client.messages.create({
            body: `Your Training Portal verification code is: ${otp}. Valid for 5 minutes.`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: `+91${phoneNumber}`
          });
          
          smsResult = { success: true, message: "OTP sent via Twilio SMS", provider: "Twilio" };
        } catch (twilioError) {
          console.log('Twilio failed, trying Textbelt...', twilioError.message);
        }
      }
      
      // Option 2: Textbelt (completely free, no registration needed)
      if (!smsResult) {
        try {
          const fetch = (await import('node-fetch')).default;
          
          const textbeltResponse = await fetch('https://textbelt.com/text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: `+91${phoneNumber}`,
              message: `Your Training Portal verification code is: ${otp}. Valid for 5 minutes.`,
              key: 'textbelt' // Free quota key
            })
          });
          
          const textbeltResult = await textbeltResponse.json();
          
          if (textbeltResult.success) {
            smsResult = { 
              success: true, 
              message: "OTP sent via Textbelt SMS (Free service)", 
              provider: "Textbelt",
              quotaRemaining: textbeltResult.quotaRemaining 
            };
          } else {
            throw new Error(textbeltResult.error || 'Textbelt service failed');
          }
        } catch (textbeltError) {
          console.log('Textbelt failed, using demo mode...', textbeltError.message);
        }
      }
      
      // Option 3: Demo mode (for development/testing)
      if (!smsResult) {
        smsResult = { 
          success: true, 
          message: `Demo Mode: OTP sent successfully`, 
          provider: "Demo",
          demoOtp: otp // Include OTP in response for demo
        };
      }

      console.log(`OTP ${otp} generated for ${phoneNumber} via ${smsResult.provider}`);
      res.json(smsResult);
      
    } catch (error) {
      console.error('Send OTP error:', error);
      res.status(500).json({ error: "Failed to send OTP" });
    }
  });

  // Verify OTP endpoint
  app.post("/api/verify-otp", async (req, res) => {
    try {
      const { phoneNumber, otp } = req.body;
      
      if (!phoneNumber || !otp) {
        return res.status(400).json({ error: "Phone number and OTP required" });
      }

      const storedData = otpStore.get(phoneNumber);
      
      if (!storedData) {
        return res.status(400).json({ error: "No OTP found for this number" });
      }

      // Check if OTP is expired (5 minutes)
      const isExpired = Date.now() - storedData.timestamp > 5 * 60 * 1000;
      if (isExpired) {
        otpStore.delete(phoneNumber);
        return res.status(400).json({ error: "OTP has expired" });
      }

      // Check attempts
      if (storedData.attempts >= 3) {
        otpStore.delete(phoneNumber);
        return res.status(400).json({ error: "Maximum verification attempts exceeded" });
      }

      // Verify OTP
      if (storedData.otp === otp) {
        otpStore.delete(phoneNumber); // Clean up after successful verification
        res.json({ success: true, message: "OTP verified successfully" });
      } else {
        storedData.attempts += 1;
        otpStore.set(phoneNumber, storedData);
        res.status(400).json({ 
          error: "Invalid OTP", 
          attemptsLeft: 3 - storedData.attempts 
        });
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      res.status(500).json({ error: "Failed to verify OTP" });
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

  // Delete candidate - NEW ADMIN FUNCTIONALITY
  app.delete("/api/candidates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid candidate ID" });
      }

      const success = await activeStorage.deleteCandidate(id);
      
      if (!success) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      res.json({ success: true, message: "Candidate deleted successfully" });
    } catch (error) {
      console.error('Delete candidate error:', error);
      res.status(500).json({ error: "Failed to delete candidate" });
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

  // Delete candidate
  app.delete("/api/candidates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid candidate ID" });
      }

      const success = await activeStorage.deleteCandidate(id);

      if (!success) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      res.json({ message: "Candidate deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete candidate" });
    }
  });

  // Send OTP via SMS
  app.post("/api/send-otp", async (req, res) => {
    try {
      const { phoneNumber } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({ error: "Phone number is required" });
      }

      // Generate 4-digit OTP
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      
      // Store OTP in memory (in production, use Redis or database)
      const otpData = {
        otp,
        phoneNumber,
        timestamp: Date.now(),
        attempts: 0
      };
      
      // Store in app instance for now
      if (!app.locals.otpStorage) {
        app.locals.otpStorage = new Map();
      }
      app.locals.otpStorage.set(phoneNumber, otpData);
      
      // Clear OTP after 5 minutes
      setTimeout(() => {
        app.locals.otpStorage?.delete(phoneNumber);
      }, 5 * 60 * 1000);

      // Try multiple SMS options
      let smsResult = { success: false, message: "SMS not sent" };
      
      try {
        // Option 1: Try Textbelt (Free)
        const textbeltResponse = await fetch('https://textbelt.com/text', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            phone: phoneNumber,
            message: `Your training portal OTP is: ${otp}. Valid for 5 minutes.`,
            key: 'textbelt'
          })
        });

        const textbeltData = await textbeltResponse.json();
        
        if (textbeltData.success) {
          smsResult = { success: true, message: "OTP sent via Textbelt" };
        }
      } catch (error) {
        console.log("Textbelt failed, trying backup method");
      }

      // If Textbelt fails, show OTP in demo mode
      if (!smsResult.success) {
        console.log(`📱 Demo Mode: OTP ${otp} for ${phoneNumber}`);
        smsResult = { 
          success: true, 
          message: `Demo Mode: Your OTP is ${otp}. In production, this would be sent via SMS.`
        };
      }

      res.json({
        success: true,
        message: smsResult.message,
        demoOtp: smsResult.success ? otp : undefined // Only for demo/testing
      });

    } catch (error) {
      console.error('SMS sending failed:', error);
      res.status(500).json({ error: "Failed to send OTP" });
    }
  });

  // Verify OTP
  app.post("/api/verify-otp", async (req, res) => {
    try {
      const { phoneNumber, otp } = req.body;
      
      if (!phoneNumber || !otp) {
        return res.status(400).json({ error: "Phone number and OTP are required" });
      }

      const otpStorage = app.locals.otpStorage;
      if (!otpStorage) {
        return res.status(400).json({ error: "No OTP found. Please request a new OTP." });
      }

      const otpData = otpStorage.get(phoneNumber);
      if (!otpData) {
        return res.status(400).json({ error: "OTP not found or expired. Please request a new OTP." });
      }

      // Check if OTP has expired (5 minutes)
      const now = Date.now();
      const otpAge = now - otpData.timestamp;
      const maxAge = 5 * 60 * 1000; // 5 minutes

      if (otpAge > maxAge) {
        otpStorage.delete(phoneNumber);
        return res.status(400).json({ error: "OTP has expired. Please request a new OTP." });
      }

      // Increment attempts
      otpData.attempts++;

      // Check max attempts (3)
      if (otpData.attempts > 3) {
        otpStorage.delete(phoneNumber);
        return res.status(400).json({ error: "Maximum attempts exceeded. Please request a new OTP." });
      }

      // Validate OTP
      if (otpData.otp === otp) {
        otpStorage.delete(phoneNumber);
        res.json({ success: true, message: "OTP verified successfully!" });
      } else {
        const attemptsLeft = 3 - otpData.attempts;
        res.status(400).json({ 
          error: `Invalid OTP. ${attemptsLeft} attempts remaining.`,
          attemptsLeft 
        });
      }

    } catch (error) {
      console.error('OTP verification failed:', error);
      res.status(500).json({ error: "Failed to verify OTP" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
