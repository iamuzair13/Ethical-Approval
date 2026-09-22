"use client";

import { cn } from "@/lib/utils";
import {
  Columns3,
  Eye,
  EyeOff,
  GripVertical,
  Pin,
  PinOff,
  RotateCcw,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

// ─── Column model ───

export type ColumnId =
  | "applicationId"
  | "name"
  | "email"
  | "currentStatus"
  | "applicationType"
  | "title"
  | "responseIn"
  | "duration"
  | "actions";

export type ColumnDef = {
  id: ColumnId;
  label: string;
  defaultWidth: number;
  minWidth: number;
  canHide: boolean;
  canPin: boolean;
};

export const COLUMN_DEFS: readonly ColumnDef[] = [
  { id: "applicationId", label: "Application ID", defaultWidth: 150, minWidth: 110, canHide: true, canPin: true },
  { id: "name", label: "Name", defaultWidth: 200, minWidth: 130, canHide: false, canPin: true },
  { id: "email", label: "Email", defaultWidth: 230, minWidth: 140, canHide: true, canPin: true },
  { id: "currentStatus", label: "Current Status", defaultWidth: 220, minWidth: 160, canHide: true, canPin: true },
  { id: "applicationType", label: "Application Type", defaultWidth: 170, minWidth: 150, canHide: true, canPin: true },
  { id: "title", label: "Title", defaultWidth: 230, minWidth: 120, canHide: true, canPin: true },
  { id: "responseIn", label: "Response In", defaultWidth: 130, minWidth: 100, canHide: true, canPin: true },
  { id: "duration", label: "Duration", defaultWidth: 115, minWidth: 90, canHide: true, canPin: true },
  { id: "actions", label: "Actions", defaultWidth: 170, minWidth: 140, canHide: false, canPin: false },
];

export const COLUMN_DEF_MAP = new Map(COLUMN_DEFS.map((d) => [d.id, d]));

/** Columns that can never be hidden — name anchors the row, actions carry workflow. */
const LOCKED_ORDER_TAIL: ColumnId = "actions";

export type ColumnLayout = {
  /** Visible order (actions is always last and is stored here too). */
  order: ColumnId[];
  hidden: ColumnId[];
  /** Columns pinned to the left edge (sticky), in `order` sequence. */
  pinned: ColumnId[];
  widths: Partial<Record<ColumnId, number>>;
};

const DEFAULT_LAYOUT: ColumnLayout = {
  order: COLUMN_DEFS.map((d) => d.id),
  hidden: [],
  pinned: [],
  widths: {},
};

const KNOWN_IDS = new Set<ColumnId>(COLUMN_DEFS.map((d) => d.id));

function sanitizeLayout(raw: unknown): ColumnLayout {
  if (!raw || typeof raw !== "object") return DEFAULT_LAYOUT;
  const o = raw as Partial<ColumnLayout>;
  const order = Array.isArray(o.order)
    ? (o.order.filter((id): id is ColumnId => KNOWN_IDS.has(id as ColumnId)) as ColumnId[])
    : [];
  // Always append any columns missing from a stored order (new columns added later).
  for (const def of COLUMN_DEFS) {
    if (!order.includes(def.id)) order.push(def.id);
  }
  const hidden = (Array.isArray(o.hidden) ? o.hidden : []).filter(
    (id): id is ColumnId =>
      KNOWN_IDS.has(id as ColumnId) && COLUMN_DEF_MAP.get(id as ColumnId)?.canHide === true,
  );
  const pinned = (Array.isArray(o.pinned) ? o.pinned : []).filter(
    (id): id is ColumnId =>
      KNOWN_IDS.has(id as ColumnId) &&
      COLUMN_DEF_MAP.get(id as ColumnId)?.canPin === true &&
      !hidden.includes(id as ColumnId),
  );
  const widths: Partial<Record<ColumnId, number>> = {};
  if (o.widths && typeof o.widths === "object") {
    for (const [id, w] of Object.entries(o.widths)) {
      if (KNOWN_IDS.has(id as ColumnId) && typeof w === "number" && w > 0) {
        widths[id as ColumnId] = w;
      }
    }
  }
  return { order, hidden, pinned, widths };
}

// ─── Layout hook (persisted to localStorage) ───

export function useColumnLayout(storageKey = "leads-report-columns:v1") {
  const [layout, setLayout] = useState<ColumnLayout>(DEFAULT_LAYOUT);
  const loadedRef = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setLayout(sanitizeLayout(JSON.parse(raw)));
    } catch {
      /* corrupted preference → keep defaults */
    }
    loadedRef.current = true;
  }, [storageKey]);

  const update = (fn: (prev: ColumnLayout) => ColumnLayout) =>
    setLayout((prev) => {
      const next = fn(prev);
      if (loadedRef.current) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          /* storage full/blocked — non-fatal */
        }
      }
      return next;
    });

  const visibleColumns = useMemo(
    () => layout.order.filter((id) => !layout.hidden.includes(id)),
    [layout],
  );

  const widthOf = (id: ColumnId) => layout.widths[id] ?? COLUMN_DEF_MAP.get(id)!.defaultWidth;

  /** Sticky-left offset for a pinned column = widths of all visible columns before it. */
  const pinnedLeftOffset = (id: ColumnId): number | null => {
    if (!layout.pinned.includes(id)) return null;
    const idx = visibleColumns.indexOf(id);
    return visibleColumns.slice(0, idx).reduce((sum, c) => sum + widthOf(c), 0);
  };

  const api = useMemo(
    () => ({
      toggleHidden: (id: ColumnId) =>
        update((prev) => {
          const def = COLUMN_DEF_MAP.get(id);
          if (!def?.canHide) return prev;
          const hiding = !prev.hidden.includes(id);
          return {
            ...prev,
            hidden: hiding ? [...prev.hidden, id] : prev.hidden.filter((c) => c !== id),
            pinned: hiding ? prev.pinned.filter((c) => c !== id) : prev.pinned,
          };
        }),
      togglePin: (id: ColumnId) =>
        update((prev) => {
          const def = COLUMN_DEF_MAP.get(id);
          if (!def?.canPin || prev.hidden.includes(id)) return prev;
          const pinned = prev.pinned.includes(id)
            ? prev.pinned.filter((c) => c !== id)
            : [...prev.pinned, id];
          // Keep pinned list sorted by column order so offsets are stable.
          pinned.sort((a, b) => prev.order.indexOf(a) - prev.order.indexOf(b));
          return { ...prev, pinned };
        }),
      /** Drag-reorder: move `fromId` to `toId`'s position. Actions stays last. */
      reorder: (fromId: ColumnId, toId: ColumnId) =>
        update((prev) => {
          if (fromId === toId || fromId === LOCKED_ORDER_TAIL || toId === LOCKED_ORDER_TAIL) return prev;
          const order = [...prev.order];
          const from = order.indexOf(fromId);
          const to = order.indexOf(toId);
          if (from < 0 || to < 0) return prev;
          order.splice(from, 1);
          order.splice(to, 0, fromId);
          const pinned = prev.pinned
            .slice()
            .sort((a, b) => order.indexOf(a) - order.indexOf(b));
          return { ...prev, order, pinned };
        }),
      setWidth: (id: ColumnId, width: number) =>
        update((prev) => {
          const def = COLUMN_DEF_MAP.get(id);
          if (!def) return prev;
          return {
            ...prev,
            widths: { ...prev.widths, [id]: Math.max(def.minWidth, Math.round(width)) },
          };
        }),
      reset: () =>
        update(() => DEFAULT_LAYOUT),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storageKey],
  );

  return { layout, visibleColumns, widthOf, pinnedLeftOffset, api };
}

// ─── Manager popover ───

export function ColumnManagerButton({ layoutApi }: { layoutApi: ReturnType<typeof useColumnLayout> }) {
  const { layout, api } = layoutApi;
  const [open, setOpen] = useState(false);
  const dragIdRef = useRef<ColumnId | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [open]);

  const rows = layout.order.map((id) => COLUMN_DEF_MAP.get(id)!);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          "inline-flex shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm shadow-indigo-600/25 transition-all duration-150 ease-in-out hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 active:scale-[0.98]",
          open && "bg-indigo-700 ring-2 ring-indigo-500/30",
        )}
      >
        <Columns3 className="size-4 shrink-0" aria-hidden />
        Columns
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between px-2 pb-2 pt-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Manage columns
            </p>
            <button
              type="button"
              onClick={api.reset}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              <RotateCcw className="size-3" aria-hidden />
              Reset
            </button>
          </div>

          <ul className="max-h-80 overflow-y-auto">
            {rows.map((def) => {
              const hidden = layout.hidden.includes(def.id);
              const pinned = layout.pinned.includes(def.id);
              const isTail = def.id === LOCKED_ORDER_TAIL;
              return (
                <li
                  key={def.id}
                  draggable={!isTail}
                  onDragStart={(e) => {
                    dragIdRef.current = def.id;
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(e) => {
                    if (!isTail) e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const from = dragIdRef.current;
                    if (from && !isTail) api.reorder(from, def.id);
                    dragIdRef.current = null;
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-1.5 py-1.5 text-sm",
                    !isTail && "cursor-grab hover:bg-gray-50 dark:hover:bg-gray-700/60",
                    hidden && "opacity-50",
                  )}
                >
                  <GripVertical
                    className={cn("size-4 shrink-0", isTail ? "text-gray-300" : "text-gray-400")}
                    aria-hidden
                  />
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate font-medium text-gray-700 dark:text-gray-200",
                      hidden && "line-through",
                    )}
                  >
                    {def.label}
                  </span>

                  {def.canPin && !hidden && (
                    <button
                      type="button"
                      onClick={() => api.togglePin(def.id)}
                      aria-label={pinned ? `Unpin ${def.label}` : `Pin ${def.label} to left`}
                      title={pinned ? "Unpin" : "Pin to left"}
                      className={cn(
                        "rounded-md p-1 transition-colors",
                        pinned
                          ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300"
                          : "text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-600",
                      )}
                    >
                      {pinned ? <Pin className="size-3.5" /> : <PinOff className="size-3.5" />}
                    </button>
                  )}

                  {def.canHide ? (
                    <button
                      type="button"
                      onClick={() => api.toggleHidden(def.id)}
                      aria-label={hidden ? `Show ${def.label}` : `Hide ${def.label}`}
                      title={hidden ? "Show" : "Hide"}
                      className={cn(
                        "rounded-md p-1 transition-colors",
                        hidden
                          ? "text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-600"
                          : "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300",
                      )}
                    >
                      {hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                  ) : (
                    <span className="w-[26px] shrink-0 text-center text-[10px] font-medium uppercase text-gray-400">
                      fixed
                    </span>
                  )}
                </li>
              );
            })}
          </ul>

          <p className="border-t border-gray-100 px-2 pb-1 pt-2 text-xs text-gray-400 dark:border-gray-700 dark:text-gray-500">
            Drag rows to reorder · resize by dragging a column header&apos;s right edge.
          </p>
        </div>
      )}
    </div>
  );
}
