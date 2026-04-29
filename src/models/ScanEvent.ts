import mongoose, { Document, Model, Schema } from "mongoose";

export interface IScanEvent extends Document {
  businessId: mongoose.Types.ObjectId;
  sessionId: string;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  converted: boolean;
  createdAt: Date;
}

const ScanEventSchema = new Schema<IScanEvent>(
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
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    location: {
      type: String,
    },
    converted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

ScanEventSchema.index({ businessId: 1, createdAt: -1 });

const ScanEvent: Model<IScanEvent> =
  mongoose.models.ScanEvent ||
  mongoose.model<IScanEvent>("ScanEvent", ScanEventSchema);

export default ScanEvent;
