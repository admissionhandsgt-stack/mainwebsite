import type { ReactNode } from "react";
import {
  BarChart3,
  BookOpen,
  Building2,
  CircleHelp,
  Coins,
  GraduationCap,
  IndianRupee,
  Landmark,
  ListOrdered,
  MapPinned,
  Route,
  ScrollText,
  Stethoscope,
  TrendingUp,
  Users,
} from "lucide-react";

/**
 * The heading of a section on a data page (2026-10-18): a gradient icon tile,
 * an eyebrow, the H2 and one line under it. Icons are named rather than passed,
 * so client pages can use it too.
 */
const ICONS = {
  chart: BarChart3,
  book: BookOpen,
  college: Building2,
  help: CircleHelp,
  coins: Coins,
  course: GraduationCap,
  money: IndianRupee,
  authority: Landmark,
  list: ListOrdered,
  map: MapPinned,
  route: Route,
  document: ScrollText,
  branch: Stethoscope,
  trend: TrendingUp,
  people: Users,
} as const;
export type SectionIcon = keyof typeof ICONS;

export default function SectionHead({
  icon,
  eyebrow,
  title,
  intro,
  id,
  className = "",
}: {
  icon: SectionIcon;
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  id?: string;
  className?: string;
}) {
  const Icon = ICONS[icon];
  return (
    <div className={`flex items-start gap-4 ${className}`}>
      <span
        className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 text-white shadow-[0_10px_24px_-8px_rgb(8_145_178/0.65),inset_0_1px_0_rgb(255_255_255/0.35)]"
        aria-hidden="true"
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        {eyebrow && <p className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-primary-strong">{eyebrow}</p>}
        <h2 id={id} className="font-heading text-[1.6rem] font-extrabold leading-tight tracking-[-0.02em] text-foreground [text-wrap:balance] md:text-3xl">
          {title}
        </h2>
        {intro && <p className="mt-2 max-w-[70ch] text-[15px] leading-relaxed text-muted-foreground">{intro}</p>}
      </div>
    </div>
  );
}
