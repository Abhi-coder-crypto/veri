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
        error: 'This does not appear to be a valid Aadhar card or the document is not clear enough to read. Please upload a clear, high-quality photo of your Aadhar card only.'
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

  private isValidAadharCard(text: string): boolean {
    const normalizedText = text.toUpperCase().replace(/\s+/g, ' ');
    
    // Check for essential Aadhar card indicators
    const aadharIndicators = [
      // Government of India text
      /GOVERNMENT\s*OF\s*INDIA/,
      /भारत\s*सरकार/,
      // UIDAI text
      /UNIQUE\s*IDENTIFICATION\s*AUTHORITY/,
      /UIDAI/,
      // Aadhar specific text
      /AADHAAR/,
      /आधार/,
      // Card specific indicators
      /ENROLMENT\s*NO/,
      /VID/,
      // Combined patterns
      /(GOVERNMENT|भारत).*(INDIA|सरकार)/,
      /(UNIQUE|UIDAI).*(IDENTIFICATION|AUTHORITY)/
    ];
    
    // Must have at least 2 strong Aadhar indicators
    const foundIndicators = aadharIndicators.filter(pattern => pattern.test(normalizedText));
    
    if (foundIndicators.length < 2) {
      console.log('Insufficient Aadhar card indicators found:', foundIndicators.length);
      return false;
    }
    
    // Must contain a 12-digit number pattern (Aadhar number)
    const hasAadharNumber = /\b\d{4}[\s\-\.]*\d{4}[\s\-\.]*\d{4}\b|\b\d{12}\b/.test(normalizedText);
    if (!hasAadharNumber) {
      console.log('No valid Aadhar number pattern found');
      return false;
    }
    
    // Must contain date pattern (DOB)
    const hasDatePattern = /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}\b/.test(normalizedText);
    if (!hasDatePattern) {
      console.log('No date pattern found (required for DOB)');
      return false;
    }
    
    console.log('Valid Aadhar card detected with', foundIndicators.length, 'indicators');
    return true;
  }



  private extractAadharInfo(text: string): AadharData | null {
    if (!text || text.trim().length === 0) {
      return null;
    }

    console.log('Raw OCR Text:', text);
    console.log('='.repeat(50));

    // FIRST: Check if this is actually an Aadhar card
    if (!this.isValidAadharCard(text)) {
      console.log('Not an Aadhar card - validation failed');
      return null;
    }

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

    // Extract Aadhar number - Enhanced for formats from your examples (4015 9329 2039)
    let aadharNumber = '';
    const aadharPatterns = [
      // PRIORITY: Most common format from examples: "4015 9329 2039"
      /\b(\d{4})\s+(\d{4})\s+(\d{4})\b/g,
      // Standard patterns with minimal spacing
      /\b(\d{4})\s*(\d{4})\s*(\d{4})\b/g,
      // With "Your Aadhaar No." label (common in cards)
      /Your\s+Aadhaar\s+No\.?\s*:?\s*(\d{4})\s+(\d{4})\s+(\d{4})/gi,
      // Hyphen/dot separated
      /\b(\d{4})[-\.](\d{4})[-\.](\d{4})\b/g,
      // Hindi/English with labels
      /आधार\s*(?:संख्या|नंबर|No|NUMBER)?\s*:?\s*(\d{4})\s+(\d{4})\s+(\d{4})/gi,
      /AADHAAR\s*(?:NO|NUMBER|संख्या)?\s*:?\s*(\d{4})\s+(\d{4})\s+(\d{4})/gi,
      /UID\s*(?:NO|NUMBER)?\s*:?\s*(\d{4})\s+(\d{4})\s+(\d{4})/gi,
      // Bottom section patterns (मेरा आधार, मेरी पहचान)
      /मेरा\s+आधार[,\s]+मेरी\s+पहचान.*?(\d{4})\s+(\d{4})\s+(\d{4})/gi,
      // Continuous 12 digits (fallback)
      /\b(\d{12})\b/g
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
      // PRIORITY 1: Exact format "जन्म तारीख / DOB : 18/01/2001"
      /जन्म\s*तारीख\s*\/\s*DOB\s*:\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/gi,
      // PRIORITY 2: Just "DOB : 18/01/2001"  
      /DOB\s*:\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/gi,
      // PRIORITY 3: Hindi only "जन्म तारीख : 18/01/2001"
      /जन्म\s*तारीख\s*:\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/gi,
      // PRIORITY 4: More flexible with any spacing
      /(?:जन्म\s*तारीख.*?DOB|DOB|जन्म\s*तिथि)\s*[:\s]*(\d{1,2})\/(\d{1,2})\/(\d{4})/gi,
      // PRIORITY 5: Date before gender (18/01/2001 पुरुष / Male)
      /(\d{1,2})\/(\d{1,2})\/(\d{4})\s*(?:पुरुष|महिला|Male|Female)/gi,
      // PRIORITY 6: Any date pattern DD/MM/YYYY
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/g,
      // PRIORITY 7: Date with dashes
      /(\d{1,2})-(\d{1,2})-(\d{4})/g,
      // PRIORITY 8: Year only fallback
      /Year of Birth\s*:?\s*(\d{4})/i
    ];

    // Search in full text first, then bottom section
    console.log('=== DOB EXTRACTION DEBUG ===');
    console.log('Full text contains "18/01/2001":', fullText.includes('18/01/2001'));
    console.log('Full text contains "DOB":', fullText.includes('DOB'));
    
    for (let i = 0; i < dobPatterns.length; i++) {
      const pattern = dobPatterns[i];
      console.log(`Testing pattern ${i + 1}:`, pattern);
      const match = fullText.match(pattern) || bottomSection.match(pattern);
      console.log(`Pattern ${i + 1} match:`, match);
      console.log(`Pattern ${i + 1} match details:`, match ? {
        fullMatch: match[0],
        day: match[1], 
        month: match[2], 
        year: match[3]
      } : 'No match');
      if (match) {
        if (match[1] && match[2] && match[3]) { // Full date with all parts
          const day = parseInt(match[1]);
          const month = parseInt(match[2]);
          const year = parseInt(match[3]);
          
          console.log(`Processing date: day=${day}, month=${month}, year=${year}`);
          
          // Validate realistic date ranges
          if (year >= 1920 && year <= 2025 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            dob = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            console.log(`✅ DOB extracted successfully: ${dob}`);
            break;
          } else {
            console.log(`❌ Date validation failed: day=${day}, month=${month}, year=${year}`);
          }
        } else if (match[1] && pattern.source.includes('Year')) { // Year only
          const year = parseInt(match[1]);
          if (year >= 1920 && year <= 2025) {
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

    // STRICT validation - ALL essential fields must be present and valid
    const hasValidName = name && name.length >= 5 && name.match(/^[A-Za-z\s]+$/) && !name.includes('OCR could not');
    const hasValidAadhar = aadharNumber && aadharNumber.length === 12 && /^\d{12}$/.test(aadharNumber) && !aadharNumber.match(/^(.)\1+$/);
    const hasValidDob = dob && dob.match(/^\d{4}-\d{2}-\d{2}$/);
    
    console.log('=== FINAL VALIDATION RESULTS ===');
    console.log('✓ Name extracted:', hasValidName ? '✅' : '❌', name);
    console.log('✓ Aadhar extracted:', hasValidAadhar ? '✅' : '❌', aadharNumber);
    console.log('✓ DOB extracted:', hasValidDob ? '✅' : '❌', dob);
    console.log('✓ Gender extracted:', gender || 'Not specified');
    
    // ALL essential fields must be successfully extracted - NO fallback data
    if (hasValidName && hasValidAadhar && hasValidDob) {
      console.log('🎉 OCR extraction SUCCESSFUL - All required fields extracted!');
      return {
        name: name.trim(),
        dob,
        aadhar: aadharNumber,
        gender: gender || 'Not specified'
      };
    } else {
      console.log('❌ OCR extraction FAILED - Missing essential data');
      if (!hasValidName) console.log('   - Name extraction failed or invalid');
      if (!hasValidAadhar) console.log('   - Aadhar number extraction failed or invalid');
      if (!hasValidDob) console.log('   - DOB extraction failed or invalid');
      return null; // Return null instead of generating fake data
    }
  }
}

export const ocrService = OCRService.getInstance();