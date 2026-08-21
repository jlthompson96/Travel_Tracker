import { useState, type FormEvent, type ReactNode } from 'react';
import { storeWriteToken } from '../lib/writeToken';

/**
 * Client-side gate. For READS it remains a deterrent rather than access
 * control: the app is a static bundle and /api/notion/travel-tracker will
 * answer anyone who requests it, gate or no gate.
 *
 * For WRITES it is load-bearing. On unlock the password is kept (see
 * lib/writeToken.ts) and sent with every edit, and api/notion/trip.ts rejects
 * anything that doesn't match TT_WRITE_SECRET. So this password is the only
 * thing standing between the internet and your Notion database — set it to
 * something real, and keep VITE_SITE_PASSWORD_HASH and TT_WRITE_SECRET in sync
 * (the hash gates the UI, the plaintext gates the API).
 *
 * If read privacy ever matters as much as write safety, put the whole
 * deployment behind real auth (Vercel deployment protection, Cloudflare Access)
 * rather than growing this component.
 */

const STORAGE_KEY = 'travel-tracker-unlocked';
const EXPECTED_HASH = import.meta.env.VITE_SITE_PASSWORD_HASH;

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function PasswordGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  if (!EXPECTED_HASH) return <>{children}</>;
  if (unlocked) return <>{children}</>;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const hash = await sha256Hex(password);
    if (hash === EXPECTED_HASH) {
      localStorage.setItem(STORAGE_KEY, 'true');
      // Kept for the write endpoint — see lib/writeToken.ts for the trade this makes.
      storeWriteToken(password);
      setUnlocked(true);
    } else {
      setError(true);
      setPassword('');
    }
  }

  return (
    <div className="px-edge-flat flex min-h-screen items-center justify-center bg-ink-navy max-sm:min-h-dvh">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-brass/30 bg-paper p-8 shadow-xl"
      >
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-brass">Travel Tracker</p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink">This trip log is private</h1>
        <p className="mt-2 text-sm text-slate/70">Enter the password to continue.</p>

        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(false);
          }}
          className="mt-5 w-full rounded-md border border-slate/20 bg-white px-3 py-2 text-sm text-slate outline-none focus:border-brass max-sm:text-base"
          placeholder="Password"
        />
        {error && <p className="mt-2 text-sm text-stamp-red">Incorrect password.</p>}

        <button
          type="submit"
          className="mt-4 w-full rounded-md bg-ink-navy px-3 py-2 text-sm font-medium text-cream transition-colors hover:bg-ink-navy/90"
        >
          Enter
        </button>
      </form>
    </div>
  );
}
