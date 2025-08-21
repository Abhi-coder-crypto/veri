// SMS Service for sending OTP (Browser-compatible version)
export interface SMSResponse {
  success: boolean;
  message: string;
  sid?: string;
}

export class SMSService {
  private static instance: SMSService;

  private constructor() {
    // Browser-compatible constructor - no Twilio client initialization
  }

  public static getInstance(): SMSService {
    if (!SMSService.instance) {
      SMSService.instance = new SMSService();
    }
    return SMSService.instance;
  }

  public async sendOTP(phoneNumber: string, otp: string): Promise<SMSResponse> {
    try {
      // Format phone number for display
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      
      // Browser demo mode - show OTP in alert
      console.log(`📱 Demo SMS: OTP ${otp} would be sent to ${formattedPhone}`);
      
      // Show alert to user in demo mode
      alert(`Demo Mode: Your OTP is ${otp}\n\nTo receive real SMS:\n1. Sign up at https://console.twilio.com/\n2. Get Account SID, Auth Token, and Phone Number\n3. Add them to your .env file\n4. Implement server-side SMS sending`);
      
      return {
        success: true,
        message: `Demo: OTP ${otp} displayed (would be sent to ${formattedPhone})`,
        sid: 'demo_' + Date.now()
      };
    } catch (error: any) {
      console.error('SMS demo failed:', error);
      
      return {
        success: false,
        message: 'Demo mode error. Please try again.'
      };
    }
  }

  private formatPhoneNumber(phoneNumber: string): string {
    // Remove any non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Add country code for India if not present
    if (cleaned.length === 10) {
      return '+91' + cleaned;
    }
    
    // If already has country code
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return '+' + cleaned;
    }
    
    // For other countries, you can add more logic here
    return '+91' + cleaned.slice(-10);
  }
}

export const smsService = SMSService.getInstance();