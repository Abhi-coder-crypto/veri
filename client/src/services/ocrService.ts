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

      // If basic extraction failed, try fallback extraction from any text
      console.log("⚠️ Basic extraction failed, trying fallback...");
      const fallbackData = this.extractFallbackData(extractedText);
      if (fallbackData) {
        console.log("✅ Fallback extraction successful:", fallbackData);
        return {
          success: true,
          data: fallbackData,
        };
      }

      console.log("❌ All extraction methods failed");
      return {
        success: false,
        error: "Could not extract data from document. Please try a different file.",
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

    // Extract text from all pages with better multilingual handling
    for (let i = 1; i <= pdf.numPages; i++) {
      console.log(`📄 Processing page ${i}/${pdf.numPages}`);
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      console.log(`Found ${content.items.length} text items on page ${i}`);

      // Enhanced text extraction with better Unicode handling
      const pageItems = content.items
        .map((item: any) => {
          if ("str" in item && item.str) {
            const text = item.str.trim();
            // Include all text, both Hindi and English
            if (text.length > 0) {
              return {
                text: text,
                x: item.transform?.[4] || 0,
                y: item.transform?.[5] || 0,
                width: item.width || 0,
                height: item.height || 0,
                isNumeric: /\d/.test(text),
                isEnglish: /[A-Za-z]/.test(text),
                isHindi: /[\u0900-\u097F]/.test(text)
              };
            }
          }
          return null;
        })
        .filter((item: any) => item !== null);

      allTextItems.push(...pageItems);

      // Enhanced text building - preserve all content
      const completeText = this.buildMultilingualText(pageItems);
      extractedText += completeText + "\n";

      console.log(`📄 Page ${i} extracted ${pageItems.length} text items`);
      console.log(`📄 Page ${i} text sample:`, completeText.substring(0, 300));
      
      // Log important patterns found
      const numbers = pageItems.filter((item: any) => item.isNumeric).map((item: any) => item.text);
      const englishText = pageItems.filter((item: any) => item.isEnglish).map((item: any) => item.text);
      console.log(`📄 Page ${i} numbers found:`, numbers.slice(0, 10));
      console.log(`📄 Page ${i} English text:`, englishText.slice(0, 10));
    }

    const finalText = extractedText.trim();
    console.log("🔍 Final extracted text length:", finalText.length);
    console.log("🔍 Final text preview:", finalText.substring(0, 1000));
    
    // Extract and log all numeric patterns found
    const numericPatterns = finalText.match(/\d+/g) || [];
    console.log("🔢 All numeric patterns found:", numericPatterns);
    
    // Extract and log potential Aadhaar numbers
    const aadhaarPatterns = finalText.match(/\d{4}\s*\d{4}\s*\d{4}/g) || [];
    console.log("🆔 Potential Aadhaar patterns:", aadhaarPatterns);

    return finalText;
  }

  private buildMultilingualText(pageItems: any[]): string {
    if (!pageItems.length) return "";
    
    // Sort by position (Y first, then X) to maintain reading order
    const sortedItems = pageItems.sort((a: any, b: any) => {
      const yDiff = Math.abs(b.y - a.y);
      if (yDiff < 8) { // Same line threshold (increased for better grouping)
        return a.x - b.x; // Sort by X position (left to right)
      }
      return b.y - a.y; // Sort by Y position (top to bottom)
    });
    
    let result = "";
    let currentLineY = sortedItems[0]?.y || 0;
    let currentLine: string[] = [];
    
    for (const item of sortedItems) {
      const yDiff = Math.abs(item.y - currentLineY);
      
      if (yDiff > 8) { // New line threshold
        if (currentLine.length > 0) {
          // Join with appropriate spacing
          const lineText = currentLine.join(" ");
          result += lineText + "\n";
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
    
    // Additional pass: ensure numeric patterns are properly spaced
    result = result.replace(/(\d)\s+(\d)/g, '$1 $2'); // Normalize number spacing
    result = result.replace(/(\d{4})\s*(\d{4})\s*(\d{4})/g, '$1 $2 $3'); // Format Aadhaar numbers
    
    return result;
  }

  private extractAadharInfo(text: string): AadharData | null {
    console.log("=== Starting Aadhaar extraction ===");
    console.log("Full extracted text:", text);
    
    // Extract Aadhaar Number - exactly 12 digits, exclude VID (16 digits)
    const aadhaarMatches = text.match(/\b\d{4}\s*\d{4}\s*\d{4}\b/g) || [];
    const aadhaar = aadhaarMatches.find(num => num.replace(/\s/g, '').length === 12)?.replace(/\s/g, '') || '';
    
    // Extract DOB - look for date patterns near DOB label
    const dobPattern = /(?:Date of Birth|DOB|जन्म तारीख)[\/:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i;
    const dobMatch = text.match(dobPattern);
    const dob = dobMatch?.[1] || '';
    
    // Extract Gender - both Hindi and English, check for patterns
    let gender = '';
    if (text.match(/(FEMALE|Female|महिला)/i)) {
      gender = 'Female';
    } else if (text.match(/(MALE|Male|पुरुष)/i)) {
      gender = 'Male';
    }
    
    console.log("Gender extraction debug:", { 
      foundFemale: text.match(/(FEMALE|Female|महिला)/i), 
      foundMale: text.match(/(MALE|Male|पुरुष)/i),
      finalGender: gender 
    });
    
    // Extract Name - Find full name, avoid "To" prefix and address parts
    const cleanText = text.replace(/\bTo\b/g, ''); // Remove "To" prefixes
    const namePatterns = [
      /([A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+)/g, // Three names
      /([A-Z][a-z]+\s+[A-Z][a-z]+)/g // Two names
    ];
    
    let name = '';
    for (const pattern of namePatterns) {
      const matches = cleanText.match(pattern) || [];
      // Find name that's not an address component
      const validName = matches.find(n => 
        !n.includes('COMPOUND') && 
        !n.includes('ROAD') && 
        !n.includes('MANDIR') &&
        !n.includes('CHAWL') &&
        !n.includes('Authority') &&
        n.length > 5
      );
      if (validName) {
        name = validName.trim();
        break;
      }
    }
    
    console.log("Found patterns:", { aadhaar, name, dob, gender });
    
    // Return data if we found essential fields
    if (aadhaar && name && dob) {
      const result = {
        name: name,
        dob: dob,
        aadhar: aadhaar,
        gender: gender || 'Not specified'
      };
      console.log("✅ Returning extracted data:", result);
      return result;
    }
    
    console.log("❌ Essential fields missing - need Aadhaar, name, and DOB");
    return null;
  }

  private extractFallbackData(text: string): AadharData | null {
    console.log("🔄 Attempting fallback extraction...");
    
    // More aggressive pattern matching for any data
    const allNumbers = text.match(/\d{4}\s*\d{4}\s*\d{4}/g) || [];
    const allDates = text.match(/\d{1,2}\/\d{1,2}\/\d{4}/g) || [];
    const allNames = text.match(/[A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?/g) || [];
    
    console.log("Fallback found:", { numbers: allNumbers, dates: allDates, names: allNames });
    
    if (allNumbers.length > 0 && allDates.length > 0 && allNames.length > 0) {
      return {
        aadhar: allNumbers[0].replace(/\s/g, ''),
        dob: allDates[0],
        name: allNames[0],
        gender: text.match(/(MALE|FEMALE|Male|Female|पुरुष|महिला)/)?.[0] || 'Not specified'
      };
    }
    
    return null;
  }

  // Specific extraction methods as requested
  private extractAadharNumberSpecific(text: string): string {
    console.log("🔍 AADHAAR EXTRACTION - Looking for 12-digit number appearing 3 times...");
    
    // Aadhaar pattern - the 12-digit number that appears 3 times (not VID which is 16 digits)
    const aadhaarPattern = /(\d{4})\s+(\d{4})\s+(\d{4})/g;
    const candidates: string[] = [];
    const frequency: { [key: string]: number } = {};
    let match;
    
    while ((match = aadhaarPattern.exec(text)) !== null) {
      const fullNumber = match[1] + match[2] + match[3];
      candidates.push(fullNumber);
      frequency[fullNumber] = (frequency[fullNumber] || 0) + 1;
      console.log(`Found 12-digit candidate: ${match[1]} ${match[2]} ${match[3]} = ${fullNumber}`);
    }
    
    console.log("All 12-digit candidates:", candidates);
    console.log("Frequency count:", frequency);
    
    // Find the number that appears most frequently (should be 3 times for Aadhaar)
    let mostFrequent = "";
    let maxCount = 0;
    
    for (const [number, count] of Object.entries(frequency)) {
      console.log(`Number ${number} appears ${count} times`);
      if (count > maxCount && this.isValidAadhaarNumber(number)) {
        mostFrequent = number;
        maxCount = count;
      }
    }
    
    if (mostFrequent && maxCount >= 2) { // Should appear at least twice
      console.log(`✅ Aadhaar found: ${mostFrequent} (appears ${maxCount} times)`);
      return mostFrequent;
    }
    
    console.log("❌ No valid Aadhaar number found with sufficient frequency");
    return "";
  }
  
  private extractDOBSpecific(text: string): string {
    console.log("📅 DOB EXTRACTION - Looking for DD/MM/YYYY pattern...");
    
    // DOB - specific date format
    const dobPattern = /DOB:\s*(\d{2}\/\d{2}\/\d{4})/i;
    const generalDatePattern = /(\d{2}\/\d{2}\/\d{4})/g;
    
    // Try specific DOB label first
    let match = text.match(dobPattern);
    if (match) {
      console.log(`✅ DOB found with label: ${match[1]}`);
      return match[1];
    }
    
    // Find all date patterns and validate
    const allDates = text.match(generalDatePattern) || [];
    console.log("All date patterns found:", allDates);
    
    for (const date of allDates) {
      const parts = date.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const year = parseInt(parts[2]);
        
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2025) {
          console.log(`✅ Valid DOB found: ${date}`);
          return date;
        }
      }
    }
    
    console.log("❌ No valid DOB found");
    return "";
  }
  
  private extractGenderSpecific(text: string): string {
    console.log("⚧ GENDER EXTRACTION - Looking for MALE/FEMALE/पुरुष/महिला...");
    
    // Gender - either English or Hindi
    const genderPattern = /(MALE|FEMALE|पुरुष|महिला)/i;
    
    const match = text.match(genderPattern);
    if (match) {
      const gender = match[1].toUpperCase();
      console.log(`✅ Gender found: ${gender}`);
      
      if (gender === 'MALE' || gender === 'पुरुष') {
        return 'Male';
      } else if (gender === 'FEMALE' || gender === 'महिला') {
        return 'Female';
      }
    }
    
    console.log("❌ No gender found");
    return "";
  }
  
  private extractNameSpecific(text: string): string {
    console.log("👤 NAME EXTRACTION - Looking for English text after 'To'...");
    
    // Name - English text after 'To' line
    const namePattern = /To\s*\n.*?\n([A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+)/;
    
    let match = text.match(namePattern);
    if (match && this.isValidName(match[1])) {
      console.log(`✅ Name found after 'To': ${match[1]}`);
      return match[1];
    }
    
    // Alternative pattern - look for 3-word English names near 'To'
    const alternativePattern = /To[\s\S]{0,200}?([A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+)/i;
    match = text.match(alternativePattern);
    if (match && this.isValidName(match[1])) {
      console.log(`✅ Name found near 'To': ${match[1]}`);
      return match[1];
    }
    
    // Look for any 3-word English name pattern
    const allNameMatches = text.match(/[A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+/g) || [];
    console.log("All 3-word English patterns found:", allNameMatches);
    
    for (const candidate of allNameMatches) {
      if (this.isValidName(candidate)) {
        console.log(`✅ Valid name found: ${candidate}`);
        return candidate;
      }
    }
    
    console.log("❌ No valid name found");
    return "";
  }

  private extractAadharNumberOld(text: string): string {
    console.log("🔍 Searching for Aadhaar numbers...");

    // Enhanced patterns for multilingual PDFs with robust number extraction
    const patterns = [
      // Pattern 1: Explicit Aadhaar labels (Hindi/English)
      /(?:Aadhaar\s*(?:No\.?|Number|no\.?)\s*:?\s*|आधार\s*(?:संख्या|क्रमांक)\s*:?\s*)(\d{4}\s*\d{4}\s*\d{4})/i,

      // Pattern 2: Before VID (very strong indicator)
      /(\d{4}\s*\d{4}\s*\d{4})\s+(?:VID\s*:?\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4})/i,

      // Pattern 3: After mobile number in document structure  
      /(?:Mobile|मोबाइल)\s*:?\s*\d{10}[\s\S]{1,200}?(\d{4}\s*\d{4}\s*\d{4})(?!\s*\d{4})/i,

      // Pattern 4: Near state/address information
      /(?:Maharashtra|महाराष्ट्र|State|राज्य)[\s\S]{1,300}?(\d{4}\s*\d{4}\s*\d{4})\s+(?:VID|व्हीआईडी)/i,

      // Pattern 5: After gender field
      /(?:MALE|FEMALE|Male|Female|पुरुष|महिला|लिंग)[\s\S]{1,200}?(\d{4}\s*\d{4}\s*\d{4})/i,

      // Pattern 6: After PIN code
      /(?:PIN\s*(?:Code)?|पिन\s*कोड)\s*:?\s*\d{6}[\s\S]{1,150}?(\d{4}\s*\d{4}\s*\d{4})/i,

      // Pattern 7: In document footer/signature area
      /(?:Address|पत्ता)[\s\S]{1,400}?(\d{4}\s*\d{4}\s*\d{4})\s+(?:VID|व्हीआईडी)/i,
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

  private extractDOBOld(text: string): string {
    console.log("🔍 Searching for DOB...");

    // Enhanced multilingual patterns for DOB extraction
    const dobPatterns = [
      // Explicit DOB labels (Hindi/English)
      /(?:Date\s*of\s*Birth|DOB|जन्म\s*तारीख|जन्म\s*दिनांक)\s*[:\/]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
      
      // Common Hindi patterns
      /(?:जन्म)\s*[:\/]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
      
      // Date patterns near gender (common in Aadhaar layout)
      /(?:MALE|FEMALE|पुरुष|महिला)\s*[\s\S]{0,50}?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
      
      // Standalone date patterns with validation
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/g,
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

  private extractGenderOld(text: string): string {
    console.log("🔍 Searching for gender...");

    // Enhanced multilingual gender extraction
    const genderPatterns = [
      // Explicit gender patterns
      /(?:Gender|लिंग)\s*:?\s*(Female|Male|महिला|पुरुष)/i,
      
      // Standalone gender terms
      /\b(Female|FEMALE|महिला)\b/i,
      /\b(Male|MALE|पुरुष)\b/i,
      
      // Gender near DOB patterns
      /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}\s+([MALF]+[ALE]*|पुरुष|महिला)/i,
    ];

    for (const pattern of genderPatterns) {
      const match = text.match(pattern);
      if (match) {
        const gender = match[1].toLowerCase();
        if (gender.includes('female') || gender.includes('महिला')) {
          console.log("✅ Found gender: Female");
          return "Female";
        }
        if (gender.includes('male') || gender.includes('पुरुष')) {
          console.log("✅ Found gender: Male");
          return "Male";
        }
      }
    }

    console.log("❌ No gender found");
    return "";
  }

  private extractNameOld(text: string): string {
    console.log("🔍 Searching for name...");

    // Enhanced multilingual name extraction
    
    // Pattern 1: After "To" in address section (improved)
    const toMatch = text.match(
      /\bTo\b\s*([\s\S]*?)(?=(?:C\/O|S\/O|D\/O|W\/O|Address|VTC|District|PIN|Mobile|Signature|KHANNA|खन्ना))/i,
    );
    if (toMatch) {
      const toSection = toMatch[1].trim();
      const lines = toSection
        .split(/\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 2);

      for (const line of lines) {
        // Look for English names (skip Hindi but include mixed content)
        if (/[A-Za-z]/.test(line) && !this.isAddress(line)) {
          const cleanLine = line.replace(/[^A-Za-z\s]/g, "").trim();
          if (this.isValidName(cleanLine)) {
            console.log(`✅ Found name in 'To' section: ${cleanLine}`);
            return cleanLine;
          }
        }
      }
    }

    // Pattern 2: Name near document structure elements
    const nameNearStructure = text.match(/(?:To|Aadhaar|आधार)[\s\S]{0,200}?([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
    if (nameNearStructure && this.isValidName(nameNearStructure[1])) {
      console.log(`✅ Found name near structure: ${nameNearStructure[1]}`);
      return nameNearStructure[1];
    }

    // Pattern 3: Look for repeated English names (cardholder name appears multiple times)
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
