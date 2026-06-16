export type DimensionKey =
  | "tool_use"
  | "agency_loop"
  | "planning"
  | "memory"
  | "integration"
  | "robustness";

export interface DimensionScore {
  score: number; // 0-10
  justification: string;
}

export interface AnalysisResult {
  overall: number; // 0-10, media ponderada
  verdict: string;
  is_disguised_llm: boolean;
  dimensions: Record<DimensionKey, DimensionScore>;
  highlights: string[];
  red_flags: string[];
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
