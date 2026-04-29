import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Business from "@/models/Business";
import ScanEvent from "@/models/ScanEvent";
import { v4 as uuidv4 } from "uuid";

// POST /api/scan — record a QR scan event
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const business = await Business.findOne({ qrToken: token }).lean();
    if (!business) {
      return NextResponse.json(
        { error: "Invalid QR code" },
        { status: 404 }
      );
    }

    const sessionId = uuidv4();
    const userAgent = req.headers.get("user-agent") || undefined;
    const ipAddress =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      undefined;

    // Record scan event
    await ScanEvent.create({
      businessId: business._id,
      sessionId,
      userAgent,
      ipAddress,
      converted: false,
    });

    // Increment scan counter
    await Business.findByIdAndUpdate(business._id, {
      $inc: { totalScans: 1 },
    });

    return NextResponse.json({
      business,
      sessionId,
      googleReviewUrl: business.googleReviewUrl,
    });
  } catch (error) {
    console.error("POST /api/scan error:", error);
    return NextResponse.json(
      { error: "Failed to process scan" },
      { status: 500 }
    );
  }
}
