/*
 * Run parameters for the current question set (196 questions): every placeholder the questions use,
 * with its value for this run. Shown on Guide → Account list. Edit a value here to change it.
 * Values marked "to confirm" are proposals that still need the run owner's sign-off.
 */
export interface RunParameter {
  key: string;
  value: string;
  notes: string;
}

export const RUN_PARAMETERS: RunParameter[] = [
  { key: "{Retailer}", value: "Best Buy · Amazon", notes: "The account being assessed. One retailer per run." },
  { key: "{retailer_domain}", value: "bestbuy.com · amazon.com", notes: "The retailer's site, used for direct checks such as /llms.txt and robots.txt." },
  { key: "{Region}", value: "United States (Americas)", notes: "Single market per run. No rating transfers across markets." },
  { key: "{Date}", value: "October 2026", notes: "The run month. Results are reported month by month." },
  { key: "[OWNER] · {brand}", value: "Microsoft", notes: "The owner whose products are assessed at the retailer." },
  { key: "LOB", value: "Surface devices", notes: "The product family sampled in this run." },
  { key: "{owner_first_party_device}", value: "Surface", notes: "The owner's own device line, used for placement and ranking checks." },
  { key: "{owner_ai_device}", value: "Copilot+ PC", notes: "The owner's AI device category, used for filters, ranking and assistant checks." },
  { key: "{owner_ai_features}", value: "Copilot features (to confirm)", notes: "The AI features the retailer's assistant is asked to explain. Proposed; confirm the list." },
  { key: "{brand_subscription}", value: "Microsoft 365", notes: "The subscription an assistant should offer with an owner PC." },
  { key: "[COMPETITOR]", value: "Apple, Dell, HP, Acer, ASUS, Lenovo", notes: "Brands the owner is compared against inside the retailer. Apple is the one compared on the Competitor tab for now." },
  { key: "{competitor_silicon}", value: "Apple silicon (M-series)", notes: "The competing chip family checked for its own category filter. Proposed; confirm." },
  { key: "[PEER RETAILERS]", value: "Best Buy ↔ Amazon", notes: "Retailers benchmarked against each other on the Retailer comparison tab." },
  { key: "{channel}", value: "To confirm", notes: "The third-party channel (for example a shopping feed or marketplace) whose title, price and specs are matched against the retailer's own page." },
  { key: "{ZIP}", value: "To confirm", notes: "A delivery ZIP code in the market, used to check delivery options." },
];
