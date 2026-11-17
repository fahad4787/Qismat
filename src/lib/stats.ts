"use client";

import {
  collection,
  doc,
  getAggregateFromServer,
  getCountFromServer,
  getDoc,
  query,
  sum,
  Timestamp,
  where,
  type Firestore,
} from "firebase/firestore";

/** Day number in Pakistan time (UTC+5): the same value the app and the rules use. */
export const pkDay = (ms = Date.now()) => Math.floor((ms + 18_000_000) / 86_400_000);
/** Start of a Pakistan day as a Date. */
export const pkDayStart = (day: number) => new Date(day * 86_400_000 - 18_000_000);

export type Totals = {
  players: number;
  newToday: number;
  activeToday: number;
  adsToday: number;
  checkInsToday: number;
  adsAllTime: number;
  ticketsUnspent: number;
};

export type SignupDay = { day: number; label: string; count: number };

const toDate = (v: unknown) => (v instanceof Timestamp ? v.toDate() : null);
const num = (v: unknown) => (typeof v === "number" ? v : 0);

export async function isAdmin(db: Firestore, uid: string) {
  try {
    return (await getDoc(doc(db, "admins", uid))).exists();
  } catch {
    return false;
  }
}

export async function loadTotals(db: Firestore): Promise<Totals> {
  const users = collection(db, "users");
  const today = pkDay();
  const activeQ = query(users, where("adDay", "==", today));
  // One field per aggregate: Firestore serves a single-field sum or count from its automatic
  // indexes, while two sums in one query (or a filter plus a sum on another field) need a
  // composite index that has to be created by hand in the console.
  const [players, ads, tickets, newToday, active, checkIns, adsToday] = await Promise.all([
    getCountFromServer(users).then((s) => s.data().count),
    getAggregateFromServer(users, { v: sum("totalAds") }).then((s) => s.data().v ?? 0),
    getAggregateFromServer(users, { v: sum("tickets") }).then((s) => s.data().v ?? 0),
    getCountFromServer(query(users, where("createdAt", ">=", Timestamp.fromDate(pkDayStart(today))))).then((s) => s.data().count),
    getCountFromServer(activeQ).then((s) => s.data().count),
    getCountFromServer(query(users, where("claimDay", "==", today))).then((s) => s.data().count),
    // Needs an (adDay, adsToday) index. Without one it reads 0 and the Overview uses the
    // stats/{day} counter instead.
    getAggregateFromServer(activeQ, { v: sum("adsToday") })
      .then((s) => s.data().v ?? 0)
      .catch(() => 0),
  ]);
  return { players, adsAllTime: ads, ticketsUnspent: tickets, newToday, activeToday: active, adsToday, checkInsToday: checkIns };
}

export async function loadSignups(db: Firestore, days = 14): Promise<SignupDay[]> {
  const users = collection(db, "users");
  const today = pkDay();
  const fmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Karachi" });
  return Promise.all(
    Array.from({ length: days }, async (_, i) => {
      const day = today - (days - 1 - i);
      const snap = await getCountFromServer(
        query(
          users,
          where("createdAt", ">=", Timestamp.fromDate(pkDayStart(day))),
          where("createdAt", "<", Timestamp.fromDate(pkDayStart(day + 1))),
        ),
      );
      return { day, label: fmt.format(pkDayStart(day)), count: snap.data().count };
    }),
  );
}
