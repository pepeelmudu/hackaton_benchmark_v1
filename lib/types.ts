export type DimensionKey =
  | "tool_use"
  | "agency_loop"
  | "planning"
  | "memory"
  | "integration"
  | "robustness";

/** Texto en los dos idiomas soportados. */
export interface Localized {
  en: string;
  es: string;
}

export interface DimensionScore {
  score: number; // 0-10
  justification: Localized;
}

export interface AnalysisResult {
  overall: number; // 0-10, media ponderada
  verdict: Localized;
  is_disguised_llm: boolean;
  dimensions: Record<DimensionKey, DimensionScore>;
  highlights: Localized[];
  red_flags: Localized[];
}

export interface Project {
  id?: number;
  url: string;
  owner: string;
  name: string;
  team: string;
}

export interface Snapshot {
  id?: number;
  project_id: number;
  ts: number; // epoch ms
  commit_sha: string;
  overall: number;
  verdict: string;
  is_disguised_llm: boolean;
  payload: AnalysisResult | null;
  error?: string | null;
}

export interface LeaderboardRow extends Project {
  ts: number;
  commit_sha: string;
  overall: number;
  verdict: string;
  is_disguised_llm: boolean;
  payload: AnalysisResult | null;
  error: string | null;
}
