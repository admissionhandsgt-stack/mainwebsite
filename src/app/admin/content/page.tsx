"use client";

import { useState } from "react";
import { SlidersHorizontal, Layers, LayoutList } from "lucide-react";
import SettingsEditor from "@/components/admin/content/SettingsEditor";
import BlocksEditor from "@/components/admin/content/BlocksEditor";
import SectionsEditor from "@/components/admin/content/SectionsEditor";
import { PageHeader, Tabs } from "@/components/admin/ui";

const TABS = [
  { id: "settings", label: "Text & numbers", icon: SlidersHorizontal },
  { id: "blocks", label: "Sections & lists", icon: Layers },
  { id: "layout", label: "Page layout", icon: LayoutList },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function ContentPage() {
  const [tab, setTab] = useState<TabId>("settings");

  return (
    <div>
      <PageHeader
        title="Page content"
        description="The words, lists and section order the site shows. Changes go live without a deploy."
      >
        <Tabs<TabId> items={[...TABS]} value={tab} onChange={setTab} />
      </PageHeader>

      {tab === "settings" && <SettingsEditor />}
      {tab === "blocks" && <BlocksEditor />}
      {tab === "layout" && <SectionsEditor />}
    </div>
  );
}
