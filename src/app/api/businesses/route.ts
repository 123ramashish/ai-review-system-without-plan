import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Business from "@/models/Business";
import { generateQRCode } from "@/lib/qr-generator";
import { v4 as uuidv4 } from "uuid";

// GET /api/businesses — list businesses for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    let businesses;
    if (session.user.role === "super_admin") {
      // Super admin sees all businesses
      businesses = await Business.find({}).sort({ createdAt: -1 }).lean();
    } else {
      // Company admin sees only their businesses
      businesses = await Business.find({ ownerId: session.user.id }).sort({ createdAt: -1 }).lean();
    }

    return NextResponse.json({ businesses });
  } catch (error) {
    console.error("GET /api/businesses error:", error);
    return NextResponse.json(
      { error: "Failed to fetch businesses" },
      { status: 500 }
    );
  }
}

// POST /api/businesses — create a new business (super admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "super_admin") {
      return NextResponse.json(
        { error: "Unauthorized - Only super admin can create businesses" },
        { status: 401 }
      );
    }

    await connectDB();
    const body = await req.json();
    const { name, description, category, googleReviewUrl, ownerId } = body;

    if (!name || !description || !category || !googleReviewUrl || !ownerId) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const qrToken = uuidv4();
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Generate QR code image
    const qrCode = await generateQRCode(qrToken, appUrl);

    const business = await Business.create({
      name,
      description,
      category,
      googleReviewUrl,
      qrToken,
      qrCode,
      ownerId,
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
