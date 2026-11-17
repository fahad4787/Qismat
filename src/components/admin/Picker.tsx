"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { firebase } from "@/lib/firebase";
import {
  commitWinners,
  loadNames,
  loadPool,
  pickFromPool,
  publicName,
  type Draw,
  type Picked,
  type PoolEntry,
} from "@/lib/admin";
import { PrizeIcon, Select } from "./controls";
import { Alert, Modal, btnGhost, btnGold, explain, nf, rs } from "./ui";

const ROW = 76; // reel row height in px
const SPIN_MS = 5600;

type Phase = "loading" | "empty" | "armed" | "locking" | "spinning" | "won" | "done";

const shuffle = <T,>(a: T[]) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The live draw: a slot-machine reveal of a draw's winners.
 *
 * It stays genuine because the order is fixed: the winners are picked with the
 * browser's secure generator (each entry one chance, nobody twice) and saved to
 * Firestore first. Only then does the reel spin, and it always stops on the
 * name that was already saved. Closing the window mid-spin changes nothing.
 */
export function LiveDraw({ draws, initial, onClose }: { draws: Draw[]; initial?: Draw; onClose: () => void }) {
  const [drawId, setDrawId] = useState(initial?.id ?? draws[0]?.id ?? "");
  const draw = draws.find((d) => d.id === drawId) ?? initial ?? null;
  const [phase, setPhase] = useState<Phase>(draw ? "loading" : "empty");
  const [pool, setPool] = useState<PoolEntry[]>([]);
  const [faces, setFaces] = useState<string[]>([]);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [shown, setShown] = useState(-1); // index of the winner on the reel
  const [spin, setSpin] = useState(0); // bumps for every spin
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(() => pool.reduce((s, e) => s + e.entries, 0), [pool]);

  // Load who is in the selected draw.
  useEffect(() => {
    if (!draw) return;
    let live = true;
    setPhase("loading");
    setError(null);
    (async () => {
      try {
        const { db } = firebase();
        const p = await loadPool(db, draw);
        if (!live) return;
        setPool(p);
        if (!p.length) return setPhase("empty");
        const sample = shuffle(p).slice(0, 36);
        const names = await loadNames(db, sample.map((e) => e.uid));
        if (!live) return;
        setFaces(sample.map((e) => publicName(names.get(e.uid) ?? "Player")));
        setPhase("armed");
      } catch (e) {
        if (live) {
          setError(explain(e));
          setPhase("empty");
        }
      }
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawId]);

  const start = async () => {
    if (!draw) return;
    setPhase("locking");
    setError(null);
    try {
      const { db } = firebase();
      const chosen = pickFromPool(pool, draw.winners);
      const names = await loadNames(db, chosen.map((c) => c.uid));
      const result = chosen.map((c) => ({ ...c, name: names.get(c.uid) ?? "Player" }));
      await commitWinners(db, draw, result);
      setPicked(result);
      setShown(0);
      setSpin((s) => s + 1);
      setPhase("spinning");
    } catch (e) {
      setError(explain(e));
      setPhase("armed");
    }
  };

  const next = () => {
    setShown((i) => i + 1);
    setSpin((s) => s + 1);
    setPhase("spinning");
  };

  const winner = shown >= 0 ? picked[shown] : null;
  const busy = phase === "locking" || phase === "spinning";

  return (
    <Modal title={draw ? `Live draw · ${draw.title}` : "Live draw"} onClose={onClose} wide>
      {draws.length > 1 && (phase === "armed" || phase === "loading" || phase === "empty") && (
        <div className="mb-4">
          <Select
            value={drawId}
            onChange={setDrawId}
            ariaLabel="Draw to pick winners for"
            options={draws.map((d) => ({ value: d.id, label: `${d.title} · ${nf.format(d.totalEntries)} entries`, icon: <PrizeIcon name={d.icon} /> }))}
          />
        </div>
      )}

      {!draw ? (
        <p className="text-sm text-muted">No draw is waiting for winners. A draw shows up here once its closing time passes.</p>
      ) : phase === "done" ? (
        <Results draw={draw} picked={picked} total={total} onClose={onClose} />
      ) : (
        <>
          <Stage phase={phase} faces={faces} winner={winner} spin={spin} onStop={() => setPhase("won")} icon={draw.icon} />

          {phase === "won" && winner ? (
            <div className="rise mt-5 text-center">
              <p className="eyebrow !text-gold">
                Winner {shown + 1} of {picked.length}
              </p>
              <p className="mt-1 font-display text-3xl text-ink sm:text-4xl">{winner.name}</p>
              <p className="mt-1 text-sm text-muted">
                {nf.format(winner.entries)} {winner.entries === 1 ? "entry" : "entries"} ·{" "}
                {((winner.entries / Math.max(1, total)) * 100).toFixed(winner.entries / total < 0.01 ? 2 : 1)}% chance
              </p>
              <div className="mt-5 flex justify-center gap-2">
                {shown + 1 < picked.length ? (
                  <button className={`${btnGold} h-11 px-6`} onClick={next}>
                    Reveal winner {shown + 2}
                  </button>
                ) : (
                  <button className={`${btnGold} h-11 px-6`} onClick={() => setPhase("done")}>
                    See all winners
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
                {[
                  ["Players", phase === "loading" ? "…" : nf.format(pool.length)],
                  ["Entries", phase === "loading" ? "…" : nf.format(total)],
                  ["To pick", nf.format(Math.min(draw.winners, pool.length || draw.winners))],
                ].map(([l, v]) => (
                  <div key={l} className="rounded-xl border border-line bg-ink/[.04] px-3 py-2.5">
                    <dt className="eyebrow">{l}</dt>
                    <dd className="mt-1 font-display text-2xl tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
              {phase === "empty" && !error && (
                <p className="mt-4 text-center text-sm text-muted">Nobody entered this draw, so there is no one to pick.</p>
              )}
              {error && <Alert>{error}</Alert>}
              <p className="mt-4 text-center text-xs leading-relaxed text-muted">
                Every entry is one chance and nobody wins twice. Winners are picked by your browser&apos;s secure random
                generator and saved <b className="text-ink">before</b> the reel spins, so the show can&apos;t change the result.
                This can&apos;t be undone.
              </p>
              <div className="mt-5 flex justify-center gap-2">
                <button className={btnGhost} onClick={onClose} disabled={busy}>
                  Cancel
                </button>
                <button
                  className={`${btnGold} spin-btn h-12 px-8 text-base`}
                  onClick={start}
                  disabled={phase !== "armed"}
                >
                  {phase === "locking" ? "Locking in…" : phase === "spinning" ? "Drawing…" : "Spin the draw"}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </Modal>
  );
}

function Stage({
  phase,
  faces,
  winner,
  spin,
  onStop,
  icon,
}: {
  phase: Phase;
  faces: string[];
  winner: Picked | null;
  spin: number;
  onStop: () => void;
  icon: string;
}) {
  const [y, setY] = useState(0);
  const [moving, setMoving] = useState(false);
  const stopped = useRef(false);
  const ms = reduced() ? 900 : SPIN_MS;

  // The reel for this spin: random faces, the winner near the end.
  const items = useMemo(() => {
    const pool = faces.length ? faces : ["Player"];
    const list = Array.from({ length: 44 }, (_, i) => pool[(i * 7 + spin * 3) % pool.length]);
    const reel = shuffle(list);
    if (winner) reel[40] = publicName(winner.name);
    return reel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spin, faces]);

  useEffect(() => {
    if (phase !== "spinning") return;
    stopped.current = false;
    setMoving(false);
    setY(0);
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setMoving(true);
        setY(-(40 - 1) * ROW);
      });
    });
    const t = setTimeout(stop, ms + 400);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spin]);

  function stop() {
    if (stopped.current) return;
    stopped.current = true;
    onStop();
  }

  const spinning = phase === "spinning";
  const won = phase === "won";
  const idle = !spinning && !won;

  return (
    <div className={`stage ${spinning ? "is-spinning" : ""} ${won ? "is-won" : ""}`}>
      <div className="stage__rays" aria-hidden />
      <Bulbs />
      <div className="stage__head">
        <span className="stage__badge">
          <PrizeIcon name={icon} size={14} />
          {spinning ? "Drawing" : won ? "We have a winner" : phase === "locking" ? "Locking in" : "Ready"}
        </span>
      </div>
      <div className="reel" aria-live="polite" aria-busy={spinning}>
        <span className="reel__frame" aria-hidden />
        <span className="reel__ptr reel__ptr--l" aria-hidden />
        <span className="reel__ptr reel__ptr--r" aria-hidden />
        {idle ? (
          <div className="reel__idle">
            {[faces[0], "?", faces[1]].map((f, i) => (
              <div key={i} className={`reel__item ${i === 1 ? "reel__q" : "reel__ghost"}`}>
                {f ?? "· · ·"}
              </div>
            ))}
          </div>
        ) : (
          <div
            className={`reel__strip ${moving ? "is-moving" : ""}`}
            style={{
              transform: `translateY(${y}px)`,
              transition: moving ? `transform ${ms}ms cubic-bezier(.12,.74,.1,1)` : "none",
            }}
            onTransitionEnd={stop}
          >
            {items.map((n, i) => (
              <div key={i} className={`reel__item ${won && i === 40 ? "reel__win" : ""}`}>
                {n}
              </div>
            ))}
          </div>
        )}
      </div>
      {won && !reduced() && <Burst key={spin} />}
    </div>
  );
}

function Bulbs() {
  return (
    <>
      {(["t", "b"] as const).map((side) => (
        <div key={side} className={`bulbs bulbs--${side}`} aria-hidden>
          {Array.from({ length: 18 }, (_, i) => (
            <i key={i} style={{ "--i": i } as React.CSSProperties} />
          ))}
        </div>
      ))}
    </>
  );
}

const COLORS = ["#f7c548", "#ffe08a", "#fff7e0", "#34d399", "#e8a93a", "#ffd166"];

/** Small seeded generator, so the burst is the same on every render (and pure). */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function Burst() {
  const bits = useMemo(
    () => {
      const rnd = seeded(7);
      return Array.from({ length: 110 }, (_, i) => {
        const a = rnd() * Math.PI * 2;
        const r = 120 + rnd() * 300;
        return {
          i,
          dx: Math.cos(a) * r,
          dy: Math.sin(a) * r * 0.7 + 60 + rnd() * 140,
          rot: (rnd() - 0.5) * 900,
          c: COLORS[i % COLORS.length],
          d: rnd() * 0.25,
          coin: i % 5 === 0,
          w: 5 + rnd() * 6,
        };
      });
    },
    [],
  );
  return (
    <div className="burst" aria-hidden>
      {bits.map((b) => (
        <i
          key={b.i}
          className={b.coin ? "burst__coin" : ""}
          style={
            {
              "--dx": `${b.dx}px`,
              "--dy": `${b.dy}px`,
              "--rot": `${b.rot}deg`,
              "--c": b.c,
              "--w": `${b.w}px`,
              animationDelay: `${b.d}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function Results({ draw, picked, total, onClose }: { draw: Draw; picked: Picked[]; total: number; onClose: () => void }) {
  return (
    <div className="rise">
      <div className="card-gold flex items-center gap-4 p-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gold text-gold-ink">
          <PrizeIcon name={draw.icon} size={24} />
        </span>
        <div className="min-w-0">
          <p className="font-display text-lg">{draw.title}</p>
          <p className="text-sm text-muted">
            {picked.length === 1 ? "1 winner" : `${picked.length} winners`} from {nf.format(total)} entries
            {draw.value ? ` · ${rs(Math.round(draw.value / draw.winners))} each` : ""}
          </p>
        </div>
      </div>
      <ol className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line">
        {picked.map((p, i) => (
          <li key={p.uid} className="rise flex items-center gap-3 px-4 py-3" style={{ "--d": i } as React.CSSProperties}>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gold/15 font-display text-sm text-gold tabular-nums">{i + 1}</span>
            <span className="flex-1">{p.name}</span>
            <span className="text-xs text-muted tabular-nums">{nf.format(p.entries)} entries</span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-sm text-muted">
        They are on the public winners list (first name and initial) and in Prize delivery. Add each winner&apos;s city
        once you have contacted them.
      </p>
      <div className="mt-5 flex justify-end">
        <button className={btnGold} onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}
