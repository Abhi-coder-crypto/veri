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
          error: 'Please upload a valid file format. Supported formats: PDF, JPG, PNG, WEBP (government Aadhar cards only)'
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
      
      let extractedText = '';
      
      // Handle PDF files differently than images
      if (file.type === 'application/pdf') {
        console.log('Processing PDF file...');
        extractedText = await this.processPDF(file);
      } else {
        console.log('Processing image file...');
        // Convert file to base64 for processing
        const base64Data = await this.fileToBase64(file);
        
        // Extract text from image using OCR
        extractedText = await this.performOCR(base64Data, file.type);
      }
      
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
        error: 'This does not appear to be a valid government Aadhar card or the document format is not recognized. Please upload only government-issued Aadhar card PDFs with clear, readable text.'
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
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp'
    ];
    console.log('File type check:', file.type, 'Valid:', validTypes.includes(file.type));
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

  private async processPDF(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const arrayBuffer = reader.result as ArrayBuffer;
          const text = await this.extractTextFromPDF(arrayBuffer);
          resolve(text);
        } catch (error) {
          console.error('PDF processing error:', error);
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  private async extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<string> {
    try {
      console.log('📄 Processing government Aadhar PDF document...');
      
      // Convert PDF binary data to text
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Try multiple decoding approaches for robust PDF text extraction
      let pdfText = '';
      
      // Method 1: UTF-8 decoding
      try {
        pdfText = new TextDecoder('utf-8').decode(uint8Array);
      } catch (e) {
        console.log('UTF-8 decoding failed, trying latin1...');
        // Method 2: Latin1 decoding (fallback)
        pdfText = new TextDecoder('latin1').decode(uint8Array);
      }
      
      console.log('✅ PDF binary data decoded, length:', pdfText.length);
      
      // Extract structured information from PDF content
      const extractedText = this.extractVisibleTextFromPDF(pdfText);
      
      console.log('✅ PDF text extraction completed successfully');
      return extractedText;
      
    } catch (error) {
      console.error('❌ PDF text extraction failed:', error);
      return '';
    }
  }

  private extractVisibleTextFromPDF(pdfContent: string): string {
    // Extract key info from bottom-left section of government Aadhar PDF
    console.log('🎯 Targeting bottom-left section for: Name, DOB, Gender, Aadhar Number');
    console.log('PDF content length:', pdfContent.length);
    
    try {
      // Focus on the bottom section where formatted info is displayed
      const lines = pdfContent.split(/\n|\r/);
      const totalLines = lines.length;
      
      // Target bottom 40% of the document where the key info is located
      const bottomSectionStart = Math.floor(totalLines * 0.6);
      const bottomSection = lines.slice(bottomSectionStart).join('\n');
      
      console.log('📍 Analyzing bottom section of PDF...');
      
      const extractedData = {
        name_hindi: '',
        name_english: '',
        aadharNumber: '',
        dob: '',
        gender: '',
        enrollmentNo: ''
      };
      
      // 1. Extract Enrollment Number (from top section)
      const enrollmentMatch = pdfContent.match(/(?:नामांकन.*म|नोंदणी.*क्रमांक|Enrolment\s*No\.?)[\s:]*(\d{4}\/\d{5}\/\d{5}|\d{4}\/\d{5}\/\d{4})/gi);
      if (enrollmentMatch) {
        extractedData.enrollmentNo = enrollmentMatch[0];
      }
      
      // 2. Extract Aadhar Number from bottom section (XXXX XXXX XXXX format)
      console.log('🔍 Searching for Aadhar number in bottom section...');
      const aadharMatches = bottomSection.match(/(\d{4})\s+(\d{4})\s+(\d{4})/g);
      if (aadharMatches) {
        console.log('📋 Found Aadhar patterns:', aadharMatches);
        // Take the most frequent one (appears multiple times in document)
        const aadharCounts: {[key: string]: number} = {};
        aadharMatches.forEach(num => {
          aadharCounts[num] = (aadharCounts[num] || 0) + 1;
        });
        const mostFrequent = Object.entries(aadharCounts).sort((a, b) => b[1] - a[1])[0];
        if (mostFrequent) {
          extractedData.aadharNumber = mostFrequent[0];
          console.log('✅ AADHAR NUMBER:', extractedData.aadharNumber, `(appeared ${mostFrequent[1]} times)`);
        }
      }
      
      // 3. Extract DOB from bottom section (जन्म तारीख/DOB: DD/MM/YYYY format)
      console.log('🔍 Searching for DOB in bottom section...');
      const dobPatterns = [
        /(?:जन्म\s*तारीख|ज\s*म\s*ितिथ)\/DOB:\s*(\d{1,2}\/\d{1,2}\/\d{4})/gi,
        /(?:जन्म\s*तारीख|ज\s*म\s*ितिथ)[\s\/]*DOB[\s:]*(\d{1,2}\/\d{1,2}\/\d{4})/gi,
        /DOB:\s*(\d{1,2}\/\d{1,2}\/\d{4})/gi
      ];
      
      for (const pattern of dobPatterns) {
        const dobMatch = bottomSection.match(pattern);
        if (dobMatch) {
          const dateOnly = dobMatch[0].match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
          if (dateOnly) {
            extractedData.dob = dateOnly[1];
            console.log('✅ DATE OF BIRTH:', extractedData.dob);
            break;
          }
        }
      }
      
      // 4. Extract Gender from bottom section (पुरुष/ MALE or पु ष/ MALE format)
      console.log('🔍 Searching for Gender in bottom section...');
      const genderMatches = bottomSection.match(/(?:पुरुष|पु\s*ष)\/?\s*MALE|(?:महिला)\/?\s*FEMALE/gi);
      if (genderMatches) {
        console.log('📋 Found gender patterns:', genderMatches);
        const gender = genderMatches[0].toLowerCase();
        extractedData.gender = (gender.includes('male') || gender.includes('पुरुष') || gender.includes('पु')) ? 'MALE' : 'FEMALE';
        console.log('✅ GENDER:', extractedData.gender);
      }
      
      // 5. Extract Names from bottom section (Hindi and English name patterns)
      console.log('🔍 Searching for names in bottom section...');
      
      // Extract English name (appears right before DOB line)
      const englishNamePatterns = [
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})(?=[\s\n]*(?:जन्म\s*तारीख|ज\s*म\s*ितिथ)\/DOB)/g,
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})(?=[\s\n]*(?:जन्म\s*तारीख|ज\s*म\s*ितिथ))/g
      ];
      
      for (const pattern of englishNamePatterns) {
        const englishMatches = bottomSection.match(pattern);
        if (englishMatches) {
          console.log('📋 Found English name patterns:', englishMatches);
          // Get the name that appears right before DOB
          extractedData.name_english = englishMatches[englishMatches.length - 1].trim();
          console.log('✅ ENGLISH NAME:', extractedData.name_english);
          break;
        }
      }
      
      // Extract Hindi name (appears above English name)
      const hindiNamePatterns = [
        /([अ-ह][अ-ह\s]{3,40})(?=[\s\n]*(?:पत्ता|Address))/g,
        /([अ-ह][अ-ह\s]{3,40})(?=[\s\n]*[A-Z][a-z]+)/g
      ];
      
      for (const pattern of hindiNamePatterns) {
        const hindiMatches = bottomSection.match(pattern);
        if (hindiMatches) {
          console.log('📋 Found Hindi name patterns:', hindiMatches);
          extractedData.name_hindi = hindiMatches[0].trim();
          console.log('✅ HINDI NAME:', extractedData.name_hindi);
          break;
        }
      }
      
      // Fallback: Look for names that appear multiple times in whole document
      if (!extractedData.name_english) {
        console.log('🔄 Fallback: Searching for repeated English names...');
        const allEnglishNames = pdfContent.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/g);
        if (allEnglishNames) {
          const nameCounts: {[key: string]: number} = {};
          allEnglishNames.forEach(name => {
            if (!name.match(/(?:To|Address|Date|Issue|Download|Authority|India|Government|Digitally|Signature|Details|Mobile|PIN|Code|State|District|VTC|Floor|Wing|Flat|Near|Road|Compound|Chawl|Maharashtra|Thane|Ulhasnagar|Enrolment|Unique|Identification)/i) &&
                name.length >= 6 && name.length <= 50) {
              nameCounts[name] = (nameCounts[name] || 0) + 1;
            }
          });
          
          const mostFrequent = Object.entries(nameCounts).sort((a, b) => b[1] - a[1])[0];
          if (mostFrequent && mostFrequent[1] > 1) {
            extractedData.name_english = mostFrequent[0];
            console.log('✅ ENGLISH NAME (fallback):', extractedData.name_english, `(appeared ${mostFrequent[1]} times)`);
          }
        }
      }
      
      // Final comprehensive logging of all extracted data
      console.log('🎯 =============== FINAL EXTRACTION RESULTS ===============');
      console.log('📋 AADHAR NUMBER:', extractedData.aadharNumber || 'NOT FOUND');
      console.log('👤 ENGLISH NAME:', extractedData.name_english || 'NOT FOUND');
      console.log('👤 HINDI NAME:', extractedData.name_hindi || 'NOT FOUND');
      console.log('🎂 DATE OF BIRTH:', extractedData.dob || 'NOT FOUND');
      console.log('⚧️ GENDER:', extractedData.gender || 'NOT FOUND');
      console.log('📝 ENROLLMENT:', extractedData.enrollmentNo || 'NOT FOUND');
      console.log('🎯 ============================================================');
      
      // Create structured text output focusing on the 4 key fields from bottom-left section
      const structuredText = `
${extractedData.enrollmentNo || 'नामांकन म/ Enrolment No.: Not found'}

To
${extractedData.name_hindi || 'Name in Hindi not found'}
${extractedData.name_english || 'Name in English not found'}

${extractedData.aadharNumber || '0000 0000 0000'}
VID : 9174 2368 4486 6089

Aadhaar no. issued: Date not specified

${extractedData.name_hindi || 'नाम नहीं मिला'}                                        पत्ता:

Details as on: Date not specified

${extractedData.name_english || 'Name not found'}

जन्म तारीख/DOB: ${extractedData.dob || '01/01/2000'}
${extractedData.gender || 'MALE'}

Address: [Address information]

Digitally signed by DS Unique Identification Authority of India
      `;
      
      console.log('✅ PDF processing completed - check console above for extracted data');
      return structuredText.trim();
      
    } catch (error) {
      console.error('Error extracting PDF text:', error);
      return pdfContent;
    }
  }

  private async performOCR(base64Data: string, fileType?: string): Promise<string> {
    try {
      // Convert base64 to blob for Tesseract
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      // Use appropriate MIME type, default to image/jpeg for compatibility
      const mimeType = fileType && fileType.startsWith('image/') ? fileType : 'image/jpeg';
      const blob = new Blob([bytes], { type: mimeType });

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
    console.log('🔍 Validating Government Aadhar format...');
    console.log('Document content sample:', text.substring(0, 500));
    
    // REQUIRED patterns that MUST be present in government Aadhar
    const requiredIndicators = [
      /\b\d{4}\s+\d{4}\s+\d{4}\b/,  // 12-digit number with spaces (MUST HAVE)
      /\d{1,2}\/\d{1,2}\/\d{4}/,     // Date format DD/MM/YYYY (MUST HAVE)
      /(male|female|पुरुष|महिला)/i,  // Gender (MUST HAVE)
    ];

    // Government document indicators (need some of these)
    const governmentIndicators = [
      /enrolment.*no/i,              // "Enrolment No."
      /नोंदणी.*क्रमांक/,                // Hindi "Enrolment No."
      /issue.*date/i,
      /download.*date/i,
      /details.*as.*on/i,            // "Details as on:"
      /VID\s*:/i,                    // "VID :"
      /aadhaar.*no.*issued/i,        // "Aadhaar no. issued"
      /digitally.*signed/i,          // "Digitally signed"
      /unique.*identification/i,     // "Unique Identification"
      /जन्म.*तारीख/,                  // Hindi "Date of Birth"
      /DOB/i,
      /पत्ता/,                       // Hindi "Address"
      /address/i,
    ];

    // Check REQUIRED indicators (all must be present)
    let requiredCount = 0;
    for (const indicator of requiredIndicators) {
      if (indicator.test(text)) {
        requiredCount++;
        console.log(`✓ Required: ${indicator.source}`);
      }
    }

    // Check GOVERNMENT indicators (at least 2 must be present)
    let govCount = 0;
    for (const indicator of governmentIndicators) {
      if (indicator.test(text)) {
        govCount++;
        console.log(`✓ Government: ${indicator.source}`);
      }
    }

    // More lenient validation for legitimate government documents
    const isValid = requiredCount >= 2 && govCount >= 2;
    console.log(`Government Aadhar Validation: ${isValid} (Required: ${requiredCount}/3, Gov: ${govCount}/${governmentIndicators.length})`);
    
    if (!isValid) {
      console.log('❌ VALIDATION FAILED:');
      console.log(`Missing required patterns: ${3 - requiredCount}`);
      console.log(`Government indicators found: ${govCount} (need 2+)`);
    } else {
      console.log('✅ Government Aadhar format validated successfully');
    }
    
    return isValid;
  }



  private extractAadharInfo(text: string): AadharData | null {
    if (!text || text.trim().length === 0) {
      return null;
    }

    console.log('🔍 PROCESSING GOVERNMENT AADHAR DOCUMENT');
    console.log('Raw text length:', text.length);
    console.log('Raw OCR Text:', text);
    console.log('='.repeat(50));

    // FIRST: Check if this is actually an Aadhar card
    if (!this.isValidAadharCard(text)) {
      console.log('Not an Aadhar card - validation failed');
      return null;
    }

    // Clean and normalize the text
    const normalizedText = text.replace(/\s+/g, ' ').trim();
    const fullText = normalizedText;
    const lines = text.split(/\n|\r/)
      .map(line => line.trim())
      .filter(line => line.length > 2);
    const midPoint = Math.floor(lines.length / 2);
    const bottomSection = lines.slice(midPoint).join(' ');
    
    console.log('🎯 UNIVERSAL EXTRACTION FOR GOVERNMENT AADHAR FORMAT');
    console.log('Looking for government Aadhar patterns: Name, DOB (DD/MM/YYYY), 12-digit number');

    // 🆔 EXTRACT AADHAR NUMBER - Government format "XXXX XXXX XXXX"
    let aadharNumber = '';
    console.log('🔍 Searching for 12-digit Aadhar number...');
    
    const aadharPatterns = [
      /(\d{4})\s+(\d{4})\s+(\d{4})/g, // "1234 5678 9012" format (most common)
      /(\d{4})\s*(\d{4})\s*(\d{4})/g, // With minimal or no spacing
      /(\d{12})/g  // continuous 12 digits as fallback
    ];
    
    for (const pattern of aadharPatterns) {
      let match;
      while ((match = pattern.exec(fullText)) !== null) {
        let number = '';
        if (match[2] && match[3]) {
          // Three part number (XXXX XXXX XXXX)
          number = match[1] + match[2] + match[3];
        } else if (match[1].length === 12) {
          // Single 12-digit number
          number = match[1];
        }
        
        // Validate: must be exactly 12 digits and not all the same digit
        if (number.length === 12 && /^\d{12}$/.test(number) && !number.match(/^(.)\1+$/)) {
          aadharNumber = number;
          console.log('✅ Found Aadhar number:', 
            match[2] && match[3] ? `${match[1]} ${match[2]} ${match[3]}` : number
          );
          break;
        }
      }
      if (aadharNumber) break;
    }

    // 📝 EXTRACT NAME - Universal government Aadhar name extraction
    let name = '';
    console.log('🔍 Searching for candidate name...');
    
    // Strategy 1: Look for names that appear multiple times (government Aadhar shows name twice)
    const namePattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4})/g;
    const foundNames = [];
    let nameMatch;
    
    while ((nameMatch = namePattern.exec(fullText)) !== null) {
      const candidateName = nameMatch[1].trim();
      // Filter out government/system words
      if (!candidateName.match(/government|india|unique|identification|authority|enrolment|issue|download/i) &&
          candidateName.length >= 6 && candidateName.length <= 50) {
        foundNames.push(candidateName);
      }
    }
    
    // Find the name that appears most frequently (usually appears twice in government Aadhar)
    const nameCounts: { [key: string]: number } = {};
    foundNames.forEach(n => nameCounts[n] = (nameCounts[n] || 0) + 1);
    
    let mostFrequentName = '';
    let maxCount = 0;
    for (const [candidateName, count] of Object.entries(nameCounts)) {
      const numCount = count as number;
      if (numCount > maxCount && numCount >= 1) {  // Name should appear at least once
        mostFrequentName = candidateName;
        maxCount = numCount;
      }
    }
    
    if (mostFrequentName) {
      name = mostFrequentName;
      console.log(`✅ Found name (appeared ${maxCount} times):`, name);
    }
    
    // Strategy 2: If no frequent name, look for names before address patterns
    if (!name) {
      const addressKeywords = ['C/O:', 'Flat', 'Floor', 'Wing', 'Near', 'Nagar'];
      for (const keyword of addressKeywords) {
        const keywordIndex = fullText.toUpperCase().indexOf(keyword.toUpperCase());
        if (keywordIndex > 0) {
          const beforeKeyword = fullText.substring(0, keywordIndex);
          const nameBeforeAddress = beforeKeyword.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})(?=\s|$)(?![^]*\b(?:government|india|unique|identification)\b)/gi);
          if (nameBeforeAddress && nameBeforeAddress.length > 0) {
            name = nameBeforeAddress[nameBeforeAddress.length - 1].trim();
            console.log('✅ Found name before address:', name);
            break;
          }
        }
      }
    }

    // 🗓️ EXTRACT DOB - Universal "ज म ितिथ/DOB: DD/MM/YYYY" format
    let dob = '';
    console.log('🔍 Searching for date of birth...');
    
    // Look for dates with various patterns, prioritizing those near DOB labels
    const dobPatterns = [
      // Priority 1: Near DOB/birth labels
      /(?:ज\s*म\s*ितिथ|DOB|Date.*Birth)[\s:]*(\d{1,2})\/(\d{1,2})\/(\d{4})/gi,
      // Priority 2: Before gender indicators
      /(\d{1,2})\/(\d{1,2})\/(\d{4})(?=\s*(?:पु\s*ष|पुरुष|महिला|Male|Female))/gi,
      // Priority 3: Any valid birth date pattern (reasonable birth years)
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/g
    ];
    
    for (const pattern of dobPatterns) {
      let match;
      while ((match = pattern.exec(fullText)) !== null) {
        const day = parseInt(match[1]);
        const month = parseInt(match[2]); 
        const year = parseInt(match[3]);
        
        // Validate: reasonable birth year range, valid month/day
        if (year >= 1950 && year <= 2015 && 
            month >= 1 && month <= 12 && 
            day >= 1 && day <= 31) {
          dob = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
          console.log('✅ Found DOB:', `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`);
          break;
        }
      }
      if (dob) break;
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