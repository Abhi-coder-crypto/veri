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
    console.log('🔍 Validating Aadhar format...');
    console.log('Text sample:', normalizedText.substring(0, 200) + '...');
    
    // Check for Aadhar indicators (more flexible)
    const aadharIndicators = [
      /GOVERNMENT/,
      /INDIA/,
      /भारत/,
      /सरकार/,
      /UNIQUE/,
      /IDENTIFICATION/,
      /UIDAI/,
      /AADHAAR/,
      /आधार/,
      /ENROLMENT/,
      /VID/,
      /DOB/,
      /जन्म/,
      /तिथि/,
      /MALE|FEMALE/,
      /पुरुष|महिला/
    ];
    
    let indicatorCount = 0;
    const foundIndicators = [];
    for (const pattern of aadharIndicators) {
      if (pattern.test(normalizedText)) {
        indicatorCount++;
        foundIndicators.push(pattern.source);
      }
    }
    
    console.log(`Found ${indicatorCount} Aadhar indicators:`, foundIndicators);
    
    // Relax requirement - just need some indicators
    if (indicatorCount < 2) {
      console.log('❌ Insufficient Aadhar indicators - may not be valid Aadhar');
      // Don't reject immediately, continue with lenient processing
    }
    
    // Check for 12-digit number pattern
    const hasAadharNumber = /\d{4}[\s\-\.]*\d{4}[\s\-\.]*\d{4}|\d{12}/.test(normalizedText);
    console.log('Has Aadhar number pattern:', hasAadharNumber);
    
    // Check for any date pattern
    const hasDatePattern = /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}/.test(normalizedText);
    console.log('Has date pattern:', hasDatePattern);
    
    // More lenient validation - accept if has basic structure
    if (hasAadharNumber || hasDatePattern || indicatorCount >= 2) {
      console.log(`✅ Accepting document for processing (${indicatorCount} indicators)`);
      return true;
    }
    
    console.log('❌ Document does not appear to contain Aadhar-like content');
    return false;
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

    // Clean and normalize the text
    const normalizedText = text.replace(/\s+/g, ' ').trim();
    const lines = text.split(/\n|\r/)
      .map(line => line.trim())
      .filter(line => line.length > 2);
    
    // Keep fullText and sections for compatibility
    const fullText = normalizedText;
    const midPoint = Math.floor(lines.length / 2);
    const topSection = lines.slice(0, midPoint).join(' ');
    const bottomSection = lines.slice(midPoint).join(' ');
    
    console.log('Processing government Aadhar format...');
    console.log('Top section:', topSection);
    console.log('Bottom section:', bottomSection);

    // Extract Aadhar number - Focus on government format "4015 9329 2039"
    let aadharNumber = '';
    const aadharPatterns = [
      // PRIORITY: Government format with spaces: "4015 9329 2039"
      /\b(\d{4})\s+(\d{4})\s+(\d{4})\b/g,
      // Also check for continuous 12 digits as fallback
      /\b(\d{12})\b/g
    ];

    for (const pattern of aadharPatterns) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(normalizedText)) !== null) {
        let number = '';
        if (match[2] && match[3]) {
          // Three part number (4015 9329 2039)
          number = match[1] + match[2] + match[3];
        } else if (match[1].length === 12) {
          // Single 12-digit number
          number = match[1];
        }
        
        if (number.length === 12 && /^\d{12}$/.test(number) && !number.match(/^(.)\1+$/)) {
          aadharNumber = number;
          console.log('✅ Found Aadhar number:', aadharNumber);
          break;
        }
      }
      if (aadharNumber) break;
    }

    // Extract name - Simplified approach for government Aadhar format
    let name = '';
    
    console.log('🔍 Extracting name from government Aadhar...');
    
    // Strategy 1: Look for name before address keywords
    const addressKeywords = ['C/O:', 'FLAT', 'WING', 'FLOOR', 'NEAR', 'NAGAR', 'WEST', 'EAST', 'NORTH', 'SOUTH'];
    
    // Find the first occurrence of any address keyword
    let addressStart = -1;
    for (const keyword of addressKeywords) {
      const index = fullText.toUpperCase().indexOf(keyword);
      if (index !== -1 && (addressStart === -1 || index < addressStart)) {
        addressStart = index;
      }
    }
    
    if (addressStart > 0) {
      // Get text before the address section
      const beforeAddress = fullText.substring(0, addressStart).trim();
      console.log('Text before address:', beforeAddress);
      
      // Find the last meaningful name in this section (usually appears twice)
      const nameMatches = beforeAddress.match(/([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,4})/g);
      if (nameMatches && nameMatches.length > 0) {
        // Take the last name match (usually the complete name)
        const lastName = nameMatches[nameMatches.length - 1];
        if (lastName.length >= 6 && lastName.length <= 50) {
          name = lastName.trim();
          console.log('✅ Found name before address:', name);
        }
      }
    }
    
    // Strategy 2: Look for names in the bottom section (where personal details are)
    if (!name) {
      console.log('Searching in bottom section...');
      const namePattern = /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,4})(?=\s*(?:DOB|जन्म\s*तिथि|\d{2}\/\d{2}\/\d{4}|Male|Female|पुरुष|महिला))/i;
      const nameMatch = bottomSection.match(namePattern);
      
      if (nameMatch && nameMatch[1]) {
        const candidateName = nameMatch[1].trim();
        if (candidateName.length >= 6 && candidateName.length <= 50) {
          name = candidateName;
          console.log('✅ Found name near DOB/gender:', name);
        }
      }
    }
    
    // Strategy 3: Simple fallback - look for clean name patterns in early lines
    if (!name) {
      console.log('Using fallback name extraction...');
      for (const line of lines.slice(0, 8)) {
        // Skip government/system lines
        if (line.match(/government|india|aadhaar|unique|identification|enrolment|\d{4}/i)) {
          continue;
        }
        
        const nameMatch = line.match(/^([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,4})$/);
        if (nameMatch && nameMatch[1]) {
          const candidateName = nameMatch[1].trim();
          if (candidateName.length >= 6 && candidateName.length <= 50) {
            name = candidateName;
            console.log('✅ Found name in clean line:', name);
            break;
          }
        }
      }
    }

    // Extract DOB - Focus on government format like "23/03/2001"  
    let dob = '';
    console.log('🗓️ Extracting DOB from government Aadhar...');
    
    // Strategy 1: Look for DD/MM/YYYY pattern anywhere in the text
    const dateRegex = /(\d{1,2})\/(\d{1,2})\/(\d{4})/g;
    let bestDate = null;
    let dateMatch;
    
    while ((dateMatch = dateRegex.exec(fullText)) !== null) {
      const day = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]);
      const year = parseInt(dateMatch[3]);
      
      // Validate the date components
      if (year >= 1950 && year <= 2015 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const dateString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        bestDate = { date: dateString, original: dateMatch[0] };
        console.log(`Found valid date: ${dateMatch[0]} -> ${dateString}`);
        // Don't break, continue to find the best one (prefer dates near DOB/gender text)
      }
    }
    
    // Strategy 2: If we found valid dates, prefer one that's near DOB or gender keywords
    if (bestDate) {
      // Look for date near DOB or gender context
      const contextPattern = new RegExp(`(${bestDate.original.replace(/[\/]/g, '\\/')})\\s*(?:DOB|जन्म\\s*तिथि|Male|Female|पुरुष|महिला)`, 'i');
      if (fullText.match(contextPattern)) {
        dob = bestDate.date;
        console.log('✅ Found DOB with context:', bestDate.original);
      } else {
        dob = bestDate.date;
        console.log('✅ Found DOB (general):', bestDate.original);
      }
    }

    // Extract gender from the full text (more flexible)
    let gender = '';
    console.log('👤 Extracting gender...');
    const genderMatches = fullText.match(/(male|female|पुरुष|महिला)/i);
    if (genderMatches) {
      const genderText = genderMatches[1].toLowerCase();
      gender = (genderText === 'male' || genderText === 'पुरुष') ? 'Male' : 'Female';
      console.log('✅ Found gender:', gender);
    }

    // Final extracted data
    const extractedData = { name, dob, aadhar: aadharNumber, gender };
    console.log('=== EXTRACTION SUMMARY ===');
    console.log('📝 Name:', name || 'Not found');
    console.log('🆔 Aadhar:', aadharNumber || 'Not found');
    console.log('🗓️ DOB:', dob || 'Not found'); 
    console.log('👤 Gender:', gender || 'Not found');

    // Flexible validation - accept partial success
    const hasName = name && name.length >= 3 && name.match(/^[A-Za-z\s\.]+$/);
    const hasAadhar = aadharNumber && aadharNumber.length === 12 && /^\d{12}$/.test(aadharNumber) && !aadharNumber.match(/^(.)\1+$/);
    const hasDob = dob && dob.match(/^\d{4}-\d{2}-\d{2}$/);
    
    console.log('=== VALIDATION RESULTS ===');
    console.log(hasName ? '✅' : '❌', 'Name:', name || 'Not found');
    console.log(hasAadhar ? '✅' : '❌', 'Aadhar:', aadharNumber || 'Not found');
    console.log(hasDob ? '✅' : '❌', 'DOB:', dob || 'Not found');
    console.log('ℹ️', 'Gender:', gender || 'Not specified');
    
    // Calculate success score - more lenient approach
    const successScore = (hasName ? 1 : 0) + (hasAadhar ? 1 : 0) + (hasDob ? 1 : 0);
    console.log(`📊 Extraction score: ${successScore}/3`);
    
    // Accept if we have at least name + one other field, or aadhar + dob
    if ((hasName && hasAadhar) || (hasAadhar && hasDob) || successScore >= 2) {
      console.log('🎉 SUCCESS: Sufficient data extracted from Aadhar!');
      return {
        name: name || 'Name could not be extracted',
        dob: dob || '',
        aadhar: aadharNumber || '',
        gender: gender || 'Not specified'
      };
    } else if (hasAadhar) {
      console.log('✅ PARTIAL: At least got Aadhar number');
      return {
        name: name || 'Name could not be extracted',
        dob: dob || '',
        aadhar: aadharNumber,
        gender: gender || 'Not specified'
      };
    } else {
      console.log('❌ FAILED: Could not extract sufficient data');
      console.log('💡 Please try a clearer, well-lit photo of your Aadhar card');
      return null;
    }
  }
}

export const ocrService = OCRService.getInstance();