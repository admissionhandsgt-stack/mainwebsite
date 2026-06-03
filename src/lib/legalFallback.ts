/**
 * Fallback legal content used when Supabase is unavailable or documents haven't been seeded.
 * This ensures the legal page always renders meaningful content.
 */

export interface FallbackDocument {
  slug: string;
  title: string;
  content: string;
  lastUpdated: string;
}

export const LEGAL_DOCUMENTS_FALLBACK: FallbackDocument[] = [
  {
    slug: 'terms',
    title: 'Terms of Service',
    lastUpdated: '2025-04-30',
    content: `## Introduction

Admission Hands ("we", "our", or "us") provides consultancy services for MBBS and MD/MS admissions in India. These terms govern your use of our website (www.admissionhands.com) and all associated services. By engaging with our services, you accept these terms in full.

## Scope of Services

We assist students and parents with:

- Medical admissions guidance (MBBS, MD/MS) across India
- College selection and preference planning based on NEET scores
- Counseling registration and application processing support
- Documentation verification and submission assistance

## Counselling Disclaimer

**Important Notice Regarding Admissions:**

Admission Hands is an independent educational consultancy. We are NOT affiliated with the Medical Counseling Committee (MCC), National Medical Commission (NMC), or any government regulatory body.

**We do not guarantee admission or "sell" medical seats.** All admissions are strictly based on merit, NEET scores, and the official counseling processes conducted by authorized state and central bodies. Our role is strictly advisory and supportive.`,
  },
  {
    slug: 'payment',
    title: 'Payment & Refund Policy',
    lastUpdated: '2025-04-30',
    content: `## Payment & Refund Policy

Our consultancy fees are structured based on the level of service required and will be clearly communicated in writing before engagement.

- A non-refundable registration fee is required to initiate our services.
- Once services have commenced (including counseling guidance, document preparation, or preference list generation), fees paid are strictly non-refundable.
- Any fees paid directly to counseling authorities (MCC, State bodies) or colleges are governed by their respective refund policies. We are not responsible for refunds from third parties.

## User Responsibilities

As a client, you agree to and are responsible for:

- Providing accurate, authentic, and complete personal, academic, and category/quota information.
- Meeting all deadlines for form submissions, fee payments, and document uploads as notified by counseling authorities.
- Checking official portals regularly for updates, even while using our services.
- The consequences of submitting false or forged documents, which may result in immediate termination of our services and legal action by authorities.`,
  },
  {
    slug: 'data-privacy',
    title: 'Data Privacy',
    lastUpdated: '2025-04-30',
    content: `## Data Privacy

We handle your personal data (including NEET scores, contact details, and academic records) with the utmost confidentiality. Your data is used exclusively to provide admission guidance and is not sold to third-party marketers. We implement standard security measures to protect your information.

## Limitation of Liability

Admission Hands shall not be held liable for:

- Rejection of application due to low merit, incorrect documentation, or failure to meet eligibility criteria.
- Technical failures or delays on official counseling portals.
- Changes in government rules, seat matrix, fee structures, or counseling procedures made by NMC/MCC mid-process.

## Intellectual Property

All content on this site, including text, graphics, logos, and images, is the property of Admission Hands and may not be reused or republished without written permission.

## Modifications

We reserve the right to update these Terms at any time. Continued use of our website and services after changes implies acceptance of the new terms.`,
  },
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    lastUpdated: '2025-04-30',
    content: `## Information We Collect

We collect information to provide and improve our medical admission consultancy services:

- **Personal Data:** Contact details (name, email, phone), academic records (marksheets, NEET scores), and demographic info (age, state, preferred colleges).
- **Usage Data:** Automatically collected details including IP address, browser type, and device information.

## How We Use Your Information

Your data is processed strictly for legitimate consultancy operations:

- To provide personalized counseling, shortlist colleges, and assist with counseling registrations.
- To communicate admission-related updates and respond to your inquiries.
- To improve website performance, user experience, and ensure compliance with regulatory rules.

## Sharing & Third-Party Sites

We protect your privacy by restricting data access:

- **No Sale of Data:** We do not rent, sell, or share your personal information with third-party marketers.
- **Authorized Disclosure:** Information is only shared with partner institutions (with your consent) or legal authorities (when required by law).
- **External Links:** We are not responsible for the privacy practices or content of third-party portals linked from our site.

## Your Rights & Updates

You hold full ownership of your personal information:

- **Data Control:** You can access, correct, or request deletion of your records, or withdraw your consent by emailing us at info@admissionhands.com.
- **Policy Updates:** We may update this policy periodically. Continued use of our platform implies acceptance of the revised terms.`,
  },
  {
    slug: 'data-security',
    title: 'Data Security',
    lastUpdated: '2025-04-30',
    content: `## Data Security Safeguards

We implement industry-standard physical, electronic, and administrative safeguards to protect your personal data from unauthorized access, alteration, disclosure, or destruction.

- **Data Encryption:** Sensitive academic documents, scorecards, and user records are transmitted and stored securely.
- **Access Restricting:** Restrict access to your personal details only to counseling advisers who require it for college guidance.
- **Infrastructure Audits:** Regular system checks are performed on our hosting environment to identify potential safety gaps.

## Safety Disclaimer

While we take every precaution to safeguard your details, no digital method of data transmission or storage is 100% secure.

- We encourage clients to be cautious when uploading files over unsecured public Wi-Fi networks.
- Ensure that you use official channels when sharing identity certificates or scorecards.
- If you notice any unauthorized access or data anomalies, please report them to info@admissionhands.com.`,
  },
  {
    slug: 'cookies',
    title: 'Cookies & Tracking',
    lastUpdated: '2025-04-30',
    content: `## What Are Cookies

Cookies are small text files placed on your device when you visit our website. They help us provide a better browsing experience and understand how visitors interact with our content.

## Types of Cookies We Use

- **Essential Cookies:** Required for basic site functionality such as page navigation and session management.
- **Analytics Cookies:** Help us understand how visitors use our website through aggregate data. We use Google Analytics (GA4) for this purpose.
- **Preference Cookies:** Remember your settings such as theme preference (light/dark mode).

## Third-Party Tracking

We use Google Analytics to collect anonymized usage data. This includes pages visited, time spent, device type, and approximate geographic location. Google Analytics uses its own cookies to collect this information.

## Managing Cookies

You can control cookies through your browser settings. Most browsers allow you to block or delete cookies. However, disabling essential cookies may affect site functionality.

## Updates

We may update this Cookies & Tracking policy as our tracking practices evolve. Changes will be reflected on this page.`,
  },
  {
    slug: 'dpdp',
    title: 'DPDP Compliance',
    lastUpdated: '2025-04-30',
    content: `## Overview

The Digital Personal Data Protection Act, 2023 (DPDP Act) governs the processing of personal data in India. Admission Hands is committed to complying with the provisions of the DPDP Act.

## Lawful Purpose

We process your personal data only for lawful purposes related to providing medical admission consultancy services. Data is collected with your explicit consent and used solely for the purposes communicated at the time of collection.

## Data Principal Rights

Under the DPDP Act, you (as the Data Principal) have the following rights:

- **Right to Access:** You may request information about the personal data we hold about you.
- **Right to Correction:** You may request correction of inaccurate or incomplete data.
- **Right to Erasure:** You may request deletion of your personal data, subject to legal retention requirements.
- **Right to Grievance Redressal:** You may raise concerns about our data processing practices.

## Data Fiduciary Obligations

As a Data Fiduciary, Admission Hands undertakes to:

- Process data only for stated, legitimate purposes
- Implement reasonable security safeguards
- Not retain data beyond the period necessary for stated purposes
- Notify the Data Protection Board of India in case of a data breach

## Consent Management

We obtain explicit consent before collecting personal data. You may withdraw consent at any time by contacting us at info@admissionhands.com. Withdrawal of consent will not affect the lawfulness of processing based on consent before its withdrawal.

## Contact for DPDP Queries

For any queries related to data protection under the DPDP Act, please contact us at info@admissionhands.com.`,
  },
  {
    slug: 'contact',
    title: 'Contact Information',
    lastUpdated: '2025-04-30',
    content: `## How to Reach Us

For any questions regarding these legal documents, our services, or your data, please contact us through the following channels:

**Email:** info@admissionhands.com

**Phone:** +91 93-9213-9213

**Office Hours:** Monday to Saturday, 10:00 AM – 7:00 PM IST

## Grievance Officer

In accordance with applicable laws, including the DPDP Act 2023, we have designated a Grievance Officer for addressing your concerns:

**Name:** Admission Hands Grievance Cell

**Email:** info@admissionhands.com

**Response Time:** We aim to acknowledge all grievances within 48 hours and resolve them within 30 days of receipt.`,
  },
];
