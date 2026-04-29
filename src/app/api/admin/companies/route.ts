import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Business from "@/models/Business";
import bcrypt from "bcryptjs";

// GET /api/admin/companies — list all companies (super admin only)
export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== "super_admin") {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        await connectDB();
        const companies = await User.find({ role: "company_admin" }).sort({ createdAt: -1 }).lean();
        return NextResponse.json({ companies });
    } catch (error) {
        console.error("GET /api/admin/companies error:", error);
        return NextResponse.json(
            { error: "Failed to fetch companies" },
            { status: 500 }
        );
    }
}

// POST /api/admin/companies — create a new company (super admin only)
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== "super_admin") {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        await connectDB();
        const body = await req.json();
        const { email, password, companyName } = body;

        if (!email || !password || !companyName) {
            return NextResponse.json(
                { error: "All fields are required" },
                { status: 400 }
            );
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return NextResponse.json(
                { error: "Email already exists" },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        const company = await User.create({
            email: email.toLowerCase(),
            password: hashedPassword,
            role: "company_admin",
            companyName,
        });

        return NextResponse.json({ company }, { status: 201 });
    } catch (error) {
        console.error("POST /api/admin/companies error:", error);
        return NextResponse.json(
            { error: "Failed to create company" },
            { status: 500 }
        );
    }
}