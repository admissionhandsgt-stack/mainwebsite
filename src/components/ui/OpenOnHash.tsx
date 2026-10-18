"use client";

import { useEffect } from "react";

/**
 * Opens the `<details>` a link points at.
 *
 * Long lists fold into one `<details>` per group (the NRI college list was
 * 47,000px on a phone with every state open), and the jump links above them
 * aim at a group's id. A browser scrolls to a closed `<details>` and leaves it
 * shut, so this opens it — on the click itself, because Next's `Link` changes
 * the hash with `pushState`, which fires no `hashchange`, and on load, for a
 * link followed from another page.
 */
export default function OpenOnHash() {
  useEffect(() => {
    const openId = (raw: string) => {
      const id = decodeURIComponent(raw.replace(/^#/, ""));
      if (!id) return;
      const el = document.getElementById(id);
      if (el instanceof HTMLDetailsElement && !el.open) el.open = true;
    };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href*='#']") as HTMLAnchorElement | null;
      if (a && a.pathname === window.location.pathname) openId(a.hash);
    };
    const onHash = () => openId(window.location.hash);

    onHash();
    document.addEventListener("click", onClick, true);
    window.addEventListener("hashchange", onHash);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("hashchange", onHash);
    };
  }, []);
  return null;
}
