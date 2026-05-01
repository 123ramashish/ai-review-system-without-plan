import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Business from "@/models/Business";
import User from "@/models/User";
import { generateQRCode } from "@/lib/qr-generator";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

function resolveAppUrl(req: NextRequest): string {
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const forwardedHost = req.headers.get("x-forwarded-host");

  if (forwardedHost) {
    const protocol = forwardedProto || "https";
    return `${protocol}://${forwardedHost}`;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    return appUrl.replace(/\/$/, "");
  }

  return "https://ai-review-system-without-plan.vercel.app";
}

// GET /api/businesses — list all businesses
export async function GET() {
  try {
    await connectDB();
    const businesses = await Business.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ businesses });
  } catch (error) {
    console.error("GET /api/businesses error:", error);
    return NextResponse.json(
      { error: "Failed to fetch businesses" },
      { status: 500 }
    );
  }
}

// POST /api/businesses — create a new business
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { name, description, category, googleReviewUrl, adminEmail, adminPassword } = body;

    if (!name || !description || !category || !googleReviewUrl || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: "All fields including Admin Email and Password are required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: adminEmail });
    if (existingUser) {
      return NextResponse.json({ error: "Admin email already in use" }, { status: 400 });
    }

    const qrToken = uuidv4();
    const appUrl = resolveAppUrl(req);

    // Generate QR code image
    const qrCode = await generateQRCode(qrToken, appUrl);

    const business = await Business.create({
      name,
      description,
      category,
      googleReviewUrl,
      qrToken,
      qrCode,
    });

    // Create Admin User
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await User.create({
      email: adminEmail,
      passwordHash,
      role: "admin",
      businessId: business._id,
    });

    return NextResponse.json({ business }, { status: 201 });
  } catch (error) {
    console.error("POST /api/businesses error:", error);
    return NextResponse.json(
      { error: "Failed to create business" },
      { status: 500 }
    );
  }
}
