import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { MoreHorizontal } from 'lucide-react';
import { MoreSheet } from './MoreSheet';
import { PRIMARY_TABS, PRIMARY_TAB_IDS, type Tab } from '../navigation/tabs';

interface BottomTabBarProps {
  tab: Tab;
  onChange: (tab: Tab) => void;
}

/**
 * Tracks whether a text field has focus, so the bar can get out of the
 * keyboard's way.
 *
 * iOS shifts the *visual* viewport when the software keyboard opens but leaves
 * the *layout* viewport alone, so a `position: fixed` bottom bar doesn't ride
 * up — it floats in the middle of the screen over the keyboard. On top of that
 * `env(safe-area-inset-bottom)` collapses to 0 while the keyboard is up, so the
 * bar changes height at the same time. Hiding it outright is both simpler and
 * better behaved than trying to track visualViewport offsets.
 */
function useTextFieldFocused(): boolean {
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const isTextField = (el: EventTarget | null) =>
      el instanceof HTMLElement &&
      (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);

    const onFocusIn = (e: FocusEvent) => {
      if (isTextField(e.target)) setFocused(true);
    };
    const onFocusOut = (e: FocusEvent) => {
      if (isTextField(e.target)) setFocused(false);
    };

    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  return focused;
}

function TabItem({
  label,
  icon,
  active,
  onClick,
  reduceMotion,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  reduceMotion: boolean | null;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`relative flex min-h-touch flex-1 flex-col items-center justify-center gap-0.5 rounded-lg transition-colors ${
        active ? 'text-ink' : 'text-slate'
      }`}
    >
      {active && (
        <motion.span
          // Deliberately NOT 'main-tab-active' — the desktop nav owns that id,
          // and if both navs are ever mounted at once framer-motion animates
          // the pill from one to the other across the whole screen.
          layoutId="mobile-tab-active"
          transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 35 }}
          className="absolute inset-x-2 inset-y-1 z-0 rounded-lg bg-ink-navy"
        />
      )}
      <span
        className={`relative z-10 flex flex-col items-center gap-0.5 ${active ? 'text-cream' : ''}`}
      >
        {icon}
        <span className="font-mono text-[10px] uppercase tracking-wide">{label}</span>
      </span>
    </button>
  );
}

/**
 * Mobile navigation. Four primary destinations plus a "More" sheet holding the
 * rest — seven equal pills don't fit a 375px screen at a 44pt tap target.
 *
 * Rendered as a <nav> so index.css's `nav { display: none }` print rule hides
 * it on paper without any extra plumbing.
 */
export function BottomTabBar({ tab, onChange }: BottomTabBarProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const keyboardOpen = useTextFieldFocused();

  const moreActive = !PRIMARY_TAB_IDS.includes(tab);

  if (keyboardOpen) return null;

  return (
    <>
      <nav
        aria-label="Main"
        // `glass` supplies its own background and border colour, and falls back
        // to fully opaque where blur is unavailable or unwanted (see index.css).
        className="glass fixed inset-x-0 bottom-0 z-nav flex h-tabbar items-stretch gap-1 border-t px-2 pb-safe-b"
      >
        {PRIMARY_TABS.map(({ id, short, icon: Icon }) => (
          <TabItem
            key={id}
            label={short}
            icon={<Icon size={20} />}
            active={id === tab}
            onClick={() => onChange(id)}
            reduceMotion={reduceMotion}
          />
        ))}
        <TabItem
          label="More"
          icon={<MoreHorizontal size={20} />}
          active={moreActive}
          onClick={() => setMoreOpen(true)}
          reduceMotion={reduceMotion}
        />
      </nav>

      <MoreSheet open={moreOpen} active={tab} onSelect={onChange} onClose={() => setMoreOpen(false)} />
    </>
  );
}
