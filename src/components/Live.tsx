"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { PRIZES, rupees } from "@/lib/site";
import { left, loadLive, type Live, type LiveDraw } from "@/lib/live";

// The build prints the seeded draws; the visitor's browser swaps in the live ones a moment later.
const FALLBACK: LiveDraw[] = PRIZES.map((p, i) => ({
  id: String(i),
  title: p.name,
  tag: p.every.toUpperCase(),
  worth: p.worth,
  value: p.value,
  ticketCost: p.ticketCost,
  winners: p.winners,
  entries: -1,
  order: i,
  endsAt: null,
}));

type Ctx = { live: Live | null; draws: LiveDraw[]; now: number };
const LiveCtx = createContext<Ctx>({ live: null, draws: FALLBACK, now: 0 });
export const useLive = () => useContext(LiveCtx);

export function LiveProvider({ children }: { children: React.ReactNode }) {
  const [live, setLive] = useState<Live | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    let off = false;
    loadLive()
      .then((l) => {
        if (off || !l) return;
        setLive(l);
        if (l.playUrl.startsWith("https://")) {
          document
            .querySelectorAll<HTMLAnchorElement>('a[href^="https://play.google.com"]')
            .forEach((a) => (a.href = l.playUrl));
        }
      })
      .catch(() => {});
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      off = true;
      clearInterval(tick);
    };
  }, []);

  const draws = live && live.draws.length ? live.draws : FALLBACK;
  return <LiveCtx.Provider value={{ live, draws, now }}>{children}</LiveCtx.Provider>;
}

export function Announcement() {
  const { live } = useLive();
  if (!live?.announcement) return null;
  return (
    <div className="announce" role="status">
      <span className="announce__dot" aria-hidden="true" />
      {live.announcement}
    </div>
  );
}

export function PoolText() {
  const { draws } = useLive();
  return <>{rupees(draws.reduce((t, d) => t + d.value, 0))}</>;
}

/** Counts up once, the first time it is on screen. */
export function Count({ value, format = (v: number) => v.toLocaleString("en-US") }: { value: number | null; format?: (v: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState<number | null>(value);
  const seen = useRef(false);
  const from = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || value === null) return;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches || /HeadlessChrome/.test(navigator.userAgent);
    let raf = 0;
    const run = () => {
      if (still) return setShown(value);
      const start = performance.now();
      const a = seen.current ? from.current : 0;
      seen.current = true;
      const step = (t: number) => {
        const k = Math.min(1, (t - start) / 1400);
        const e = 1 - Math.pow(1 - k, 4);
        setShown(Math.round(a + (value - a) * e));
        if (k < 1) raf = requestAnimationFrame(step);
        else from.current = value;
      };
      raf = requestAnimationFrame(step);
    };
    if (seen.current) {
      run();
      return () => cancelAnimationFrame(raf);
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          io.disconnect();
          run();
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);

  return (
    <span ref={ref} className="tabular">
      {value === null ? "–" : format(shown ?? value)}
    </span>
  );
}

export function Board() {
  const { draws, live } = useLive();
  const pool = draws.reduce((t, d) => t + d.value, 0);
  const entries = live ? live.draws.reduce((t, d) => t + Math.max(0, d.entries), 0) : null;
  const figures: { k: string; v: React.ReactNode; c: string }[] = [
    { k: "pool", v: <Count value={pool} format={rupees} />, c: "in prizes, open right now" },
    { k: "draws", v: <Count value={draws.length} />, c: draws.length === 1 ? "draw taking entries" : "draws taking entries" },
    { k: "entries", v: <Count value={entries} />, c: "entries placed by players" },
    { k: "cost", v: "Rs 0", c: "to enter, every time" },
  ];
  return (
    <dl className="board">
      {figures.map((f, i) => (
        <div className="board__fig" key={f.k} style={{ "--i": i } as React.CSSProperties}>
          <dt>{f.c}</dt>
          <dd>
            <span className="board__num">{f.v}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function PrizesHeading() {
  const { draws } = useLive();
  const words = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
  const count = words[draws.length] ?? String(draws.length);
  return (
    <>
      {count} {draws.length === 1 ? "draw" : "draws"} open now.{" "}
      <span className="muted">
        <PoolText /> in prizes, bought by us.
      </span>
    </>
  );
}

export function PrizeLedger() {
  const { draws, now } = useLive();
  return (
    <ul className="rows ledger sx-deal">
      {draws.map((d, i) => (
        <li key={d.id} style={{ "--i": i } as React.CSSProperties}>
          <span className="rows__name">{d.title}</span>
          <p>
            {d.endsAt && now ? (
              <span className="ledger__clock">
                <svg viewBox="0 0 12 12" aria-hidden="true">
                  <circle cx="6" cy="6" r="5" />
                  <path d="M6 3.2V6l1.8 1.2" />
                </svg>
                closes in {left(d.endsAt - now)}
              </span>
            ) : (
              <span>{d.tag ? d.tag.charAt(0) + d.tag.slice(1).toLowerCase() : "Open"} draw</span>
            )}
            {" · "}
            {d.winners === 1 ? "1 winner" : `${d.winners} winners`} · {d.ticketCost}{" "}
            {d.ticketCost === 1 ? "ticket" : "tickets"} per entry
            {d.entries > 0 && ` · ${d.entries.toLocaleString("en-US")} entries`}
          </p>
          <span className="rows__value">{d.worth || rupees(d.value)}</span>
        </li>
      ))}
    </ul>
  );
}

const ago = (at: number | null, now: number) => {
  if (!at || !now) return "";
  const d = Math.floor((now - at) / 86_400_000);
  if (d <= 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d} days ago`;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Karachi" }).format(at);
};

/** The latest winners as a row of cards. Only real results from the app. */
export function WinnersBand() {
  const { live, now } = useLive();
  const list = live?.winners.filter((w) => w.name) ?? [];
  if (!list.length) return null;
  return (
    <section className="winners-band" aria-labelledby="won-h">
      <div className="wrap winners-band__head">
        <h2 id="won-h" className="winners-band__h">
          <span className="winners-band__dot" aria-hidden />
          Latest winners
        </h2>
        <p className="winners-band__sub">Real players, picked at random in the app.</p>
      </div>
      <div className="wrap">
      <ul className="winners-band__row">
        {list.map((w) => (
          <li key={w.id} className="win-card">
            <span className="win-card__avatar" aria-hidden>
              {w.name.trim()[0]?.toUpperCase()}
            </span>
            <div className="win-card__who">
              <b>{w.name}</b>
              <span>{[w.city, ago(w.at, now)].filter(Boolean).join(" · ")}</span>
            </div>
            <p className="win-card__prize">
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
              </svg>
              {w.prize}
            </p>
          </li>
        ))}
      </ul>
      </div>
    </section>
  );
}

/** The grand draw's time left, from the live draw that closes last. */
export function HeroClock() {
  const { live, now } = useLive();
  const grand = live?.draws.filter((d) => d.endsAt).sort((a, b) => b.value - a.value)[0];
  let parts: [string, string][] = [["12", "days"], ["04", "hrs"], ["37", "min"]];
  if (grand?.endsAt && now) {
    const m = Math.max(0, Math.floor((grand.endsAt - now) / 60_000));
    const pad = (v: number) => String(v).padStart(2, "0");
    parts = [[pad(Math.floor(m / 1440)), "days"], [pad(Math.floor((m % 1440) / 60)), "hrs"], [pad(m % 60), "min"]];
  }
  return (
    <div className="pc-clock">
      {parts.map(([v, l]) => (
        <span key={l}>
          <b>{v}</b>
          {l}
        </span>
      ))}
    </div>
  );
}
