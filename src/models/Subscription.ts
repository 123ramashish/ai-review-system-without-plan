import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISubscription extends Document {
    userId: mongoose.Types.ObjectId; // Company admin user
    businessId: mongoose.Types.ObjectId;
    month: number; // 1-12
    year: number;
    reviewCount: number; // Number of reviews generated this month
    maxReviews: number; // 1000 for monthly subscription
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        businessId: {
            type: Schema.Types.ObjectId,
            ref: "Business",
            required: true,
            index: true,
        },
        month: {
            type: Number,
            required: true,
            min: 1,
            max: 12,
        },
        year: {
            type: Number,
            required: true,
        },
        reviewCount: {
            type: Number,
            default: 0,
        },
        maxReviews: {
            type: Number,
            default: 1000,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for unique subscription per business per month
SubscriptionSchema.index({ businessId: 1, month: 1, year: 1 }, { unique: true });

const Subscription: Model<ISubscription> =
    mongoose.models.Subscription ||
    mongoose.model<ISubscription>("Subscription", SubscriptionSchema);

export default Subscription;