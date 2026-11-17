"use client";

import { useEffect, useState } from "react";
import type { DocumentSnapshot } from "firebase/firestore";
import { firebase } from "@/lib/firebase";
import { loadDraws, loadEntries, loadPlayers, setTickets, type Player } from "@/lib/admin";
import { Alert, Field, Modal, Table, btnGhost, btnGold, btnSmall, field, fmtDate, fmtPhone, nf, useAction } from "./ui";

export function Players({ tick }: { tick: number }) {
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [cursor, setCursor] = useState<DocumentSnapshot | null>(null);
  const [open, setOpen] = useState<Player | null>(null);
  const { busy, error, run } = useAction();

  const load = (q: string, after: DocumentSnapshot | null) =>
    run(async () => {
      const page = await loadPlayers(firebase().db, q, after);
      setPlayers((prev) => (after && prev ? [...prev, ...page.players] : page.players));
      setCursor(page.cursor);
    });

  useEffect(() => {
    load(term, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, tick]);

  return (
    <>
      <section className="rise mt-5 min-w-0">
        <form
          className="mb-4 flex max-w-md gap-2"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setTerm(search.trim());
          }}
        >
          <input
            className={field}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, e.g. Ayesha"
            aria-label="Search players by name"
          />
          <button className={btnGhost} type="submit">
            Search
          </button>
          {term && (
            <button
              className={btnGhost}
              type="button"
              onClick={() => {
                setSearch("");
                setTerm("");
              }}
            >
              Clear
            </button>
          )}
        </form>
        {error && <Alert>{error}</Alert>}
        {players ? (
          <Table
            minWidth={800}
            head={["Name", "Mobile", "Joined", "Tickets", "Ads today", "Ads total", "Streak", ""]}
            numeric={[3, 4, 5, 6]}
            rows={players.map((p) => ({
              key: p.id,
              cells: [
                p.name || <span className="text-muted">No name</span>,
                p.phone ? (
                  <a key="ph" href={`tel:${p.phone}`} className="font-mono text-[13px] hover:text-gold">
                    {fmtPhone(p.phone)}
                  </a>
                ) : (
                  <span key="ph" className="text-muted">—</span>
                ),
                fmtDate(p.createdAt),
                nf.format(p.tickets),
                nf.format(p.adsToday),
                nf.format(p.totalAds),
                p.streak ? `${p.streak}d` : "—",
                <div key="a" className="flex justify-end">
                  <button className={btnSmall} onClick={() => setOpen(p)}>
                    Open
                  </button>
                </div>,
              ],
            }))}
            empty={term ? "No player names start with that. Names are case-sensitive." : "No players yet."}
          />
        ) : (
          <div className="h-40 animate-pulse card" />
        )}
        {cursor && (
          <div className="mt-4 flex justify-center">
            <button className={btnGhost} disabled={busy} onClick={() => load(term, cursor)}>
              {busy ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
      </section>
      {open && (
        <PlayerDetail
          player={open}
          onClose={() => setOpen(null)}
          onChanged={(t) => {
            setPlayers((ps) => ps?.map((p) => (p.id === open.id ? { ...p, tickets: t } : p)) ?? null);
            setOpen(null);
          }}
        />
      )}
    </>
  );
}

function PlayerDetail({
  player,
  onClose,
  onChanged,
}: {
  player: Player;
  onClose: () => void;
  onChanged: (tickets: number) => void;
}) {
  const [entries, setEntries] = useState<{ drawId: string; count: number; title: string }[] | null>(null);
  const [tickets, setT] = useState(String(player.tickets));
  const { busy, error, run } = useAction();

  useEffect(() => {
    run(async () => {
      const { db } = firebase();
      const [list, draws] = await Promise.all([loadEntries(db, player.id), loadDraws(db)]);
      const titles = new Map(draws.map((d) => [d.id, d.drawnAt ? `${d.title} (drawn)` : d.title]));
      setEntries(list.map((e) => ({ ...e, title: titles.get(e.drawId) ?? "Deleted draw" })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.id]);

  return (
    <Modal title={player.name || "Player"} onClose={onClose}>
      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line text-center">
        {[
          ["Tickets", player.tickets],
          ["Ads watched", player.totalAds],
          ["Streak", player.streak],
        ].map(([l, v]) => (
          <div key={l} className="bg-bg p-3">
            <dt className="text-xs text-muted">{l}</dt>
            <dd className="mt-1 font-display text-xl tabular">{nf.format(Number(v))}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        {player.phone ? (
          <a href={`tel:${player.phone}`} className="font-mono text-gold hover:underline">
            {fmtPhone(player.phone)}
          </a>
        ) : (
          <span className="text-muted">No mobile number yet</span>
        )}
        <span className="font-mono text-[11px] text-muted">{player.id}</span>
      </p>

      <h3 className="mt-6 text-sm text-muted">Entries</h3>
      {entries === null ? (
        <p className="mt-2 text-sm text-muted">Loading…</p>
      ) : entries.length ? (
        <ul className="mt-2 divide-y divide-line rounded-xl border border-line text-sm">
          {entries.map((e) => (
            <li key={e.drawId} className="flex justify-between px-3 py-2">
              <span>{e.title}</span>
              <span className="tabular">{nf.format(e.count)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted">No entries yet.</p>
      )}

      <form
        className="mt-6 flex items-end gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const n = Math.max(0, Math.round(Number(tickets)));
          if ((await run(async () => (await setTickets(firebase().db, player.id, n), true))) === true) onChanged(n);
        }}
      >
        <Field label="Set ticket balance" hint="For support cases, like an ad that paid out but did not count." className="flex-1">
          <input className={field} type="number" min={0} max={100000} value={tickets} onChange={(e) => setT(e.target.value)} />
        </Field>
        <button className={`${btnGold} mb-[22px] h-11`} disabled={busy || Number(tickets) === player.tickets}>
          Save
        </button>
      </form>
      {error && <Alert>{error}</Alert>}
    </Modal>
  );
}
