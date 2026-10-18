/**
 * A state's counselling authority, for the state pages (2026-10-18). Reads the
 * admin's `state_authorities` collection (title = state, subtitle = authority,
 * link = official site, body = a note, data.scope / data.checked), falling back
 * to the shipped list when the collection is empty. Server only.
 */

import { getBlocks } from "@/lib/content";
import { STATE_AUTHORITIES, STATE_AUTHORITIES_CHECKED, type StateAuthority } from "@/lib/stateAuthorityList";

export interface StateAuthorityInfo extends StateAuthority {
  checked: string;
}

const key = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z]/g, "");

export async function getStateAuthority(state: string): Promise<StateAuthorityInfo | null> {
  const blocks = await getBlocks("state_authorities");
  const list: StateAuthorityInfo[] = blocks.length
    ? blocks
        .filter((b) => b.title && b.subtitle && b.linkUrl && /^https?:\/\//i.test(b.linkUrl))
        .map((b) => ({
          state: b.title!.trim(),
          authority: b.subtitle!.trim(),
          url: b.linkUrl!.trim(),
          label: (b.linkLabel ?? "").trim() || b.linkUrl!.replace(/^https?:\/\//i, "").replace(/\/$/, ""),
          scope: String(b.data?.scope ?? "").toLowerCase().includes("pg") ? "UG and PG" : "UG",
          note: (b.body ?? "").trim() || undefined,
          checked: String(b.data?.checked ?? "").trim() || STATE_AUTHORITIES_CHECKED,
        }))
    : STATE_AUTHORITIES.map((a) => ({ ...a, checked: STATE_AUTHORITIES_CHECKED }));
  return list.find((a) => key(a.state) === key(state)) ?? null;
}
