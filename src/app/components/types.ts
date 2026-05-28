export interface SqlResult {
  sql: string;
  rows: Record<string, unknown>[];
  ms: number;
  cached: boolean;
  rowCount: number;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  sqlResult?: SqlResult;
  error?: string;
}
