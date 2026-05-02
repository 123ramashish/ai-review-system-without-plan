import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Business from "@/models/Business";
import User from "@/models/User";
import { generateQRCode } from "@/lib/qr-generator";
import { requireBusinessAccess, requireSuperAdmin } from "@/lib/verify-admin";

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

// GET /api/businesses/[id] — super admin or owning business admin
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await requireBusinessAccess(req, params.id);
    if (!access) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const business = await Business.findById(params.id).lean();
    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }
    return NextResponse.json({ business });
  } catch (error) {
    console.error("GET /api/businesses/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch business" },
      { status: 500 }
    );
  }
}

// PATCH /api/businesses/[id] — super admin only
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireSuperAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const body = await req.json();

    // If googleReviewUrl changed, regenerate QR code
    const existing = await Business.findById(params.id);
    if (!existing) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    if (body.regenerateQR) {
      const appUrl = resolveAppUrl(req);
      body.qrCode = await generateQRCode(existing.qrToken, appUrl);
      delete body.regenerateQR;
    }

    const business = await Business.findByIdAndUpdate(
      params.id,
      { $set: body },
      { new: true, runValidators: true }
    ).lean();

    return NextResponse.json({ business });
  } catch (error) {
    console.error("PATCH /api/businesses/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update business" },
      { status: 500 }
    );
  }
}

// DELETE /api/businesses/[id] — super admin only
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireSuperAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    await Business.findByIdAndDelete(params.id);
    await User.deleteMany({ businessId: params.id });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/businesses/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete business" },
      { status: 500 }
    );
  }
}

