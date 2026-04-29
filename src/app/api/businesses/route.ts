import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Business from "@/models/Business";
import { generateQRCode } from "@/lib/qr-generator";
import { v4 as uuidv4 } from "uuid";

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
    const { name, description, category, googleReviewUrl } = body;

    if (!name || !description || !category || !googleReviewUrl) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const qrToken = uuidv4();
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://ai-review-system-without-plan.vercel.app/";

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

    return NextResponse.json({ business }, { status: 201 });
  } catch (error) {
    console.error("POST /api/businesses error:", error);
    return NextResponse.json(
      { error: "Failed to create business" },
      { status: 500 }
    );
  }
}
