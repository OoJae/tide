import { SqlPreview } from "./SqlPreview";
import { ResultsGrid } from "./ResultsGrid";
import { RiskBadge } from "./RiskBadge";
import type { Message } from "./types";

function getRiskFromRows(
  rows: Record<string, unknown>[]
): { change7d: number | null; sentiment: number | null } {
  if (rows.length === 0) return { change7d: null, sentiment: null };
  const first = rows[0];
  return {
    change7d:
      typeof first.change_7d === "number" ? first.change_7d : null,
    sentiment:
      typeof first.avg_sentiment === "number" ? first.avg_sentiment : null,
  };
}

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const risk = message.sqlResult
    ? getRiskFromRows(message.sqlResult.rows)
    : null;

  return (
    <div className={`max-w-3xl ${isUser ? "ml-auto" : ""}`}>
      <div
        className={`rounded-lg p-4 ${
          isUser
            ? "bg-accent/10 border border-accent/20"
            : "bg-surface-2 border border-border"
        }`}
      >
        {/* Error state */}
        {message.error && (
          <div className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {message.error}
          </div>
        )}

        {/* Text content */}
        <div className="text-sm whitespace-pre-wrap">{message.content}</div>

        {/* SQL Preview */}
        {message.sqlResult && (
          <SqlPreview
            sql={message.sqlResult.sql}
            ms={message.sqlResult.ms}
            cached={message.sqlResult.cached}
            rowCount={message.sqlResult.rowCount}
          />
        )}

        {/* Risk Badge */}
        {risk && (risk.change7d !== null || risk.sentiment !== null) && (
          <div className="mt-2">
            <RiskBadge change7d={risk.change7d} sentiment={risk.sentiment} />
          </div>
        )}

        {/* Results Grid */}
        {message.sqlResult && message.sqlResult.rows.length > 0 && (
          <ResultsGrid rows={message.sqlResult.rows} />
        )}
      </div>
    </div>
  );
}
