import Image from "next/image";
import counsellors from "@/data/counsellors.json";

/**
 * The counsellors, as faces that open their cards (/<slug>, the shareable
 * card pages). A counsellor without a photo shows initials rather than a stock
 * face. `tone` is the surface it sits on.
 */

type Counsellor = { slug: string; name: string; title: string; photo?: string };

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export default function CounsellorFaces({
  tone = "light",
  size = 44,
  withNames = false,
}: {
  tone?: "light" | "dark";
  size?: number;
  withNames?: boolean;
}) {
  const list = counsellors as Counsellor[];
  const ring = tone === "dark" ? "border-slate-900" : "border-card";

  if (withNames) {
    return (
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {list.map((c) => (
          <li key={c.slug}>
            <a
              href={`/${c.slug}`}
              target="_blank"
              rel="noopener"
              className={`flex items-center gap-3 rounded-2xl border p-2.5 pr-3 transition-colors ${
                tone === "dark"
                  ? "border-white/10 bg-white/[0.06] hover:border-cyan-300/40"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              {c.photo ? (
                <Image src={`/card/${c.photo}`} alt="" width={44} height={44} loading="eager" className="h-11 w-11 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="font-heading inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-[14px] font-extrabold text-white">
                  {initials(c.name)}
                </span>
              )}
              <span className="min-w-0">
                <span className={`block truncate text-[14px] font-bold ${tone === "dark" ? "text-white" : "text-foreground"}`}>{c.name}</span>
                <span className={`block truncate text-[12px] ${tone === "dark" ? "text-cyan-100/70" : "text-muted-foreground"}`}>
                  {c.title}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="flex -space-x-3">
      {list.map((c) => (
        <a
          key={c.slug}
          href={`/${c.slug}`}
          target="_blank"
          rel="noopener"
          title={`${c.name} — ${c.title}`}
          aria-label={`${c.name}, ${c.title} — open card`}
          className="relative transition-transform hover:z-10 hover:-translate-y-0.5"
        >
          {c.photo ? (
            <Image
              src={`/card/${c.photo}`}
              alt=""
              width={size}
              height={size}
              loading="eager"
              className={`rounded-full border-2 object-cover ${ring}`}
              style={{ width: size, height: size }}
            />
          ) : (
            <span
              className={`font-heading inline-flex items-center justify-center rounded-full border-2 bg-gradient-brand text-[13px] font-extrabold text-white ${ring}`}
              style={{ width: size, height: size }}
            >
              {initials(c.name)}
            </span>
          )}
        </a>
      ))}
    </div>
  );
}
