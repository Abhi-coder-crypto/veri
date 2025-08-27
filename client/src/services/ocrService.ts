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
    console.log("🚀 Starting Aadhaar document processing...");
    console.log("📁 File details:", {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    try {
      // Accept PDFs even if browser reports as application/octet-stream
      const isPDF =
        file.type.includes("pdf") ||
        file.type === "application/octet-stream" ||
        file.name.toLowerCase().endsWith(".pdf");

      console.log("📋 File type check:", {
        isPDF,
        type: file.type,
        name: file.name,
      });

      if (!isPDF) {
        console.log("❌ File rejected: not a PDF");
        return {
          success: false,
          error: "Only PDF Aadhaar files are supported.",
        };
      }

      console.log("✅ PDF file accepted, starting text extraction...");

      // Extract text from PDF
      const extractedText = await this.processPDF(file);

      console.log(
        `📝 Text extraction result: ${extractedText.length} characters extracted`,
      );

      if (!extractedText || extractedText.length < 100) {
        console.log("❌ Text extraction failed or insufficient text");
        return {
          success: false,
          error:
            "Unable to extract text from PDF. Please ensure it's a valid UIDAI e-Aadhaar PDF.",
        };
      }

      console.log("✅ Text extracted successfully, starting data parsing...");

      // Parse Aadhaar info with improved validation
      const aadharData = this.extractAadharInfo(extractedText);

      if (aadharData) {
        console.log("✅ Aadhaar data extracted successfully:", aadharData);
        return {
          success: true,
          data: aadharData,
        };
      }

      console.log("❌ Failed to parse Aadhaar data from extracted text");
      return {
        success: false,
        error:
          "Could not extract valid Aadhaar details from PDF. Please ensure all required information is clearly visible.",
      };
    } catch (err) {
      console.error("💥 Error in processAadharDocument:", err);
      return {
        success: false,
        error: `Failed to process Aadhaar PDF: ${err instanceof Error ? err.message : "Unknown error"}`,
      };
    }
  }

  private async processPDF(file: File): Promise<string> {
    // Configure PDF.js worker for Vite/Replit
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

    const arrayBuffer = await file.arrayBuffer();

    try {
      console.log("📄 Opening PDF document...");
      const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer,
        verbosity: 0, // Reduce PDF.js internal logging
      }).promise;
      console.log(`📄 PDF opened successfully. Pages: ${pdf.numPages}`);

      const text = await this.extractTextFromPDF(pdf);

      if (text.length < 10) {
        console.log("⚠️ Very little text extracted:", text.length, "chars");
        throw new Error("No meaningful text extracted from PDF");
      }

      console.log("✅ PDF processing completed successfully");
      return text;
    } catch (error) {
      console.error("❌ Error processing PDF:", error);

      // Try with common password if PDF fails to open
      const password = prompt(
        "PDF processing failed. If this is a password-protected Aadhaar PDF:\\n\\n" +
          "Enter the password (first 4 letters of name + birth year, e.g., ABHI1999):\\n\\n" +
          "Or click Cancel if the PDF should work without password:",
      );

      if (password) {
        console.log(`🔑 Retrying with password...`);
        try {
          const pdfWithPassword = await pdfjsLib.getDocument({
            data: arrayBuffer,
            password: password,
          }).promise;

          const text = await this.extractTextFromPDF(pdfWithPassword);
          return text;
        } catch (passwordError) {
          console.error("❌ Failed with password:", passwordError);
          throw new Error(
            "Could not process PDF with or without password. Please check the file.",
          );
        }
      } else {
        throw new Error(
          `PDF processing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }
  }

  private async extractTextFromPDF(pdf: any): Promise<string> {
    let extractedText = "";
    let allTextItems: any[] = [];

    // Extract text from all pages
    for (let i = 1; i <= pdf.numPages; i++) {
      console.log(`📄 Processing page ${i}/${pdf.numPages}`);
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      console.log(`Found ${content.items.length} text items on page ${i}`);

      // Process each text item with position info for better extraction
      const pageItems = content.items
        .map((item: any) => {
          if ("str" in item && item.str && item.str.trim()) {
            return {
              text: item.str.trim(),
              x: item.transform?.[4] || 0,
              y: item.transform?.[5] || 0,
              width: item.width || 0,
              height: item.height || 0
            };
          }
          return null;
        })
        .filter((item: any) => item !== null);

      allTextItems.push(...pageItems);

      // Method 1: Simple concatenation with spaces
      const simpleText = pageItems.map((item: any) => item.text).join(" ");
      
      // Method 2: Position-aware text extraction (sort by Y position, then X)
      const sortedItems = pageItems.sort((a: any, b: any) => {
        const yDiff = Math.abs(b.y - a.y);
        if (yDiff < 5) { // Same line threshold
          return a.x - b.x; // Sort by X position
        }
        return b.y - a.y; // Sort by Y position (top to bottom)
      });
      
      const structuredText = this.buildStructuredText(sortedItems);
      
      console.log(`📄 Page ${i} simple text sample:`, simpleText.substring(0, 200));
      console.log(`📄 Page ${i} structured text sample:`, structuredText.substring(0, 200));
      
      // Use the longer/better extracted text
      const pageText = structuredText.length > simpleText.length ? structuredText : simpleText;
      extractedText += pageText + "\n";
    }

    const finalText = extractedText.trim();
    console.log("🔍 Final extracted text length:", finalText.length);
    console.log("🔍 Final text sample:", finalText.substring(0, 800));
    
    // Additional logging for debugging
    console.log("🔍 All unique text fragments found:", 
      Array.from(new Set(allTextItems.map(item => item.text))).slice(0, 50)
    );

    return finalText;
  }

  private buildStructuredText(sortedItems: any[]): string {
    if (!sortedItems.length) return "";
    
    let result = "";
    let currentLineY = sortedItems[0]?.y || 0;
    let currentLine: string[] = [];
    
    for (const item of sortedItems) {
      const yDiff = Math.abs(item.y - currentLineY);
      
      if (yDiff > 5) { // New line threshold
        if (currentLine.length > 0) {
          result += currentLine.join(" ") + "\n";
          currentLine = [];
        }
        currentLineY = item.y;
      }
      
      currentLine.push(item.text);
    }
    
    // Add the last line
    if (currentLine.length > 0) {
      result += currentLine.join(" ");
    }
    
    return result;
  }

  private extractAadharInfo(text: string): AadharData | null {
    console.log("=== Starting Aadhaar extraction ===");
    console.log("Text sample:", text.substring(0, 500));

    const result = {
      name: "",
      dob: "",
      aadhar: "",
      gender: "",
    };

    // Extract Aadhaar Number using improved logic
    result.aadhar = this.extractAadharNumber(text);
    console.log("Extracted Aadhaar:", result.aadhar);
    if (!result.aadhar) {
      console.log("❌ No valid Aadhaar number found");
      return null;
    }

    // Extract DOB
    result.dob = this.extractDOB(text);
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

    // Extract Name
    result.name = this.extractName(text);
    console.log("Extracted Name:", result.name);
    if (!result.name) {
      console.log("❌ No valid Name found");
      return null;
    }

    console.log("✅ All fields extracted successfully:", result);
    return result;
  }

  private extractAadharNumber(text: string): string {
    console.log("🔍 Searching for Aadhaar numbers...");

    // Enhanced patterns with better number type distinction
    const patterns = [
      // Pattern 1: Explicit Aadhaar labels (highest priority)
      /(?:Aadhaar\s*(?:No\.?|Number)\s*:?\s*|आधार\s*संख्या\s*:?\s*)(\d{4}\s*\d{4}\s*\d{4})/i,

      // Pattern 2: After mobile but ensuring it's not part of VID
      /Mobile\s*:?\s*\d{10}[\s\S]*?(\d{4}\s*\d{4}\s*\d{4})(?!\s*\d{4})/i,

      // Pattern 3: Before VID with clear separation (for your format)
      /(\d{4}\s*\d{4}\s*\d{4})\s+VID\s*:?\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}/i,

      // Pattern 4: Aadhaar appearing near the end of document (common in e-Aadhaar)
      /(?:महाराष्ट्र|Maharashtra|Address)[\s\S]*?(\d{4}\s*\d{4}\s*\d{4})\s+VID/i,

      // Pattern 5: In document structure after gender and DOB
      /(?:MALE|FEMALE|पुरुष|महिला)[\s\S]*?(\d{4}\s*\d{4}\s*\d{4})/i,

      // Pattern 6: Multiple occurrence pattern (Aadhaar often appears multiple times)
      /(\d{4}\s*\d{4}\s*\d{4})[\s\S]*?\1/i,

      // Pattern 7: After PIN code in address section  
      /PIN\s*(?:Code)?\s*:?\s*\d{6}[\s\S]*?(\d{4}\s*\d{4}\s*\d{4})/i,
    ];

    // Try specific patterns first (highest confidence)
    for (let i = 0; i < patterns.length; i++) {
      const match = text.match(patterns[i]);
      if (match) {
        let aadhaar = match[1].replace(/\s/g, "");
        if (this.isValidAadhaarNumber(aadhaar)) {
          console.log(`✅ Found Aadhaar using pattern ${i + 1}: ${aadhaar}`);
          return aadhaar;
        }
      }
    }

    // Fallback: Find all 12-digit patterns and validate with enhanced logic
    const allNumbersPattern = /\b(\d{4})\s*(\d{4})\s*(\d{4})\b/g;
    const candidates: Array<{ number: string; position: number }> = [];
    let match;

    while ((match = allNumbersPattern.exec(text)) !== null) {
      const fullMatch = match[1] + match[2] + match[3];
      if (fullMatch.length === 12) {
        candidates.push({
          number: fullMatch,
          position: match.index || 0,
        });
      }
    }

    console.log(`Found ${candidates.length} potential 12-digit numbers:`, candidates.map(c => c.number));

    // Enhanced validation with better context analysis
    const validCandidates: Array<{ number: string; score: number; reason: string }> = [];
    
    for (const candidate of candidates) {
      if (this.isValidAadhaarNumber(candidate.number)) {
        const contextResult = this.analyzeNumberContext(candidate.number, candidate.position, text);
        console.log(`Context analysis for ${candidate.number}:`, contextResult);
        
        if (contextResult.isLikelyAadhaar) {
          // Calculate confidence score
          let score = 1;
          if (contextResult.reason.includes("VID")) score += 3;
          if (contextResult.reason.includes("Aadhaar label")) score += 5;
          if (contextResult.reason.includes("PIN code")) score += 2;
          if (contextResult.reason.includes("gender")) score += 2;
          
          validCandidates.push({
            number: candidate.number,
            score: score,
            reason: contextResult.reason
          });
        }
      }
    }
    
    // Return the highest scoring candidate
    if (validCandidates.length > 0) {
      const best = validCandidates.sort((a, b) => b.score - a.score)[0];
      console.log(`✅ Best Aadhaar found: ${best.number} (score: ${best.score}, reason: ${best.reason})`);
      return best.number;
    }

    console.log("❌ No valid Aadhaar number found");
    return "";
  }

  private isValidAadhaarNumber(number: string): boolean {
    // Basic validation
    if (number.length !== 12) return false;
    if (/^0+$/.test(number)) return false; // All zeros
    if (/^(\d)\1+$/.test(number)) return false; // All same digit

    // Aadhaar numbers don't start with 0 or 1
    if (number.startsWith("0") || number.startsWith("1")) return false;

    // Apply Verhoeff algorithm check for Aadhaar validation
    return this.verhoeffCheck(number);
  }

  private verhoeffCheck(num: string): boolean {
    // Simplified Verhoeff algorithm for Aadhaar validation
    const d = [
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
      [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
      [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
      [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
      [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
      [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
      [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
      [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
      [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
    ];

    const p = [
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
      [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
      [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
      [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
      [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
      [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
      [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
    ];

    let c = 0;
    const myArray = num.split("").reverse();

    for (let i = 0; i < myArray.length; i++) {
      c = d[c][p[(i + 1) % 8][parseInt(myArray[i])]];
    }

    return c === 0;
  }

  private analyzeNumberContext(number: string, position: number, text: string): { isLikelyAadhaar: boolean; reason: string } {
    // Find the actual position of the spaced version
    const spacedNumber = number.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3');
    let actualIndex = text.indexOf(spacedNumber);
    if (actualIndex === -1) {
      actualIndex = text.indexOf(number);
    }
    if (actualIndex === -1) {
      actualIndex = position;
    }

    const contextBefore = text
      .substring(Math.max(0, actualIndex - 150), actualIndex)
      .toLowerCase();
    const contextAfter = text
      .substring(actualIndex, actualIndex + number.length + 150)
      .toLowerCase();

    // POSITIVE indicators (strongly suggest this is Aadhaar)
    if (contextBefore.includes("aadhaar") || contextBefore.includes("आधार")) {
      return { isLikelyAadhaar: true, reason: "Found near Aadhaar label" };
    }

    // Check if this is definitely a VID (16 digits) - but be more precise
    const vidPattern = new RegExp(`VID\\s*:?\\s*\\d{4}\\s*\\d{4}\\s*\\d{4}\\s*\\d{4}`);
    const isPartOfVid = text.includes(`VID : ${number.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3')}`);
    if (isPartOfVid || (contextBefore.includes("vid :") && contextAfter.match(/^\s*\d{4}$/))) {
      return { isLikelyAadhaar: false, reason: "Part of 16-digit VID" };
    }

    // Check if this is definitely a mobile number (preceded by mobile label)
    if (contextBefore.match(/mobile\s*:?\s*$/i) || contextBefore.match(/phone\s*:?\s*$/i)) {
      return { isLikelyAadhaar: false, reason: "Mobile number" };
    }

    // Check if this appears to be an enrollment number
    if (contextBefore.match(/enrol(?:l)?ment\s*(?:no|number)\s*:?\s*$/i)) {
      return { isLikelyAadhaar: false, reason: "Enrollment number" };
    }

    // POSITIVE context indicators (specific to your PDF format)
    
    // Check if it appears before VID (very strong indicator for your format)
    if (contextAfter.includes("vid :") || contextAfter.includes("vid:")) {
      return { isLikelyAadhaar: true, reason: "Found before VID (typical Aadhaar position)" };
    }
    
    // Check if it's repeated multiple times (Aadhaar often appears multiple times)
    const formattedNumber = number.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3');
    const occurrences = (text.match(new RegExp(formattedNumber.replace(/\s/g, '\\s*'), 'g')) || []).length;
    if (occurrences > 1) {
      return { isLikelyAadhaar: true, reason: `Found multiple times (${occurrences} occurrences)` };
    }

    if (contextBefore.includes("pin") && contextBefore.includes("code")) {
      return { isLikelyAadhaar: true, reason: "Found after PIN code (typical Aadhaar position)" };
    }

    if (contextBefore.includes("gender") || contextBefore.includes("लिंग")) {
      return { isLikelyAadhaar: true, reason: "Found after gender field" };
    }

    if (contextBefore.includes("address") && !contextBefore.includes("mobile")) {
      return { isLikelyAadhaar: true, reason: "Found in address section" };
    }

    // Check if it appears in document structure after personal details
    if (contextBefore.match(/(male|female|पुरुष|महिला)/i) && !contextBefore.includes("mobile")) {
      return { isLikelyAadhaar: true, reason: "Found after gender information" };
    }

    // Check if it appears after Maharashtra or state information
    if (contextBefore.includes("maharashtra") || contextBefore.includes("महाराष्ट्र")) {
      return { isLikelyAadhaar: true, reason: "Found after state information" };
    }

    // Default: likely Aadhaar if no strong negative indicators
    return { isLikelyAadhaar: true, reason: "No negative indicators found" };
  }

  private extractDOB(text: string): string {
    console.log("🔍 Searching for DOB...");

    // Multiple patterns for DOB extraction
    const dobPatterns = [
      /(?:Date\s*of\s*Birth|DOB|जन्म.*?तारीख)\s*:?\s*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
      /(?:Birth|जन्म)\s*:?\s*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
      /(\d{2}[\/\-]\d{2}[\/\-]\d{4})/g, // Fallback for any date pattern
    ];

    for (const pattern of dobPatterns) {
      const match = text.match(pattern);
      if (match) {
        const date = match[1];
        // Validate date format and range
        const parts = date.split(/[\/\-]/);
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]);
          const year = parseInt(parts[2]);

          if (
            day >= 1 &&
            day <= 31 &&
            month >= 1 &&
            month <= 12 &&
            year >= 1900 &&
            year <= 2025
          ) {
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

    const lowerText = text.toLowerCase();

    // Check for female indicators first (more specific)
    if (lowerText.includes("female") || lowerText.includes("महिला")) {
      console.log("✅ Found gender: Female");
      return "Female";
    }

    // Check for male indicators
    if (lowerText.includes("male") || lowerText.includes("पुरुष")) {
      console.log("✅ Found gender: Male");
      return "Male";
    }

    console.log("❌ No gender found");
    return "";
  }

  private extractName(text: string): string {
    console.log("🔍 Searching for name...");

    // Pattern 1: After "To" in address section
    const toMatch = text.match(
      /\bTo\b\s*([\s\S]*?)(?=(?:C\/O|S\/O|D\/O|W\/O|Address|VTC|District|PIN|Mobile|Signature))/i,
    );
    if (toMatch) {
      const toSection = toMatch[1].trim();
      const lines = toSection
        .split(/\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 2);

      for (const line of lines) {
        // Skip Hindi text and addresses
        if (!/[अ-ह]/.test(line) && !this.isAddress(line)) {
          const cleanLine = line.replace(/[^\w\s]/g, "").trim();
          if (this.isValidName(cleanLine)) {
            console.log(`✅ Found name in 'To' section: ${cleanLine}`);
            return cleanLine;
          }
        }
      }
    }

    // Pattern 2: Look for repeated names (cardholder name appears multiple times)
    const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/g;
    const nameFrequency: { [key: string]: number } = {};
    let match;

    while ((match = namePattern.exec(text)) !== null) {
      const candidateName = match[1].trim();
      if (this.isValidName(candidateName) && !this.isAddress(candidateName)) {
        nameFrequency[candidateName] = (nameFrequency[candidateName] || 0) + 1;
      }
    }

    // Find the most frequent valid name
    const sortedNames = Object.entries(nameFrequency)
      .filter(([name, count]) => count >= 1)
      .sort((a, b) => b[1] - a[1]);

    if (sortedNames.length > 0) {
      console.log(
        `✅ Found name: ${sortedNames[0][0]} (frequency: ${sortedNames[0][1]})`,
      );
      return sortedNames[0][0];
    }

    console.log("❌ No valid name found");
    return "";
  }

  private isValidName(name: string): boolean {
    // Filter out common non-name words and addresses
    const invalidWords = [
      "unique",
      "identification",
      "authority",
      "india",
      "government",
      "compound",
      "chawl",
      "road",
      "near",
      "mandir",
      "district",
      "state",
      "maharashtra",
      "details",
      "address",
      "signature",
      "digitally",
      "download",
      "vtc",
      "pin",
      "code",
      "floor",
      "wing",
      "chs",
      "flat",
      "society",
      "nagar",
      "west",
      "east",
      "north",
      "south",
      "thane",
      "enrolment",
      "mobile",
      "khanna",
      "vitthalwadi",
      "ulhasnagar",
      "hanuman",
      "greenwood",
      "hubtown",
      "issued",
      "date",
    ];

    const words = name.toLowerCase().split(" ");
    for (const word of words) {
      if (invalidWords.includes(word)) {
        return false;
      }
    }

    // Name should be reasonable length and contain only letters and spaces
    return (
      name.length >= 4 &&
      name.length <= 50 &&
      /^[A-Za-z\s]+$/.test(name) &&
      words.length >= 2 &&
      words.length <= 4
    );
  }

  private isAddress(text: string): boolean {
    const addressKeywords = [
      "compound",
      "chawl",
      "road",
      "street",
      "lane",
      "plot",
      "flat",
      "building",
      "society",
      "nagar",
      "colony",
      "area",
      "sector",
      "phase",
      "wing",
      "floor",
      "room",
      "house",
      "pin",
      "vtc",
      "district",
      "state",
      "near",
      "opp",
      "opposite",
    ];

    const lowerText = text.toLowerCase();
    return addressKeywords.some((keyword) => lowerText.includes(keyword));
  }
}

export const ocrService = OCRService.getInstance();
