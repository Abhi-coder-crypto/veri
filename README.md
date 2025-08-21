# Training Portal - Candidate Verification & Enrollment System

A React-based training portal for verifying candidates and managing enrollment. This system handles mobile OTP verification, Aadhar document processing via OCR, candidate registration, and status checking.

## 🚨 CRITICAL SETUP REQUIREMENT

**This application requires MongoDB to function properly**. Without MongoDB:
- Duplicate prevention will not work
- Admin dashboard will show no data
- Data will be lost on application restart

### Quick Setup for Replit:
1. Go to Secrets in your Replit project
2. Add key: `MONGODB_URI`
3. Add value: `mongodb+srv://abhijeet18012001:0tHeU22kRKBldEiX@verifying.liwmsxe.mongodb.net/?retryWrites=true&w=majority&appName=verifying`
4. Run the application

### Quick Setup for VS Code/Local:
1. Copy `.env.example` to `.env`
2. The MongoDB URI is already configured
3. Run `npm install` then `npm run dev`

## Features

- **Mobile Verification**: OTP-based phone verification
- **Document Processing**: Aadhar card OCR simulation
- **Candidate Registration**: Complete enrollment with training programs
- **Status Checking**: Search by Aadhar or mobile number
- **Admin Dashboard**: Secure admin login with candidate management
- **Duplicate Prevention**: Enforces unique Aadhar and mobile number registration

## Tech Stack

- **Frontend**: React + Wouter (routing) + Tailwind CSS + shadcn/ui
- **Backend**: Express + TypeScript
- **Database**: MongoDB (required for production features)
- **Storage**: Fallback to in-memory storage if MongoDB unavailable

## API Endpoints

- `GET /api/candidates` - Get all candidates
- `GET /api/candidates/:id` - Get candidate by ID
- `POST /api/candidates/search` - Search by Aadhar or mobile
- `POST /api/candidates` - Create new candidate
- `PUT /api/candidates/:id` - Update candidate

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# The app will be available at http://localhost:5000
```

## Admin Access

- Username: `admin`
- Password: `admin123`

## Important Notes

- MongoDB connection is verified on startup
- Unique indexes are created for Aadhar numbers and candidate IDs
- Application falls back gracefully to in-memory storage if MongoDB is unavailable
- All candidate data persists in MongoDB for admin dashboard functionality

For detailed deployment instructions, see `DEPLOYMENT_GUIDE.md`.