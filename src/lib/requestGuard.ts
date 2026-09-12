/**
 * "Latest request wins" guard for an async effect keyed by more than one
 * changing input (e.g. a proposal token AND the caller's identity). A plain
 * `let cancelled = false` + effect-cleanup boolean protects against a stale
 * response correctly IF every input the async call actually reads is also
 * in the effect's own dependency array -- easy to get wrong (auth.uid()
 * inside an RPC depends on who's logged in, not just the URL token).
 *
 * This tracks validity with a monotonically increasing generation counter,
 * not by comparing request "keys": two requests can share the same
 * logical key (e.g. navigating token A -> B -> back to A) and must still
 * be treated as independent -- the first A response arriving late must
 * not become "current" again just because a later call happens to match
 * its key. Every start() supersedes whatever came before, unconditionally.
 */
export function createLatestRequestGuard() {
  let generation = 0;

  return {
    /** Call synchronously when starting a new request (including on an
     * early return, e.g. no token -- invalidate it right away so its
     * cleanup has nothing stale to guard). */
    start() {
      generation += 1;
      const myGeneration = generation;
      return {
        /** True only until a newer request starts or this one is invalidated. */
        isCurrent: () => generation === myGeneration,
        /** Call from the owning effect's cleanup (unmount, deps change,
         * or an early "no token" return) so this generation can never
         * become current again, even if nothing newer ever starts. */
        invalidate: () => {
          if (generation === myGeneration) generation += 1;
        },
      };
    },

    /** Read-only snapshot of the current generation, for code that isn't
     * itself starting a new fetch (an admin write action triggered by a
     * click, not an effect) but still needs to verify the page's context
     * hasn't moved on -- e.g. navigated to a different proposal -- since
     * it began, before applying its result to component state. */
    snapshot() {
      const myGeneration = generation;
      return { isCurrent: () => generation === myGeneration };
    },
  };
}
