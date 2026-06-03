"use client";

import React, { useState, useCallback, Children, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link2 } from "lucide-react";

interface LegalContentProps {
  sections: Array<{
    slug: string;
    title: string;
    content: string;
    lastUpdated: string;
  }>;
}

function extractText(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(extractText).join("");
  if (children && typeof children === "object" && "props" in children) {
    return extractText((children as { props: { children?: ReactNode } }).props.children);
  }
  return "";
}

function generateId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function CopyableHeading({
  level,
  id,
  children,
}: {
  level: number;
  id: string;
  children: ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const url = `${window.location.origin}/terms#${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [id]);

  const Tag = `h${level}` as keyof Pick<
    JSX.IntrinsicElements,
    "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
  >;

  const headingClasses =
    level === 2
      ? "text-[14px] md:text-xl font-bold text-slate-900 dark:text-white mt-3.5 mb-1 md:mt-6 md:mb-2"
      : "text-[12px] md:text-[14.5px] font-semibold text-slate-800 dark:text-slate-200 mt-2.5 mb-0.5 md:mt-4.5 md:mb-1.5";

  return (
    <div className="group relative">
      <Tag id={id} className={headingClasses}>
        {children}
      </Tag>
      <button
        type="button"
        onClick={handleCopy}
        className="absolute top-1/2 -translate-y-1/2 -left-6 opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
        aria-label={`Copy link to ${id}`}
      >
        <Link2 className="h-4 w-4" />
      </button>
      {copied && (
        <span className="absolute top-1/2 -translate-y-1/2 -left-20 text-[11px] bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-800 px-2 py-0.5 rounded animate-fade-out pointer-events-none">
          Copied!
        </span>
      )}
    </div>
  );
}

function isShortList(children: ReactNode): boolean {
  const childrenArray = Children.toArray(children);
  if (childrenArray.length === 0) return false;

  let totalLength = 0;
  let maxLength = 0;
  let count = 0;

  childrenArray.forEach((child) => {
    const text = extractText(child);
    if (text) {
      totalLength += text.length;
      if (text.length > maxLength) {
        maxLength = text.length;
      }
      count++;
    }
  });

  if (count === 0) return false;
  const avgLength = totalLength / count;

  return avgLength < 25 && maxLength < 35;
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

export default function LegalContent({ sections }: LegalContentProps) {
  const markdownComponents = {
    h1: ({ children }: { children?: ReactNode }) => {
      const text = extractText(children);
      const id = generateId(text);
      return (
        <CopyableHeading level={1} id={id}>
          {children}
        </CopyableHeading>
      );
    },
    h2: ({ children }: { children?: ReactNode }) => {
      const text = extractText(children);
      const id = generateId(text);
      return (
        <CopyableHeading level={2} id={id}>
          {children}
        </CopyableHeading>
      );
    },
    h3: ({ children }: { children?: ReactNode }) => {
      const text = extractText(children);
      const id = generateId(text);
      return (
        <CopyableHeading level={3} id={id}>
          {children}
        </CopyableHeading>
      );
    },
    p: ({ children }: { children?: ReactNode }) => (
      <p className="text-[13px] md:text-[13.5px] leading-[1.6] text-slate-600 dark:text-slate-350 mb-2">
        {children}
      </p>
    ),
    ul: ({ children }: { children?: ReactNode }) => {
      const isShort = isShortList(children);
      if (isShort) {
        return (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0.5 text-[13px] md:text-[13.5px] leading-[1.6] text-slate-600 dark:text-slate-350 mb-2 list-none [&>li]:relative [&>li]:pl-4 [&>li]:before:content-['•'] [&>li]:before:absolute [&>li]:before:left-0.5 [&>li]:before:text-slate-400 [&>li]:dark:before:text-slate-600">
            {children}
          </ul>
        );
      }
      return (
        <ul className="text-[13px] md:text-[13.5px] leading-[1.6] text-slate-600 dark:text-slate-350 pl-5 mb-2 list-disc">
          {children}
        </ul>
      );
    },
    ol: ({ children }: { children?: ReactNode }) => (
      <ol className="text-[13px] md:text-[13.5px] leading-[1.6] text-slate-600 dark:text-slate-350 pl-5 mb-2 list-decimal">
        {children}
      </ol>
    ),
    li: ({ children }: { children?: ReactNode }) => (
      <li className="mb-0.5">{children}</li>
    ),
    strong: ({ children }: { children?: ReactNode }) => (
      <strong className="text-slate-800 dark:text-slate-100 font-bold">
        {children}
      </strong>
    ),
    a: ({
      href,
      children,
    }: {
      href?: string;
      children?: ReactNode;
    }) => (
      <a
        href={href}
        className="text-blue-600 dark:text-blue-400 underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
  };

  return (
    <div className="flex-1 min-w-0">
      {sections.map((section, index) => (
        <article
          key={section.slug}
          id={section.slug}
          data-section={section.slug}
          className={
            index === 0
              ? "pb-5 pt-0.5"
              : "py-5 border-t border-slate-100 dark:border-slate-800"
          }
        >
          <div className="[&>*:first-child]:mt-0">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {section.content}
            </ReactMarkdown>
          </div>
        </article>
      ))}
    </div>
  );
}
