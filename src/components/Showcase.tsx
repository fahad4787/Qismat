"use client";

import { useEffect, useRef, useState } from "react";
import { Arrow } from "@/components/Chrome";
import { Announcement, Count, HeroClock, useLive } from "@/components/Live";
import { ADS_PER_DAY, DAILY_BONUS, rupees } from "@/lib/site";
import { left } from "@/lib/live";

const still = () =>
  typeof window === "undefined" ||
  matchMedia("(prefers-reduced-motion: reduce)").matches ||
  /HeadlessChrome/.test(navigator.userAgent);

/* ------------------------------------------------------------------ prize glyphs */

type Glyph = "bike" | "tv" | "phone" | "earbuds" | "load" | "gift";

export function glyphFor(title: string): Glyph {
  const t = title.toLowerCase();
  if (/bike|motor|cc\b/.test(t)) return "bike";
  if (/tv|led|television/.test(t)) return "tv";
  if (/load|cash|rs\b|balance/.test(t)) return "load";
  if (/bud|headphone|airpod/.test(t)) return "earbuds";
  if (/phone|mobile|iphone|samsung/.test(t)) return "phone";
  return "gift";
}

const PATHS: Record<Glyph, React.ReactNode> = {
  bike: (
    <>
      <circle cx="6" cy="16.5" r="3.5" />
      <circle cx="18" cy="16.5" r="3.5" />
      <path d="M6 16.5l3.5-6.5h5l3.5 6.5M9.5 10L8 7H5.5M14.5 10l1.5-3h2.5M11 16.5h3" />
    </>
  ),
  tv: (
    <>
      <rect x="2.5" y="4.5" width="19" height="12.5" rx="2" />
      <path d="M8.5 20.5h7M12 17v3.5" />
    </>
  ),
  phone: (
    <>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.6" />
      <path d="M10.5 5.5h3M11 18.5h2" />
    </>
  ),
  earbuds: (
    <>
      <path d="M7 4.5a3.5 3.5 0 0 1 3.5 3.5v2.5a3 3 0 0 1-3 3H7v6M17 4.5A3.5 3.5 0 0 0 13.5 8v2.5a3 3 0 0 0 3 3h.5v6" />
    </>
  ),
  load: (
    <>
      <path d="M13.5 2.5L5 13.5h6l-1 8 8.5-11h-6l1-8z" />
    </>
  ),
  gift: (
    <>
      <rect x="3.5" y="9" width="17" height="11.5" rx="1.5" />
      <path d="M2.5 9h19M12 9v11.5M12 9C10 5 6.5 5 6.5 7S9.5 9 12 9zm0 0c2-4 5.5-4 5.5-2S14.5 9 12 9z" />
    </>
  ),
};

export function PrizeGlyph({ title, className = "" }: { title: string; className?: string }) {
  return (
    <svg className={`glyph ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      {PATHS[glyphFor(title)]}
    </svg>
  );
}

/** "Worth Rs 8,500" and "Rs 8,500" both read as "Rs 8,500". */
const worthOf = (d: { worth: string; value: number }) => (d.worth || rupees(d.value)).replace(/^worth\s+/i, "");

/* ------------------------------------------------------------------ gold dust */

/** Gold dust and spinning coins rising through the hero. Paused off screen and for reduced motion. */
function Dust() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    let w = 0;
    let h = 0;
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    const size = () => {
      w = cv.clientWidth;
      h = cv.clientHeight;
      cv.width = w * dpr;
      cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    const count = w < 700 ? 16 : 34;

    // Glow and coin are drawn once into small sprites; each frame only stamps them (no shadowBlur, no gradients).
    const sprite = (r: number, paint: (c: CanvasRenderingContext2D) => void) => {
      const s = document.createElement("canvas");
      s.width = s.height = r * 2;
      const c = s.getContext("2d")!;
      paint(c);
      return s;
    };
    const GLOW = 16;
    const glow = sprite(GLOW, (c) => {
      const g = c.createRadialGradient(GLOW, GLOW, 0, GLOW, GLOW, GLOW);
      g.addColorStop(0, "rgba(255,236,170,1)");
      g.addColorStop(0.18, "rgba(247,197,72,.9)");
      g.addColorStop(0.45, "rgba(247,197,72,.22)");
      g.addColorStop(1, "rgba(247,197,72,0)");
      c.fillStyle = g;
      c.fillRect(0, 0, GLOW * 2, GLOW * 2);
    });
    const COIN = 24;
    const coinImg = sprite(COIN, (c) => {
      const g = c.createLinearGradient(0, 0, COIN * 2, COIN * 2);
      g.addColorStop(0, "rgba(255,232,150,.9)");
      g.addColorStop(1, "rgba(214,150,40,.9)");
      c.fillStyle = g;
      c.beginPath();
      c.arc(COIN, COIN, COIN - 1, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "rgba(255,247,224,.55)";
      c.lineWidth = 2.5;
      c.beginPath();
      c.arc(COIN, COIN, COIN * 0.6, 0, Math.PI * 2);
      c.stroke();
    });

    type P = { x: number; y: number; r: number; v: number; sway: number; ph: number; coin: boolean; spin: number };
    const make = (y?: number): P => {
      const coin = Math.random() < 0.16;
      return {
        x: Math.random() * w,
        y: y ?? h + 20,
        r: coin ? 5 + Math.random() * 5 : 0.6 + Math.random() * 1.8,
        v: coin ? 0.25 + Math.random() * 0.35 : 0.15 + Math.random() * 0.5,
        sway: 10 + Math.random() * 26,
        ph: Math.random() * Math.PI * 2,
        coin,
        spin: 0.6 + Math.random() * 1.6,
      };
    };
    const ps = Array.from({ length: count }, () => make(Math.random() * h));

    let last = 0;
    const draw = (t: number) => {
      // Frame-rate independent drift, so a slow frame never makes the dust stutter.
      const k = last ? Math.min(3, (t - last) / 16.7) : 1;
      last = t;
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) {
        const x = p.x + Math.sin(t / 2200 + p.ph) * p.sway;
        const fade = Math.min(1, p.y / (h * 0.35)) * Math.min(1, (h - p.y + 40) / 120);
        if (fade > 0.02) {
          if (p.coin) {
            const sx = Math.max(0.12, Math.abs(Math.cos((t / 1000) * p.spin + p.ph)));
            ctx.globalAlpha = fade;
            ctx.drawImage(coinImg, x - p.r * sx, p.y - p.r, p.r * 2 * sx, p.r * 2);
          } else {
            const tw = 0.45 + 0.55 * Math.abs(Math.sin(t / 700 + p.ph));
            const d = p.r * 7;
            ctx.globalAlpha = tw * fade;
            ctx.drawImage(glow, x - d / 2, p.y - d / 2, d, d);
          }
        }
        p.y -= p.v * k;
        if (p.y < -20) Object.assign(p, make());
      }
      ctx.globalAlpha = 1;
    };

    if (still()) {
      draw(0);
      return;
    }
    let raf = 0;
    let on = true;
    const loop = (t: number) => {
      draw(t);
      raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !on) {
        on = true;
        last = 0;
        raf = requestAnimationFrame(loop);
      } else if (!e.isIntersecting && on) {
        on = false;
        cancelAnimationFrame(raf);
      }
    });
    io.observe(cv);
    raf = requestAnimationFrame(loop);
    const ro = new ResizeObserver(size);
    ro.observe(cv);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  return <canvas ref={ref} className="qh__dust" aria-hidden="true" />;
}

/* ------------------------------------------------------------------ the rolling prize word */

function Roller({ words }: { words: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (still() || words.length < 2) return;
    const t = setInterval(() => setI((v) => (v + 1) % words.length), 2600);
    return () => clearInterval(t);
  }, [words.length]);
  const word = words[i % words.length] ?? "";
  return (
    <span className="qh__roll">
      <span className="qh__roll-word" key={word}>
        {word}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ hero */

export function Hero() {
  const { draws } = useLive();
  const stage = useRef<HTMLDivElement>(null);
  const pool = draws.reduce((t, d) => t + d.value, 0);
  const words = draws.map((d) =>
    d.title
      .replace(/^(rs [\d,]+|\d+cc|\d+-inch|wireless)\s+/i, "")
      .split(" ")
      .map((w) => (w === w.toUpperCase() ? w : w.toLowerCase()))
      .join(" "),
  );
  const grand = [...draws].sort((a, b) => b.value - a.value)[0];

  // Looping animations in a section stop while it is off screen, so only what you can see costs anything.
  useEffect(() => {
    const secs = document.querySelectorAll<HTMLElement>("main > section, main > .winners-band");
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.target.classList.toggle("is-off", !e.isIntersecting)),
      { rootMargin: "120px 0px" },
    );
    secs.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  // The stage leans toward the pointer (desktop only, never for reduced motion).
  useEffect(() => {
    const el = stage.current;
    if (!el || still() || !matchMedia("(pointer: fine)").matches) return;
    let raf = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty("--mx", x.toFixed(3));
        el.style.setProperty("--my", y.toFixed(3));
      });
    };
    const reset = () => {
      el.style.setProperty("--mx", "0");
      el.style.setProperty("--my", "0");
    };
    const sec = el.closest("section") ?? el;
    sec.addEventListener("pointermove", move as EventListener);
    sec.addEventListener("pointerleave", reset);
    return () => {
      cancelAnimationFrame(raf);
      sec.removeEventListener("pointermove", move as EventListener);
      sec.removeEventListener("pointerleave", reset);
    };
  }, []);

  const orbit = draws.slice(0, 5);

  return (
    <section className="hero qh" aria-labelledby="hero-h">
      <div className="qh__bg" aria-hidden="true">
        <div className="qh__aurora qh__aurora--a" />
        <div className="qh__aurora qh__aurora--b" />
        <div className="qh__aurora qh__aurora--c" />
        <div className="qh__floor" />
        <div className="qh__grain" />
      </div>
      <Dust />

      <div className="wrap qh__wrap">
        <div className="qh__copy">
          <Announcement />
          <p className="qh__kicker">
            <span className="qh__live" aria-hidden="true" />
            <span>
              Live now · {draws.length} {draws.length === 1 ? "draw" : "draws"} open
            </span>
          </p>

          <h1 id="hero-h" className="qh__title">
            <span className="qh__line" style={{ "--d": "0ms" } as React.CSSProperties}>
              <span>Win a</span>
            </span>
            <span className="qh__line qh__line--gold" style={{ "--d": "120ms" } as React.CSSProperties}>
              <Roller words={words.length ? words : ["motorbike"]} />
            </span>
            <span className="qh__line" style={{ "--d": "240ms" } as React.CSSProperties}>
              <span>
                for <em className="qh__free">free</em>.
              </span>
            </span>
          </h1>

          <p className="qh__lead">
            Watch a short ad, get a ticket, drop it in a draw. No payment, ever. Free prize draws for
            everyone in Pakistan.
          </p>

          <div className="qh__cta">
            <a className="btn btn--primary qh__btn" href="#get">
              <span>Get the app</span>
              <Arrow />
            </a>
            <a className="qh__ghost" href="#how">
              <span className="qh__play" aria-hidden="true">
                <svg viewBox="0 0 12 12">
                  <path d="M4 2.6v6.8L9.4 6z" />
                </svg>
              </span>
              How it works
            </a>
          </div>

          <dl className="qh__stats">
            <div>
              <dt>In prizes now</dt>
              <dd className="qh__stat-gold">
                <Count value={pool} format={rupees} />
              </dd>
            </div>
            <div>
              <dt>Tickets a day</dt>
              <dd>
                <Count value={ADS_PER_DAY + DAILY_BONUS} />
              </dd>
            </div>
            <div>
              <dt>Cost to play</dt>
              <dd>Rs 0</dd>
            </div>
          </dl>
        </div>

        <div
          className="qh__stage"
          ref={stage}
          role="img"
          aria-label="The Qismat app on a phone, with the prizes circling it, a ticket just earned and the grand draw's countdown"
        >
          <div className="qh__halo" aria-hidden="true" />
          <div className="qh__wheel" aria-hidden="true">
            {Array.from({ length: 24 }, (_, i) => (
              <i key={i} style={{ "--i": i } as React.CSSProperties} />
            ))}
          </div>
          <div className="qh__orbit" aria-hidden="true">
            {orbit.map((d, i) => (
              <div
                className="qh__sat"
                key={d.id}
                style={{ "--a": `${(360 / orbit.length) * i}deg` } as React.CSSProperties}
              >
                <div className="qh__chip">
                  <PrizeGlyph title={d.title} />
                  <span>{worthOf(d)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="qh__phone">
            <div className="qh__phone-inner">
              <img
                src="/shots/home.webp"
                srcSet="/shots/home-sm.webp 603w, /shots/home.webp 1206w"
                sizes="(max-width: 1023px) 220px, 280px"
                alt=""
                width={1206}
                height={2622}
                fetchPriority="high"
              />
              <span className="qh__glare" />
            </div>
          </div>

          <div className="qh__card qh__card--ticket" aria-hidden="true">
            <span className="qh__ticket-ico">
              <svg viewBox="0 0 24 24">
                <path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z" />
                <path d="M9 6v12" strokeDasharray="1.5 2" />
              </svg>
            </span>
            <span>
              <b className="qh__plus">+1 ticket</b>
              <small>Ad finished · 8 of {ADS_PER_DAY} today</small>
            </span>
          </div>

          <div className="qh__card qh__card--clock" aria-hidden="true">
            <span className="pc-label">Grand draw · {grand?.title ?? "70cc motorbike"}</span>
            <HeroClock />
          </div>
        </div>
      </div>

      <div className="qh__marquee" aria-hidden="true">
        <div className="qh__track">
          {[0, 1].map((k) => (
            <div className="qh__run" key={k}>
              {draws.map((d) => (
                <span className="qh__item" key={d.id}>
                  <PrizeGlyph title={d.title} />
                  <b>{d.title}</b>
                  <i>{worthOf(d)}</i>
                  <span className="qh__star">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ prizes as a bento */

export function PrizeBento() {
  const { draws, now } = useLive();
  const sorted = [...draws].sort((a, b) => b.value - a.value);
  return (
    <ul className="bento">
      {sorted.map((d, i) => (
        <li
          key={d.id}
          className={`bento__card ${i === 0 ? "bento__card--hero" : ""}`}
          style={{ "--i": i } as React.CSSProperties}
        >
          <div className="bento__top">
            <span className="bento__icon">
              <PrizeGlyph title={d.title} />
            </span>
            <span className="bento__tag">{d.tag ? d.tag.charAt(0) + d.tag.slice(1).toLowerCase() : "Open"}</span>
          </div>
          {i === 0 && <span className="bento__big" aria-hidden="true"><PrizeGlyph title={d.title} /></span>}
          <div className="bento__body">
            <h3>{d.title}</h3>
            <p className="bento__worth">{worthOf(d)}</p>
            <p className="bento__meta">
              <span>{d.winners === 1 ? "1 winner" : `${d.winners} winners`}</span>
              <span>
                {d.ticketCost} {d.ticketCost === 1 ? "ticket" : "tickets"} / entry
              </span>
              {d.endsAt && now ? <span>closes in {left(d.endsAt - now)}</span> : null}
              {d.entries > 0 && <span>{d.entries.toLocaleString("en-US")} entries</span>}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
