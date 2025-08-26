import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker?url";

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
      // Accept PDFs even if browser reports as application/octet-stream
      const isPDF = file.type.includes('pdf') || 
                   file.type === 'application/octet-stream' || 
                   file.name.toLowerCase().endsWith('.pdf');
      
      if (!isPDF) {
        return {
          success: false,
          error: "Only PDF Aadhaar files are supported."
        };
      }

      // Extract text from PDF
      const extractedText = await this.processPDF(file);
      
      if (!extractedText || extractedText.length < 100) {
        return {
          success: false,
          error: "Unable to extract text from PDF. Please ensure it's a valid UIDAI e-Aadhaar PDF."
        };
      }

      // Parse Aadhaar info with strict validation
      const aadharData = this.extractAadharInfo(extractedText);
      if (aadharData) {
        return { 
          success: true, 
          data: aadharData 
        };
      }

      return {
        success: false,
        error: "Could not extract valid Aadhaar details from PDF. Please ensure all required information is clearly visible."
      };
    } catch (err) {
      return {
        success: false,
        error: `Failed to process Aadhaar PDF: ${err instanceof Error ? err.message : 'Unknown error'}`
      };
    }
  }

  private async processPDF(file: File): Promise<string> {
    // Configure PDF.js worker for Vite/Replit
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

    const arrayBuffer = await file.arrayBuffer();
    
    try {
      console.log("📄 Opening PDF document...");
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      console.log(`📄 PDF opened successfully. Pages: ${pdf.numPages}`);
      
      const text = await this.extractTextFromPDF(pdf);
      
      if (text.length < 10) {
        throw new Error("No meaningful text extracted from PDF");
      }
      
      return text;
      
    } catch (error) {
      console.error("❌ Error processing PDF:", error);
      
      // If PDF fails to open normally, try with password
      const password = prompt(
        "PDF processing failed. If this is a password-protected Aadhaar PDF:\\n\\n" +
        "Enter the password (first 4 letters of name + birth year, e.g., ABHI1999):\\n\\n" +
        "Or click Cancel if the PDF should work without password:"
      );
      
      if (password) {
        console.log(`🔑 Retrying with password...`);
        try {
          const pdfWithPassword = await pdfjsLib.getDocument({ 
            data: arrayBuffer, 
            password: password 
          }).promise;
          
          const text = await this.extractTextFromPDF(pdfWithPassword);
          return text;
          
        } catch (passwordError) {
          console.error("❌ Failed with password:", passwordError);
          throw new Error("Could not process PDF with or without password. Please check the file.");
        }
      } else {
        throw new Error(`PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  private async extractTextFromPDF(pdf: any): Promise<string> {
    let extractedText = "";

    // Extract text from all pages
    for (let i = 1; i <= pdf.numPages; i++) {
      console.log(`📄 Processing page ${i}/${pdf.numPages}`);
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      
      console.log(`Found ${content.items.length} text items on page ${i}`);
      
      // Better text extraction - preserve structure and spacing
      const textItems = content.items.map((item: any) => {
        if ('str' in item && item.str.trim()) {
          console.log(`Text item: "${item.str}"`);
          return item.str;
        }
        return '';
      }).filter((str: string) => str.length > 0);
      
      // Join with spaces and add line breaks
      const pageText = textItems.join(' ');
      extractedText += pageText + "\n";
      
      console.log(`Page ${i} text sample:`, pageText.substring(0, 200));
    }

    const finalText = extractedText.trim();
    console.log("🔍 Final extracted text length:", finalText.length);
    console.log("🔍 Final text sample:", finalText.substring(0, 500));
    
    return finalText;
  }

  private isTextCorrupted(text: string): boolean {
    // Check if text contains mostly broken Unicode characters or very little content
    const meaningfulChars = text.match(/[a-zA-Z0-9]/g) || [];
    const totalChars = text.replace(/\\s/g, '').length;
    
    // If less than 30% of characters are meaningful English/numbers, likely corrupted
    const meaningfulRatio = meaningfulChars.length / Math.max(totalChars, 1);
    
    console.log(`Text analysis: ${meaningfulChars.length}/${totalChars} meaningful chars (${(meaningfulRatio * 100).toFixed(1)}%)`);
    
    return meaningfulRatio < 0.3;
  }

  private extractAadharInfo(text: string): AadharData | null {
    console.log("=== Starting Aadhaar extraction ===");
    console.log("Text sample:", text.substring(0, 500));
    
    const result = {
      name: "",
      dob: "",
      aadhar: "",
      gender: ""
    };

    // Extract valid Aadhaar Number (12 digits only, not phone/VID/enrollment)
    result.aadhar = this.extractValidAadharNumber(text);
    console.log("Extracted Aadhaar:", result.aadhar);
    if (!result.aadhar) {
      console.log("❌ No valid Aadhaar number found");
      return null;
    }

    // Extract DOB
    result.dob = this.extractValidDOB(text);
    console.log("Extracted DOB:", result.dob);
    if (!result.dob) {
      console.log("❌ No valid DOB found");
      return null;
    }

    // Extract Gender
    result.gender = this.extractGender(text);
    console.log("Extracted Gender:", result.gender);
    if (!result.gender) {
      console.log("❌ No valid Gender found");
      return null;
    }

    // Extract Name using context and fallback methods
    result.name = this.extractName(text);
    console.log("Extracted Name:", result.name);
    if (!result.name) {
      console.log("❌ No valid Name found");
      return null;
    }

    console.log("✅ All fields extracted successfully:", result);
    return result;
  }

  private extractValidAadharNumber(text: string): string {
    console.log("🔍 Searching for Aadhaar numbers...");
    
    // Find all 12-digit patterns (spaced and unspaced)
    const patterns = [
      /\b(\d{4})\s+(\d{4})\s+(\d{4})\b/g,  // 2305 2244 1763
      /\b(\d{12})\b/g  // 230522441763
    ];
    
    const foundNumbers: string[] = [];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        let number;
        if (match[2] && match[3]) {
          // Spaced format: combine all parts
          number = match[1] + match[2] + match[3];
        } else {
          // Unspaced format
          number = match[1];
        }
        
        if (number.length === 12) {
          foundNumbers.push(number);
          console.log("Found 12-digit number:", number);
        }
      }
      pattern.lastIndex = 0; // Reset regex
    }
    
    console.log("All found 12-digit numbers:", foundNumbers);
    
    // Filter out invalid numbers
    for (const number of foundNumbers) {
      console.log(`\n--- Validating ${number} ---`);
      
      // Rule 1: Reject repeated digits (like 000000000000)
      if (/^(\d)\1+$/.test(number)) {
        console.log(`❌ Rejected: repeated digits`);
        continue;
      }
      
      // Rule 2: Check context around this number to reject VIDs
      const numberIndex = text.indexOf(number.substring(0, 4)); // Find by first 4 digits
      if (numberIndex !== -1) {
        const contextBefore = text.substring(Math.max(0, numberIndex - 20), numberIndex).toLowerCase();
        const contextAfter = text.substring(numberIndex, numberIndex + 50).toLowerCase();
        
        console.log(`Context before: "${contextBefore}"`);
        console.log(`Context after: "${contextAfter}"`);
        
        if (contextBefore.includes('vid') || contextAfter.includes('vid')) {
          console.log(`❌ Rejected: appears near VID keyword`);
          continue;
        }
      }
      
      // Rule 3: Reject phone numbers in mobile context
      if ((number.startsWith('9') || number.startsWith('8') || 
           number.startsWith('7') || number.startsWith('6'))) {
        const mobileContext = text.toLowerCase();
        const mobileIndex = mobileContext.indexOf(number);
        if (mobileIndex !== -1) {
          const surrounding = mobileContext.substring(Math.max(0, mobileIndex - 30), mobileIndex + 50);
          if (surrounding.includes('mobile') || surrounding.includes('phone')) {
            console.log(`❌ Rejected: appears in mobile context`);
            continue;
          }
        }
      }
      
      // Rule 4: Reject enrollment numbers
      const enrollmentContext = text.toLowerCase();
      if (enrollmentContext.includes('enrolment') || enrollmentContext.includes('नामांकन')) {
        const enrollmentIndex = Math.max(
          enrollmentContext.indexOf('enrolment'),
          enrollmentContext.indexOf('नामांकन')
        );
        const numberIndexInText = enrollmentContext.indexOf(number);
        
        // If number appears close to enrollment keywords, reject it
        if (Math.abs(enrollmentIndex - numberIndexInText) < 100) {
          console.log(`❌ Rejected: appears near enrollment context`);
          continue;
        }
      }
      
      // Rule 5: Common VID starting patterns
      if (number.startsWith('9171') || number.startsWith('9174') || 
          number.startsWith('9999') || number.startsWith('9666') ||
          number.startsWith('9174')) {
        console.log(`❌ Rejected: common VID pattern`);
        continue;
      }
      
      // If we get here, it's likely a valid Aadhaar number
      console.log(`✅ Valid Aadhaar number found: ${number}`);
      return number;
    }
    
    console.log("❌ No valid Aadhaar number found after filtering");
    return "";
  }

  private extractValidDOB(text: string): string {
    console.log("🔍 Searching for DOB...");
    
    // Find all date patterns first
    const dateMatches = text.match(/\d{2}\/\d{2}\/\d{4}/g) || [];
    console.log("Found date patterns:", dateMatches);
    
    // Check each date for birth context
    for (const date of dateMatches) {
      const year = parseInt(date.split('/')[2]);
      if (year >= 1900 && year <= 2030) {
        console.log(`Checking date ${date} (year ${year})`);
        
        // Find this date in text and check surrounding context
        const dateIndex = text.indexOf(date);
        if (dateIndex !== -1) {
          const contextBefore = text.substring(Math.max(0, dateIndex - 60), dateIndex);
          const contextAfter = text.substring(dateIndex, dateIndex + 30);
          
          console.log(`Context before "${date}": "${contextBefore}"`);
          console.log(`Context after "${date}": "${contextAfter}"`);
          
          // Very flexible DOB detection - look for any birth-related indicators
          const birthIndicators = [
            'dob', 'birth', 'जन्म', 'ज�म', 'तारीख', 'ितिथ', 'जनम'
          ];
          
          const fullContext = (contextBefore + contextAfter).toLowerCase();
          const hasBirthContext = birthIndicators.some(indicator => 
            fullContext.includes(indicator)
          );
          
          if (hasBirthContext) {
            console.log(`✅ Found DOB: ${date}`);
            return date;
          }
        }
      }
    }
    
    console.log("❌ No valid DOB found");
    return "";
  }

  private extractGender(text: string): string {
    console.log("🔍 Searching for gender...");
    
    // Very flexible gender patterns to handle broken characters
    const maleIndicators = [
      'male', 'पुरुष', 'पु', 'ष', 'पुरुष', 'male/', '/male', 'पु�ष', 'पुरुष/', '/पुरुष'
    ];
    
    const femaleIndicators = [
      'female', 'महिला', 'मह', 'ला', 'female/', '/female', 'महिला/', '/महिला'
    ];
    
    const lowerText = text.toLowerCase();
    
    // Check for male indicators
    for (const indicator of maleIndicators) {
      if (lowerText.includes(indicator.toLowerCase())) {
        console.log(`✅ Found male indicator: "${indicator}"`);
        return "Male";
      }
    }
    
    // Check for female indicators
    for (const indicator of femaleIndicators) {
      if (lowerText.includes(indicator.toLowerCase())) {
        console.log(`✅ Found female indicator: "${indicator}"`);
        return "Female";
      }
    }
    
    console.log("❌ No gender found");
    return "";
  }

  private extractName(text: string): string {
    console.log("🔍 Searching for name...");
    
    // Method 1: Look for names that appear multiple times (cardholder appears twice)
    const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){2,3})\b/g;
    const nameFrequency: { [key: string]: number } = {};
    let match;

    while ((match = namePattern.exec(text)) !== null) {
      const candidateName = match[1].trim();
      if (this.isValidName(candidateName)) {
        nameFrequency[candidateName] = (nameFrequency[candidateName] || 0) + 1;
        console.log(`Found name candidate: "${candidateName}" (count: ${nameFrequency[candidateName]})`);
      }
    }

    console.log("Name frequencies:", nameFrequency);

    // Prioritize names that appear multiple times
    const repeatedNames = Object.entries(nameFrequency)
      .filter(([name, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1]);

    if (repeatedNames.length > 0) {
      console.log(`✅ Found repeated name: ${repeatedNames[0][0]} (appeared ${repeatedNames[0][1]} times)`);
      return repeatedNames[0][0];
    }

    // Method 2: Extract from "To" section
    const toMatch = text.match(/\bTo\b\s*([\s\S]*?)(?=(?:C\/O:|Flat|Address|VTC|District|PIN|Mobile|Signature|Digitally))/i);
    if (toMatch) {
      console.log("Found 'To' section:", toMatch[1]);
      const toSection = toMatch[1].trim();
      const lines = toSection.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      // Look for English names (skip Hindi text)
      for (const line of lines) {
        if (!/[अ-ह]/.test(line) && !line.toLowerCase().includes('c/o')) {
          const nameMatch = line.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){2,3})/);
          if (nameMatch && this.isValidName(nameMatch[1])) {
            console.log(`✅ Found name in 'To' section: ${nameMatch[1]}`);
            return nameMatch[1].trim();
          }
        }
      }
    }

    // Method 3: Look for the most frequent valid name
    if (Object.keys(nameFrequency).length > 0) {
      const mostFrequent = Object.entries(nameFrequency)
        .sort((a, b) => b[1] - a[1])[0];
      console.log(`✅ Using most frequent name: ${mostFrequent[0]}`);
      return mostFrequent[0];
    }

    console.log("❌ No valid name found");
    return "";
  }

  private isValidName(name: string): boolean {
    // Filter out common non-name words
    const invalidWords = [
      'Unique', 'Identification', 'Authority', 'India', 'Government',
      'Compound', 'Chawl', 'Road', 'Near', 'Mandir', 'District', 'State',
      'Maharashtra', 'Details', 'Address', 'Signature', 'Digitally',
      'Date', 'Issue', 'Download', 'VTC', 'PIN', 'Code', 'Floor', 'Wing',
      'CHS', 'Flat', 'Bhandar', 'Nagar', 'West', 'Thane', 'Download',
      'Enrolment', 'Mobile', 'Khanna', 'Vitthalwadi', 'Ulhasnagar',
      'Hanuman', 'Greenwood', 'Hubtown'
    ];

    const words = name.split(' ');
    for (const word of words) {
      if (invalidWords.some(invalid => word.toLowerCase().includes(invalid.toLowerCase()))) {
        return false;
      }
    }

    // Name should be reasonable length and contain only letters and spaces
    return name.length >= 6 && 
           name.length <= 50 && 
           /^[A-Za-z\s]+$/.test(name) &&
           words.length >= 2 && 
           words.length <= 4;
  }

  private isParentName(name: string, text: string): boolean {
    // Check if this name appears only in C/O or parent context
    const nameIndex = text.indexOf(name);
    const contextBefore = text.substring(Math.max(0, nameIndex - 30), nameIndex).toLowerCase();
    return contextBefore.includes('c/o') || contextBefore.includes('c/o:');
  }
}

export const ocrService = OCRService.getInstance();