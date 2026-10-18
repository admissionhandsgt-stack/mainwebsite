/**
 * Shapes shared by the Admission Chance screens. No imports beyond types, so
 * every client file can use it.
 */

import type { ChanceBand } from "@/lib/chance";
import type { CounsellingProfile, Stream } from "@/lib/counsellingOptions";

export interface CollegeOptionView {
  name: string;
  slug: string;
  state: string | null;
  ownership: string | null;
  best: ChanceBand;
  bands: Record<ChanceBand, number>;
  options: number;
  branches: { name: string; best: ChanceBand }[];
  fee: string | null;
}

export interface PredictData {
  total: number;
  counts: Record<ChanceBand, number>;
  shape: { states: number; colleges: number; branches: number; fee: string | null; capped: boolean };
  insight: {
    exam: string;
    appeared: number;
    aheadOf: number;
    topStates: { state: string; colleges: number }[];
  };
  access: { signedIn: boolean; verified: boolean; staff: boolean };
  options: CollegeOptionView[] | null;
}

export interface RoundsData {
  openedTotal: number;
  tightenedTotal: number;
}

export interface Viewer {
  signedIn: boolean;
  verified: boolean;
  name: string | null;
  profile: CounsellingProfile | null;
}

export interface StreamFacets {
  states: string[];
  categories: { code: string; seats: number }[];
  branches: string[];
  ownerships: string[];
}

export type { Stream };
