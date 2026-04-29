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
      maxlength: [500, "Description cannot exceed 500 characters"],
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
      index: true,
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
  },
  {
    timestamps: true,
  }
);

// Indexes
BusinessSchema.index({ qrToken: 1 });
BusinessSchema.index({ createdAt: -1 });

const Business: Model<IBusiness> =
  mongoose.models.Business ||
  mongoose.model<IBusiness>("Business", BusinessSchema);

export default Business;
