// OTP Service for generating and validating OTPs
export interface OTPData {
  otp: string;
  phoneNumber: string;
  timestamp: number;
  attempts: number;
}

export class OTPService {
  private static instance: OTPService;
  private otpStorage: Map<string, OTPData> = new Map();
  private readonly OTP_VALIDITY_MINUTES = 5;
  private readonly MAX_ATTEMPTS = 3;

  private constructor() {}

  public static getInstance(): OTPService {
    if (!OTPService.instance) {
      OTPService.instance = new OTPService();
    }
    return OTPService.instance;
  }

  public generateOTP(): string {
    // Generate 4-digit OTP
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  public storeOTP(phoneNumber: string, otp: string): void {
    this.otpStorage.set(phoneNumber, {
      otp,
      phoneNumber,
      timestamp: Date.now(),
      attempts: 0
    });

    // Auto-cleanup after validity period
    setTimeout(() => {
      this.otpStorage.delete(phoneNumber);
    }, this.OTP_VALIDITY_MINUTES * 60 * 1000);
  }

  public validateOTP(phoneNumber: string, enteredOTP: string): {
    valid: boolean;
    message: string;
    attemptsLeft?: number;
  } {
    const otpData = this.otpStorage.get(phoneNumber);

    if (!otpData) {
      return {
        valid: false,
        message: 'OTP not found or expired. Please request a new OTP.'
      };
    }

    // Check if OTP has expired
    const now = Date.now();
    const otpAge = now - otpData.timestamp;
    const maxAge = this.OTP_VALIDITY_MINUTES * 60 * 1000;

    if (otpAge > maxAge) {
      this.otpStorage.delete(phoneNumber);
      return {
        valid: false,
        message: 'OTP has expired. Please request a new OTP.'
      };
    }

    // Increment attempts
    otpData.attempts++;

    // Check max attempts
    if (otpData.attempts > this.MAX_ATTEMPTS) {
      this.otpStorage.delete(phoneNumber);
      return {
        valid: false,
        message: 'Maximum attempts exceeded. Please request a new OTP.'
      };
    }

    // Validate OTP
    if (otpData.otp === enteredOTP) {
      this.otpStorage.delete(phoneNumber);
      return {
        valid: true,
        message: 'OTP verified successfully!'
      };
    }

    const attemptsLeft = this.MAX_ATTEMPTS - otpData.attempts;
    return {
      valid: false,
      message: `Invalid OTP. ${attemptsLeft} attempts remaining.`,
      attemptsLeft
    };
  }

  public isOTPPending(phoneNumber: string): boolean {
    return this.otpStorage.has(phoneNumber);
  }

  public clearOTP(phoneNumber: string): void {
    this.otpStorage.delete(phoneNumber);
  }
}

export const otpService = OTPService.getInstance();