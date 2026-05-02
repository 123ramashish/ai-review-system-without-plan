import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Business from "@/models/Business";
import { verifyAdminToken } from "@/lib/verify-admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    const payload = await verifyAdminToken(req);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (payload.role !== "admin" || !payload.businessId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const business = await Business.findById(payload.businessId).lean();

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    return NextResponse.json({ business });
  } catch (error) {
    console.error("GET /api/admin/business error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
