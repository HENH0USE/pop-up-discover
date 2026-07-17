import { useEffect, type RefObject } from "react";

type GsapCtx = { revert: () => void };

export type UseGsapSetup = (
  gsap: typeof import("gsap").gsap,
  ctx: { reduce: boolean; narrow: boolean; root: HTMLElement },
) => void | (() => void);

/**
 * Lazy-loads GSAP inside useEffect, scopes animations to `rootRef`,
 * exposes `prefers-reduced-motion` and mobile flags, and cleans up
 * on unmount. Animate transform/opacity only.
 */
export function useGsap(
  rootRef: RefObject<HTMLElement | null>,
  setup: UseGsapSetup,
  deps: ReadonlyArray<unknown> = [],
) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const narrow = window.innerWidth < 480;
    let ctx: GsapCtx | null = null;
    let userCleanup: void | (() => void);
    let cancelled = false;
    import("gsap").then(({ gsap }) => {
      if (cancelled) return;
      ctx = gsap.context(() => {
        userCleanup = setup(gsap, { reduce, narrow, root });
      }, root);
    });
    return () => {
      cancelled = true;
      if (typeof userCleanup === "function") userCleanup();
      ctx?.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}