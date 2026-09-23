import type { Metadata } from 'next';
import { resolveMetadata } from '@/lib/content';

/**
 * The page itself is a client component, so its metadata lives here — a client
 * module cannot export `generateMetadata`.
 *
 * Admin overrides apply the same way (Admin -> Search & sharing); blank values
 * fall through to the defaults below.
 */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata('/nri-quota/colleges', {
    title: "NRI Quota Medical Colleges in India | AdmissionHands",
    description:
      "Medical colleges that offer NRI quota MBBS seats, with the eligibility and documentation each one expects.",
  });
}

export default function NriCollegesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
