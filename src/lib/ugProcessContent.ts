/**
 * The NEET UG journey's steps from the admin's `ug_process_steps` collection,
 * grouped back into phases in the order the rows are listed (2026-10-18).
 * Empty collection → the shipped steps (lib/ugProcessSteps.ts). Server only.
 *
 * Row: title = the step, subtitle = its phase ("Phase 1: Before Exam"), body = what
 * happens, data.short = the phase's tab label, data.support = what we do, data.list =
 * one item per line, data.rounds = one "Name: what happens" per line.
 */

import { getBlocks } from "@/lib/content";
import { UG_PHASES, type UgPhase } from "@/lib/ugProcessSteps";

const lines = (v: unknown) =>
  String(v ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

export async function getUgPhases(): Promise<UgPhase[]> {
  const blocks = await getBlocks("ug_process_steps");
  if (!blocks.length) return UG_PHASES;
  const phases: UgPhase[] = [];
  blocks.forEach((b, i) => {
    const title = (b.subtitle ?? "").trim() || "Steps";
    let phase = phases.find((p) => p.title === title);
    if (!phase) {
      phase = { title, shortTitle: String(b.data?.short ?? "").trim() || title.replace(/^Phase \d+:\s*/i, ""), steps: [] };
      phases.push(phase);
    }
    const list = lines(b.data?.list);
    const rounds = lines(b.data?.rounds).map((l) => {
      const at = l.indexOf(":");
      return at > 0 ? { name: l.slice(0, at).trim(), description: l.slice(at + 1).trim() } : { name: l, description: "" };
    });
    phase.steps.push({
      id: i + 1,
      title: (b.title ?? "").trim(),
      description: (b.body ?? "").trim(),
      support: String(b.data?.support ?? "").trim(),
      ...(list.length ? { list } : {}),
      ...(rounds.length ? { rounds } : {}),
    });
  });
  return phases.filter((p) => p.steps.length);
}
