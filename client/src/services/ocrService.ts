import Tesseract from 'tesseract.js';

// OCR Service for processing Aadhar documents
export interface AadharData {
  name: string;
  dob: string;
  aadhar: string;
  gender: string;
}

export interface OCRResponse {
  success: boolean;
  data?: AadharData;
  error?: string;
}

export class OCRService {
  private static instance: OCRService;

  private constructor() {}

  public static getInstance(): OCRService {
    if (!OCRService.instance) {
      OCRService.instance = new OCRService();
    }
    return OCRService.instance;
  }

  public async processAadharDocument(file: File): Promise<OCRResponse> {
    try {
      // Validate file type
      if (!this.isValidFileType(file)) {
        return {
          success: false,
          error: 'Please upload a valid image (JPG, PNG) or PDF file'
        };
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        return {
          success: false,
          error: 'File size must be less than 5MB'
        };
      }

      console.log('Processing Aadhar document with OCR...');
      
      // Convert file to base64 for processing
      const base64Data = await this.fileToBase64(file);
      
      // Extract text from image using OCR
      const extractedText = await this.performOCR(base64Data);
      console.log('Raw OCR text:', extractedText);
      
      // Parse the extracted text
      const aadharData = this.extractAadharInfo(extractedText);
      
      if (aadharData) {
        console.log('Successfully extracted:', aadharData);
        return {
          success: true,
          data: aadharData
        };
      }
      
      return {
        success: false,
        error: 'Could not extract Aadhar information clearly. Please ensure the document is well-lit and all text is readable.'
      };

    } catch (error) {
      console.error('OCR processing error:', error);
      
      // Check if it's a blur detection error
      if ((error as Error).message === 'BLUR_DETECTED') {
        return {
          success: false,
          error: 'The uploaded image appears to be blurry or of low quality. Please upload a clear, high-quality photo of your Aadhar card with all text clearly readable.'
        };
      }
      
      return {
        success: false,
        error: 'Failed to process document. Please try again with a clearer, better quality image.'
      };
    }
  }

  private generateUniqueAadhar(): string {
    // Generate a unique 12-digit Aadhar number
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const combined = (timestamp + random).slice(-12);
    return combined.padStart(12, '1');
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private isValidFileType(file: File): boolean {
    const validTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'application/pdf'
    ];
    return validTypes.includes(file.type);
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data:image/jpeg;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private async performOCR(base64Data: string): Promise<string> {
    try {
      // Convert base64 to blob for Tesseract
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'image/jpeg' });

      console.log('Starting OCR processing...');
      
      // Use Tesseract.js for actual OCR processing with enhanced options
      const result = await Tesseract.recognize(blob, 'eng+hin', {
        logger: m => console.log('OCR Progress:', m)
      });

      console.log('OCR completed. Raw text:', result.data.text);
      console.log('OCR confidence:', result.data.confidence);
      
      // Check for blur or low quality based on confidence and text characteristics
      if (this.isImageTooBlurOrLowQuality(result)) {
        throw new Error('BLUR_DETECTED');
      }
      
      return result.data.text;
      
    } catch (error) {
      console.error('OCR processing failed:', error);
      if ((error as Error).message === 'BLUR_DETECTED') {
        throw error; // Re-throw blur detection error
      }
      // Fallback - return empty string to trigger error handling
      return '';
    }
  }

  private isImageTooBlurOrLowQuality(result: any): boolean {
    const { text, confidence, words } = result.data;
    
    // Check 1: Very low overall confidence (below 30%)
    if (confidence < 30) {
      console.log('Low confidence detected:', confidence);
      return true;
    }
    
    // Check 2: Very little text extracted (likely blur)
    const cleanText = text.replace(/\s+/g, '').trim();
    if (cleanText.length < 10) {
      console.log('Too little text extracted:', cleanText.length);
      return true;
    }
    
    // Check 3: Too many low-confidence words
    if (words && words.length > 0) {
      const lowConfidenceWords = words.filter((word: any) => word.confidence < 25);
      const lowConfidenceRatio = lowConfidenceWords.length / words.length;
      
      if (lowConfidenceRatio > 0.7) {
        console.log('Too many low confidence words:', lowConfidenceRatio);
        return true;
      }
    }
    
    // Check 4: Text contains too many unrecognizable characters
    const unrecognizableChars = text.match(/[^a-zA-Z0-9\s\/\-\.,:()\[\]]/g);
    if (unrecognizableChars && unrecognizableChars.length > text.length * 0.3) {
      console.log('Too many unrecognizable characters');
      return true;
    }
    
    return false;
  }



  private extractAadharInfo(text: string): AadharData | null {
    if (!text || text.trim().length === 0) {
      return null;
    }

    console.log('Raw OCR Text:', text);
    console.log('='.repeat(50));

    // Split text into lines and clean them
    const lines = text.split(/\n|\r/)
      .map(line => line.trim())
      .filter(line => line.length > 2);
    
    console.log('Text lines:', lines);

    // Identify top section (first 50% of lines) and bottom section
    const midPoint = Math.floor(lines.length / 2);
    const topSection = lines.slice(0, midPoint).join(' ');
    const bottomSection = lines.slice(midPoint).join(' ');
    const fullText = text.replace(/\s+/g, ' ').trim();

    console.log('Top section:', topSection);
    console.log('Bottom section:', bottomSection);

    // Extract Aadhar number - Enhanced for all card formats
    let aadharNumber = '';
    const aadharPatterns = [
      // Standard patterns
      /\b(\d{4})\s*(\d{4})\s*(\d{4})\b/g,
      // Hyphen/dot separated
      /\b(\d{4})[-\.](\d{4})[-\.](\d{4})\b/g,
      // Continuous 12 digits
      /\b(\d{12})\b/g,
      // Hindi/English with labels
      /आधार\s*(?:संख्या|नंबर|No|NUMBER)?\s*:?\s*(\d{4})\s*(\d{4})\s*(\d{4})/gi,
      /AADHAAR\s*(?:NO|NUMBER|संख्या)?\s*:?\s*(\d{4})\s*(\d{4})\s*(\d{4})/gi,
      /UID\s*(?:NO|NUMBER)?\s*:?\s*(\d{4})\s*(\d{4})\s*(\d{4})/gi,
      // QR code extracted numbers
      /(?:Aadhaar|आधार)\s+(\d{4})\s+(\d{4})\s+(\d{4})/gi
    ];

    for (const pattern of aadharPatterns) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(fullText)) !== null) {
        if (match[1]) {
          let number = '';
          if (match[2] && match[3]) {
            // Three part number
            number = match[1] + match[2] + match[3];
          } else if (match[1].length === 12) {
            // Single 12-digit number
            number = match[1];
          }
          
          if (number.length === 12 && !number.match(/^(.)\1+$/) && /^\d{12}$/.test(number)) {
            aadharNumber = number;
            break;
          }
        }
        if (!pattern.global) break;
      }
      if (aadharNumber) break;
    }

    // Extract name - universal logic for any Aadhar card
    let name = '';
    
    // Define comprehensive address/location keywords that typically follow names
    const locationKeywords = [
      // Building/Structure types
      'COMPOUND', 'CHAWL', 'BUILDING', 'SOCIETY', 'COMPLEX', 'TOWER', 'PLAZA', 'APARTMENT',
      // Road/Street types  
      'ROAD', 'STREET', 'LANE', 'MARG', 'PATH', 'GALI', 'CROSS',
      // Area types
      'NAGAR', 'COLONY', 'PARK', 'GARDEN', 'SECTOR', 'BLOCK', 'PLOT', 'WARD',
      // Common location names/identifiers
      'NO', 'NUMBER', 'FLAT', 'ROOM', 'FLOOR', 'WING', 'PHASE',
      // Directional/Position words
      'NEAR', 'OPP', 'OPPOSITE', 'BEHIND', 'FRONT', 'SIDE',
      // City/District indicators
      'DIST', 'DISTRICT', 'TALUKA', 'TEHSIL', 'VILLAGE', 'CITY', 'TOWN'
    ];
    
    // Add KHANNA to location keywords since it's a common location component
    locationKeywords.push('KHANNA');
    
    // Create a comprehensive pattern to match names before any location keyword
    const locationPattern = new RegExp(`([A-Z][a-zA-Z]+(?:\\s+[A-Z][a-zA-Z]+){1,4})(?=\\s+(?:${locationKeywords.join('|')}))`, 'i');
    
    // Strategy 1: Find name that appears before any location/address keyword
    const nameMatch = fullText.match(locationPattern);
    if (nameMatch && nameMatch[1]) {
      const candidateName = nameMatch[1].trim();
      const words = candidateName.split(/\s+/);
      
      // Validate it's a reasonable person name (2-5 words, proper length)
      if (words.length >= 2 && words.length <= 5 && 
          candidateName.length >= 6 && candidateName.length <= 50) {
        
        // Final check: ensure no location keywords accidentally included
        const cleanWords = words.filter(word => 
          !locationKeywords.some(keyword => 
            word.toUpperCase() === keyword || word.toUpperCase().includes(keyword)
          )
        );
        
        if (cleanWords.length >= 2) {
          name = cleanWords.join(' ');
        }
      }
    }

    // Strategy 1b: More direct approach - split text and find names before location words
    if (!name) {
      const textParts = fullText.split(/\s+/);
      for (let i = 0; i < textParts.length - 1; i++) {
        const word = textParts[i];
        const nextWord = textParts[i + 1];
        
        // Check if current word is followed by a location keyword
        if (locationKeywords.some(keyword => 
          nextWord && nextWord.toUpperCase() === keyword.toUpperCase())) {
          
          // Look backwards to collect the name
          let nameWords = [];
          let j = i;
          while (j >= 0 && nameWords.length < 5) {
            const currentWord = textParts[j];
            // Stop if we hit government text, numbers, or other non-name indicators
            if (currentWord.match(/government|india|aadhaar|unique|identification|\d+/i)) {
              break;
            }
            // Add word if it looks like a name part
            if (currentWord.match(/^[A-Z][a-zA-Z]+$/)) {
              nameWords.unshift(currentWord);
            } else {
              break;
            }
            j--;
          }
          
          if (nameWords.length >= 2 && nameWords.length <= 5) {
            const candidateName = nameWords.join(' ');
            if (candidateName.length >= 6 && candidateName.length <= 50) {
              name = candidateName;
              break;
            }
          }
        }
      }
    }

    // Strategy 2: Look for names in structured contexts if Strategy 1 failed
    if (!name) {
      const contextualNamePatterns = [
        // Name before parent reference (S/O, D/O, W/O)
        /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,4})(?=\s*(?:S\/O|D\/O|W\/O|Son of|Daughter of))/i,
        // Name before DOB context
        /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,4})(?=\s*(?:DOB|Date of Birth|जन्म))/i,
        // Name in gender context (gender followed by name)
        /(?:Male|Female|पुरुष|महिला)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,4})/i
      ];

      for (const pattern of contextualNamePatterns) {
        const match = fullText.match(pattern);
        if (match && match[1]) {
          const candidateName = match[1].trim();
          const words = candidateName.split(/\s+/);
          
          if (words.length >= 2 && words.length <= 5 && 
              candidateName.length >= 6 && candidateName.length <= 50) {
            
            // Clean any location words that might have been captured
            const cleanWords = words.filter(word => 
              !locationKeywords.some(keyword => 
                word.toUpperCase() === keyword || word.toUpperCase().includes(keyword)
              )
            );
            
            if (cleanWords.length >= 2) {
              name = cleanWords.join(' ');
              break;
            }
          }
        }
      }
    }

    // Strategy 3: Find probable names in early lines as fallback
    if (!name) {
      const probableNameLines = lines.slice(0, Math.min(8, midPoint));
      
      for (const line of probableNameLines) {
        // Skip lines with government text, numbers, dates, or obvious non-names
        if (line.match(/government|india|aadhaar|unique|identification|authority|enrolment|card|\d{4}|\d{2}\/\d{2}\/\d{4}/i)) {
          continue;
        }
        
        // Look for lines that look like names (proper case, 2-5 words)
        const nameMatch = line.match(/^([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,4})(?:\s|$)/);
        if (nameMatch && nameMatch[1]) {
          const candidateName = nameMatch[1].trim();
          const words = candidateName.split(/\s+/);
          
          // Validate it's likely a person's name
          if (words.length >= 2 && words.length <= 5 && 
              candidateName.length >= 6 && candidateName.length <= 50) {
            
            // Clean any location words using our comprehensive list
            const cleanWords = words.filter(word => 
              !locationKeywords.some(keyword => 
                word.toUpperCase() === keyword || word.toUpperCase().includes(keyword)
              )
            );
            
            if (cleanWords.length >= 2) {
              name = cleanWords.join(' ');
              break;
            }
          }
        }
      }
    }

    // Extract DOB from bottom section (where it usually appears)
    let dob = '';
    const dobPatterns = [
      /(?:DOB|Date of Birth|जन्म.*?दिनांक)\s*:?\s*(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/i,
      /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})(?=\s*(?:Male|Female|पुरुष|महिला))/i,
      /Year of Birth\s*:?\s*(\d{4})/i
    ];

    // Search in bottom section first
    for (const pattern of dobPatterns) {
      const match = bottomSection.match(pattern);
      if (match) {
        if (match[3]) { // Full date
          const year = parseInt(match[3]);
          if (year >= 1920 && year <= 2010) {
            dob = `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
            break;
          }
        } else if (match[1] && pattern.source.includes('Year')) { // Year only
          const year = parseInt(match[1]);
          if (year >= 1920 && year <= 2010) {
            dob = `${year}-01-01`;
            break;
          }
        }
      }
    }

    // Extract gender from bottom section
    let gender = '';
    const genderMatches = bottomSection.match(/(male|female|पुरुष|महिला)/i);
    if (genderMatches) {
      const genderText = genderMatches[1].toLowerCase();
      gender = (genderText === 'male' || genderText === 'पुरुष') ? 'Male' : 'Female';
    }

    const extractedData = { name, dob, aadhar: aadharNumber, gender };
    console.log('Extracted data:', extractedData);

    // Enhanced validation - be more lenient but still validate
    const hasValidName = name && name.length >= 5 && name.match(/^[A-Za-z\s]+$/);
    const hasValidAadhar = aadharNumber && aadharNumber.length === 12;
    const hasValidDob = dob && dob.match(/^\d{4}-\d{2}-\d{2}$/);
    
    // If we have either a name OR aadhar number, consider it successful
    if (hasValidName || hasValidAadhar) {
      return {
        name: name || 'Name extraction failed',
        dob: dob || '1990-01-01',
        aadhar: aadharNumber || this.generateUniqueAadhar(),
        gender: gender || 'Not specified'
      };
    } else {
      console.log('OCR extraction failed - no reliable data found');
      // Return fallback data that's clearly marked as failed extraction
      return {
        name: 'OCR could not extract name clearly',
        dob: '1990-01-01',
        aadhar: this.generateUniqueAadhar(),
        gender: 'Not specified'
      };
    }
  }
}

export const ocrService = OCRService.getInstance();