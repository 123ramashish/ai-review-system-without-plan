export interface Business {
  _id: string;
  name: string;
  description: string;
  category: string;
  googleReviewUrl: string;
  qrCode?: string;
  qrToken: string;
  totalScans: number;
  totalSubmissions: number;
  rating?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeedbackSuggestion {
  _id: string;
  businessId: string;
  sessionId: string;
  suggestedText: string;
  rating: number;
  tone: FeedbackTone;
  keywords: string[];
  wasUsed: boolean;
  wasEdited: boolean;
  finalText?: string;
  createdAt: Date;
}

export interface ScanEvent {
  _id: string;
  businessId: string;
  sessionId: string;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  converted: boolean;
  createdAt: Date;
}

export type FeedbackTone = "enthusiastic" | "professional" | "casual" | "detailed";

export type StarRating = 1 | 2 | 3 | 4 | 5;

/** Language for generated review text (offline + AI prompts). */
export type ReviewLanguage = "english" | "hindi" | "hinglish";

export const REVIEW_LANGUAGE_OPTIONS: {
  value: ReviewLanguage;
  label: string;
  hint: string;
}[] = [
  { value: "english", label: "English", hint: "English only" },
  { value: "hindi", label: "हिंदी", hint: "Devanagari Hindi" },
  { value: "hinglish", label: "Hinglish", hint: "Hindi + English mix" },
];

export interface GenerateFeedbackRequest {
  businessId: string;
  rating: StarRating;
  tone: FeedbackTone;
  /** Defaults to hinglish when omitted */
  reviewLanguage?: ReviewLanguage;
  keywords?: string[];
  sessionId: string;
}

export interface GenerateFeedbackResponse {
  suggestions: GeneratedSuggestion[];
  sessionId: string;
}

export interface GeneratedSuggestion {
  id: string;
  text: string;
  tone: FeedbackTone;
  rating: StarRating;
  keywords: string[];
}

export interface QRScanResponse {
  business: Business;
  sessionId: string;
  googleReviewUrl: string;
}

export interface DashboardStats {
  totalBusinesses: number;
  totalScans: number;
  totalSubmissions: number;
  conversionRate: number;
  recentScans: ScanEvent[];
}
