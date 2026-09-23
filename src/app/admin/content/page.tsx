"use client";

import { useState } from "react";
import { SlidersHorizontal, Layers, LayoutList } from "lucide-react";
import SettingsEditor from "@/components/admin/content/SettingsEditor";
import BlocksEditor from "@/components/admin/content/BlocksEditor";
import SectionsEditor from "@/components/admin/content/SectionsEditor";

const TABS = [
  { id: "settings", label: "Text & numbers", icon: SlidersHorizontal },
  { id: "blocks", label: "Sections & lists", icon: Layers },
  { id: "layout", label: "Page layout", icon: LayoutList },
] as const;

export default function ContentPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("settings");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Page Content</h1>
        <p className="mt-1 text-sm text-gray-500">
          The words and lists the site renders. Changes go live without a deploy.
        </p>
      </div>

      <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === t.id
                ? "bg-medical-50 text-medical-900"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "settings" && <SettingsEditor />}
      {tab === "blocks" && <BlocksEditor />}
      {tab === "layout" && <SectionsEditor />}
    </div>
  );
}
