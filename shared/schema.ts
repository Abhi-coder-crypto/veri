import { pgTable, text, serial, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  candidateId: text("candidate_id").notNull().unique(),
  name: text("name").notNull(),
  dob: text("dob").notNull(),
  mobile: text("mobile").notNull(),
  aadhar: text("aadhar").notNull().unique(),
  address: text("address"),
  program: text("program"),
  center: text("center"),
  trainer: text("trainer"),
  duration: text("duration"),
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
