import { useState, type FormEvent, type ReactNode } from 'react';

/**
 * Client-side-only gate: a deterrent against casual visitors, not real
 * access control. GitHub Pages is static hosting — there's no server to
 * check a password against, and the underlying data file stays fetchable
 * directly by anyone who has its URL regardless of this gate. Don't put
 * anything here you'd be upset to see leaked; use a real auth layer
 * (e.g. Cloudflare Access in front of the site) if that matters.
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
      setUnlocked(true);
    } else {
      setError(true);
      setPassword('');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-navy px-6">
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
          className="mt-5 w-full rounded-md border border-slate/20 bg-white px-3 py-2 text-sm text-slate outline-none focus:border-brass"
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
