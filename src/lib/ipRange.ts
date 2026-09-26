/**
 * IPv4/IPv6 CIDR matching, on its own and with no imports.
 *
 * Extracted from `crawler.ts` so it can be tested directly. It is worth testing
 * on its own because of how it fails: a matcher that wrongly rejects is
 * invisible — no error, no log, just a crawler quietly served the locked page
 * and, some weeks later, pages that no longer rank. `scripts/verify_ipranges.mjs`
 * checks it against the addresses Google actually publishes.
 */

export interface Range {
  start: bigint;
  end: bigint;
  bits: number;
}

/** An address as a number, so a CIDR test is two comparisons. */
export function toBigInt(ip: string): { value: bigint; bits: number } | null {
  if (ip.includes(".") && !ip.includes(":")) {
    const parts = ip.split(".");
    if (parts.length !== 4) return null;
    let value = 0n;
    for (const part of parts) {
      const n = Number(part);
      if (!Number.isInteger(n) || n < 0 || n > 255) return null;
      value = (value << 8n) | BigInt(n);
    }
    return { value, bits: 32 };
  }

  if (!ip.includes(":")) return null;

  // IPv6, including the `::` run and a trailing IPv4 form.
  const [head, tail = ""] = ip.split("::");
  const expand = (chunk: string): string[] => {
    if (!chunk) return [];
    const out: string[] = [];
    for (const group of chunk.split(":")) {
      if (!group) continue;
      if (group.includes(".")) {
        const v4 = toBigInt(group);
        if (!v4 || v4.bits !== 32) return [];
        out.push(((v4.value >> 16n) & 0xffffn).toString(16));
        out.push((v4.value & 0xffffn).toString(16));
      } else {
        out.push(group);
      }
    }
    return out;
  };

  const left = expand(head);
  const right = expand(tail);
  const missing = 8 - left.length - right.length;
  if (missing < 0) return null;
  if (missing > 0 && !ip.includes("::")) return null;

  const groups = [...left, ...Array(missing).fill("0"), ...right];
  if (groups.length !== 8) return null;

  let value = 0n;
  for (const group of groups) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(group)) return null;
    value = (value << 16n) | BigInt(parseInt(group, 16));
  }
  return { value, bits: 128 };
}

export function parseCidr(cidr: string): Range | null {
  const [addr, prefixText] = cidr.split("/");
  const parsed = toBigInt(addr ?? "");
  if (!parsed) return null;

  const prefix = prefixText === undefined ? parsed.bits : Number(prefixText);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > parsed.bits) return null;

  const hostBits = BigInt(parsed.bits - prefix);
  const start = (parsed.value >> hostBits) << hostBits;
  const end = start + (1n << hostBits) - 1n;
  return { start, end, bits: parsed.bits };
}


/** Whether an address falls inside any of the ranges. */
export function inRanges(ip: string, ranges: Range[]): boolean {
  const parsed = toBigInt(ip);
  if (!parsed) return false;
  return ranges.some(
    (r) => r.bits === parsed.bits && parsed.value >= r.start && parsed.value <= r.end,
  );
}
