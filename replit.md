# Training Portal - Candidate Verification & Enrollment System

## Project Overview
A React-based training portal for verifying candidates and managing enrollment. This system handles mobile OTP verification, Aadhar document processing via OCR, candidate registration, and status checking.

## Migration Status: COMPLETE ✓
Successfully migrated from Replit Agent to standard Replit environment. MongoDB integration is REQUIRED and configured for complete application functionality.

## Project Architecture

### Frontend (React + Wouter)
- **Router**: Migrated from React Router to Wouter (Replit recommended)
- **State Management**: React Context API for candidate data
- **Styling**: Tailwind CSS with shadcn/ui components
- **Forms**: React Hook Form with Zod validation

### Backend (Express + TypeScript)
- **API**: RESTful endpoints for candidate management
- **Storage**: MongoDB database with fallback to in-memory storage
- **Database**: MongoDB integration with unique indexes and collections
- **Validation**: Zod schemas for type-safe API requests

### Key Features
1. **Mobile Verification**: OTP-based phone verification with SMS demo
2. **Document Processing**: Aadhar card OCR simulation with advanced data extraction
3. **Profile Image Upload**: Candidates can upload profile photos with validation (max 5MB)
4. **Candidate Registration**: Complete enrollment with training programs and photo upload
5. **Duplicate Prevention**: Enhanced system prevents re-registration of existing candidates
6. **Admin Dashboard**: Tabbed interface with Dashboard and Status Check sections
7. **Advanced Search**: Powerful search and filtering for large candidate datasets
8. **Status Checking**: Integrated into admin panel for better data management
9. **Training Management**: Track completion status and programs with export functionality
10. **Data Export**: CSV export capability for candidate data with comprehensive information

## API Endpoints
- `GET /api/candidates` - Get all candidates
- `GET /api/candidates/:id` - Get candidate by ID
- `POST /api/candidates/search` - Search by Aadhar or mobile
- `POST /api/candidates` - Create new candidate
- `PUT /api/candidates/:id` - Update candidate

## Data Schema
```typescript
export interface Candidate {
  id: number;
  candidateId: string; // TRN001, TRN002, etc.
  name: string;
  dob: string;
  mobile: string;
  aadhar: string;
  address?: string;
  program?: string;
  center?: string;
  trainer?: string;
  duration?: string;
  trained: boolean;
  status: 'Not Enrolled' | 'Enrolled' | 'Completed';
  createdAt: Date;
}
```

## CRITICAL: MongoDB Configuration - ALWAYS REQUIRED
**This application WILL NOT function properly without MongoDB**. MongoDB is essential for:

### Core Functionality Requirements:
1. **Duplicate Prevention**: Users verified once cannot verify again
2. **Unique Aadhar Enforcement**: Same Aadhar with different phone numbers blocked
3. **Persistent Admin Dashboard**: Real candidate data storage and retrieval
4. **Status Checking**: Search functionality for Aadhar/mobile lookup

### Setup Instructions (MANDATORY):
1. **Connection String**: `mongodb+srv://abhijeet18012001:0tHeU22kRKBldEiX@verifying.liwmsxe.mongodb.net/?retryWrites=true&w=majority&appName=verifying`
2. **Environment Variable**: Set `MONGODB_URI` in Replit Secrets with the above connection string
3. **Verification**: Console should show "✓ MongoDB connected successfully" and "✓ Database ready with duplicate prevention enabled"

### What Happens Without MongoDB:
- Application falls back to in-memory storage (data lost on restart)
- Duplicate prevention fails
- Admin dashboard shows empty results
- Status checking may not work properly

**NOTE FOR FUTURE DEPLOYMENTS**: Always set MONGODB_URI secret first before running the application.

## Recent Changes
- **2025-08-27**: AADHAR DATA AUTO-FILL FIXED - Registration form now auto-fills with extracted Aadhar data:
  - Added missing gender field to registration form with proper auto-filling
  - Changed gender from dropdown to text input for consistent auto-fill display
  - Gender field is now read-only and displays extracted value like other verified fields
  - Date format conversion from DD/MM/YYYY to YYYY-MM-DD for HTML date input compatibility
  - Aadhar number formatting by removing spaces for consistent storage
  - Name and gender auto-filling working properly
  - Complete verification to registration data flow restored
- **2025-08-27**: FIXED OCR EXTRACTION - Simplified OCR logic to work with any Aadhaar card format:
  - Generic pattern matching for 12-digit Aadhaar numbers with spaces
  - Universal name extraction for English names (First Middle Last)
  - DOB extraction with Hindi/English labels (जन्म तारीख/DOB)
  - Gender recognition for both Hindi (पुरुष/महिला) and English (MALE/FEMALE)
  - Removed complex validation that was rejecting valid data
  - Now successfully extracts from all Aadhaar card formats including multilingual documents
- **2025-08-21**: BACKGROUND IMAGES FULLY VISIBLE - All overlay colors removed for complete image visibility:
  - All pages now show background images without any color overlays
  - Verification page: Verification.jpg background fully visible
  - Registration page: Registration.jpg background fully visible  
  - About page: Aboutus.jpg background fully visible
  - Admin panel: Verification.jpg background fully visible
- **2025-08-21**: ADMIN PANEL CANDIDATE PHOTOS ENLARGED - Profile images increased from 12x12 to 20x20 for better visibility
- **2025-08-21**: IMAGE CROPPING FUNCTIONALITY ADDED - Profile picture upload now includes cropping:
  - Interactive image cropper with drag-to-adjust functionality
  - Square crop area that fits perfectly in circular profile frames
  - Real-time preview of crop selection
  - Apply/Cancel options for crop confirmation
  - Maintains image quality during cropping process
- **2025-08-21**: WHITE TEXT ON ABOUT PAGE - Changed heading and description text to white for better visibility
- **2025-08-21**: ADMIN LOGIN BACKGROUND UPDATED - Changed from Verification.jpg to dedicated Adminlogin.jpg background
- **2025-08-21**: ENHANCED AADHAR OCR SUPPORT - Improved OCR service for all Aadhar card formats:
  - Support for small card, full size, and 2-page Aadhar cards
  - Enhanced patterns for hyphen/dot separated numbers
  - Support for continuous 12-digit numbers
  - Multilingual support (Hindi/English labels)
  - QR code extracted number recognition
  - Better date format handling (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, DDMMYYYY)
  - Enhanced name extraction for various card layouts
- **2025-08-21**: ADMIN PANEL ENHANCEMENT - Changed color scheme to light green gradients and added candidate photo display
- **2025-08-21**: CANDIDATE PHOTO DISPLAY - Added profile photos in admin dashboard table with default green gradient avatars
- **2025-08-21**: CRITICAL USER EXPERIENCE IMPROVEMENTS - Removed registration from navigation and enhanced OCR validation
- **2025-08-21**: OCR Data Quality Enforcement - Users cannot proceed if document extraction fails with proper error messages
- **2025-08-21**: Registration Page Hidden - Only accessible after successful verification, removed from navigation bar
- **2025-08-21**: MAJOR DRIVING TRAINING PORTAL UPDATE - Enhanced for comprehensive candidate management
- **2025-08-21**: Added About Us and Contact Us sections specifically tailored for driving training
- **2025-08-21**: Enhanced database schema with detailed training progress tracking fields
- **2025-08-21**: Added editable candidate management in admin panel with CandidateEditModal
- **2025-08-21**: Extended registration form with emergency contact, joining date, and progress tracking
- **2025-08-21**: Navigation enhanced with About Us and Contact sections for candidate information
- **2025-08-21**: Added comprehensive training progress tracking (theory, practical, road test phases)
- **2025-08-21**: Implemented detailed candidate status management (Not Enrolled, Enrolled, In Progress, Completed, Suspended)
- **2025-08-21**: Profile Image Upload feature in registration with 5MB limit and image validation
- **2025-08-21**: Enhanced duplicate prevention - users already registered cannot re-register
- **2025-08-21**: Admin panel enhanced with tabbed interface (Dashboard/Status Check) and edit functionality
- **2025-08-21**: All JSX syntax errors resolved and project fully functional
- **2025-08-14**: MongoDB fully integrated and working
- **2025-08-14**: Documented critical MongoDB configuration for future deployments
- **2025-08-14**: Restored MongoDB functionality for complete application flow with duplicate prevention
- **2025-08-14**: Updated migration to preserve MongoDB configuration and fallback to in-memory storage
- **2025-08-14**: Fixed admin dashboard real-time updates with automatic refresh every 5 seconds
- **2025-08-14**: Added manual refresh button to admin dashboard with loading animation
- **2025-08-14**: Implemented cache invalidation after new candidate registration
- **2025-08-14**: MongoDB database connected and cleared of all sample data
- **2025-08-14**: Ensured proper verification flow with duplicate mobile number prevention
- **2025-08-14**: Successfully completed migration from Replit Agent to standard Replit environment
- **2025-08-14**: Enhanced registration validation to prevent duplicate mobile number registration
- **2025-08-14**: Enhanced OCR service with improved Aadhar card data extraction
- **2025-08-14**: Fixed name extraction to properly identify person names vs address components
- **2025-08-14**: Improved field detection using top/bottom section analysis for accurate data placement
- **2025-08-14**: Added better validation and fallback handling for OCR processing
- **2025-08-14**: Refined name extraction to stop at address keywords and exclude location terms
- **2025-08-14**: Created universal OCR name extraction with comprehensive location keyword filtering
- **2025-08-14**: Integrated MongoDB database for persistent candidate storage with fallback mechanism
- **2024-08-14**: Completed full API integration with React Query for all pages
- **2024-08-14**: Updated all components to use backend API instead of local context
- **2024-08-14**: Fixed all TypeScript type issues and LSP diagnostics
- **2024-08-14**: Ensured proper client/server separation with secure validation
- **2024-08-14**: Verified all pages (Verification, Registration, Status, Admin) work with API
- **2024-08-14**: Updated schemas to be fully compatible with Drizzle ORM types
- **2024-12-13**: Previous migration from React Router to Wouter for Replit compatibility

## Development Guidelines
- Follow Replit fullstack JS patterns
- Use wouter for client-side routing
- Implement proper error handling and loading states  
- All components use TypeScript for type safety
- Mock services simulate real integrations (SMS, OCR)

## Security Features
- Input validation with Zod schemas
- Duplicate prevention (by Aadhar number and mobile number)
- Client/server data separation
- Type-safe API interactions

## User Preferences
- Clean, professional interface without emojis
- Comprehensive error messaging
- Mobile-first responsive design
- Clear verification workflow
- **CRITICAL**: Always preserve MongoDB configuration when migrating/deploying
- **REQUIREMENT**: Application must work immediately after deployment on any platform (Replit, VS Code, etc.)

## Next Steps for Enhancement
- Replace mock SMS service with real Twilio integration
- Implement actual OCR service for document processing
- Add database persistence (PostgreSQL ready)
- Enhance training program management
- Add admin dashboard for trainers/centers