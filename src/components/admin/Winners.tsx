"use client";

import { useEffect, useState } from "react";
import { firebase } from "@/lib/firebase";
import {
  ICONS,
  createWinner,
  deleteWinner,
  loadDraws,
  loadPayouts,
  loadWinners,
  setPayoutStatus,
  updateWinner,
  type Draw,
  type Payout,
  type PayoutStatus,
  type Winner,
} from "@/lib/admin";
import { LiveDraw } from "./Picker";
import { DateTimePicker, Select, iconOptions, type Option } from "./controls";
import {
  Alert,
  ConfirmButton,
  Field,
  Modal,
  PlusIcon,
  Table,
  btnGhost,
  btnGold,
  btnSmall,
  field,
  fmtDate,
  fromPkInput,
  rs,
  toPkInput,
  useAction,
} from "./ui";

const STATUS: Option<PayoutStatus>[] = [
  { value: "to-contact", label: "To contact", dot: "#e0a412" },
  { value: "contacted", label: "Contacted", dot: "#3b82f6" },
  { value: "delivered", label: "Delivered", dot: "#16a34a" },
];

export function Winners({ tick }: { tick: number }) {
  const [winners, setWinners] = useState<Winner[] | null>(null);
  const [payouts, setPayouts] = useState<Map<string, Payout>>(new Map());
  const [editing, setEditing] = useState<Winner | "new" | null>(null);
  const [waiting, setWaiting] = useState<Draw[]>([]);
  const [live, setLive] = useState(false);
  const [filter, setFilter] = useState<"all" | "todo" | "done">("all");
  const { error, run } = useAction();

  const load = () =>
    run(async () => {
      const { db } = firebase();
      const [w, p, d] = await Promise.all([loadWinners(db, 100), loadPayouts(db), loadDraws(db)]);
      setWinners(w);
      setPayouts(p);
      const now = Date.now();
      setWaiting(d.filter((x) => !x.drawnAt && x.endsAt && x.endsAt.getTime() <= now));
    });
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const pending = [...payouts.values()].filter((p) => p.status !== "delivered").length;
  const shown = (winners ?? []).filter((w) => {
    const p = payouts.get(w.id);
    if (filter === "todo") return p && p.status !== "delivered";
    if (filter === "done") return p?.status === "delivered";
    return true;
  });

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-xl border border-line bg-white p-0.5 text-sm" role="group" aria-label="Show">
          {(
            [
              ["all", `All ${winners?.length ?? ""}`],
              ["todo", `To deliver ${pending || ""}`],
              ["done", "Delivered"],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              aria-pressed={filter === v}
              className={`rounded-lg px-3 py-1.5 tabular transition ${filter === v ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
            >
              {l.trim()}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button className={btnGhost} onClick={() => setEditing("new")}>
            <PlusIcon />
            Add by hand
          </button>
          <button className={btnGold} onClick={() => setLive(true)}>
            Live draw{waiting.length ? ` · ${waiting.length}` : ""}
          </button>
        </div>
      </div>

      {error && <Alert>{error}</Alert>}
      <div className="mt-3">
        {winners ? (
          <Table
            minWidth={720}
            head={["Winner", "Prize", "Drawn", "Delivery", ""]}
            rows={shown.map((w) => {
              const p = payouts.get(w.id);
              return {
                key: w.id,
                cells: [
                  <div key="n">
                    <p>
                      {w.name}
                      {w.city ? <span className="text-muted"> · {w.city}</span> : null}
                    </p>
                    {p && p.name !== w.name && <p className="text-xs text-muted">Account: {p.name}</p>}
                  </div>,
                  <div key="p">
                    <p>{w.prize}</p>
                    {p?.value ? <p className="text-xs text-muted tabular">{rs(p.value)}</p> : null}
                  </div>,
                  fmtDate(w.drawnAt),
                  p ? (
                    <div key="s" className="w-36">
                      <Select
                        small
                        ariaLabel={`Delivery status for ${w.name}`}
                        value={p.status}
                        options={STATUS}
                        onChange={(status) => run(() => setPayoutStatus(firebase().db, p.id, status)).then(load)}
                      />
                    </div>
                  ) : (
                    <span key="s" className="text-xs text-muted">Added by hand</span>
                  ),
                  <div key="a" className="flex justify-end gap-1.5">
                    <button className={btnSmall} onClick={() => setEditing(w)}>
                      Edit
                    </button>
                    <ConfirmButton
                      title={`Remove ${w.name}?`}
                      message={"They come off the winners list in the app and on the website, and their delivery record is deleted too. This can't be undone."}
                      confirm="Remove winner"
                      onConfirm={() => run(() => deleteWinner(firebase().db, w.id)).then(load)}
                    />
                  </div>,
                ],
              };
            })}
            empty={filter === "all" ? "No winners yet. Run a live draw once a draw closes." : "Nothing here."}
          />
        ) : (
          <div className="h-40 animate-pulse card" />
        )}
      </div>

      {live && (
        <LiveDraw
          draws={waiting}
          onClose={() => {
            setLive(false);
            load();
          }}
        />
      )}
      {editing && (
        <WinnerForm
          winner={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </>
  );
}

function WinnerForm({ winner, onClose, onSaved }: { winner: Winner | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    name: winner?.name ?? "",
    city: winner?.city ?? "",
    prize: winner?.prize ?? "",
    icon: winner?.icon || "gift",
    drawnAt: toPkInput(winner?.drawnAt ?? new Date()),
  });
  const { busy, error, setError, run } = useAction();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.value });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim() || !f.prize.trim()) return setError("Name and prize are needed.");
    const input = { ...f, drawnAt: fromPkInput(f.drawnAt) };
    const { db } = firebase();
    const ok = await run(async () => {
      if (winner) await updateWinner(db, winner.id, input);
      else await createWinner(db, input);
      return true;
    });
    if (ok) onSaved();
  };

  return (
    <Modal title={winner ? `Edit ${winner.name}` : "Add a winner"} onClose={onClose}>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Public name" hint="First name and last initial">
          <input className={field} value={f.name} onChange={set("name")} maxLength={40} required />
        </Field>
        <Field label="City">
          <input className={field} value={f.city} onChange={set("city")} maxLength={40} placeholder="Lahore" />
        </Field>
        <Field label="Prize" className="sm:col-span-2">
          <input className={field} value={f.prize} onChange={set("prize")} maxLength={60} required />
        </Field>
        <Field label="Icon">
          <Select value={f.icon} onChange={(v) => setF({ ...f, icon: v })} options={iconOptions(ICONS)} ariaLabel="Icon" />
        </Field>
        <Field label="Drawn (Pakistan time)">
          <DateTimePicker value={f.drawnAt} onChange={(v) => setF({ ...f, drawnAt: v })} ariaLabel="Drawn (Pakistan time)" />
        </Field>
        {error && <div className="sm:col-span-2"><Alert>{error}</Alert></div>}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" className={btnGhost} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={btnGold} disabled={busy}>
            {busy ? "Saving…" : "Save winner"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
