import { settingsForRequest, type CopyTokens } from "@/lib/pageCopy";
import { PAGE_COPY } from "@/lib/pageCopyDefaults";

/**
 * Hinglish questions on the data pages (2026-11-11). Words: Admin → Content → "Site: Hinglish questions on data pages",
 * one "Question | Answer" per line, `{tokens}` filled with the page's live figures. A line is kept only when every token
 * it names has a value on this page — a missing figure ("—", blank) drops the whole question rather than printing a
 * gap — so a state without private colleges simply has no private-fee question. The pages add these to their own FAQ
 * list, so they sit in the same visible block and the same FAQPage markup. Server only.
 */
export type HinglishKind = keyof (typeof PAGE_COPY)["site.faq_hinglish"]["fields"];
export type Faq = { question: string; answer: string };

const MISSING = /^(|—|-|–|₹—|NaN|undefined|null)$/;

/** Every "Question | Answer" line of `text` whose tokens all have a value, filled. */
export function faqLines(text: string, tokens: CopyTokens): Faq[] {
  const out: Faq[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const names = [...line.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
    if (names.some((k) => tokens[k] == null || MISSING.test(String(tokens[k]).trim()))) continue;
    const filled = line.replace(/\{(\w+)\}/g, (_, k: string) => String(tokens[k]).trim()).replace(/[^\S\n]{2,}/g, " ");
    const cut = filled.indexOf("|");
    if (cut < 0) continue;
    const question = filled.slice(0, cut).trim();
    const answer = filled.slice(cut + 1).trim();
    if (question && answer) out.push({ question, answer });
  }
  return out;
}

export async function hinglishFaqs(kind: HinglishKind, tokens: CopyTokens = {}): Promise<Faq[]> {
  const s = await settingsForRequest();
  const def = (PAGE_COPY["site.faq_hinglish"].fields as Record<string, { value: string }>)[kind]?.value ?? "";
  const text = (s[`site.faq_hinglish.${kind}`] ?? "").trim() || def;
  return faqLines(text, tokens);
}
