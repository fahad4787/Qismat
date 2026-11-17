// The public figures the landing page shows, read straight from Firestore's REST API so the page
// stays light (no Firebase SDK). Only public documents: draws, winners and config/public.
// Every reader falls back to the static facts in site.ts when the request fails.

const PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "prizemoney-6d1a7";
const KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const EMULATOR = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR === "true";
const BASE = `${EMULATOR ? "http://127.0.0.1:8080" : "https://firestore.googleapis.com"}/v1/projects/${PROJECT}/databases/(default)/documents`;

export type LiveDraw = {
  id: string;
  title: string;
  tag: string;
  worth: string;
  value: number;
  ticketCost: number;
  winners: number;
  entries: number;
  order: number;
  endsAt: number | null;
};
export type LiveWinner = { id: string; name: string; city: string; prize: string; at: number | null };
export type Live = { draws: LiveDraw[]; winners: LiveWinner[]; announcement: string; playUrl: string };

type Value = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  timestampValue?: string;
  booleanValue?: boolean;
  nullValue?: null;
};
type Doc = { name: string; fields?: Record<string, Value> };

const read = (v: Value | undefined): string | number | null => {
  if (!v) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.timestampValue !== undefined) return Date.parse(v.timestampValue);
  return null;
};
const s = (d: Doc, k: string) => {
  const v = read(d.fields?.[k]);
  return typeof v === "string" ? v : "";
};
const n = (d: Doc, k: string) => {
  const v = read(d.fields?.[k]);
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
};
const t = (d: Doc, k: string) => {
  const v = d.fields?.[k]?.timestampValue;
  return v ? Date.parse(v) : null;
};
const id = (d: Doc) => d.name.slice(d.name.lastIndexOf("/") + 1);

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T | null> {
  const q = new URLSearchParams(params);
  if (KEY && !EMULATOR) q.set("key", KEY);
  // Firestore reads "+" literally, so spaces (as in "drawnAt desc") must go as %20.
  const r = await fetch(`${BASE}/${path}?${q.toString().replace(/\+/g, "%20")}`, { cache: "no-store" });
  if (!r.ok) return null;
  return (await r.json()) as T;
}

export async function loadLive(): Promise<Live | null> {
  const [draws, winners, config] = await Promise.all([
    get<{ documents?: Doc[] }>("draws", { pageSize: "60" }),
    get<{ documents?: Doc[] }>("winners", { pageSize: "14", orderBy: "drawnAt desc" }),
    get<Doc>("config/public"),
  ]);
  if (!draws) return null;
  const now = Date.now();
  return {
    draws: (draws.documents ?? [])
      .filter((d) => !t(d, "drawnAt"))
      .map((d) => ({
        id: id(d),
        title: s(d, "title") || id(d),
        tag: s(d, "tag"),
        worth: s(d, "worth"),
        value: n(d, "value"),
        ticketCost: n(d, "ticketCost") || 1,
        winners: n(d, "winners") || 1,
        entries: n(d, "totalEntries"),
        order: n(d, "order"),
        endsAt: t(d, "endsAt"),
      }))
      .filter((d) => d.endsAt === null || d.endsAt > now)
      .sort((a, b) => a.order - b.order),
    winners: (winners?.documents ?? []).map((d) => ({
      id: id(d),
      name: s(d, "name"),
      city: s(d, "city"),
      prize: s(d, "prize"),
      at: t(d, "drawnAt"),
    })),
    announcement: config ? s(config, "announcement") : "",
    playUrl: config ? s(config, "playUrl") : "",
  };
}

/** "26d 22h", "9h 12m", "12m" */
export function left(ms: number) {
  const m = Math.max(0, Math.floor(ms / 60_000));
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m % 60}m`;
  return `${m}m`;
}
