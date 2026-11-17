"use client";

import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  endAt,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  startAt,
  Timestamp,
  updateDoc,
  writeBatch,
  type DocumentSnapshot,
  type Firestore,
} from "firebase/firestore";
import { pkDay } from "./stats";

/** Prize icons the app knows how to draw (see `_icons` in the app's state.dart). */
export const ICONS = ["bike", "phone", "cash", "earbuds", "tv", "car", "laptop", "watch", "gold", "gift"] as const;

const toDate = (v: unknown) => (v instanceof Timestamp ? v.toDate() : null);
const num = (v: unknown) => (typeof v === "number" ? v : 0);
const str = (v: unknown) => (typeof v === "string" ? v : "");

/* ───────────── settings ───────────── */

export type AdminConfig = { ecpmUsd: number; usdToPkr: number };
export type PublicConfig = { announcement: string; playUrl: string };

export const DEFAULT_ADMIN_CONFIG: AdminConfig = { ecpmUsd: 1.5, usdToPkr: 280 };

export async function loadConfig(db: Firestore) {
  const [a, p] = await Promise.all([getDoc(doc(db, "config", "admin")), getDoc(doc(db, "config", "public"))]);
  const am = a.data() ?? {};
  const pm = p.data() ?? {};
  return {
    admin: {
      ecpmUsd: num(am.ecpmUsd) || DEFAULT_ADMIN_CONFIG.ecpmUsd,
      usdToPkr: num(am.usdToPkr) || DEFAULT_ADMIN_CONFIG.usdToPkr,
    } as AdminConfig,
    public: { announcement: str(pm.announcement), playUrl: str(pm.playUrl) } as PublicConfig,
  };
}

export const saveAdminConfig = (db: Firestore, c: AdminConfig) =>
  setDoc(doc(db, "config", "admin"), { ...c, updatedAt: serverTimestamp() });
export const savePublicConfig = (db: Firestore, c: PublicConfig) =>
  setDoc(doc(db, "config", "public"), { ...c, updatedAt: serverTimestamp() });

/** Estimated ad earnings in rupees: ads ÷ 1000 × eCPM × exchange rate. */
export const revenue = (ads: number, c: AdminConfig) => (ads / 1000) * c.ecpmUsd * c.usdToPkr;

/* ───────────── daily stats ───────────── */

export type StatDay = { day: number; label: string; ads: number; claims: number };

export async function loadStatDays(db: Firestore, days = 14): Promise<StatDay[]> {
  const today = pkDay();
  const fmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  return Promise.all(
    Array.from({ length: days }, async (_, i) => {
      const day = today - (days - 1 - i);
      const m = (await getDoc(doc(db, "stats", String(day)))).data() ?? {};
      return { day, label: fmt.format(new Date(day * 86_400_000)), ads: num(m.ads), claims: num(m.claims) };
    }),
  );
}

/* ───────────── draws ───────────── */

export type Draw = {
  id: string;
  title: string;
  tag: string;
  icon: string;
  image: string;
  worth: string;
  value: number;
  ticketCost: number;
  winners: number;
  totalEntries: number;
  order: number;
  endsAt: Date | null;
  drawnAt: Date | null;
};

export type DrawInput = Omit<Draw, "id" | "totalEntries" | "drawnAt" | "endsAt"> & { endsAt: Date };

const drawFrom = (d: DocumentSnapshot): Draw => {
  const m = d.data() ?? {};
  return {
    id: d.id,
    title: str(m.title) || d.id,
    tag: str(m.tag),
    icon: str(m.icon),
    image: str(m.image),
    worth: str(m.worth),
    value: num(m.value),
    ticketCost: num(m.ticketCost) || 1,
    winners: num(m.winners) || 1,
    totalEntries: num(m.totalEntries),
    order: num(m.order),
    endsAt: toDate(m.endsAt),
    drawnAt: toDate(m.drawnAt),
  };
};

export async function loadDraws(db: Firestore): Promise<Draw[]> {
  const snap = await getDocs(query(collection(db, "draws"), orderBy("order")));
  return snap.docs.map(drawFrom);
}

const drawData = (d: DrawInput) => ({
  title: d.title.trim(),
  tag: d.tag.trim(),
  icon: d.icon,
  image: d.image.trim(),
  worth: d.worth.trim(),
  value: Math.max(0, Math.round(d.value)),
  ticketCost: Math.max(1, Math.round(d.ticketCost)),
  winners: Math.max(1, Math.round(d.winners)),
  order: Math.round(d.order),
  endsAt: Timestamp.fromDate(d.endsAt),
});

export const createDraw = (db: Firestore, d: DrawInput) =>
  addDoc(collection(db, "draws"), { ...drawData(d), totalEntries: 0 });

export const updateDraw = (db: Firestore, id: string, d: DrawInput) => updateDoc(doc(db, "draws", id), drawData(d));

/** Closes an open draw right now: no more entries, and it's ready for the live draw. */
export const endDrawNow = (db: Firestore, id: string) =>
  updateDoc(doc(db, "draws", id), { endsAt: Timestamp.fromMillis(Date.now()) });

export const deleteDraw = (db: Firestore, id: string) => deleteDoc(doc(db, "draws", id));

/**
 * Starts the next round of a draw as a new document. Entries are stored per
 * draw id, so reusing the old id would carry last round's entries over. The
 * finished round stays as a record; the app hides it once it has closed.
 */
export async function newRound(db: Firestore, d: Draw, endsAt: Date) {
  return (await createDraw(db, { ...d, endsAt })).id;
}

/* ───────────── picking winners ───────────── */

export type Picked = { uid: string; name: string; entries: number };

/** A fair random integer in [0, n), from the browser's secure generator. */
function randomBelow(n: number) {
  const limit32 = Math.floor(0x1_0000_0000 / n) * n;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf);
  while (buf[0] >= limit32);
  return buf[0] % n;
}

/** First name and last initial, for the public winners list. */
export function publicName(full: string) {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Player";
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0];
}

export type PoolEntry = { uid: string; entries: number };

/** Everyone with at least one entry in the draw. */
export async function loadPool(db: Firestore, d: Draw): Promise<PoolEntry[]> {
  const snap = await getDocs(collectionGroup(db, "entries"));
  return snap.docs
    .filter((e) => e.id === d.id && e.ref.parent.parent)
    .map((e) => ({ uid: e.ref.parent.parent!.id, entries: num(e.data().count) }))
    .filter((e) => e.entries > 0);
}

/** Weighted picks from the browser's secure generator: each entry is one chance, nobody wins twice. */
export function pickFromPool(pool: PoolEntry[], n: number): PoolEntry[] {
  const left = [...pool];
  const picked: PoolEntry[] = [];
  while (picked.length < n && left.length) {
    const total = left.reduce((s, e) => s + e.entries, 0);
    let ticket = randomBelow(total);
    const i = left.findIndex((e) => (ticket -= e.entries) < 0);
    picked.push(left.splice(i, 1)[0]);
  }
  return picked;
}

/** Players' names by uid (missing or blank names read "Player"). */
export async function loadNames(db: Firestore, uids: string[]): Promise<Map<string, string>> {
  const names = await Promise.all(
    uids.map(async (u) => [u, str((await getDoc(doc(db, "users", u))).data()?.name) || "Player"] as const),
  );
  return new Map(names);
}

/** Saves the picks: public winners list, payouts to deliver, and the draw marked drawn. */
export async function commitWinners(db: Firestore, d: Draw, picked: Picked[]) {
  const each = Math.round(d.value / d.winners);
  const batch = writeBatch(db);
  picked.forEach((p) => {
    const ref = doc(collection(db, "payouts"));
    batch.set(doc(db, "winners", ref.id), {
      name: publicName(p.name),
      city: "",
      prize: d.title,
      icon: d.icon,
      drawnAt: serverTimestamp(),
    });
    batch.set(ref, {
      uid: p.uid,
      name: p.name,
      drawId: d.id,
      prize: d.title,
      value: each,
      entries: p.entries,
      status: "to-contact",
      createdAt: serverTimestamp(),
    });
  });
  batch.update(doc(db, "draws", d.id), { drawnAt: serverTimestamp() });
  await batch.commit();
}

/**
 * Picks the draw's winners: every entry is one chance, and a player can win a
 * draw once. Writes a public winner record and a private payout for each.
 */
export async function pickWinners(db: Firestore, d: Draw): Promise<Picked[]> {
  const pool = await loadPool(db, d);
  if (!pool.length) throw new Error("Nobody entered this draw, so there is no one to pick.");
  const chosen = pickFromPool(pool, d.winners);
  const names = await loadNames(db, chosen.map((p) => p.uid));
  const picked = chosen.map((p) => ({ ...p, name: names.get(p.uid) ?? "Player" }));
  await commitWinners(db, d, picked);
  return picked;
}

/* ───────────── winners and payouts ───────────── */

export type Winner = { id: string; name: string; city: string; prize: string; icon: string; drawnAt: Date | null };
export type PayoutStatus = "to-contact" | "contacted" | "delivered";
export type Payout = {
  id: string;
  uid: string;
  name: string;
  prize: string;
  value: number;
  status: PayoutStatus;
  createdAt: Date | null;
};

export async function loadWinners(db: Firestore, n = 50): Promise<Winner[]> {
  const snap = await getDocs(query(collection(db, "winners"), orderBy("drawnAt", "desc"), limit(n)));
  return snap.docs.map((d) => {
    const m = d.data();
    return { id: d.id, name: str(m.name), city: str(m.city), prize: str(m.prize), icon: str(m.icon), drawnAt: toDate(m.drawnAt) };
  });
}

export async function loadPayouts(db: Firestore): Promise<Map<string, Payout>> {
  const snap = await getDocs(query(collection(db, "payouts"), orderBy("createdAt", "desc"), limit(200)));
  return new Map(
    snap.docs.map((d) => {
      const m = d.data();
      const status = (["to-contact", "contacted", "delivered"].includes(m.status) ? m.status : "to-contact") as PayoutStatus;
      return [d.id, { id: d.id, uid: str(m.uid), name: str(m.name), prize: str(m.prize), value: num(m.value), status, createdAt: toDate(m.createdAt) }];
    }),
  );
}

export type WinnerInput = { name: string; city: string; prize: string; icon: string; drawnAt: Date };

const winnerData = (w: WinnerInput) => ({
  name: w.name.trim(),
  city: w.city.trim(),
  prize: w.prize.trim(),
  icon: w.icon,
  drawnAt: Timestamp.fromDate(w.drawnAt),
});

export const createWinner = (db: Firestore, w: WinnerInput) => addDoc(collection(db, "winners"), winnerData(w));
export const updateWinner = (db: Firestore, id: string, w: WinnerInput) => updateDoc(doc(db, "winners", id), winnerData(w));

/** Removes a winner from the public list, and its payout if it has one. */
export async function deleteWinner(db: Firestore, id: string) {
  const batch = writeBatch(db);
  batch.delete(doc(db, "winners", id));
  batch.delete(doc(db, "payouts", id));
  await batch.commit();
}

export const setPayoutStatus = (db: Firestore, id: string, status: PayoutStatus) =>
  updateDoc(doc(db, "payouts", id), { status, updatedAt: serverTimestamp() });

/* ───────────── players ───────────── */

export type Player = {
  id: string;
  name: string;
  /** Mobile number as +923XXXXXXXXX, or "" if the player has not added one. */
  phone: string;
  createdAt: Date | null;
  tickets: number;
  totalAds: number;
  adsToday: number;
  streak: number;
};

const playerFrom = (d: DocumentSnapshot): Player => {
  const m = d.data() ?? {};
  const today = pkDay();
  return {
    id: d.id,
    name: str(m.name),
    phone: str(m.phone),
    createdAt: toDate(m.createdAt),
    tickets: num(m.tickets),
    totalAds: num(m.totalAds),
    adsToday: m.adDay === today ? num(m.adsToday) : 0,
    streak: num(m.claimDay) >= today - 1 ? num(m.streak) : 0,
  };
};

export type PlayerPage = { players: Player[]; cursor: DocumentSnapshot | null };

/** Newest players first, or players whose name starts with [search] (case-sensitive, as Firestore is). */
export async function loadPlayers(db: Firestore, search: string, after: DocumentSnapshot | null, n = 25): Promise<PlayerPage> {
  const users = collection(db, "users");
  const s = search.trim();
  const parts = s
    ? [orderBy("name"), startAt(s), endAt(s + "")]
    : [orderBy("createdAt", "desc")];
  const q = after ? query(users, ...parts, startAfter(after), limit(n)) : query(users, ...parts, limit(n));
  const snap = await getDocs(q);
  return { players: snap.docs.map(playerFrom), cursor: snap.docs.length === n ? snap.docs[snap.docs.length - 1] : null };
}

export async function loadEntries(db: Firestore, uid: string) {
  const snap = await getDocs(collection(db, "users", uid, "entries"));
  return snap.docs.map((d) => ({ drawId: d.id, count: num(d.data().count), updatedAt: toDate(d.data().updatedAt) }));
}

export const setTickets = (db: Firestore, uid: string, tickets: number) =>
  updateDoc(doc(db, "users", uid), { tickets: Math.max(0, Math.round(tickets)) });
