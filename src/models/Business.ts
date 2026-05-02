import mongoose, { Document, Model, Schema } from "mongoose";

export interface IBusiness extends Document {
  name: string;
  description: string;
  category: string;
  googleReviewUrl: string;
  qrCode?: string;
  qrToken: string;
  totalScans: number;
  totalSubmissions: number;
  rating?: number;
  subscriptionStatus: "active" | "past_due" | "canceled";
  subscriptionAmount: number;
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BusinessSchema = new Schema<IBusiness>(
  {
    name: {
      type: String,
      required: [true, "Business name is required"],
      trim: true,
      maxlength: [100, "Business name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Business description is required"],
      trim: true,
      maxlength: [10000, "Description cannot exceed 10000 characters"],
    },
    category: {
      type: String,
      required: [true, "Business category is required"],
      enum: [
        "restaurant",
        "cafe",
        "retail",
        "hotel",
        "salon",
        "gym",
        "medical",
        "automotive",
        "services",
        "other",
      ],
      default: "other",
    },
    googleReviewUrl: {
      type: String,
      required: [true, "Google Review URL is required"],
      trim: true,
    },
    qrCode: {
      type: String, // Base64 PNG or SVG of QR code
    },
    qrToken: {
      type: String,
      required: true,
      unique: true,
    },
    totalScans: {
      type: Number,
      default: 0,
    },
    totalSubmissions: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    subscriptionStatus: {
      type: String,
      enum: ["active", "past_due", "canceled"],
      default: "active",
    },
    subscriptionAmount: {
      type: Number,
      default: 1000,
    },
    subscriptionStartDate: {
      type: Date,
      default: Date.now,
    },
    subscriptionEndDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes (qrToken indexed via unique)
BusinessSchema.index({ createdAt: -1 });

const Business: Model<IBusiness> =
  mongoose.models.Business ||
  mongoose.model<IBusiness>("Business", BusinessSchema);

export default Business;
