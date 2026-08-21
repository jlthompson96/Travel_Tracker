import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, BadgeCheck, Star } from 'lucide-react';
import { useUpdateTrip, type TripPatch } from '../../../../services/notionAdapter';
import { canAttemptWrites } from '../../../../lib/writeToken';
import type { Trip, TripPriority } from '../../../../types/travel';

/**
 * In-app editing for the fields that were structurally impossible to fill
 * before: with Notion read-only, rating a trip meant leaving the app, so
 * nobody did — 0 of 62 trips had notes or a priority and 1 had a rating.
 *
 * Only renders when the site is unlocked (see lib/writeToken.ts). Every control
 * writes through useUpdateTrip, which is optimistic, so the UI moves
 * immediately and rolls back if Notion rejects the change.
 */

const PRIORITIES: TripPriority[] = ['High', 'Medium', 'Low'];

/** Today in the browser's timezone as YYYY-MM-DD (toISOString would use UTC and can be a day off). */
function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function TripEditor({ trip }: { trip: Trip }) {
  const { mutate, isPending, error } = useUpdateTrip();
  const [editable] = useState(canAttemptWrites);

  if (!editable) return null;

  const update = (patch: TripPatch) => mutate({ id: trip.id, patch });

  return (
    <div data-trip-editor className="no-print flex flex-col gap-4 border-y border-dashed border-slate/20 py-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-mono text-[11px] uppercase tracking-wide text-slate/50 max-sm:text-slate/80">Edit this trip</h3>
        {isPending && <Loader2 size={13} className="animate-spin text-brass" aria-label="Saving" />}
      </div>

      {error && (
        <p role="alert" className="text-xs text-stamp-red">
          {error instanceof Error ? error.message : 'Could not save that change.'}
        </p>
      )}

      <RatingPicker value={trip.ratingStars} onChange={(ratingStars) => update({ ratingStars })} />

      <PriorityPicker value={trip.priority} onChange={(priority) => update({ priority })} />

      {trip.status === 'Bucket List' && <MarkVisited onConfirm={(start) => update({ status: 'Been There', dateVisited: { start } })} />}

      <NotesField key={trip.id} value={trip.notes} onCommit={(notes) => update({ notes })} />
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <span className="w-16 shrink-0 font-mono text-[11px] uppercase tracking-wide text-slate/60 max-sm:text-slate/80">
        {label}
      </span>
      {children}
    </div>
  );
}

function RatingPicker({ value, onChange }: { value: Trip['ratingStars']; onChange: (v: Trip['ratingStars']) => void }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const shown = hovered ?? value ?? 0;

  return (
    <FieldRow label="Rating">
      <div className="flex items-center gap-0.5" onPointerLeave={() => setHovered(null)}>
        {([1, 2, 3, 4, 5] as const).map((star) => (
          <button
            key={star}
            type="button"
            // Clicking the current rating clears it, so there's a way back to unrated.
            onClick={() => onChange(value === star ? null : star)}
            onPointerEnter={() => setHovered(star)}
            aria-label={value === star ? `Clear rating` : `Rate ${star} of 5`}
            aria-pressed={value != null && star <= value}
            className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-brass/10 max-sm:h-11 max-sm:w-11"
          >
            <Star
              size={16}
              className={star <= shown ? 'fill-brass text-brass max-sm:text-brass-text' : 'text-slate/30'}
            />
          </button>
        ))}
      </div>
    </FieldRow>
  );
}

function PriorityPicker({ value, onChange }: { value: TripPriority | null; onChange: (v: TripPriority | null) => void }) {
  return (
    <FieldRow label="Priority">
      <div className="flex flex-wrap gap-1.5">
        {PRIORITIES.map((priority) => {
          const active = value === priority;
          return (
            <button
              key={priority}
              type="button"
              onClick={() => onChange(active ? null : priority)}
              aria-pressed={active}
              className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-wide transition-colors max-sm:inline-flex max-sm:min-h-touch max-sm:items-center max-sm:px-4 ${
                active
                  ? 'border-ink-navy bg-ink-navy text-cream'
                  : 'border-slate/20 bg-surface/50 text-slate/70 hover:border-slate/40 hover:bg-surface/80'
              }`}
            >
              {priority}
            </button>
          );
        })}
      </div>
    </FieldRow>
  );
}

/**
 * The highest-value control here: 46 of 62 trips are stuck on the bucket list,
 * and this is what moves one into the Timeline and the Passport.
 */
function MarkVisited({ onConfirm }: { onConfirm: (start: string) => void }) {
  const [date, setDate] = useState(todayISO);

  return (
    <FieldRow label="Visited">
      <input
        type="date"
        value={date}
        max={todayISO()}
        onChange={(e) => setDate(e.target.value)}
        aria-label="Date visited"
        className="rounded border border-slate/20 bg-surface/50 px-2 py-1 font-mono text-xs text-ink outline-none focus:border-brass max-sm:min-h-touch max-sm:text-base"
      />
      <button
        type="button"
        onClick={() => date && onConfirm(date)}
        disabled={!date}
        className="flex items-center gap-1.5 rounded-full bg-ink-navy px-3 py-1 font-mono text-[11px] uppercase tracking-wide text-cream transition-colors hover:bg-ink-navy/90 disabled:opacity-40 max-sm:min-h-touch max-sm:px-4"
      >
        <BadgeCheck size={13} /> Mark visited
      </button>
    </FieldRow>
  );
}

/**
 * Saves on blur rather than on every keystroke — one Notion write per edit
 * session instead of one per character. The `saved` tick is the only feedback
 * that a blur did anything.
 */
function NotesField({ value, onCommit }: { value: string | null; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState(value ?? '');
  const [saved, setSaved] = useState(false);
  const committed = useRef(value ?? '');

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [saved]);

  const commit = () => {
    if (draft === committed.current) return;
    committed.current = draft;
    onCommit(draft);
    setSaved(true);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] uppercase tracking-wide text-slate/60 max-sm:text-slate/80">Notes</span>
        {saved && (
          <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide text-horizon-teal">
            <Check size={11} /> Saved
          </span>
        )}
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        rows={3}
        maxLength={2000}
        placeholder="What do you want to remember about this one?"
        className="w-full resize-y rounded border border-slate/20 bg-surface/50 p-2 text-sm text-ink outline-none placeholder:text-slate/40 focus:border-brass max-sm:text-base"
      />
    </div>
  );
}
