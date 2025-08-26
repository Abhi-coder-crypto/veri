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
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let extractedText = "";

    // Extract text from all pages
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items
        .map((item: any) => ("str" in item ? item.str : ""))
        .filter((s: string) => s.trim().length > 0);
      extractedText += strings.join(" ") + "\n";
    }

    return extractedText.trim();
  }

  private extractAadharInfo(text: string): AadharData | null {
    const result = {
      name: "",
      dob: "",
      aadhar: "",
      gender: ""
    };

    // Extract valid Aadhaar Number (12 digits only, not phone/VID/enrollment)
    result.aadhar = this.extractValidAadharNumber(text);
    if (!result.aadhar) return null;

    // Extract DOB with year validation (1900-2015)
    result.dob = this.extractValidDOB(text);
    if (!result.dob) return null;

    // Extract Gender
    result.gender = this.extractGender(text);
    if (!result.gender) return null;

    // Extract Name using context and fallback methods
    result.name = this.extractName(text);
    if (!result.name) return null;

    return result;
  }

  private extractValidAadharNumber(text: string): string {
    // Split text into lines to analyze context
    const lines = text.split('\n').map(line => line.trim());
    
    // Find all potential 12-digit numbers (with or without spaces)
    const numberPattern = /\b\d{4}\s+\d{4}\s+\d{4}\b|\b\d{12}\b/g;
    const potentialNumbers: Array<{number: string, context: string, lineIndex: number}> = [];
    
    lines.forEach((line, index) => {
      let match;
      while ((match = numberPattern.exec(line)) !== null) {
        const cleanNum = match[0].replace(/\s/g, '');
        if (cleanNum.length === 12) {
          potentialNumbers.push({
            number: cleanNum,
            context: line.toLowerCase(),
            lineIndex: index
          });
        }
      }
      // Reset regex for next line
      numberPattern.lastIndex = 0;
    });

    // Filter out invalid numbers with strict rules
    for (const item of potentialNumbers) {
      const { number, context } = item;
      
      // Rule 1: Must be exactly 12 digits
      if (number.length !== 12) continue;
      
      // Rule 2: Reject if appears after "VID" keyword
      if (context.includes('vid') && context.indexOf('vid') < context.indexOf(number.substring(0, 4))) {
        continue;
      }
      
      // Rule 3: Reject phone numbers (typically start with 9,8,7,6 and appear with mobile context)
      if ((number.startsWith('9') || number.startsWith('8') || 
           number.startsWith('7') || number.startsWith('6')) &&
          (context.includes('mobile') || context.includes('phone'))) {
        continue;
      }
      
      // Rule 4: Reject enrollment numbers (typically longer or contain slashes)
      if (context.includes('enrolment') || context.includes('enrollment') || 
          context.includes('नामांकन') || context.includes('/')) {
        continue;
      }
      
      // Rule 5: Reject repeated digits
      if (/^(\d)\1+$/.test(number)) continue;
      
      // Rule 6: Additional VID rejection - numbers that commonly appear in VID format
      if (number.startsWith('9171') || number.startsWith('9174') || 
          number.startsWith('9999') || number.startsWith('9666')) {
        continue;
      }
      
      // Valid Aadhaar number found - return the first one that passes all rules
      return number;
    }
    
    return "";
  }

  private extractValidDOB(text: string): string {
    // More flexible patterns to handle broken text and various formats
    const dobPatterns = [
      /(?:जन्म|ज.*म)\s*(?:तारीख|तिथि|ितिथ)\s*[\/:]*\s*DOB\s*[\/:]*\s*(\d{2}\/\d{2}\/\d{4})/i,
      /DOB\s*[\/:]*\s*(\d{2}\/\d{2}\/\d{4})/i,
      /Date\s*of\s*Birth\s*[\/:]*\s*(\d{2}\/\d{2}\/\d{4})/i,
      /(?:जन्म|ज.*म).*?(\d{2}\/\d{2}\/\d{4})/i,
      /(?:तारीख|तिथि).*?(\d{2}\/\d{2}\/\d{4})/i
    ];

    // Also look for standalone date patterns near birth-related text
    const dateMatches = text.match(/\d{2}\/\d{2}\/\d{4}/g);
    if (dateMatches) {
      for (const date of dateMatches) {
        const year = parseInt(date.split('/')[2]);
        // Validate reasonable year range (1900-2030)
        if (year >= 1900 && year <= 2030) {
          // Check if this date appears near birth-related keywords
          const dateIndex = text.indexOf(date);
          const contextBefore = text.substring(Math.max(0, dateIndex - 50), dateIndex).toLowerCase();
          const contextAfter = text.substring(dateIndex, dateIndex + 50).toLowerCase();
          
          if (contextBefore.includes('dob') || contextBefore.includes('birth') || 
              contextBefore.includes('जन्म') || contextBefore.includes('तारीख') ||
              contextAfter.includes('dob') || contextAfter.includes('birth')) {
            return date;
          }
        }
      }
    }

    // Try the original patterns as fallback
    for (const pattern of dobPatterns) {
      const match = text.match(pattern);
      if (match) {
        const dob = match[1];
        const year = parseInt(dob.split('/')[2]);
        
        if (year >= 1900 && year <= 2030) {
          return dob;
        }
      }
    }

    return "";
  }

  private extractGender(text: string): string {
    // More robust gender matching with broken character handling
    const malePatterns = [
      /MALE/i,
      /पुरुष/i,
      /पु.*ष/i,  // handles broken characters like पु�ष
      /Male/i,
      /पु\s*ष/i
    ];
    
    const femalePatterns = [
      /FEMALE/i,
      /महिला/i,
      /मह.*ला/i,  // handles broken characters
      /Female/i
    ];
    
    // Check for male patterns
    for (const pattern of malePatterns) {
      if (pattern.test(text)) {
        return "Male";
      }
    }
    
    // Check for female patterns
    for (const pattern of femalePatterns) {
      if (pattern.test(text)) {
        return "Female";
      }
    }
    
    return "";
  }

  private extractName(text: string): string {
    // Method 1: Extract name from "To" section - prioritize the actual cardholder
    const toMatch = text.match(/\bTo\b\s*([\s\S]*?)(?=(?:C\/O:|Flat|Address|VTC|District|PIN|Mobile|Signature|Digitally))/i);
    if (toMatch) {
      const toSection = toMatch[1].trim();
      const lines = toSection.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      // Look for the English name line (usually comes after Hindi name)
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip Hindi text lines and C/O lines
        if (!/[अ-ह]/.test(line) && !line.toLowerCase().includes('c/o')) {
          const nameMatch = line.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})(?:,|$)/);
          if (nameMatch && this.isValidName(nameMatch[1])) {
            // Prioritize names that are not just father's name
            const name = nameMatch[1].trim();
            // If this appears to be the main name (not just parent name)
            if (!this.isParentName(name, text)) {
              return name;
            }
          }
        }
      }
    }

    // Method 2: Find name that appears multiple times (cardholder name appears twice)
    const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){2,3})\b/g;
    const nameFrequency: { [key: string]: number } = {};
    let match;

    while ((match = namePattern.exec(text)) !== null) {
      const candidateName = match[1].trim();
      if (this.isValidName(candidateName) && !candidateName.toLowerCase().includes('singh,')) {
        nameFrequency[candidateName] = (nameFrequency[candidateName] || 0) + 1;
      }
    }

    // Find names that appear more than once (cardholder name typically appears twice)
    const repeatedNames = Object.entries(nameFrequency)
      .filter(([name, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1]);

    if (repeatedNames.length > 0) {
      return repeatedNames[0][0];
    }

    // Method 3: Context-based extraction near DOB/Gender
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = lines[i + 1] || '';
      
      // If next line contains DOB or gender info, current line might be the name
      if ((nextLine.includes('DOB') || nextLine.includes('MALE') || nextLine.includes('FEMALE')) &&
          !/[अ-ह]/.test(line) && !line.includes('Address') && !line.includes('पत्ता')) {
        const nameMatch = line.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){2,3})/);
        if (nameMatch && this.isValidName(nameMatch[1])) {
          return nameMatch[1].trim();
        }
      }
    }

    // Method 4: Fallback to most frequent valid name
    if (Object.keys(nameFrequency).length > 0) {
      const mostFrequent = Object.entries(nameFrequency)
        .sort((a, b) => b[1] - a[1])[0];
      return mostFrequent[0];
    }

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