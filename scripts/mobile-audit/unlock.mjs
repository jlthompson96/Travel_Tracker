/**
 * Seeds the localStorage keys that make the app behave as "unlocked", so the
 * audit can see the in-modal editing controls (TripEditor).
 *
 * Without this the editor never renders and its star buttons, priority pills,
 * date input and notes textarea — the newest interactive surface in the app —
 * would be invisible to the touch-target and contrast checks.
 *
 * The token is deliberately fake. Preview has no TT_WRITE_SECRET, so the write
 * endpoint answers 503/401 and nothing the audit does can reach Notion.
 */
export async function seedUnlocked(ctx) {
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('travel-tracker-unlocked', 'true');
      localStorage.setItem('travel-tracker-write-token', 'audit-fake-token');
    } catch {
      // storage disabled — the editor just won't render, same as a locked visitor
    }
  });
}
