import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/review-genius";

// Minimal inline schema for seeding
const BusinessSchema = new mongoose.Schema({
  name: String,
  description: String,
  category: String,
  googleReviewUrl: String,
  qrToken: { type: String, unique: true },
  totalScans: { type: Number, default: 0 },
  totalSubmissions: { type: Number, default: 0 },
}, { timestamps: true });

const Business = mongoose.models.Business || mongoose.model("Business", BusinessSchema);

const sampleBusinesses = [
  {
    name: "The Golden Fork Restaurant",
    description: "An upscale dining establishment serving contemporary European cuisine with locally sourced ingredients in an elegant setting.",
    category: "restaurant",
    googleReviewUrl: "https://search.google.com/local/writereview?placeid=REPLACE_WITH_REAL_PLACE_ID",
    qrToken: uuidv4(),
    totalScans: 142,
    totalSubmissions: 87,
  },
  {
    name: "Brew & Bloom Café",
    description: "A cozy neighborhood café known for specialty single-origin coffee, homemade pastries, and a warm community atmosphere.",
    category: "cafe",
    googleReviewUrl: "https://search.google.com/local/writereview?placeid=REPLACE_WITH_REAL_PLACE_ID",
    qrToken: uuidv4(),
    totalScans: 289,
    totalSubmissions: 201,
  },
  {
    name: "Serenity Wellness Spa",
    description: "A luxury day spa offering personalized massage therapy, facials, and holistic wellness treatments in a serene environment.",
    category: "salon",
    googleReviewUrl: "https://search.google.com/local/writereview?placeid=REPLACE_WITH_REAL_PLACE_ID",
    qrToken: uuidv4(),
    totalScans: 67,
    totalSubmissions: 45,
  },
];

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  await Business.deleteMany({});
  console.log("Cleared existing businesses");

  const created = await Business.insertMany(sampleBusinesses);
  console.log(`Created ${created.length} sample businesses`);

  for (const b of created) {
    console.log(`  - ${(b as any).name}: /review/${(b as any).qrToken}`);
  }

  await mongoose.disconnect();
  console.log("\n✅ Seed complete! Run 'npm run dev' to start the app.");
}

seed().catch(console.error);
