import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NEET UG Admission Process – Step-by-Step Guide',
  description: 'Understand the complete MBBS admission journey from NEET UG exam to college joining with expert guidance from Admission Hands.',
};

export default function NeetUgProcessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
