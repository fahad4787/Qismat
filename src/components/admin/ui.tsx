"use client";

import { useEffect, useId, useRef, useState } from "react";

export const nf = new Intl.NumberFormat("en-PK");
export const rs = (n: number) => `Rs ${nf.format(Math.round(n))}`;
const df = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Karachi",
});
/** +923001234567 as 0300 1234567, the way people in Pakistan write it. */
export const fmtPhone = (p: string) => (/^\+923\d{9}$/.test(p) ? `0${p.slice(3, 6)} ${p.slice(6)}` : p);
export const fmtDate = (d: Date | null) => (d ? df.format(d) : "—");

/** A Date as the value of a datetime-local input, in Pakistan time. */
export const toPkInput = (d: Date) => new Date(d.getTime() + 18_000_000).toISOString().slice(0, 16);
/** A datetime-local value read as Pakistan time. */
export const fromPkInput = (v: string) => new Date(Date.parse(v + ":00Z") - 18_000_000);

export function explain(e: unknown) {
  const code = (e as { code?: string })?.code ?? "";
  const msg = (e as { message?: string })?.message ?? String(e);
  if (code === "permission-denied")
    return "Firestore refused this. Make sure the latest rules in qismat/firestore.rules are deployed and this account is in admins.";
  if (code === "failed-precondition" && msg.includes("index"))
    return "A Firestore index is missing. Open the link in the browser console to create it, then try again.";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found")
    return "That email and password don't match an account.";
  if (code === "auth/popup-closed-by-user") return "The Google window was closed before sign-in finished.";
  if (code === "auth/unauthorized-domain")
    return "This domain isn't allowed for sign-in. Add it under Firebase Authentication → Settings → Authorised domains.";
  return msg;
}

export const field =
  "h-11 w-full rounded-xl border border-ink/10 bg-white px-3.5 text-ink placeholder:text-muted/60 transition focus:border-gold/70 focus:bg-white focus:outline-none focus:ring-4 focus:ring-gold/10";
export const btnGold =
  "btn-gold inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition active:scale-[.98] disabled:opacity-60";
export const btnGhost =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-ink/10 bg-ink/[.03] px-3 text-sm text-ink transition hover:border-ink/20 hover:bg-ink/[.06] disabled:opacity-60";
export const btnSmall =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-ink/10 bg-ink/[.03] px-2.5 text-xs text-ink transition hover:border-ink/20 hover:bg-ink/[.06] disabled:opacity-50";

export function Section({
  title,
  note,
  action,
  children,
}: {
  title: string;
  note?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rise mt-6 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <h2 className="font-display text-lg tracking-tight">{title}</h2>
          {note && <span className="text-sm text-muted tabular">{note}</span>}
        </div>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export type Tile = { label: string; value: React.ReactNode; hint?: string; accent?: boolean };

export function Tiles({ items, cols = 4 }: { items: Tile[]; cols?: 4 | 5 }) {
  return (
    <dl
      className={`mt-4 grid grid-cols-2 gap-3 ${
        cols === 5 ? "md:grid-cols-6 lg:grid-cols-5" : "md:grid-cols-4"
      }`}
    >
      {items.map(({ label, value, hint, accent }, i) => (
        <div
          key={label}
          style={{ "--d": i } as React.CSSProperties}
          className={`rise ${accent ? "card-gold" : "card"} p-4 ${
            cols === 5 ? `${i === 0 ? "col-span-2" : ""} ${i < 3 ? "md:col-span-2" : "md:col-span-3"} lg:col-span-1` : ""
          }`}
        >
          <dt className="text-sm text-muted">{label}</dt>
          <dd className="mt-2 font-display text-2xl tracking-tight tabular sm:text-[1.75rem]">
            {typeof value === "number" ? nf.format(value) : value}
          </dd>
          {hint && <dd className="mt-1 text-xs text-muted tabular">{hint}</dd>}
        </div>
      ))}
    </dl>
  );
}

export function Table({
  head,
  rows,
  numeric = [],
  empty,
  minWidth = 560,
}: {
  head: string[];
  rows: { key: string; cells: React.ReactNode[]; muted?: boolean }[];
  numeric?: number[];
  empty: string;
  minWidth?: number;
}) {
  if (!rows.length) return <p className="card p-6 text-center text-muted">{empty}</p>;
  const align = (i: number) => (numeric.includes(i) ? "text-right tabular" : "text-left");
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-line bg-panel-2/60 text-muted">
            {head.map((h, i) => (
              <th key={i} scope="col" className={`px-4 py-3 text-[11px] font-medium uppercase tracking-[.08em] ${align(i)}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className={`border-b border-ink/[.05] transition-colors last:border-0 hover:bg-ink/[.025] ${r.muted ? "text-muted" : ""}`}>
              {r.cells.map((c, i) => (
                <td key={i} className={`px-4 py-3 align-middle ${align(i)} ${i === 0 ? (r.muted ? "" : "text-ink") : "whitespace-nowrap"}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* Single series, one hue: gold bars, 4px rounded tops, 2px gaps, recessive axis. */
export function BarChart({
  title,
  unit,
  days,
  detail,
}: {
  title: string;
  unit: string;
  days: { key: number; label: string; value: number }[];
  detail?: (i: number) => string;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...days.map((d) => d.value));
  const total = days.reduce((s, d) => s + d.value, 0);
  const step = Math.pow(10, Math.floor(Math.log10(max)));
  const top = Math.ceil(max / step) * step;

  return (
    <div className="card rise p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink">{title}</p>
          <p className="text-xs text-muted tabular">
            {nf.format(total)} {unit} in {days.length} days
          </p>
        </div>
        <div className="flex rounded-xl border border-ink/10 bg-ink/[.04] p-0.5 text-xs" role="group" aria-label="Show as">
          {(["chart", "table"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`rounded-lg px-2.5 py-1 capitalize transition ${view === v ? "bg-ink/10 text-ink" : "text-muted hover:text-ink"}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === "table" ? (
        <div className="mt-4 max-h-56 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="py-2 text-left font-normal">Day</th>
                <th className="py-2 text-right font-normal capitalize">{unit}</th>
                {detail && <th className="py-2 text-right font-normal">Detail</th>}
              </tr>
            </thead>
            <tbody>
              {days.map((d, i) => (
                <tr key={d.key} className="border-b border-line/60 last:border-0">
                  <td className="py-2">{d.label}</td>
                  <td className="py-2 text-right tabular">{nf.format(d.value)}</td>
                  {detail && <td className="py-2 text-right tabular text-muted">{detail(i)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative mt-6">
          <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-line text-[11px] text-muted">
            <span className="-mt-2 inline-block bg-panel pr-1 tabular">{nf.format(top)}</span>
          </div>
          <div className="flex h-44 items-end gap-[2px] border-b border-line" onMouseLeave={() => setHover(null)}>
            {days.map((d, i) => (
              <div
                key={d.key}
                className="relative flex h-full flex-1 items-end outline-none"
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                tabIndex={0}
                aria-label={`${d.label}: ${d.value} ${unit}`}
              >
                <div
                  className={`w-full rounded-t-[4px] bg-[#e0a412] transition-opacity ${
                    hover !== null && hover !== i ? "opacity-45" : ""
                  }`}
                  style={{ height: d.value ? `${Math.max(2, (d.value / top) * 100)}%` : "0" }}
                />
                {hover === i && (
                  <div
                    role="tooltip"
                    className={`absolute bottom-full z-10 mb-2 whitespace-nowrap rounded-md border border-line bg-bg px-2.5 py-1.5 text-xs shadow-lg ${
                      i > days.length / 2 ? "right-0" : "left-0"
                    }`}
                  >
                    <span className="text-muted">{d.label}</span>
                    <span className="ml-2 tabular text-ink">
                      {nf.format(d.value)} {unit}
                    </span>
                    {detail && <span className="ml-2 tabular text-muted">{detail(i)}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-muted">
            <span>{days[0]?.label}</span>
            <span>{days[days.length - 1]?.label}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/** A dialog with a title, built on <dialog> so focus and Escape work. */
export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    // No close() on cleanup: it fires `close`, which would call onClose while
    // React re-runs effects. Unmounting removes the dialog anyway.
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={`m-auto w-[calc(100%-2rem)] ${
        wide ? "max-w-2xl" : "max-w-lg"
      } whitespace-normal text-left rounded-2xl border border-ink/10 bg-panel p-0 text-ink shadow-2xl backdrop:bg-ink/30 backdrop:backdrop-blur-sm`}
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 id={id} className="font-display text-lg">
          {title}
        </h2>
        <button onClick={onClose} className="rounded-md p-1 text-muted hover:text-ink" aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      <div className="max-h-[75dvh] overflow-y-auto px-5 py-5">{children}</div>
    </dialog>
  );
}

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: React.ReactElement;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm text-muted">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const btnDanger =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-bad px-4 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[.98] disabled:opacity-60";

/** A delete button that opens a confirm dialog before it acts. */
export function ConfirmButton({
  onConfirm,
  label = "Delete",
  confirm = "Delete",
  title = "Delete this?",
  message = "This is removed for good and can't be undone.",
  disabled,
  tone = "danger",
}: {
  onConfirm: () => void | Promise<unknown>;
  /** "danger" deletes something; "gold" is a firm but undoable step, like ending a draw early. */
  tone?: "danger" | "gold";
  label?: string;
  confirm?: string;
  title?: string;
  message?: React.ReactNode;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={`${btnSmall} ${tone === "gold" ? "hover:border-gold/60 hover:text-gold" : "hover:border-bad/60 hover:text-bad"}`}
      >
        {label}
      </button>
      {open && (
        <Modal title={title} onClose={() => setOpen(false)}>
          <div className="flex gap-4">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${tone === "gold" ? "bg-gold/15 text-gold" : "warn-ring bg-bad/15 text-bad"}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d={tone === "gold" ? "M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 9v4l2.5 2.5M10 2h4" : "M4 7h16M10 11v6M14 11v6M5.5 7l1 12.5a2 2 0 0 0 2 1.5h7a2 2 0 0 0 2-1.5L18.5 7M9 7V4.5h6V7"} />
              </svg>
            </span>
            <p className="min-w-0 whitespace-normal pt-1 text-sm leading-relaxed text-muted">{message}</p>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setOpen(false)} disabled={busy} autoFocus>
              Cancel
            </button>
            <button type="button" className={tone === "gold" ? btnGold : btnDanger} onClick={go} disabled={busy}>
              {busy ? (tone === "gold" ? "Working…" : "Deleting…") : confirm}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

export function Alert({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" className="mt-4 rounded-lg border border-bad/40 bg-bad/10 p-3 text-sm text-bad">
      {children}
    </div>
  );
}

export function Status({ tone, children }: { tone: "gold" | "muted" | "good" | "bad"; children: React.ReactNode }) {
  const c = {
    gold: "border-gold/40 bg-gold/10 text-gold",
    muted: "border-line text-muted",
    good: "border-emerald-400/40 bg-emerald-400/10 text-emerald-700",
    bad: "border-bad/40 bg-bad/10 text-bad",
  }[tone];
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs ${c}`}>{children}</span>;
}

/** Runs an async action with busy and error state. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true);
    setError("");
    try {
      return await fn();
    } catch (e) {
      console.error(e);
      setError(explain(e));
      return undefined;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, setError, run };
}

export function Mark({ small }: { small?: boolean }) {
  const s = small ? 28 : 44;
  return (
    <svg width={s} height={s} viewBox="0 0 64 64" aria-hidden className={small ? "" : "mx-auto"}>
      <rect width="64" height="64" rx="14" fill="#183829" stroke="#2f5745" />
      <rect x="16" y="36" width="32" height="8" rx="2" fill="#f7c548" />
      <rect x="20" y="26" width="24" height="8" rx="2" fill="#f7c548" opacity=".75" />
      <rect x="24" y="16" width="16" height="8" rx="2" fill="#f7c548" opacity=".5" />
    </svg>
  );
}

export function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className={spinning ? "animate-spin" : ""}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36M21 4v5h-5" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
