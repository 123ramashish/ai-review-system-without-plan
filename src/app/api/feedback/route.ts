import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import FeedbackSuggestion from "@/models/FeedbackSuggestion";
import ScanEvent from "@/models/ScanEvent";
import Business from "@/models/Business";

// POST /api/feedback — mark a suggestion as used/submitted
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { dbId, finalText, wasEdited, sessionId, businessId } = body;

    if (!dbId || !sessionId) {
      return NextResponse.json(
        { error: "dbId and sessionId are required" },
        { status: 400 }
      );
    }

    // Update the feedback suggestion
    await FeedbackSuggestion.findByIdAndUpdate(dbId, {
      wasUsed: true,
      wasEdited: wasEdited || false,
      finalText: finalText || undefined,
    });

    // Mark scan as converted
    await ScanEvent.findOneAndUpdate(
      { sessionId },
      { converted: true }
    );

    // Increment submission counter
    if (businessId) {
      await Business.findByIdAndUpdate(businessId, {
        $inc: { totalSubmissions: 1 },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/feedback error:", error);
    return NextResponse.json(
      { error: "Failed to record feedback submission" },
      { status: 500 }
    );
  }
}

// GET /api/feedback?businessId=xxx — get feedback analytics for a business
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");

    if (!businessId) {
      return NextResponse.json(
        { error: "businessId is required" },
        { status: 400 }
      );
    }

    const feedbacks = await FeedbackSuggestion.find({ businessId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const stats = {
      total: feedbacks.length,
      used: feedbacks.filter((f) => f.wasUsed).length,
      edited: feedbacks.filter((f) => f.wasEdited).length,
      byRating: [1, 2, 3, 4, 5].map((r) => ({
        rating: r,
        count: feedbacks.filter((f) => f.rating === r).length,
      })),
      byTone: ["enthusiastic", "professional", "casual", "detailed"].map(
        (t) => ({
          tone: t,
          count: feedbacks.filter((f) => f.tone === t).length,
        })
      ),
    };

    return NextResponse.json({ feedbacks, stats });
  } catch (error) {
    console.error("GET /api/feedback error:", error);
    return NextResponse.json(
      { error: "Failed to fetch feedback" },
      { status: 500 }
    );
  }
}
