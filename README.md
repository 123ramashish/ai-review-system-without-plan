# ReviewGenius 🌟

> AI-powered Google Business Review Generator via QR Code

ReviewGenius lets businesses place a QR code at their counter. When customers scan it, they instantly see AI-generated, unique review text that they can personalize and submit to Google Business Reviews in seconds.

---

## ✨ Features

- **QR Code Generation** — Each business gets a unique QR code that links to a personalized review page
- **AI-Powered Suggestions** — Claude AI generates 3 unique, authentic-sounding review texts per scan
- **Multiple Tones** — Enthusiastic, Professional, Casual, or Detailed
- **Star Rating Aware** — Suggestions match the customer's 1–5 star rating
- **Editable Text** — Customers can tweak the AI text before submitting
- **One-Tap Google Submission** — Auto-copies text and opens Google Reviews
- **Analytics Dashboard** — Track scans, submissions, and conversion rates

---


---

## 🚀 Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# MongoDB (local or Atlas)
MONGODB_URI=mongodb://localhost:27017/review-genius

# Your app URL (for QR code generation)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Claude AI API key (get from console.anthropic.com)
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Seed sample data (optional)

```bash
npm run seed
```

### 4. Start development server

```bash
npm run dev
```

Visit:
- **Landing page**: http://localhost:3000
- **Dashboard**: http://localhost:3000/dashboard
- **Demo review flow**: http://localhost:3000/review/demo

---

## 🗄️ MongoDB Data Models

### Business
| Field | Type | Description |
|-------|------|-------------|
| `name` | String | Business name |
| `description` | String | Used by AI for context |
| `category` | Enum | restaurant, cafe, salon, etc. |
| `googleReviewUrl` | String | Google Business write-review URL |
| `qrToken` | String | Unique UUID for QR URL |
| `qrCode` | String | Base64 PNG of the QR code |
| `totalScans` | Number | Increments on each QR scan |
| `totalSubmissions` | Number | Increments when review submitted |

### FeedbackSuggestion
| Field | Type | Description |
|-------|------|-------------|
| `businessId` | ObjectId | Reference to Business |
| `sessionId` | String | Per-scan session UUID |
| `suggestedText` | String | AI-generated review text |
| `rating` | 1–5 | Star rating |
| `tone` | Enum | enthusiastic/professional/casual/detailed |
| `wasUsed` | Boolean | Did customer use this suggestion? |
| `wasEdited` | Boolean | Did they edit before submitting? |
| `finalText` | String | The text actually submitted |

### ScanEvent
| Field | Type | Description |
|-------|------|-------------|
| `businessId` | ObjectId | Reference to Business |
| `sessionId` | String | UUID per scan |
| `ipAddress` | String | For geo-analytics |
| `userAgent` | String | Device/browser info |
| `converted` | Boolean | Did scan lead to review? |

---

## 🤖 AI Generation

The app uses **Claude claude-opus-4-5** to generate suggestions:

- Generates 3 unique reviews per request
- Context-aware: uses business name, category, description
- Tone-specific prompting
- Rating-calibrated sentiment
- Falls back to hand-crafted templates if no API key

To enable AI: add `ANTHROPIC_API_KEY` to `.env.local`.

---

## 📱 Customer Flow

1. Customer receives receipt/table card with QR code
2. Customer scans QR → redirected to `/review/{token}`
3. App records the scan event
4. Customer selects star rating (1–5)
5. Customer picks tone preference
6. AI generates 3 unique review texts
7. Customer selects + optionally edits
8. "Submit to Google" → copies text + opens Google Reviews
9. Customer pastes and submits on Google

---



## 🎨 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | MongoDB + Mongoose |
| AI | Anthropic Claude API |
| QR Code | `qrcode` npm package |
| Icons | Lucide React |
| Fonts | Clash Display + Satoshi |

---

## 🌐 Deployment

### Vercel (recommended)

```bash
npm run build
vercel deploy
```

Set environment variables in Vercel dashboard:
- `MONGODB_URI` — MongoDB Atlas connection string
- `NEXT_PUBLIC_APP_URL` — Your production URL
- `ANTHROPIC_API_KEY` — Claude API key

### Finding Your Google Review URL

1. Go to [Google Maps](https://maps.google.com)
2. Search for your business
3. Click "Share" → "Copy link"
4. Or go to your Google Business Profile → Get more reviews → Copy link

The URL format is:
```
https://search.google.com/local/writereview?placeid=YOUR_PLACE_ID
```

---

## 📈 Extending the Project

Ideas for additional features:
- **Email/SMS campaigns** — Send review QR links post-purchase
- **Multi-language support** — Generate reviews in customer's language
- **Review sentiment analysis** — Track AI-generated sentiment trends
- **White-label** — Custom branding per business
- **Webhook integration** — Notify on review submission
- **A/B testing** — Test which tone drives more submissions
