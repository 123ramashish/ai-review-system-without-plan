import mongoose, { Document, Model, Schema } from "mongoose";
import { FeedbackTone } from "@/types";

export interface IFeedbackSuggestion extends Document {
  businessId: mongoose.Types.ObjectId;
  sessionId: string;
  suggestedText: string;
  rating: number;
  tone: FeedbackTone;
  keywords: string[];
  wasUsed: boolean;
  wasEdited: boolean;
  finalText?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FeedbackSuggestionSchema = new Schema<IFeedbackSuggestion>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    suggestedText: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    tone: {
      type: String,
      enum: ["enthusiastic", "professional", "casual", "detailed"],
      required: true,
    },
    keywords: [
      {
        type: String,
        trim: true,
      },
    ],
    wasUsed: {
      type: Boolean,
      default: false,
    },
    wasEdited: {
      type: Boolean,
      default: false,
    },
    finalText: {
      type: String,
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
  }
);

FeedbackSuggestionSchema.index({ businessId: 1, sessionId: 1 });
FeedbackSuggestionSchema.index({ createdAt: -1 });

const FeedbackSuggestion: Model<IFeedbackSuggestion> =
  mongoose.models.FeedbackSuggestion ||
  mongoose.model<IFeedbackSuggestion>(
    "FeedbackSuggestion",
    FeedbackSuggestionSchema
  );

export default FeedbackSuggestion;
