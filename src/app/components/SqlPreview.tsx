import { SourceChips } from "./SourceChips";

const SQL_KEYWORDS =
  /\b(SELECT|FROM|JOIN|LEFT|RIGHT|INNER|OUTER|CROSS|WHERE|AND|OR|ON|GROUP|BY|ORDER|ASC|DESC|LIMIT|OFFSET|HAVING|AS|DISTINCT|COUNT|SUM|AVG|MIN|MAX|FILTER|INTERVAL|CAST|DOUBLE|INTEGER|FLOAT|VARCHAR|TRUE|FALSE|NULL|IN|NOT|BETWEEN|LIKE|CASE|WHEN|THEN|ELSE|END|WITH|UNION|ALL|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TABLE|INDEX|INTO|VALUES|SET|IS|EXISTS|ANY|SOME)\b/gi;

const SQL_FUNCTIONS =
  /\b(now|current_timestamp|coalesce|nullif|concat|lower|upper|trim|length|substring|replace|abs|round|floor|ceil|sqrt|power|log)\b/gi;

function highlightSql(sql: string): string {
  return sql
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(
      SQL_KEYWORDS,
      '<span class="text-accent font-semibold">$1</span>'
    )
    .replace(
      SQL_FUNCTIONS,
      '<span class="text-[#c49b7a]">$1</span>'
    )
    .replace(
      /('[^']*')/g,
      '<span class="text-[#d4a574]">$1</span>'
    )
    .replace(
      /(\b\d+\.?\d*)\b/g,
      '<span class="text-[#8ab8a4]">$1</span>'
    );
}

interface SqlPreviewProps {
  sql: string;
  ms: number;
  cached: boolean;
  rowCount: number;
}

export function SqlPreview({ sql, ms, cached, rowCount }: SqlPreviewProps) {
  return (
    <div className="mt-4 rounded-lg bg-surface-3 border border-border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs text-accent font-mono font-semibold">
            SQL
          </span>
          <SourceChips sql={sql} />
        </div>
        <span className="text-xs text-text-tertiary">
          {rowCount} rows &middot; {ms}ms
          {cached && (
            <span className="ml-1 text-success">&middot; cached</span>
          )}
        </span>
      </div>
      <pre className="p-3 text-xs overflow-x-auto">
        <code
          className="font-mono text-text"
          dangerouslySetInnerHTML={{ __html: highlightSql(sql) }}
        />
      </pre>
    </div>
  );
}
