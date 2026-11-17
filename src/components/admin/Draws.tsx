"use client";

import { useCallback, useEffect, useState } from "react";
import { firebase } from "@/lib/firebase";
import {
  ICONS,
  createDraw,
  deleteDraw,
  endDrawNow,
  loadDraws,
  newRound,
  updateDraw,
  type Draw,
  type DrawInput,
} from "@/lib/admin";
import { LiveDraw } from "./Picker";
import { DateTimePicker, PrizeIcon, Select, iconOptions } from "./controls";
import {
  Alert,
  ConfirmButton,
  Field,
  Modal,
  PlusIcon,
  Status,
  Table,
  btnGhost,
  btnGold,
  btnSmall,
  field,
  fmtDate,
  fromPkInput,
  nf,
  rs,
  toPkInput,
  useAction,
} from "./ui";

type Filter = "all" | "open" | "closed" | "drawn";
type Editing = { mode: "new" } | { mode: "edit"; draw: Draw } | { mode: "round"; draw: Draw };

export function Draws({ tick }: { tick: number }) {
  const [draws, setDraws] = useState<Draw[] | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [picking, setPicking] = useState<Draw | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const { error, run } = useAction();

  const load = useCallback(() => run(async () => setDraws(await loadDraws(firebase().db))), [run]);
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const now = Date.now();
  const state = (d: Draw): Exclude<Filter, "all"> =>
    d.drawnAt ? "drawn" : d.endsAt && d.endsAt.getTime() <= now ? "closed" : "open";

  const list = (draws ?? []).filter((d) => filter === "all" || state(d) === filter);
  const count = (f: Filter) => (draws ?? []).filter((d) => state(d) === f).length;

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-xl border border-line bg-white p-0.5 text-sm" role="group" aria-label="Show">
          {(
            [
              ["all", "All"],
              ["open", "Open"],
              ["closed", "Needs winners"],
              ["drawn", "Finished"],
            ] as const
          ).map(([v, l]) => {
            const n = v === "all" ? draws?.length : count(v);
            return (
              <button
                key={v}
                onClick={() => setFilter(v)}
                aria-pressed={filter === v}
                className={`rounded-lg px-3 py-1.5 tabular transition ${filter === v ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
              >
                {l}
                {n ? <span className="ml-1.5 opacity-60">{n}</span> : null}
              </button>
            );
          })}
        </div>
        <button className={btnGold} onClick={() => setEditing({ mode: "new" })}>
          <PlusIcon />
          Add draw
        </button>
      </div>
      {error && <Alert>{error}</Alert>}
      <div className="mt-3">
        {draws ? (
          <Table
            minWidth={760}
            head={["Draw", "Status", "Entries", "Closes", ""]}
            numeric={[2]}
            rows={list.map((d) => {
              const s = state(d);
              return {
                key: d.id,
                muted: s === "drawn",
                cells: [
                  <div key="t" className="flex min-w-[200px] items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gold/10 text-gold">
                      <PrizeIcon name={d.icon} size={17} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{d.title}</p>
                      <p className="text-xs text-muted tabular">
                        {d.worth || rs(d.value)} · {d.ticketCost} {d.ticketCost === 1 ? "ticket" : "tickets"} · {d.winners}{" "}
                        {d.winners === 1 ? "winner" : "winners"}
                      </p>
                    </div>
                  </div>,
                  s === "open" ? (
                    <Status tone="good">Open</Status>
                  ) : s === "closed" ? (
                    <Status tone="gold">Needs winners</Status>
                  ) : (
                    <Status tone="muted">Finished</Status>
                  ),
                  nf.format(d.totalEntries),
                  fmtDate(s === "drawn" ? d.drawnAt : d.endsAt),
                  <div key="a" className="flex justify-end gap-1.5">
                    {s === "closed" && (
                      <button className={`${btnSmall} border-gold/50 text-gold`} onClick={() => setPicking(d)}>
                        Live draw
                      </button>
                    )}
                    {s === "open" && (
                      <ConfirmButton
                        label="End now"
                        tone="gold"
                        title={`End ${d.title} now?`}
                        message={
                          <>
                            Entries close straight away{d.totalEntries ? ` with ${nf.format(d.totalEntries)} in the draw` : ""}, and
                            it moves to <span className="text-gold">Needs winners</span> so you can run the live draw. To reopen
                            it, edit the closing time.
                          </>
                        }
                        confirm="End draw"
                        onConfirm={() => run(() => endDrawNow(firebase().db, d.id)).then(load)}
                      />
                    )}
                    {s === "drawn" && (
                      <button className={btnSmall} onClick={() => setEditing({ mode: "round", draw: d })}>
                        Next round
                      </button>
                    )}
                    <button className={btnSmall} onClick={() => setEditing({ mode: "edit", draw: d })}>
                      Edit
                    </button>
                    <ConfirmButton
                      title={`Delete ${d.title}?`}
                      message={
                        d.totalEntries
                          ? `${nf.format(d.totalEntries)} entries are in this draw. Players lose those entries and the draw disappears from the app. This can't be undone.`
                          : "The draw disappears from the app and the website. This can't be undone."
                      }
                      confirm="Delete draw"
                      onConfirm={() => run(() => deleteDraw(firebase().db, d.id)).then(load)}
                    />
                  </div>,
                ],
              };
            })}
            empty={filter === "all" ? "No draws yet. Add the first one and it shows up in the app straight away." : "Nothing here."}
          />
        ) : (
          <div className="h-40 animate-pulse card" />
        )}
      </div>

      {editing && (
        <DrawForm
          editing={editing}
          nextOrder={draws ? Math.max(0, ...draws.map((d) => d.order + 1)) : 0}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
      {picking && (
        <LiveDraw
          draws={(draws ?? []).filter((d) => state(d) === "closed")}
          initial={picking}
          onClose={() => {
            setPicking(null);
            load();
          }}
        />
      )}
    </>
  );
}

function DrawForm({
  editing,
  nextOrder,
  onClose,
  onSaved,
}: {
  editing: Editing;
  nextOrder: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const base = editing.mode === "new" ? null : editing.draw;
  const weekOn = new Date(Date.now() + 7 * 86_400_000);
  const [f, setF] = useState({
    title: base?.title ?? "",
    tag: base?.tag ?? "",
    icon: base?.icon || "gift",
    image: base?.image ?? "",
    worth: base?.worth ?? "",
    value: String(base?.value ?? ""),
    ticketCost: String(base?.ticketCost ?? 1),
    winners: String(base?.winners ?? 1),
    order: String(base?.order ?? nextOrder),
    endsAt: toPkInput(editing.mode === "edit" && base?.endsAt ? base.endsAt : weekOn),
  });
  const { busy, error, setError, run } = useAction();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.value });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const endsAt = fromPkInput(f.endsAt);
    if (!f.title.trim()) return setError("Give the draw a title.");
    if (Number.isNaN(endsAt.getTime())) return setError("Choose when the draw closes.");
    if (editing.mode !== "edit" && endsAt.getTime() <= Date.now()) return setError("The closing time must be in the future.");
    const input: DrawInput = {
      title: f.title,
      tag: f.tag,
      icon: f.icon,
      image: f.image,
      worth: f.worth,
      value: Number(f.value) || 0,
      ticketCost: Number(f.ticketCost) || 1,
      winners: Number(f.winners) || 1,
      order: Number(f.order) || 0,
      endsAt,
    };
    const { db } = firebase();
    const ok = await run(async () => {
      if (editing.mode === "edit") await updateDraw(db, editing.draw.id, input);
      else if (editing.mode === "round") await newRound(db, { ...editing.draw, ...input }, endsAt);
      else await createDraw(db, input);
      return true;
    });
    if (ok) onSaved();
  };

  const title = editing.mode === "new" ? "Add a draw" : editing.mode === "round" ? `Next round: ${base?.title}` : `Edit ${base?.title}`;

  return (
    <Modal title={title} onClose={onClose} wide>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        {editing.mode === "round" && (
          <p className="text-sm text-muted sm:col-span-2">
            This opens a fresh draw with zero entries. The finished round stays in the list as a record.
          </p>
        )}
        <Field label="Title" className="sm:col-span-2">
          <input className={field} value={f.title} onChange={set("title")} placeholder="70cc motorbike" required maxLength={60} />
        </Field>
        <Field label="Prize worth (shown to players)" hint="Free text, like Rs 8,500 each">
          <input className={field} value={f.worth} onChange={set("worth")} placeholder="Rs 165,000" maxLength={40} />
        </Field>
        <Field label="Total value in rupees" hint="All winners together. Used for the prize pool.">
          <input className={field} type="number" min={0} step={1} value={f.value} onChange={set("value")} inputMode="numeric" />
        </Field>
        <Field label="Tickets per entry">
          <input className={field} type="number" min={1} max={1000} value={f.ticketCost} onChange={set("ticketCost")} />
        </Field>
        <Field label="Number of winners">
          <input className={field} type="number" min={1} max={1000} value={f.winners} onChange={set("winners")} />
        </Field>
        <Field label="Closes (Pakistan time)">
          <DateTimePicker value={f.endsAt} onChange={(v) => setF({ ...f, endsAt: v })} ariaLabel="Closes (Pakistan time)" />
        </Field>
        <Field label="Order" hint="Lower numbers show first">
          <input className={field} type="number" value={f.order} onChange={set("order")} />
        </Field>
        <Field label="Icon">
          <Select value={f.icon} onChange={(v) => setF({ ...f, icon: v })} options={iconOptions(ICONS)} ariaLabel="Icon" />
        </Field>
        <Field label="Tag" hint="Short label, like GRAND DRAW">
          <input className={field} value={f.tag} onChange={set("tag")} maxLength={20} />
        </Field>
        <Field label="Photo URL (optional)" hint="A product photo. Without one the app shows the icon." className="sm:col-span-2">
          <input className={field} type="url" value={f.image} onChange={set("image")} placeholder="https://…" />
        </Field>
        {error && <div className="sm:col-span-2"><Alert>{error}</Alert></div>}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" className={btnGhost} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={btnGold} disabled={busy}>
            {busy ? "Saving…" : editing.mode === "round" ? "Open next round" : "Save draw"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
