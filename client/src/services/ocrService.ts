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
      console.log("File info:", file.name, file.type, file.size);
      
      if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
        return {
          success: false,
          error: "Only PDF Aadhaar files are supported."
        };
      }

      // Extract text from PDF
      console.log("Starting PDF processing...");
      const extractedText = await this.processPDF(file);
      console.log("Extracted text length:", extractedText.length);
      console.log("Extracted text sample:", extractedText.substring(0, 200));

      // Parse Aadhaar info
      const aadharData = this.extractAadharInfo(extractedText);
      if (aadharData) {
        console.log("Successfully extracted Aadhaar data:", aadharData);
        return { success: true, data: aadharData };
      }

      return {
        success: false,
        error: "Could not extract Aadhaar details. Please upload a valid UIDAI PDF."
      };
    } catch (err) {
      console.error("PDF processing error:", err);
      return {
        success: false,
        error: `Failed to process Aadhaar PDF: ${err instanceof Error ? err.message : 'Unknown error'}`
      };
    }
  }

  private async processPDF(file: File): Promise<string> {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let extractedText = "";

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

  // ✅ Aadhaar info parser (simplified version)
  private extractAadharInfo(text: string): AadharData | null {
    const aadharMatch = text.match(/\b\d{4}\s\d{4}\s\d{4}\b/);
    const dobMatch = text.match(/(\d{2}\/\d{2}\/\d{4})/);
    const genderMatch = text.match(/male|female/i);
    const nameMatch = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/);

    if (!aadharMatch || !dobMatch || !genderMatch || !nameMatch) return null;

    return {
      name: nameMatch[1],
      dob: dobMatch[1],
      aadhar: aadharMatch[0].replace(/\s/g, ""),
      gender: genderMatch[0].toLowerCase() === "male" ? "Male" : "Female"
    };
  }
}

export const ocrService = OCRService.getInstance();