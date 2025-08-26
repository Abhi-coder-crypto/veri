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
    // Find all 12-digit sequences
    const allNumbers = text.match(/\d{12}|\d{4}\s+\d{4}\s+\d{4}/g) || [];
    
    for (const num of allNumbers) {
      const cleanNum = num.replace(/\s/g, '');
      
      // Must be exactly 12 digits
      if (cleanNum.length !== 12) continue;
      
      // Ignore VIDs (typically start with 9174 or 9999)
      if (cleanNum.startsWith('9174') || cleanNum.startsWith('9999')) continue;
      
      // Ignore phone numbers (typically start with 9, 8, 7, 6)
      if (cleanNum.startsWith('9') || cleanNum.startsWith('8') || 
          cleanNum.startsWith('7') || cleanNum.startsWith('6')) continue;
      
      // Ignore sequences of same digit (like 000000000000)
      if (/^(\d)\1+$/.test(cleanNum)) continue;
      
      // Valid Aadhaar number found
      return cleanNum;
    }
    
    return "";
  }

  private extractValidDOB(text: string): string {
    const dobPatterns = [
      /(?:जन्म\s*तारीख|DOB):\s*(\d{2}\/\d{2}\/\d{4})/i,
      /DOB:\s*(\d{2}\/\d{2}\/\d{4})/i,
      /Date\s*of\s*Birth:\s*(\d{2}\/\d{2}\/\d{4})/i
    ];

    for (const pattern of dobPatterns) {
      const match = text.match(pattern);
      if (match) {
        const dob = match[1];
        const year = parseInt(dob.split('/')[2]);
        
        // Validate year range (1900-2015)
        if (year >= 1900 && year <= 2015) {
          return dob;
        }
      }
    }

    return "";
  }

  private extractGender(text: string): string {
    const genderMatch = text.match(/(पुरुष|MALE|महिला|FEMALE)/i);
    if (genderMatch) {
      const genderText = genderMatch[1].toLowerCase();
      return (genderText.includes('male') || genderText.includes('पुरुष')) ? "Male" : "Female";
    }
    return "";
  }

  private extractName(text: string): string {
    // Method 1: Extract name after "To" section
    const toMatch = text.match(/\bTo\b\s+(.*?)(?=\n|$)/i);
    if (toMatch) {
      const afterTo = toMatch[1].trim();
      // Look for English name pattern in the "To" section
      const nameMatch = afterTo.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/);
      if (nameMatch) {
        const name = nameMatch[1].trim();
        if (this.isValidName(name)) {
          return name;
        }
      }
    }

    // Method 2: Find name before address context
    const addressKeywords = ['Compound', 'Chawl', 'Road', 'Near', 'District', 'State', 'PIN'];
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      const nextLine = lines[i + 1]?.trim() || '';
      
      // Check if next line contains address keywords
      const hasAddressKeywords = addressKeywords.some(keyword => 
        nextLine.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (hasAddressKeywords) {
        const nameMatch = line.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/);
        if (nameMatch && this.isValidName(nameMatch[1])) {
          return nameMatch[1].trim();
        }
      }
    }

    // Method 3: Find most frequent proper noun (fallback)
    const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/g;
    const foundNames: string[] = [];
    let match;

    while ((match = namePattern.exec(text)) !== null) {
      const candidateName = match[1].trim();
      if (this.isValidName(candidateName)) {
        foundNames.push(candidateName);
      }
    }

    // Return most frequent valid name
    if (foundNames.length > 0) {
      const nameCounts: { [key: string]: number } = {};
      foundNames.forEach(name => {
        nameCounts[name] = (nameCounts[name] || 0) + 1;
      });

      const mostFrequent = Object.entries(nameCounts)
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
      'Date', 'Issue', 'Download', 'VTC', 'PIN', 'Code'
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
}

export const ocrService = OCRService.getInstance();