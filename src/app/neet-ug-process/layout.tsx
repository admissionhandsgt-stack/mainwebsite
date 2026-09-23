import { Metadata } from 'next';
import { resolveMetadata } from '@/lib/content';

/**
 * Metadata the admin can override per route (Admin -> Search & sharing).
 * Blank admin values fall through to the defaults below.
 */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata('/neet-ug-process', {
    title: 'NEET UG Admission Process – Step-by-Step Guide',
    description: 'Understand the complete MBBS admission journey from NEET UG exam to college joining with expert guidance from Admission Hands.',
  });
}

export default function NeetUgProcessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
