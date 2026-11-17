"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

/* ───────────── popover plumbing ───────────── */

type Place = { left: number; top: number; width: number; up: boolean };

/**
 * A floating panel anchored to a trigger. It is portalled into the open
 * <dialog> when there is one (a modal dialog makes everything outside it
 * inert), otherwise into <body>, and positioned with `fixed` so scroll
 * containers never clip it.
 */
function usePopover(height: number) {
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<Place | null>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const anchor = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const measure = useCallback(() => {
    const r = anchor.current?.getBoundingClientRect();
    if (!r) return;
    const up = r.bottom + height + 12 > window.innerHeight && r.top > height + 12;
    const width = Math.max(r.width, 220);
    const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
    setPlace({ left, top: up ? r.top - 6 : r.bottom + 6, width, up });
  }, [height]);

  useLayoutEffect(() => {
    if (!open) return;
    setHost(anchor.current?.closest("dialog") ?? document.body);
    measure();
    const away = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!anchor.current?.contains(t) && !panel.current?.contains(t)) setOpen(false);
    };
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    document.addEventListener("pointerdown", away);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      document.removeEventListener("pointerdown", away);
    };
  }, [open, measure]);

  return { open, setOpen, place, anchor, panel, host };
}



function Floating({
  open,
  place,
  host,
  panelRef,
  children,
  className = "",
  ...rest
}: {
  open: boolean;
  place: Place | null;
  host: HTMLElement | null;
  panelRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  if (!open || !host || !place) return null;
  const { left, top, width, up } = place;
  return createPortal(
    <div
      ref={panelRef}
      {...rest}
      style={{ position: "fixed", left, top, minWidth: width, transform: up ? "translateY(-100%)" : undefined, zIndex: 60 }}
      className={`pop rounded-2xl border border-gold/20 bg-panel-2/95 p-1.5 text-ink shadow-[0_24px_60px_-20px_rgb(0_0_0/.9),0_0_0_1px_rgb(247_197_72/.04)] backdrop-blur-md ${
        up ? "pop--up" : ""
      } ${className}`}
    >
      {children}
    </div>,
    host,
  );
}

const Chevron = ({ open }: { open: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    className={`shrink-0 text-gold/80 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const Tick = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 12.5 10 17l9-10" />
  </svg>
);

/* ───────────── Select ───────────── */

export type Option<T extends string> = { value: T; label: string; icon?: React.ReactNode; dot?: string };

const triggerBase =
  "group flex w-full items-center gap-2.5 text-left text-ink transition focus:outline-none focus-visible:border-gold/70 focus-visible:ring-4 focus-visible:ring-gold/10";
const triggerMd = "h-11 rounded-xl border border-ink/10 bg-white px-3.5 hover:border-ink/20 hover:bg-black/35";
const triggerSm = "h-8 rounded-lg border border-ink/10 bg-ink/[.03] px-2.5 text-xs hover:border-ink/20 hover:bg-ink/[.06]";

/** A themed dropdown: a listbox in a popover, with keyboard support. */
export function Select<T extends string>({
  value,
  onChange,
  options,
  small,
  ariaLabel,
  disabled,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Option<T>[];
  small?: boolean;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  const { open, setOpen, anchor, panel, place, host } = usePopover(Math.min(options.length, 7) * 42 + 14);
  const id = useId();
  const sel = Math.max(0, options.findIndex((o) => o.value === value));
  const [active, setActive] = useState(sel);
  const cur = options[sel];

  useEffect(() => {
    if (open) {
      setActive(sel);
      requestAnimationFrame(() => panel.current?.focus());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open) document.getElementById(`${id}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, open, id]);

  const choose = (i: number) => {
    setOpen(false);
    anchor.current?.focus();
    if (options[i] && options[i].value !== value) onChange(options[i].value);
  };

  const key = (e: React.KeyboardEvent) => {
    const n = options.length;
    if (e.key === "ArrowDown") setActive((a) => (a + 1) % n);
    else if (e.key === "ArrowUp") setActive((a) => (a - 1 + n) % n);
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(n - 1);
    else if (e.key === "Enter" || e.key === " ") choose(active);
    else if (e.key === "Escape") {
      setOpen(false);
      anchor.current?.focus();
    } else if (e.key === "Tab") setOpen(false);
    else return;
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <>
      <button
        type="button"
        ref={anchor}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (["ArrowDown", "ArrowUp"].includes(e.key)) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={`${triggerBase} ${small ? triggerSm : triggerMd} ${open ? "!border-gold/60 ring-4 ring-gold/10" : ""} disabled:opacity-50`}
      >
        {cur?.dot && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: cur.dot, boxShadow: `0 0 10px ${cur.dot}` }} />}
        {cur?.icon && <span className={`grid shrink-0 place-items-center text-gold ${small ? "" : "h-7 w-7 rounded-lg bg-gold/10"}`}>{cur.icon}</span>}
        <span className="min-w-0 flex-1 truncate">{cur?.label ?? "Choose…"}</span>
        <Chevron open={open} />
      </button>
      <Floating
        open={open} place={place} host={host} panelRef={panel}
        role="listbox"
        tabIndex={-1}
        aria-label={ariaLabel}
        aria-activedescendant={`${id}-${active}`}
        onKeyDown={key}
        className="max-h-[300px] overflow-y-auto outline-none"
      >
        {options.map((o, i) => {
          const on = i === sel;
          return (
            <div
              key={o.value}
              id={`${id}-${i}`}
              role="option"
              aria-selected={on}
              onPointerEnter={() => setActive(i)}
              onClick={() => choose(i)}
              className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-colors ${
                i === active ? "bg-gold/[.12]" : ""
              } ${on ? "text-gold" : "text-ink"}`}
            >
              {o.dot && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: o.dot }} />}
              {o.icon && (
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg transition ${
                    on ? "bg-gold text-gold-ink" : "bg-ink/[.05] text-gold"
                  }`}
                >
                  {o.icon}
                </span>
              )}
              <span className="flex-1">{o.label}</span>
              <span className={`text-gold transition ${on ? "opacity-100" : "opacity-0"}`}>
                <Tick />
              </span>
            </div>
          );
        })}
      </Floating>
    </>
  );
}

/* ───────────── DateTimePicker ───────────── */

/** Parts of a "YYYY-MM-DDTHH:mm" string (Pakistan wall time). */
const parse = (v: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(v);
  if (!m) return null;
  return { y: +m[1], mo: +m[2] - 1, d: +m[3], h: +m[4], mi: +m[5] };
};
const fmt = (y: number, mo: number, d: number, h: number, mi: number) =>
  new Date(Date.UTC(y, mo, d, h, mi)).toISOString().slice(0, 16);
const nowPk = () => new Date(Date.now() + 18_000_000).toISOString().slice(0, 16);

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function describePk(v: string) {
  const p = parse(v);
  if (!p) return "Choose a date";
  const wd = new Date(Date.UTC(p.y, p.mo, p.d)).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
  const h12 = p.h % 12 || 12;
  return `${wd} ${p.d} ${MONTHS[p.mo].slice(0, 3)} ${p.y} · ${h12}:${String(p.mi).padStart(2, "0")} ${p.h < 12 ? "AM" : "PM"}`;
}

const CalIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </svg>
);

function Stepper({ label, value, onUp, onDown }: { label: string; value: string; onUp: () => void; onDown: () => void }) {
  const btn =
    "grid h-7 w-full place-items-center rounded-lg text-muted transition hover:bg-gold/10 hover:text-gold active:scale-95";
  return (
    <div className="flex w-14 flex-col items-center rounded-xl border border-ink/10 bg-white p-1" aria-label={label} role="group">
      <button type="button" className={btn} onClick={onUp} aria-label={`${label} up`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="m6 15 6-6 6 6" /></svg>
      </button>
      <span className="py-0.5 font-display text-xl tabular-nums text-ink">{value}</span>
      <button type="button" className={btn} onClick={onDown} aria-label={`${label} down`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
      </button>
    </div>
  );
}

/**
 * A themed date-and-time picker. The value is a Pakistan wall-time string,
 * "YYYY-MM-DDTHH:mm", the same shape toPkInput / fromPkInput use.
 */
export function DateTimePicker({ value, onChange, ariaLabel }: { value: string; onChange: (v: string) => void; ariaLabel?: string }) {
  const { open, setOpen, anchor, panel, place, host } = usePopover(470);
  const p = parse(value) ?? parse(nowPk())!;
  const [view, setView] = useState({ y: p.y, mo: p.mo });
  const today = parse(nowPk())!;

  useEffect(() => {
    if (open) setView({ y: p.y, mo: p.mo });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const cells = useMemo(() => {
    const first = new Date(Date.UTC(view.y, view.mo, 1));
    const lead = (first.getUTCDay() + 6) % 7; // Monday first
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(Date.UTC(view.y, view.mo, 1 - lead + i));
      return { y: d.getUTCFullYear(), mo: d.getUTCMonth(), d: d.getUTCDate() };
    });
  }, [view]);

  const set = (c: Partial<typeof p>) => {
    const n = { ...p, ...c };
    onChange(fmt(n.y, n.mo, n.d, n.h, n.mi));
  };
  const shift = (months: number) => setView((v) => ({ y: v.y + Math.floor((v.mo + months) / 12), mo: (((v.mo + months) % 12) + 12) % 12 }));
  const preset = (days: number, h: number) => {
    const d = new Date(Date.UTC(today.y, today.mo, today.d + days));
    onChange(fmt(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h, 0));
    setView({ y: d.getUTCFullYear(), mo: d.getUTCMonth() });
  };
  const pm = p.h >= 12;
  const h12 = p.h % 12 || 12;

  return (
    <>
      <button
        type="button"
        ref={anchor}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen(!open)}
        className={`${triggerBase} ${triggerMd} ${open ? "!border-gold/60 ring-4 ring-gold/10" : ""}`}
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gold/10 text-gold">
          <CalIcon />
        </span>
        <span className="min-w-0 flex-1 truncate tabular-nums">{describePk(value)}</span>
        <Chevron open={open} />
      </button>
      <Floating
        open={open} place={place} host={host} panelRef={panel}
        role="dialog"
        aria-label={ariaLabel ?? "Choose date and time"}
        className="w-[312px] !p-3"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            setOpen(false);
            anchor.current?.focus();
          }
        }}
      >
        <div className="mb-3 flex flex-wrap gap-1.5">
          {[
            ["Tonight 9 PM", 0, 21],
            ["Tomorrow", 1, 21],
            ["In a week", 7, 21],
            ["In 30 days", 30, 21],
          ].map(([l, d, h]) => (
            <button
              key={l as string}
              type="button"
              onClick={() => preset(d as number, h as number)}
              className="rounded-full border border-gold/25 bg-gold/[.06] px-2.5 py-1 text-[11px] text-gold transition hover:bg-gold hover:text-gold-ink"
            >
              {l}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-ink/5 hover:text-ink">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="m15 6-6 6 6 6" /></svg>
          </button>
          <p className="font-display text-[15px]" aria-live="polite">
            {MONTHS[view.mo]} <span className="text-gold">{view.y}</span>
          </p>
          <button type="button" onClick={() => shift(1)} aria-label="Next month" className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-ink/5 hover:text-ink">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="m9 6 6 6-6 6" /></svg>
          </button>
        </div>

        <div className="mt-2 grid grid-cols-7 gap-0.5 text-center">
          {DOW.map((d) => (
            <span key={d} className="py-1 font-mono text-[10px] uppercase tracking-wider text-muted/70">
              {d}
            </span>
          ))}
          {cells.map((c) => {
            const inMonth = c.mo === view.mo;
            const on = c.y === p.y && c.mo === p.mo && c.d === p.d;
            const isToday = c.y === today.y && c.mo === today.mo && c.d === today.d;
            const past = Date.UTC(c.y, c.mo, c.d) < Date.UTC(today.y, today.mo, today.d);
            return (
              <button
                key={`${c.y}-${c.mo}-${c.d}`}
                type="button"
                aria-pressed={on}
                aria-label={`${c.d} ${MONTHS[c.mo]} ${c.y}`}
                onClick={() => {
                  set({ y: c.y, mo: c.mo, d: c.d });
                  if (!inMonth) setView({ y: c.y, mo: c.mo });
                }}
                className={`relative grid h-9 place-items-center rounded-xl text-[13px] tabular-nums transition ${
                  on
                    ? "bg-gradient-to-b from-[#ffe08a] to-gold font-semibold text-gold-ink shadow-[0_6px_18px_-6px_rgb(247_197_72/.7)]"
                    : inMonth
                      ? `${past ? "text-muted/60" : "text-ink"} hover:bg-gold/10 hover:text-gold`
                      : "text-muted/30 hover:bg-ink/5"
                }`}
              >
                {c.d}
                {isToday && !on && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-gold" />}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
          <Stepper label="Hour" value={String(h12).padStart(2, "0")} onUp={() => set({ h: (p.h + 1) % 24 })} onDown={() => set({ h: (p.h + 23) % 24 })} />
          <span className="font-display text-xl text-gold">:</span>
          <Stepper label="Minute" value={String(p.mi).padStart(2, "0")} onUp={() => set({ mi: (p.mi + 5 - (p.mi % 5)) % 60 })} onDown={() => set({ mi: p.mi % 5 ? p.mi - (p.mi % 5) : (p.mi + 55) % 60 })} />
          <div className="ml-1 flex flex-col gap-1 rounded-xl border border-ink/10 bg-white p-1">
            {(["AM", "PM"] as const).map((x) => {
              const on = (x === "PM") === pm;
              return (
                <button
                  key={x}
                  type="button"
                  aria-pressed={on}
                  onClick={() => !on && set({ h: (p.h + 12) % 24 })}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${on ? "bg-gold text-gold-ink" : "text-muted hover:text-ink"}`}
                >
                  {x}
                </button>
              );
            })}
          </div>
          <div className="ml-auto flex flex-col items-end gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted">Pakistan time</span>
            <button type="button" className="btn-gold rounded-lg px-3 py-1.5 text-xs font-semibold" onClick={() => { setOpen(false); anchor.current?.focus(); }}>
              Done
            </button>
          </div>
        </div>
      </Floating>
    </>
  );
}

/* ───────────── prize icons ───────────── */

const ICON_PATHS: Record<string, React.ReactNode> = {
  bike: (
    <>
      <circle cx="5.5" cy="16.5" r="3" />
      <circle cx="18.5" cy="16.5" r="3" />
      <path d="M5.5 16.5 9 9.5h5.5l4 7M12.5 9.5 11 6H8.5M14.5 9.5 16.5 6h2" />
    </>
  ),
  phone: (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      <path d="M11 18.5h2" />
    </>
  ),
  cash: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 9.5v5M18 9.5v5" />
    </>
  ),
  earbuds: (
    <>
      <path d="M8 4.5a3.5 3.5 0 0 0-3.5 3.5v.5A3.5 3.5 0 0 0 8 12v8" />
      <path d="M16 4.5a3.5 3.5 0 0 1 3.5 3.5v.5A3.5 3.5 0 0 1 16 12v8" />
    </>
  ),
  tv: (
    <>
      <rect x="2.5" y="5.5" width="19" height="12.5" rx="2" />
      <path d="M8 21h8M9 2.5l3 3 3-3" />
    </>
  ),
  car: (
    <>
      <path d="M3.5 16.5v-3.5l2-5h13l2 5v3.5z" />
      <path d="M4.5 16.5v2.5h3v-2.5M16.5 16.5v2.5h3v-2.5" />
      <circle cx="7.5" cy="13.2" r=".9" />
      <circle cx="16.5" cy="13.2" r=".9" />
    </>
  ),
  laptop: (
    <>
      <rect x="4.5" y="5" width="15" height="10.5" rx="1.5" />
      <path d="M2 19h20" />
    </>
  ),
  watch: (
    <>
      <circle cx="12" cy="12" r="5.5" />
      <path d="m9 6.8.6-4.3h4.8l.6 4.3M9 17.2l.6 4.3h4.8l.6-4.3M12 9.6V12l1.6 1.4" />
    </>
  ),
  gold: <path d="M2.5 19.5 4.5 14h6l2 5.5zM11.5 19.5l2-5.5h6l2 5.5zM7 14l2-5.5h6l2 5.5z" />,
  gift: (
    <>
      <rect x="3.5" y="8.5" width="17" height="4" rx="1" />
      <path d="M5 12.5V21h14v-8.5M12 8.5V21M12 8.5C10 8.5 7 8 7.5 5.5S11 5 12 8.5zm0 0c2 0 5-.5 4.5-3S13 5 12 8.5z" />
    </>
  ),
};

export function PrizeIcon({ name, size = 16 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICON_PATHS[name] ?? ICON_PATHS.gift}
    </svg>
  );
}

export const iconOptions = (names: readonly string[]): Option<string>[] =>
  names.map((n) => ({ value: n, label: n[0].toUpperCase() + n.slice(1), icon: <PrizeIcon name={n} /> }));
