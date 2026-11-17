"use client";

import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { firebase, firebaseConfigured } from "@/lib/firebase";
import { isAdmin } from "@/lib/stats";
import { Draws } from "./Draws";
import { Overview } from "./Overview";
import { Players } from "./Players";
import { Settings } from "./Settings";
import { Winners } from "./Winners";
import { Mark, RefreshIcon, btnGhost, btnGold, explain, field } from "./ui";

type Gate = "loading" | "signed-out" | "checking" | "denied" | "admin";

const TABS = [
  { id: "overview", label: "Overview", icon: "M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 7h6V4h-6z" },
  { id: "draws", label: "Draws", icon: "M4 8V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4zM14 4v12" },
  { id: "winners", label: "Winners", icon: "M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 6h3v1a3 3 0 0 1-3 3M7 6H4v1a3 3 0 0 0 3 3" },
  { id: "players", label: "Players", icon: "M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 20v-1a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" },
  { id: "settings", label: "Settings", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" },
] as const;

const Icon = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
);
// The one admin login. The password lives only in Firebase Authentication, never in this code.

type Tab = (typeof TABS)[number]["id"];

export function AdminApp() {
  if (!firebaseConfigured) return <SetupNotice />;
  return <Admin />;
}

function Admin() {
  const [gate, setGate] = useState<Gate>("loading");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const { auth, db } = firebase();
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) return setGate("signed-out");
      setGate("checking");
      setGate((await isAdmin(db, u.uid)) ? "admin" : "denied");
    });
  }, []);

  if (gate === "loading" || gate === "checking")
    return (
      <Centered>
        <div className="flex flex-col items-center gap-5" role="status">
          <div className="relative">
            <span className="absolute -inset-3 rounded-[22px] border border-gold/20 border-t-gold" style={{ animation: "spin-slow 1.1s linear infinite" }} />
            <Mark />
          </div>
          <p className="eyebrow">{gate === "loading" ? "Loading" : "Checking access"}</p>
        </div>
      </Centered>
    );
  if (gate === "signed-out") return <SignIn />;
  if (gate === "denied")
    return (
      <Centered>
        <Mark />
        <h1 className="mt-6 font-display text-2xl">This account isn&apos;t an admin</h1>
        <p className="mt-2 max-w-sm text-muted">
          Signed in as {user?.email ?? user?.uid}. To give it access, create a document at{" "}
          <code className="font-mono text-ink">admins/{user?.uid}</code> in Firestore.
        </p>
        <button onClick={() => signOut(firebase().auth)} className={`${btnGhost} mt-6`}>
          Sign out
        </button>
      </Centered>
    );
  return <Console user={user!} />;
}

/* ───────────── sign-in ───────────── */

function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(explain(e));
      setBusy(false);
    }
  };

  const [show, setShow] = useState(false);

  return (
    <main className="adm-bg grid min-h-dvh lg:grid-cols-[1.15fr_1fr]">
      <aside className="relative hidden overflow-hidden border-r border-ink/5 lg:block">
        <div className="grid-lines absolute inset-0" />
        <div className="absolute -left-40 top-1/3 h-[34rem] w-[34rem] rounded-full bg-gold/10 blur-[120px]" />
        <div className="relative flex h-full flex-col p-12 xl:p-16">
          <div className="rise flex items-center gap-3">
            <Mark small />
            <span className="font-display text-lg">Qismat</span>
            <span className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[.1em] text-gold">Admin</span>
          </div>
          <div className="mt-auto max-w-lg pb-8">
            <p className="eyebrow rise" style={{ "--d": 1 } as React.CSSProperties}>Control room</p>
            <h1 className="rise mt-4 font-display text-5xl leading-[1.02] tracking-[-0.035em] xl:text-6xl" style={{ "--d": 2 } as React.CSSProperties}>
              Every draw, every ad, <span className="text-gold">one desk.</span>
            </h1>
            <p className="rise mt-5 max-w-sm text-muted" style={{ "--d": 3 } as React.CSSProperties}>
              Revenue, players and prizes, read live from the app&apos;s own database.
            </p>
            <ul className="rise mt-10 flex flex-wrap gap-2 text-sm" style={{ "--d": 4 } as React.CSSProperties}>
              {["Live revenue", "Draws & winners", "Payouts", "Announcements"].map((f) => (
                <li key={f} className="rounded-full border border-ink/10 bg-ink/[.03] px-3 py-1.5 text-ink/80">
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="pointer-events-none absolute right-10 top-14 flex items-start gap-4 xl:right-14" aria-hidden>
          <img src="/shots/draws-sm.webp" alt="" className="float mt-16 w-36 rounded-[26px] border-[5px] border-black opacity-70 shadow-2xl xl:w-40" style={{ "--r": "-3deg", rotate: "-3deg", animationDelay: "-2s" } as React.CSSProperties} />
          <img src="/shots/home-sm.webp" alt="" className="float w-40 rounded-[28px] border-[5px] border-black shadow-[0_40px_80px_-30px_rgba(0,0,0,.9)] xl:w-44" style={{ "--r": "4deg", rotate: "4deg" } as React.CSSProperties} />
        </div>
      </aside>

      <section className="relative flex items-center justify-center px-5 py-12 sm:px-10">
        <form
          className="rise w-full max-w-[400px]"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => signInWithEmailAndPassword(firebase().auth, email, password));
          }}
        >
          <div className="flex items-center gap-3 lg:hidden">
            <Mark small />
            <span className="font-display text-lg">Qismat</span>
            <span className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[.1em] text-gold">Admin</span>
          </div>
          <h2 className="mt-10 font-display text-[2rem] leading-tight tracking-[-0.03em] lg:mt-0">Welcome back</h2>
          <p className="mt-2 text-muted">Sign in to the admin. One account, signed in once on this browser.</p>

          <div className="card mt-8 p-6 sm:p-7">
            <label className="block text-sm text-ink/80" htmlFor="email">
              Email
            </label>
            <div className="relative mt-2">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
                <Icon size={17} d="M4 6h16v12H4zM4 7l8 6 8-6" />
              </span>
              <input
                id="email"
                type="email"
                autoComplete="username"
                inputMode="email"
                placeholder="you@example.com"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${field} pl-10`}
              />
            </div>
            <label className="mt-5 block text-sm text-ink/80" htmlFor="password">
              Password
            </label>
            <div className="relative mt-2">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
                <Icon size={17} d="M6 11h12v10H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
              </span>
              <input
                id="password"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${field} px-10`}
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? "Hide password" : "Show password"}
                aria-pressed={show}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted transition hover:text-ink"
              >
                <Icon size={17} d={show ? "M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 9 6 9 6a17 17 0 0 1-2.6 3.2M6.3 7.6A16 16 0 0 0 3 12s4 6 9 6a9 9 0 0 0 4.2-1M9.9 10a3 3 0 0 0 4.1 4.1" : "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"} />
              </button>
            </div>
            {error && (
              <p role="alert" className="mt-4 rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">
                {error}
              </p>
            )}
            <button type="submit" disabled={busy} className={`${btnGold} mt-6 h-12 w-full text-[15px]`}>
              {busy ? "Signing in…" : "Sign in"}
              {!busy && <Icon size={17} d="M5 12h14M13 6l6 6-6 6" />}
            </button>
          </div>

          <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted">
            <Icon size={14} d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
            Protected by Firebase Authentication
          </p>
        </form>
      </section>
    </main>
  );
}

/* ───────────── console ───────────── */

const readTab = (): Tab => {
  const h = typeof location === "undefined" ? "" : location.hash.slice(1);
  return (TABS.find((t) => t.id === h)?.id ?? "overview") as Tab;
};

function Console({ user }: { user: User }) {
  const [tab, setTabState] = useState<Tab>("overview");
  const [tick, setTick] = useState(0);
  // Screens stay mounted once opened, so switching tabs shows what was already loaded.
  // Data reloads only on Refresh or after a change made on that screen.
  const [seen, setSeen] = useState<Set<Tab>>(() => new Set());
  if (!seen.has(tab)) setSeen(new Set(seen).add(tab));

  useEffect(() => {
    setTabState(readTab());
    const on = () => setTabState(readTab());
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);

  const setTab = (t: Tab) => {
    history.replaceState(null, "", `#${t}`);
    setTabState(t);
  };
  const refresh = () => {
    setTick((n) => n + 1);
  };

  const current = TABS.find((t) => t.id === tab)!;
  const out = () => signOut(firebase().auth);

  return (
    <div className="adm-bg min-h-dvh lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-white px-4 py-5 lg:flex">
        <div className="flex items-center gap-3 px-2">
          <Mark small />
          <span className="font-display text-lg">Qismat</span>
          <span className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[.1em] text-gold">Admin</span>
        </div>
        <nav aria-label="Admin sections" className="mt-8 grid gap-1">
          {TABS.map((t) => {
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-current={on ? "page" : undefined}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  on ? "bg-gold/10 font-medium text-ink" : "text-muted hover:bg-ink/[.03] hover:text-ink"
                }`}
              >
                {on && <span className="absolute -left-4 top-2 bottom-2 w-[3px] rounded-r-full bg-gold" />}
                <span className={on ? "text-gold" : "text-muted transition group-hover:text-ink"}>
                  <Icon d={t.icon} />
                </span>
                {t.label}
              </button>
            );
          })}
        </nav>
        <div className="card mt-auto flex items-center gap-3 p-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold to-[#c9952a] font-display text-sm text-gold-ink">
            {(user.email ?? "A")[0].toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-ink">{user.email}</p>
            <p className="text-xs text-muted">Admin</p>
          </div>
          <button onClick={out} className="rounded-lg p-2 text-muted transition hover:bg-ink/[.06] hover:text-ink" aria-label="Sign out" title="Sign out">
            <Icon size={17} d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11" />
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <span className="lg:hidden">
                <Mark small />
              </span>
              <h1 className="truncate font-display text-xl tracking-tight">{current.label}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={refresh} className={btnGhost} aria-label="Reload data">
                <RefreshIcon spinning={false} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button onClick={out} className={`${btnGhost} lg:hidden`}>
                Sign out
              </button>
            </div>
          </div>
          <nav
            aria-label="Admin sections"
            className="flex gap-1.5 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:px-6 lg:hidden"
            ref={(nav) => {
              // Keep the selected tab in view on narrow screens.
              nav?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
            }}
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-current={tab === t.id ? "page" : undefined}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
                  tab === t.id ? "border-gold/40 bg-gold/10 text-gold" : "border-ink/10 text-muted hover:text-ink"
                }`}
              >
                <Icon size={15} d={t.icon} />
                {t.label}
              </button>
            ))}
          </nav>
        </header>

        <main className="px-4 pb-16 sm:px-6">
          {seen.has("overview") && <div hidden={tab !== "overview"}><Overview tick={tick} goSettings={() => setTab("settings")} /></div>}
          {seen.has("draws") && <div hidden={tab !== "draws"}><Draws tick={tick} /></div>}
          {seen.has("winners") && <div hidden={tab !== "winners"}><Winners tick={tick} /></div>}
          {seen.has("players") && <div hidden={tab !== "players"}><Players tick={tick} /></div>}
          {seen.has("settings") && <div hidden={tab !== "settings"}><Settings key={tick} /></div>}
        </main>
      </div>
    </div>
  );
}

/* ───────────── setup notice ───────────── */

function SetupNotice() {
  return (
    <Centered>
      <div className="max-w-lg">
        <Mark />
        <h1 className="mt-6 font-display text-2xl">Connect the admin to Firebase</h1>
        <p className="mt-2 text-muted">
          Register a web app in the Firebase console (Project settings → Your apps → Add app → Web), then put its
          values in <code className="font-mono text-ink">.env.local</code> and rebuild:
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg border border-line bg-panel p-4 font-mono text-sm leading-relaxed text-ink">
          {`NEXT_PUBLIC_FIREBASE_API_KEY=…
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=prizemoney-6d1a7.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=prizemoney-6d1a7
NEXT_PUBLIC_FIREBASE_APP_ID=…`}
        </pre>
      </div>
    </Centered>
  );
}

/* ───────────── bits ───────────── */

function Centered({ children }: { children: React.ReactNode }) {
  return <main className="adm-bg grid min-h-dvh place-items-center px-4 py-12 text-center">{children}</main>;
}
