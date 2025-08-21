# Training Portal - Deployment Guide

## CRITICAL - MongoDB Setup Required

This application **REQUIRES** MongoDB to function properly. Without it, core features will not work.

### Step 1: Set Environment Variable
**ALWAYS do this first before running the application:**

1. In Replit: Go to Secrets → Add new secret
2. Key: `MONGODB_URI`
3. Value: `mongodb+srv://abhijeet18012001:0tHeU22kRKBldEiX@verifying.liwmsxe.mongodb.net/?retryWrites=true&w=majority&appName=verifying`

### Step 2: Verify Connection
When you start the application, you should see:
```
Connected to MongoDB successfully
✓ MongoDB connected successfully
✓ Database ready with duplicate prevention enabled
```

### Step 3: Test Core Features
1. **Verification Flow**: Users can verify mobile numbers
2. **Registration**: Aadhar numbers are unique, mobile numbers are unique
3. **Admin Dashboard**: Shows real candidates from database
4. **Status Check**: Search works by Aadhar or mobile number

## What MongoDB Enables
- Prevents users from verifying multiple times
- Blocks registration with same Aadhar but different mobile
- Persistent data storage for admin dashboard
- Complete status checking functionality

## Troubleshooting
If MongoDB connection fails:
1. Check if MONGODB_URI secret is set correctly
2. Verify the connection string is exact
3. Application will fall back to in-memory storage (temporary)

## For Future Deployments
- Always set MONGODB_URI first
- Test admin dashboard to verify connection
- Ensure duplicate prevention is working