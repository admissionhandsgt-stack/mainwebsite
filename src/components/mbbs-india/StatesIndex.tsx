import Link from "next/link";
import { MapPin } from "lucide-react";

/**
 * Every state page, linked from the MBBS landing page.
 *
 * The 33 `/mbbs-india/[state]` pages had no inbound link anywhere on the site —
 * the sitemap was the only way a crawler could find them, and no visitor could
 * at all. A page nothing links to is one Google treats as unimportant. This is
 * a server component: plain links, in the HTML.
 */
export function StatesIndex({ states }: { states: { name: string; slug: string; collegesCount: number | null }[] }) {
  if (!states.length) return null;
  return (
    <section className="border-t border-border bg-background py-12 md:py-16" aria-labelledby="mbbs-by-state">
      <div className="container-custom">
        <h2 id="mbbs-by-state" className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          MBBS colleges by state
        </h2>
        <p className="mt-2 max-w-[66ch] text-muted-foreground">
          Who runs the counselling in each state, and every MBBS college there with its published closing ranks.
        </p>
        <ul className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {states.map((s) => (
            <li key={s.slug}>
              <Link
                href={`/mbbs-india/${s.slug}`}
                className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                MBBS in {s.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
