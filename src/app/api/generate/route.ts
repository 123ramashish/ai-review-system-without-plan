import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Business from "@/models/Business";
import FeedbackSuggestion from "@/models/FeedbackSuggestion";
import { generateFeedbackSuggestions } from "@/lib/ai-generator";
import { GenerateFeedbackRequest } from "@/types";
import { normalizeReviewLanguage } from "@/lib/review-bounds";

// POST /api/generate — time-seeded feedback generation (free, no API key needed)
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body: GenerateFeedbackRequest & { minuteTimestamp?: number } = await req.json();
    const {
      businessId,
      rating,
      tone,
      keywords = [],
      sessionId,
      minuteTimestamp,
      reviewLanguage: rawLang,
    } = body;
    const reviewLanguage = normalizeReviewLanguage(rawLang);

    if (!businessId || !rating || !tone || !sessionId) {
      return NextResponse.json(
        { error: "businessId, rating, tone, and sessionId are required" },
        { status: 400 }
      );
    }

    const business = await Business.findById(businessId).lean();
    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    // Generate 3 suggestions — seeded by business + rating + tone + current minute
    const suggestions = await generateFeedbackSuggestions(
      {
        name: business.name,
        category: business.category,
        description: business.description,
      },
      rating,
      tone,
      keywords,
      3,
      minuteTimestamp,
      reviewLanguage
    );

    // Persist for analytics
    const saved = await FeedbackSuggestion.insertMany(
      suggestions.map((s) => ({
        businessId,
        sessionId,
        suggestedText: s.text,
        rating,
        tone,
        reviewLanguage,
        keywords,
        wasUsed: false,
        wasEdited: false,
      }))
    );

    return NextResponse.json({
      suggestions: suggestions.map((s, i) => ({
        ...s,
        dbId: saved[i]._id.toString(),
      })),
      sessionId,
    });
  } catch (error) {
    console.error("POST /api/generate error:", error);
    return NextResponse.json({ error: "Failed to generate feedback" }, { status: 500 });
  }
}
