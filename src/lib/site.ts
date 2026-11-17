// Facts the marketing pages print. Change them here and every page follows.

/** The live site address. Set NEXT_PUBLIC_SITE_URL when the domain is bought. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://qismat.example"
).replace(/\/$/, "");

export const APP_ID = "com.qismat.qismat";
export const PLAY_URL = `https://play.google.com/store/apps/details?id=${APP_ID}`;
/** Fill in once the App Store listing exists, e.g. https://apps.apple.com/app/id1234567890 */
export const APP_STORE_URL: string | null = null;

export const CONTACT_EMAIL = "hello@qismat.example";

export const ADS_PER_DAY = 20;
export const DAILY_BONUS = 2;

export type Prize = {
  name: string;
  every: string;
  worth: string;
  winners: number;
  ticketCost: number;
  value: number;
};

/** The draws as seeded in the app (qismat/tool/seed_draws.py). */
export const PRIZES: Prize[] = [
  { name: "70cc motorbike", every: "Monthly", worth: "Rs 165,000", winners: 1, ticketCost: 3, value: 165000 },
  { name: "43-inch LED TV", every: "Monthly", worth: "Rs 75,000", winners: 1, ticketCost: 2, value: 75000 },
  { name: "Smartphone", every: "Weekly", worth: "Rs 60,000", winners: 1, ticketCost: 2, value: 60000 },
  { name: "Wireless earbuds", every: "Weekly", worth: "Rs 8,500", winners: 3, ticketCost: 1, value: 25500 },
  { name: "Rs 1,000 mobile load", every: "Daily", worth: "Rs 1,000", winners: 10, ticketCost: 1, value: 10000 },
];

export const PRIZE_POOL = PRIZES.reduce((t, p) => t + p.value, 0);
export const rupees = (n: number) => `Rs ${n.toLocaleString("en-US")}`;
