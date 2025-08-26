import { pgTable, text, serial, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  candidateId: text("candidate_id").notNull().unique(),
  
  // Excel fields mapped to our schema
  srNo: text("sr_no"),
  location: text("location").notNull(),
  name: text("name").notNull(),
  aadhar: text("aadhar").notNull().unique(), // Aadharno from Excel
  dob: text("dob").notNull(), // Date of Birth
  gender: text("gender").notNull(),
  religion: text("religion"),
  vulnerability: text("vulnerability"), // Category like OBC, ST, SC
  annualIncome: text("annual_income"),
  educationalQualification: text("educational_qualification"),
  mobile: text("mobile").notNull(), // Contact no of Trainee
  assessmentDate: text("assessment_date"),
  dlNo: text("dl_no"), // DL No
  dlType: text("dl_type"), // DL Type
  licenseExpiryDate: text("license_expiry_date"),
  dependentFamilyMembers: text("dependent_family_members"),
  ownerDriver: text("owner_driver"), // Owner / Driver
  abhaNo: text("abha_no"), // ABHA noNO
  jobRole: text("job_role"),
  jobCode: text("job_code"),
  emailAddress: text("email_address"), // Email Address of Trainee
  youTube: text("you_tube"),
  facebook: text("facebook"),
  instagram: text("instagram"),
  ekycStatus: text("ekyc_status"),
  personalEmailAddress: text("personal_email_address"), // Email Address of Trainee.1
  
  // Keep some existing fields that may still be useful
  trained: boolean("trained").notNull().default(false),
  status: text("status").notNull().default('Not Enrolled'),
  profileImage: text("profile_image"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCandidateSchema = createInsertSchema(candidates).omit({
  id: true,
  candidateId: true,
  createdAt: true,
});

export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type Candidate = typeof candidates.$inferSelect;
