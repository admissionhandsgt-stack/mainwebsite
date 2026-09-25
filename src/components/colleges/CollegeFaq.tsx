import type { Faq } from "@/lib/collegeSeo";

/**
 * The questions this page is found by, answered on the page.
 *
 * Server-rendered plain text, not an accordion. Two reasons: content hidden
 * behind a click is content a crawler weights less, and somebody who arrived
 * from "SMS Medical College cutoff" should see the closing rank without
 * hunting for a chevron.
 *
 * `<details>` would have been the tidier component and the worse page.
 */
export default function CollegeFaq({ faqs }: { faqs: Faq[] }) {
  if (faqs.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="font-heading text-xl font-bold text-foreground md:text-2xl">
        Common questions
      </h2>
      <p className="mt-1.5 text-[14px] text-muted-foreground">
        Answered from this college&rsquo;s own published counselling results.
      </p>

      <dl className="mt-5 divide-y divide-border rounded-2xl border border-border bg-card">
        {faqs.map((f) => (
          <div key={f.q} className="p-5">
            <dt className="font-heading text-[15px] font-bold leading-snug text-foreground md:text-base">
              {f.q}
            </dt>
            <dd className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">{f.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
