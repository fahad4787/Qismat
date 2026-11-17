"use client";

import { useEffect, useState } from "react";
import { firebase } from "@/lib/firebase";
import { loadConfig, revenue, saveAdminConfig, savePublicConfig } from "@/lib/admin";
import { Alert, Field, Section, btnGold, field, rs, useAction } from "./ui";

export function Settings() {
  const [ecpm, setEcpm] = useState("");
  const [rate, setRate] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [playUrl, setPlayUrl] = useState("");
  const [saved, setSaved] = useState("");
  const load = useAction();
  const save = useAction();

  useEffect(() => {
    load.run(async () => {
      const c = await loadConfig(firebase().db);
      setEcpm(String(c.admin.ecpmUsd));
      setRate(String(c.admin.usdToPkr));
      setAnnouncement(c.public.announcement);
      setPlayUrl(c.public.playUrl);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const done = (what: string) => {
    setSaved(what);
    setTimeout(() => setSaved(""), 2500);
  };

  return (
    <div className="grid gap-x-10 lg:grid-cols-2">
      <Section title="Ad revenue">
        <form
          className="card p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await save.run(async () => {
              await saveAdminConfig(firebase().db, { ecpmUsd: Number(ecpm) || 0, usdToPkr: Number(rate) || 0 });
              return true;
            });
            if (ok) done("revenue");
          }}
        >
          <p className="text-sm text-muted">
            Used for every revenue figure in the panel. Copy the eCPM for rewarded ads from your AdMob report.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="eCPM (US dollars)" hint="Earnings per 1,000 ads">
              <input className={field} type="number" min={0} step={0.01} value={ecpm} onChange={(e) => setEcpm(e.target.value)} required />
            </Field>
            <Field label="Rupees per dollar">
              <input className={field} type="number" min={1} step={0.1} value={rate} onChange={(e) => setRate(e.target.value)} required />
            </Field>
          </div>
          <p className="mt-4 text-sm text-muted tabular">
            1,000 ads ≈ <span className="text-gold">{rs(revenue(1000, { ecpmUsd: Number(ecpm) || 0, usdToPkr: Number(rate) || 0 }))}</span>
          </p>
          <div className="mt-5 flex items-center justify-end gap-3">
            {saved === "revenue" && <span className="text-sm text-muted" role="status">Saved</span>}
            <button className={btnGold} disabled={save.busy || load.busy}>
              Save
            </button>
          </div>
        </form>
      </Section>

      <Section title="Website and app">
        <form
          className="card p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await save.run(async () => {
              await savePublicConfig(firebase().db, { announcement: announcement.trim(), playUrl: playUrl.trim() });
              return true;
            });
            if (ok) done("public");
          }}
        >
          <p className="text-sm text-muted">Public. The website reads these when a visitor opens it.</p>
          <div className="mt-4 grid gap-4">
            <Field label="Announcement banner" hint="One line across the top of the website. Leave empty to hide it.">
              <input
                className={field}
                value={announcement}
                maxLength={120}
                onChange={(e) => setAnnouncement(e.target.value)}
                placeholder="New draw: a 43-inch TV, closes Friday"
              />
            </Field>
            <Field label="Google Play link" hint="Overrides the link built into the site.">
              <input className={field} type="url" value={playUrl} onChange={(e) => setPlayUrl(e.target.value)} placeholder="https://play.google.com/store/apps/details?id=…" />
            </Field>
          </div>
          <div className="mt-5 flex items-center justify-end gap-3">
            {saved === "public" && <span className="text-sm text-muted" role="status">Saved</span>}
            <button className={btnGold} disabled={save.busy || load.busy}>
              Save
            </button>
          </div>
        </form>
      </Section>
      {(load.error || save.error) && (
        <div className="lg:col-span-2">
          <Alert>{load.error || save.error}</Alert>
        </div>
      )}
    </div>
  );
}
