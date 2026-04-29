import mongoose, { Document, Model, Schema } from "mongoose";

export interface IUser extends Document {
    email: string;
    password: string;
    role: "super_admin" | "company_admin";
    companyName?: string; // For company admins
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            trim: true,
            lowercase: true,
        },
        password: {
            type: String,
            required: [true, "Password is required"],
        },
        role: {
            type: String,
            enum: ["super_admin", "company_admin"],
            required: true,
        },
        companyName: {
            type: String,
            trim: true,
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

// Indexes
UserSchema.index({ email: 1 }, { unique: true });

const User: Model<IUser> =
    mongoose.models.User ||
    mongoose.model<IUser>("User", UserSchema);

export default User;