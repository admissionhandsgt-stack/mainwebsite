"use client";

import {
  Award, Banknote, BarChart3, BookOpen, Building2, CheckCircle, CheckCircle2,
  ClipboardCheck, ClipboardList, Database, Eye, FileCheck, GraduationCap,
  HeartPulse, Map, MapPinned, Search, ShieldCheck, Sparkles, Stethoscope,
  Target, TrendingUp, Users, Wallet,
  type LucideIcon,
} from "lucide-react";

/**
 * Icons an editor may pick for a content block.
 *
 * An allow-list rather than a dynamic import: a Lucide component cannot be
 * sent from a server component to a client one, and resolving an arbitrary
 * name at runtime would pull the entire icon set into the bundle.
 */
const ICONS: Record<string, LucideIcon> = {
  Award, Banknote, BarChart3, BookOpen, Building2, CheckCircle, CheckCircle2,
  ClipboardCheck, ClipboardList, Database, Eye, FileCheck, GraduationCap,
  HeartPulse, Map, MapPinned, Search, ShieldCheck, Sparkles, Stethoscope,
  Target, TrendingUp, Users, Wallet,
};

/** The names an editor can type, for the admin help text. */
export const ICON_NAMES = Object.keys(ICONS);

export default function BlockIcon({
  name,
  fallback = "Sparkles",
  className,
  size,
}: {
  name?: string | null;
  fallback?: string;
  className?: string;
  size?: number;
}) {
  const Icon = (name && ICONS[name]) || ICONS[fallback] || Sparkles;
  return <Icon className={className} size={size} />;
}
