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
- **2025-08-21**: MAJOR FEATURE UPDATE - Added comprehensive new features and improvements
- **2025-08-21**: Logo replaced with large graduation cap emoji (🎓) without background as requested
- **2025-08-21**: Status Check moved from main navigation to Admin panel as separate tab for better organization
- **2025-08-21**: Added Profile Image Upload feature in registration with 5MB limit and image validation
- **2025-08-21**: Enhanced duplicate prevention - users already registered cannot re-register
- **2025-08-21**: Updated database schema to include profileImage field for candidate photos
- **2025-08-21**: Admin panel enhanced with tabbed interface (Dashboard/Status Check)
- **2025-08-21**: Improved search functionality in admin panel for large datasets
- **2025-08-21**: Background images completely removed, replaced with clean gradient themes
- **2025-08-21**: Navigation streamlined to 3 main sections (Verification, Registration, Admin)
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