import Link from "@/components/ui/Link";
import { MessageCircleQuestion } from "lucide-react";
import { currentPath } from "@/lib/pageDates";
import { getSearchFaqs } from "@/lib/searchFaq";
import { pageCopy } from "@/lib/pageCopy";

/**
 * "Questions people ask" — the searches Google shows this page for (or that autocomplete offers and this page should
 * answer), each as a heading in the searcher's own words with the answer in its first sentence, built from live data
 * (lib/searchFaq.ts). Nothing renders on a page without any. Heading: Admin → Content → "Site: questions people ask"
 * (blank hides the block). No FAQPage markup here: many pages already carry one, and Google shows FAQ results only for
 * government and health sites since 2023.
 */
export default async function SearchFaqs() {
  const path = await currentPath();
  const faqs = await getSearchFaqs(path).catch(() => []);
  if (!faqs.length) return null;
  const copy = await pageCopy("site.search_faqs", {}).catch(() => ({ heading: "", more: "" }));
  if (!copy.heading) return null;
  return (
    <section className="container-custom py-8" aria-labelledby="search-faqs-heading">
      <h2 id="search-faqs-heading" className="font-heading flex items-center gap-2 text-xl font-bold text-foreground md:text-2xl">
        <MessageCircleQuestion className="h-5 w-5 text-primary" aria-hidden="true" />
        {copy.heading}
      </h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {faqs.map((f) => (
          <article key={f.id} className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-heading text-[1.05rem] font-bold leading-snug text-foreground">{f.heading}</h3>
            <p className="mt-2 text-[14.5px] leading-relaxed text-foreground">{f.draft.lead}</p>
            {!!f.draft.points?.length && (
              <ul className="mt-2 space-y-1">
                {f.draft.points.slice(0, 6).map((p) => (
                  <li key={p} className="flex gap-2 text-[14px] leading-relaxed text-muted-foreground">
                    <span className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" aria-hidden="true" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            )}
            {!!f.draft.checks?.length && (
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                <b className="font-semibold text-foreground">Check before you accept: </b>
                {f.draft.checks.slice(0, 3).join(" ")}
              </p>
            )}
            {f.draft.source && <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">Source: {f.draft.source}</p>}
            {f.official && (
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
                Source:{" "}
                <a href={f.official.url} target="_blank" rel="noopener" className="font-semibold text-primary-strong underline-offset-2 hover:underline dark:text-primary">
                  {f.official.title}
                </a>
                {f.official.asOf ? ` (${f.official.asOf})` : ""}. Copied from the official page; its notice is the final word.
              </p>
            )}
            {f.draft.page !== path && copy.more && (
              <p className="mt-2 text-[13.5px]">
                <Link href={f.draft.page} className="font-semibold text-primary-strong hover:underline dark:text-primary">
                  {copy.more.replace("{what}", f.draft.what)}
                </Link>
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
