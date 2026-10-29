import { motion } from 'framer-motion';
import { FastForward, Globe2, Home, Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import type { FlightLeg, RouteMode } from '../utils/yearStats';

interface FlightControlsProps {
  legs: FlightLeg[];
  activeLegIndex: number;
  legProgress: number;
  isPlaying: boolean;
  playbackSpeed: number;
  routeMode: RouteMode;
  onTogglePlay: () => void;
  onPreviousLeg: () => void;
  onNextLeg: () => void;
  onSelectLeg: (index: number) => void;
  onChangeSpeed: (speed: number) => void;
  onChangeRouteMode: (mode: RouteMode) => void;
  onReplay: () => void;
}

export function FlightControls({
  legs,
  activeLegIndex,
  legProgress,
  isPlaying,
  playbackSpeed,
  routeMode,
  onTogglePlay,
  onPreviousLeg,
  onNextLeg,
  onSelectLeg,
  onChangeSpeed,
  onChangeRouteMode,
  onReplay,
}: FlightControlsProps) {
  const isLastLeg = activeLegIndex >= legs.length - 1;
  const isFinished = isLastLeg && legProgress >= 0.99;
  const activeLeg = legs[activeLegIndex];

  return (
    <div className="flex flex-col gap-3 rounded border border-slate/15 bg-surface/70 p-4 shadow-sm backdrop-blur-sm">
      {/* Top Bar: Playback actions, Route Mode, Speed */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Playback Button Group */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {isFinished ? (
            <button
              type="button"
              onClick={onReplay}
              aria-label="Replay flight animation from the start"
              className="flex h-11 items-center gap-1.5 rounded-full border border-brass bg-brass px-4 font-mono text-xs font-semibold uppercase tracking-wide text-ink-navy transition-colors hover:bg-brass/90"
            >
              <RotateCcw size={15} />
              Replay
            </button>
          ) : (
            <button
              type="button"
              onClick={onTogglePlay}
              aria-label={isPlaying ? 'Pause flight animation' : 'Play flight animation'}
              className="flex h-11 items-center gap-2 rounded-full border border-ink-navy bg-ink-navy px-5 font-mono text-xs font-semibold uppercase tracking-wide text-cream shadow-sm transition-colors hover:bg-ink-navy/90"
            >
              {isPlaying ? <Pause size={15} /> : <Play size={15} fill="currentColor" />}
              <span>{isPlaying ? 'Pause' : 'Play Flight'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onPreviousLeg}
            disabled={activeLegIndex === 0}
            aria-label="Go to previous flight stop"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-slate/20 bg-paper text-ink transition-colors hover:border-slate/40 hover:bg-surface disabled:opacity-30 disabled:pointer-events-none"
          >
            <SkipBack size={16} />
          </button>

          <button
            type="button"
            onClick={onNextLeg}
            disabled={isLastLeg}
            aria-label="Go to next flight stop"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-slate/20 bg-paper text-ink transition-colors hover:border-slate/40 hover:bg-surface disabled:opacity-30 disabled:pointer-events-none"
          >
            <SkipForward size={16} />
          </button>
        </div>

        {/* Route Mode & Speed Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Route Mode Toggle */}
          <div className="flex items-center rounded-full border border-slate/20 bg-paper p-0.5" role="group" aria-label="Route Mode">
            <button
              type="button"
              onClick={() => onChangeRouteMode('grand-tour')}
              aria-pressed={routeMode === 'grand-tour'}
              className={`flex h-9 items-center gap-1 rounded-full px-3 font-mono text-[11px] uppercase tracking-wider transition-colors max-sm:h-11 ${
                routeMode === 'grand-tour'
                  ? 'bg-ink-navy text-cream'
                  : 'text-slate/70 hover:text-ink'
              }`}
            >
              <Globe2 size={13} />
              Grand Tour
            </button>
            <button
              type="button"
              onClick={() => onChangeRouteMode('from-home')}
              aria-pressed={routeMode === 'from-home'}
              className={`flex h-9 items-center gap-1 rounded-full px-3 font-mono text-[11px] uppercase tracking-wider transition-colors max-sm:h-11 ${
                routeMode === 'from-home'
                  ? 'bg-ink-navy text-cream'
                  : 'text-slate/70 hover:text-ink'
              }`}
            >
              <Home size={13} />
              From Home
            </button>
          </div>

          {/* Speed Toggle */}
          <div className="flex items-center rounded-full border border-slate/20 bg-paper p-0.5" role="group" aria-label="Playback Speed">
            {[1, 1.5, 2].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onChangeSpeed(s)}
                aria-pressed={playbackSpeed === s}
                className={`flex h-9 min-w-9 items-center justify-center rounded-full px-2.5 font-mono text-[11px] font-semibold transition-colors max-sm:h-11 max-sm:min-w-11 ${
                  playbackSpeed === s
                    ? 'bg-brass text-ink-navy'
                    : 'text-slate/70 hover:text-ink'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Progress Line */}
      <div className="flex flex-col gap-1.5 pt-1">
        <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wide text-slate/60 max-sm:text-slate/80">
          <span className="flex items-center gap-1">
            <FastForward size={12} className="text-brass" />
            {activeLeg?.isReturnHome ? (
              <span>Return flight to Home</span>
            ) : (
              <span>
                Stop {activeLegIndex + 1} of {legs.filter((l) => !l.isReturnHome).length}: {activeLeg?.toLabel}
              </span>
            )}
          </span>
          <span>{Math.round(legProgress * 100)}%</span>
        </div>

        {/* Fractional Leg Progress Bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate/15">
          <motion.div
            className="h-full bg-brass"
            style={{ width: `${Math.max(2, legProgress * 100)}%` }}
            transition={{ ease: 'linear', duration: 0.1 }}
          />
        </div>
      </div>

      {/* Interactive Stop Scrubber Pills */}
      <div className="no-scrollbar -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 py-1">
        {legs.map((leg, idx) => {
          if (leg.isReturnHome) return null;
          const isCurrent = idx === activeLegIndex;
          const isPassed = idx < activeLegIndex;

          return (
            <button
              key={leg.id}
              type="button"
              onClick={() => onSelectLeg(idx)}
              aria-label={`Jump to stop ${idx + 1}: ${leg.toLabel}`}
              aria-current={isCurrent ? 'step' : undefined}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] transition-all max-sm:min-h-[44px] ${
                isCurrent
                  ? 'border-ink-navy bg-ink-navy text-cream shadow-sm'
                  : isPassed
                    ? 'border-stamp-red/30 bg-stamp-red/10 text-stamp-red hover:bg-stamp-red/20'
                    : 'border-slate/20 bg-paper text-slate/70 hover:border-slate/40 hover:text-ink'
              }`}
            >
              <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
                isCurrent ? 'bg-brass text-ink-navy' : isPassed ? 'bg-stamp-red text-white' : 'bg-slate/20'
              }`}>
                {idx + 1}
              </span>
              <span className="max-w-[130px] truncate">{leg.toLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

