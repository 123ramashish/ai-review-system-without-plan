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

export interface GenerateFeedbackRequest {
  businessId: string;
  rating: StarRating;
  tone: FeedbackTone;
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
