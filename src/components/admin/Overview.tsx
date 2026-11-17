"use client";

import { useCallback, useEffect, useState } from "react";
import { firebase } from "@/lib/firebase";
import { loadSignups, loadTotals, type SignupDay, type Totals } from "@/lib/stats";
import { loadConfig, loadDraws, loadStatDays, revenue, type AdminConfig, type Draw, type StatDay } from "@/lib/admin";
import { Alert, BarChart, Tiles, explain, nf, rs } from "./ui";

type Data = { totals: Totals; signups: SignupDay[]; stats: StatDay[]; config: AdminConfig; draws: Draw[] };

export function Overview({ tick, goSettings }: { tick: number; goSettings: () => void }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { db } = firebase();
    setError("");
    try {
      const [totals, signups, stats, cfg, draws] = await Promise.all([
        loadTotals(db),
        loadSignups(db, 14),
        loadStatDays(db, 14),
        loadConfig(db),
        loadDraws(db),
      ]);
      setData({ totals, signups, stats, config: cfg.admin, draws });
    } catch (e) {
      console.error(e);
      setError(explain(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, tick]);

  if (error) return <Alert>{error}</Alert>;
  if (!data) return <Skeleton />;

  const { totals: t, config: c, stats } = data;
  const now = Date.now();
  const open = data.draws.filter((d) => d.endsAt && d.endsAt.getTime() > now);
  const pool = open.reduce((s, d) => s + d.value, 0);
  // The daily counter started with a later app version, so it can be behind the per-player totals.
  const adsToday = Math.max(t.adsToday, stats[stats.length - 1]?.ads ?? 0);

  return (
    <>
      <Tiles
        items={[
          { label: "Revenue today", value: rs(revenue(adsToday, c)), hint: `${rs(revenue(t.adsAllTime, c))} all time`, accent: true },
          { label: "Ads today", value: adsToday, hint: `${nf.format(t.adsAllTime)} all time` },
          { label: "New players today", value: t.newToday, hint: `${nf.format(t.players)} in total` },
          { label: "Open draws", value: open.length, hint: `${rs(pool)} in prizes` },
        ]}
      />
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <BarChart
          title="Ads per day"
          unit="ads"
          days={stats.map((d) => ({ key: d.day, label: d.label, value: d.ads }))}
          detail={(i) => `≈ ${rs(revenue(stats[i].ads, c))}`}
        />
        <BarChart
          title="New players per day"
          unit="players"
          days={data.signups.map((d) => ({ key: d.day, label: d.label, value: d.count }))}
        />
      </div>
      <p className="mt-3 text-xs text-muted">
        Revenue is estimated at ${c.ecpmUsd} eCPM.{" "}
        <button onClick={goSettings} className="text-gold underline-offset-2 hover:underline">
          Change rate
        </button>
      </p>
    </>
  );
}

function Skeleton() {
  return (
    <div aria-hidden>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card h-[110px] animate-pulse" />
        ))}
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="card h-[280px] animate-pulse" />
        <div className="card h-[280px] animate-pulse" />
      </div>
    </div>
  );
}
