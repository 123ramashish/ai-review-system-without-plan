import { FeedbackTone, StarRating, GeneratedSuggestion } from "@/types";
import { v4 as uuidv4 } from "uuid";

interface BusinessContext {
  name: string;
  category: string;
  description: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Seeded PRNG — Mulberry32. Same seed → same output. Seed changes every minute.
// ─────────────────────────────────────────────────────────────────────────────
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildTimeSeed(
  businessKey: string,
  rating: StarRating,
  tone: FeedbackTone,
  minuteTimestamp?: number
): number {
  const minute = minuteTimestamp ?? Math.floor(Date.now() / 60000);
  const str = `${businessKey}|${rating}|${tone}|${minute}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(31, hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

function pickN<T>(arr: T[], n: number, rand: () => number): T[] {
  const copy = [...arr];
  const result: T[] = [];
  for (let i = 0; i < Math.min(n, copy.length); i++) {
    const idx = Math.floor(rand() * (copy.length - i));
    result.push(copy[idx]);
    copy[idx] = copy[copy.length - 1 - i];
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Category-specific vocabulary
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORY_DETAILS: Record<string, {
  things: string[];
  staff: string[];
  ambiance: string[];
  actions: string[];
}> = {
  restaurant: {
    things: ["the food", "the menu", "the dishes", "the portions", "the flavours", "the presentation", "the cuisine", "the specials", "the wine list"],
    staff: ["the chef", "our server", "the waiting staff", "the team", "the host", "the kitchen crew", "the sommelier"],
    ambiance: ["the atmosphere", "the décor", "the lighting", "the setting", "the vibe", "the dining room", "the terrace"],
    actions: ["dined", "ate", "visited", "had lunch", "had dinner", "stopped by for a meal", "came for a tasting menu"],
  },
  cafe: {
    things: ["the coffee", "the pastries", "the drinks", "the menu", "the snacks", "the brunch", "the cakes", "the sandwiches", "the flat white"],
    staff: ["the barista", "the team", "the staff", "the crew", "the counter staff", "the owner"],
    ambiance: ["the atmosphere", "the cosy feel", "the space", "the music", "the seating", "the vibe", "the outdoor seating"],
    actions: ["stopped in", "popped by", "visited", "spent a morning", "came for a coffee", "had brunch", "worked from here"],
  },
  salon: {
    things: ["the treatment", "the service", "the results", "the products", "the styling", "the colour work", "the cut", "the blowdry"],
    staff: ["my stylist", "the team", "the technician", "the staff", "my therapist", "the colourist", "the nail technician"],
    ambiance: ["the salon", "the space", "the atmosphere", "the décor", "the music", "the relaxing environment", "the wash stations"],
    actions: ["had a treatment", "visited", "booked in", "came for an appointment", "had my hair done", "had a colour treatment"],
  },
  gym: {
    things: ["the equipment", "the facilities", "the classes", "the machines", "the weights area", "the pool", "the programmes", "the cardio zone"],
    staff: ["the trainer", "the instructors", "the staff", "the team", "the reception team", "my PT", "the floor staff"],
    ambiance: ["the gym floor", "the changing rooms", "the space", "the cleanliness", "the layout", "the energy", "the studio"],
    actions: ["trained", "worked out", "attended a class", "visited", "used the facilities", "signed up", "had a session with my PT"],
  },
  hotel: {
    things: ["the room", "the breakfast", "the amenities", "the facilities", "the bed", "the service", "the restaurant", "the spa", "the view"],
    staff: ["the front desk team", "the concierge", "the housekeeping staff", "the team", "the staff", "the night manager"],
    ambiance: ["the lobby", "the atmosphere", "the décor", "the common areas", "the overall feel", "the property", "the pool area"],
    actions: ["stayed", "checked in", "spent the weekend", "booked a room", "visited", "had a short break", "stayed for a conference"],
  },
  retail: {
    things: ["the selection", "the products", "the range", "the stock", "the quality", "the prices", "the merchandise", "the window display"],
    staff: ["the assistant", "the team", "the staff", "the sales team", "the floor team", "the store manager"],
    ambiance: ["the store", "the layout", "the display", "the fitting rooms", "the shop floor", "the space", "the window displays"],
    actions: ["shopped", "browsed", "visited", "picked up a few things", "came in looking for something", "popped in", "did my Christmas shopping"],
  },
  medical: {
    things: ["the consultation", "the treatment", "the diagnosis", "the care", "the advice", "the follow-up", "the procedure", "the examination"],
    staff: ["the doctor", "the nurse", "the practitioner", "the team", "the receptionist", "the specialist", "the consultant"],
    ambiance: ["the clinic", "the waiting room", "the facilities", "the environment", "the surgery", "the practice", "the treatment room"],
    actions: ["attended an appointment", "visited", "came in for a consultation", "booked in", "had a check-up", "had a follow-up"],
  },
  automotive: {
    things: ["the work", "the service", "the repairs", "the MOT", "the diagnostics", "the job", "the parts", "the bodywork"],
    staff: ["the mechanic", "the team", "the technician", "the workshop crew", "the service advisor", "the staff", "the manager"],
    ambiance: ["the workshop", "the garage", "the waiting area", "the facility", "the premises", "the reception"],
    actions: ["brought the car in", "booked the car in", "visited", "had some work done", "dropped the car off", "came in for an MOT"],
  },
  services: {
    things: ["the work", "the service", "the results", "the output", "the project", "the job", "the deliverables", "the proposal"],
    staff: ["the team", "the staff", "the consultant", "the specialist", "the professional", "the expert", "the account manager"],
    ambiance: ["the office", "the workspace", "the setup", "the environment", "the overall experience", "the process"],
    actions: ["worked with them", "hired the team", "commissioned the work", "engaged their services", "used them for a project", "brought them on board"],
  },
  other: {
    things: ["the service", "the experience", "the offering", "the quality", "the work", "the product", "the overall package"],
    staff: ["the team", "the staff", "the people", "everyone there", "the crew", "the manager"],
    ambiance: ["the place", "the environment", "the setup", "the space", "the location", "the overall feel"],
    actions: ["visited", "used the service", "came by", "tried it out", "gave it a go", "made use of the service"],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Phrase banks
// ─────────────────────────────────────────────────────────────────────────────
const OPENERS: Record<StarRating, string[]> = {
  5: [
    "Genuinely one of the best experiences I've had in a long time",
    "Completely blown away by this place",
    "Cannot recommend highly enough",
    "What an absolute find",
    "Absolutely delighted with everything",
    "This place is truly something special",
    "Left thoroughly and genuinely impressed",
    "Exceeded every expectation I had coming in",
    "An outstanding visit from start to finish",
    "So glad I finally came here",
    "Rarely do I leave somewhere feeling this positive",
    "A truly exceptional experience all round",
    "Five stars and I mean every single one",
    "I came with high hopes and left with them exceeded",
    "This is exactly what you hope for",
  ],
  4: [
    "Really enjoyed my visit here",
    "A very solid and enjoyable experience overall",
    "Left feeling genuinely satisfied",
    "Mostly really impressed with the whole thing",
    "A great visit — just the odd minor thing aside",
    "Would comfortably and happily recommend this",
    "Very pleased with how everything went",
    "A strong experience on the whole",
    "Came away happy and would return",
    "Very nearly perfect — close to five stars",
    "A lot to like here, would definitely return",
    "Really good experience with only tiny caveats",
  ],
  3: [
    "A mixed bag, if I'm being honest",
    "Had an okay experience — nothing more, nothing less",
    "Some genuinely good moments, some less so",
    "Left with a fairly neutral impression",
    "Neither blown away nor particularly disappointed",
    "It was fine — room for improvement, though",
    "There's real potential here but it wasn't quite there on my visit",
    "A middle-of-the-road experience overall",
    "Not bad but not wow either",
    "I've had better and I've had worse",
  ],
  2: [
    "Disappointed, if I'm being honest",
    "Didn't quite meet my expectations, unfortunately",
    "Left feeling a little let down",
    "Not the experience I was hoping for",
    "Quite a few things fell short on this visit",
    "Struggled to leave a higher rating",
    "There were real issues that affected the overall experience",
    "Not what I'd been led to expect from the reviews",
    "Had been looking forward to this but came away underwhelmed",
  ],
  1: [
    "Really not a good experience at all, unfortunately",
    "One of the most disappointing visits I've had",
    "Left feeling genuinely frustrated",
    "Wouldn't be able to recommend in good conscience",
    "A deeply disappointing experience from start to finish",
    "Nothing about this visit worked as it should have",
    "Can't say this went well at all",
    "I rarely leave a one-star review but this warranted one",
  ],
};

const MIDDLE_PHRASES: Record<StarRating, Record<FeedbackTone, string[]>> = {
  5: {
    enthusiastic: [
      "everything was absolutely spot on and I was thrilled",
      "I was genuinely wowed at every single turn",
      "the whole thing felt effortless and absolutely brilliant",
      "it all came together in the most perfect way",
      "every single detail had clearly been thought through",
      "it was honestly magical from the very first moment",
      "I couldn't fault a single thing about the whole experience",
      "the whole experience just felt premium and considered",
      "I was smiling the entire time — it was just that good",
    ],
    professional: [
      "the standard of service was exemplary at every stage",
      "execution was precise, considered, and genuinely customer-focused",
      "every aspect of the visit was handled with real professionalism",
      "the quality was consistently and notably above expectations",
      "attention to detail was clearly and visibly a priority",
      "the operational standards on display were impressively high",
      "customer care was evident and consistent at every touchpoint",
      "the team's expertise and commitment was plain to see",
    ],
    casual: [
      "everything just clicked into place perfectly",
      "it all felt really natural, easy and enjoyable",
      "nothing felt forced or awkward at any point",
      "I just felt completely at ease the whole time I was there",
      "it's the kind of place where you relax the moment you walk in",
      "everything ran so smoothly from beginning to end",
      "it was honestly just a really, really good time",
      "zero complaints — it was just a lovely experience",
    ],
    detailed: [
      "the quality was exceptional on every metric I could assess",
      "service, environment, and the core offering all aligned perfectly",
      "from the initial greeting to the final interaction, standards never dipped",
      "each individual element — staff, quality, environment — was independently strong",
      "the experience held up under scrutiny at every single stage",
      "there was a consistency and cohesion to the experience that spoke of real care",
    ],
  },
  4: {
    enthusiastic: [
      "almost everything was brilliant and well above average",
      "the vast majority of the experience was genuinely fantastic",
      "so much to love here — really impressed overall",
      "really impressive on almost every single front",
      "genuinely great across the board with only tiny exceptions",
    ],
    professional: [
      "the service was largely professional and well-executed throughout",
      "quality was consistently above the average I'd expect",
      "most elements were handled with evident care and skill",
      "execution was strong and reliable throughout the majority of the visit",
    ],
    casual: [
      "most things were really, really good",
      "I had a really enjoyable time overall — can't deny that",
      "things generally went really well from start to finish",
      "pretty much everything worked out nicely on this visit",
    ],
    detailed: [
      "the majority of the experience met and often exceeded high standards",
      "service and quality were strong across most dimensions assessed",
      "a thorough and largely impressive experience with only minor gaps",
    ],
  },
  3: {
    enthusiastic: [
      "some real highlights definitely stood out",
      "a few moments genuinely impressed me",
      "there's clearly something good here trying to emerge",
      "I saw enough to know the potential is there",
    ],
    professional: [
      "certain aspects were competently and adequately handled",
      "some elements met the expected standard comfortably",
      "there were commendable moments alongside clear areas for development",
    ],
    casual: [
      "some things worked out nicely enough",
      "there were definitely some good bits I enjoyed",
      "I had moments where I was genuinely happy to be there",
    ],
    detailed: [
      "quality varied noticeably across different aspects and stages of the visit",
      "some elements were clearly strong while others needed meaningful work",
      "the experience was inconsistent when assessed across its component parts",
    ],
  },
  2: {
    enthusiastic: [
      "there were a couple of redeeming moments scattered throughout",
      "I spotted some genuine potential buried underneath the issues",
      "a few things showed promise even if the overall experience didn't deliver",
    ],
    professional: [
      "isolated elements were handled adequately",
      "one or two individual interactions were professional and competent",
      "there were glimpses of competence among the broader issues",
    ],
    casual: [
      "it wasn't all bad, to be fair",
      "a couple of things were okay and saved it from being worse",
      "there were the odd nice moments in amongst the disappointments",
    ],
    detailed: [
      "a limited number of aspects met the baseline expectations I'd set",
      "specific elements were adequate despite more widespread failings",
    ],
  },
  1: {
    enthusiastic: [
      "it was a genuinely difficult experience from the very outset",
      "nothing seemed to work as it should at any point",
      "issues kept appearing at every stage without resolution",
    ],
    professional: [
      "service standards were fundamentally and consistently inadequate",
      "quality fell far below any acceptable or reasonable benchmark",
      "customer care was effectively absent throughout the entire visit",
    ],
    casual: [
      "basically nothing worked out the way it should have",
      "it was genuinely frustrating the whole way through",
      "I really couldn't find much that was positive to take away",
    ],
    detailed: [
      "every dimension I assessed — service, quality, environment — was problematic",
      "a comprehensive failure across all the criteria I was able to evaluate",
      "the issues were pervasive and systemic rather than isolated or incidental",
    ],
  },
};

const STAFF_PHRASES: Record<StarRating, string[]> = {
  5: [
    "the {staff} were absolutely fantastic throughout",
    "{staff} couldn't have been more helpful, warm or attentive",
    "the {staff} made me feel genuinely valued as a customer",
    "I was really struck by how impressive the {staff} were",
    "{staff} went above and beyond at every opportunity",
    "the {staff} were knowledgeable, genuinely attentive and kind",
    "the {staff} struck the perfect balance of friendly and professional",
    "{staff} anticipated what I needed without being asked",
  ],
  4: [
    "the {staff} were really helpful and easy to deal with",
    "{staff} were professional and thoroughly pleasant throughout",
    "the {staff} looked after me well and checked in regularly",
    "I was happy with how attentive and friendly the {staff} were",
    "the {staff} were a definite highlight of the visit",
  ],
  3: [
    "the {staff} were okay — friendly enough but not outstanding",
    "{staff} were variable — some were great, others less so",
    "the {staff} tried their best but things were inconsistent",
    "I had mixed interactions with the {staff} across the visit",
  ],
  2: [
    "the {staff} seemed disorganised and sometimes inattentive",
    "{staff} struggled to deal with my concerns effectively",
    "I found the {staff} somewhat dismissive when issues arose",
    "the {staff} were not as attentive or helpful as I'd have liked",
  ],
  1: [
    "the {staff} were unhelpful and at times frankly rude",
    "{staff} showed no real interest in resolving the issues I raised",
    "dealing with the {staff} made things worse, not better",
    "the {staff} were dismissive and appeared undertrained for the role",
  ],
};

const THING_PHRASES: Record<StarRating, string[]> = {
  5: [
    "{things} was genuinely outstanding and memorable",
    "the quality of {things} was the best I've encountered",
    "{things} impressed me enormously and exceeded my expectations",
    "{things} was exceptional — exactly what I'd been hoping for",
    "I was completely wowed by {things}",
    "{things} was handled with real care and evident skill",
  ],
  4: [
    "{things} was very good and clearly well-prepared",
    "I was genuinely impressed by {things}",
    "{things} was high quality and absolutely worth it",
    "{things} delivered on its promise and then some",
    "{things} was a real strength of the visit",
  ],
  3: [
    "{things} was okay but could certainly be better",
    "{things} was inconsistent — good at times, fairly average at others",
    "{things} didn't quite meet what I'd expected coming in",
    "{things} had its moments but wasn't reliably strong",
  ],
  2: [
    "{things} fell well short of what I'd hoped for",
    "{things} was below the standard I'd reasonably expect",
    "{things} was disappointing and inconsistent throughout",
    "{things} let the experience down in a way that was hard to overlook",
  ],
  1: [
    "{things} was genuinely poor on this occasion",
    "{things} was far below any acceptable standard",
    "{things} was a real and significant letdown",
    "{things} did not meet even the most basic expectations",
  ],
};

const CLOSERS: Record<StarRating, Record<FeedbackTone, string[]>> = {
  5: {
    enthusiastic: [
      "I'll absolutely be back and I've already started recommending this place to everyone I know!",
      "Cannot wait to return — this is firmly my new go-to spot!",
      "Will be telling absolutely everyone about this — it deserves all the success!",
      "My new favourite — already planning the next visit!",
      "Would give ten stars if I could — an absolute gem!",
    ],
    professional: [
      "I would recommend this establishment to colleagues and clients without any reservation.",
      "A benchmark operation in its category — I will return and refer others with confidence.",
      "This is the standard that others in this sector should be actively aspiring to.",
      "I have no hesitation in recommending this business to anyone who appreciates quality.",
    ],
    casual: [
      "Will definitely be back — honestly love this place!",
      "Telling all my friends about it — would absolutely recommend!",
      "Already looking forward to my next visit, can't wait.",
      "Solid recommendation from me — seriously, give it a go!",
    ],
    detailed: [
      "In summary: an exceptional experience across all assessed dimensions. Unreservedly recommended.",
      "Taken as a whole, this represents the highest standard I have encountered in this category.",
      "Based on this visit alone, I would return and recommend with complete confidence.",
    ],
  },
  4: {
    enthusiastic: [
      "Would absolutely go back — I really enjoyed it overall!",
      "A genuinely great spot — highly recommend with only the tiniest of caveats!",
      "Definitely coming back and will suggest others do the same!",
    ],
    professional: [
      "I would recommend this business to others and fully intend to return.",
      "Overall a strong experience that I would endorse to others without hesitation.",
      "Minor areas for improvement notwithstanding, I would return and recommend.",
    ],
    casual: [
      "Would happily go back and recommend it to friends and family.",
      "A solid spot all round — would tell others to give it a try.",
      "Thumbs up from me — would return without question.",
    ],
    detailed: [
      "Overall a strong visit with only marginal areas for improvement. Would return.",
      "The experience was highly positive in most respects assessed. Would recommend.",
    ],
  },
  3: {
    enthusiastic: [
      "Might give it another shot — I think it could be genuinely great with a few tweaks!",
      "There's definitely real potential here — rooting for them to improve!",
      "I'd try it again in the hope of a more consistent experience next time!",
    ],
    professional: [
      "I would consider returning once the identified areas for improvement have been addressed.",
      "With greater operational consistency, this business could achieve a meaningfully stronger rating.",
    ],
    casual: [
      "Might go back if they manage to sort a few things out.",
      "Not sure I'd rush back but I wouldn't rule it out entirely either.",
    ],
    detailed: [
      "A return visit would be considered if the noted inconsistencies were addressed.",
      "With targeted improvements in specific areas, this could be a much stronger offering.",
    ],
  },
  2: {
    enthusiastic: [
      "Really hoping they sort things out — there's clearly potential there somewhere!",
      "I want to give them another chance but would need to see real improvement first!",
    ],
    professional: [
      "I would not recommend in the current state but would reconsider following demonstrated improvement.",
      "A return visit would require clear evidence of significant operational changes.",
    ],
    casual: [
      "Not somewhere I'd rush back to unless I heard things had genuinely improved.",
      "Would need to see a real change in approach before I went back.",
    ],
    detailed: [
      "A return visit would only be considered following demonstrated improvement across the key failure areas identified.",
    ],
  },
  1: {
    enthusiastic: [
      "Really hope management sees this and takes it seriously — urgent changes are needed!",
      "I genuinely want to see this place turn it around but right now cannot recommend it.",
    ],
    professional: [
      "I cannot recommend this business and would urge management to undertake a comprehensive review.",
      "The issues experienced require urgent and substantive action from those in leadership.",
    ],
    casual: [
      "Would save others the hassle and steer clear until major improvements are made.",
      "Can't recommend at all — hopefully things change significantly in the future.",
    ],
    detailed: [
      "Until fundamental improvements across service, quality, and staff management are clearly demonstrated, this business cannot be recommended.",
    ],
  },
};

const MINOR_CAVEATS = [
  "just one or two small things stopped me awarding full marks",
  "a minor thing or two keeps this from a perfect five stars",
  "there's a small area or two that could still be polished",
  "a couple of tiny details could be further refined",
  "it's very close to perfect — just needs a minor tweak or two",
  "there's a small gap between where it is and a perfect five",
  "a few marginal improvements and this would be flawless",
];

// ─────────────────────────────────────────────────────────────────────────────
// Core review builder
// ─────────────────────────────────────────────────────────────────────────────
function buildReview(
  business: BusinessContext,
  rating: StarRating,
  tone: FeedbackTone,
  seed: number,
  variant: number
): string {
  // Each variant gets a different sub-seed so the three suggestions differ
  const rand = mulberry32(seed + variant * 999983 + variant * variant * 7);

  const cat = business.category in CATEGORY_DETAILS ? business.category : "other";
  const details = CATEGORY_DETAILS[cat];

  const staff = pick(details.staff, rand);
  const thing = pick(details.things, rand);
  const action = pick(details.actions, rand);

  const opener = pick(OPENERS[rating], rand);
  const connector = pick([" — ", ". ", " and ", ". And ", "; ", ": "], rand);
  const middle = pick(MIDDLE_PHRASES[rating][tone], rand);

  const staffPhrase = pick(STAFF_PHRASES[rating], rand).replace("{staff}", staff);
  const thingPhrase = pick(THING_PHRASES[rating], rand).replace("{things}", thing);
  const closer = pick(CLOSERS[rating][tone], rand);

  const useName = rand() > 0.35;
  const nameRef = useName
    ? business.name
    : pick(["this place", "here", "the team", "the business"], rand);

  let body = "";

  if (rating === 5) {
    const intro = rand() > 0.5
      ? `I ${action} at ${business.name} recently and was genuinely delighted. `
      : `Just back from ${business.name} and couldn't not leave a review. `;

    const parts = pickN([staffPhrase, thingPhrase], 2, rand);
    body = `${opener}${connector}${middle}. ${intro}${parts.join(". ")}. ${closer}`;
  } else if (rating === 4) {
    const caveat = pick(MINOR_CAVEATS, rand);
    body = `${opener}${connector}${middle}. ${pick([staffPhrase, thingPhrase], rand)}. I'll say ${caveat}. ${closer}`;
  } else if (rating === 3) {
    body = `${opener}. ${middle}. ${staffPhrase}. ${thingPhrase}. ${closer}`;
  } else if (rating === 2) {
    body = `${opener}${connector}${middle}. ${thingPhrase}. ${staffPhrase}. ${closer}`;
  } else {
    body = `${opener}. ${middle}. ${staffPhrase}. ${thingPhrase}. ${closer}`;
  }

  // Add a business-name mention if it wasn't included
  if (!body.includes(business.name) && rand() > 0.4) {
    body = body.replace(
      /^([^.!]+[.!])/,
      `$1 ${pick(["Visited", "Tried", "Used"], rand)} ${business.name} and the experience was as described.`
    );
  }

  return body
    .replace(/\s{2,}/g, " ")
    .replace(/\.\s*\./g, ".")
    .replace(/,\s*\./g, ".")
    .replace(/\.\s*,/g, ".")
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API — always free, time-seeded
// ─────────────────────────────────────────────────────────────────────────────
export async function generateFeedbackSuggestions(
  business: BusinessContext,
  rating: StarRating,
  tone: FeedbackTone,
  keywords: string[] = [],
  count: number = 3,
  minuteTimestamp?: number
): Promise<GeneratedSuggestion[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (apiKey) {
    try {
      return await generateWithClaude(business, rating, tone, keywords, count);
    } catch (err) {
      console.warn("Claude API failed, using seeded generator:", err);
    }
  }

  const seed = buildTimeSeed(
    business.name + business.description,
    rating,
    tone,
    minuteTimestamp
  );

  return Array.from({ length: count }, (_, i) => ({
    id: uuidv4(),
    text: buildReview(business, rating, tone, seed, i),
    tone,
    rating,
    keywords,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Claude AI path (optional — only used when API key is set)
// ─────────────────────────────────────────────────────────────────────────────
async function generateWithClaude(
  business: BusinessContext,
  rating: StarRating,
  tone: FeedbackTone,
  keywords: string[],
  count: number
): Promise<GeneratedSuggestion[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY!;

  const toneMap: Record<FeedbackTone, string> = {
    enthusiastic: "very excited and positive, use natural exclamation points",
    professional: "formal, balanced, business-like",
    casual: "friendly, conversational, relaxed",
    detailed: "thorough and specific, covering multiple aspects",
  };

  const ratingMap: Record<StarRating, string> = {
    1: "very disappointed with serious unresolved issues",
    2: "somewhat dissatisfied with notable problems",
    3: "neutral — mixed experience",
    4: "mostly satisfied with minor suggestions",
    5: "completely delighted — exceptional experience",
  };

  const prompt = `Generate ${count} unique, human-sounding Google Business reviews for "${business.name}" (${business.category}).
Business: ${business.description}
Sentiment: ${ratingMap[rating]}
Tone: ${toneMap[tone]}
${keywords.length ? `Focus on: ${keywords.join(", ")}` : ""}

Rules: each review must be structurally distinct, 60–150 words, no AI clichés.
Return ONLY a JSON array: [{"text":"..."}]`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-5",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Claude ${res.status}`);
  const data = await res.json();
  const raw = data.content[0].text.replace(/```json\n?|\n?```/g, "").trim();
  const parsed = JSON.parse(raw) as { text: string }[];

  return parsed.map((item) => ({
    id: uuidv4(),
    text: item.text,
    tone,
    rating,
    keywords,
  }));
}
