"use client";

import { useState, useRef, useEffect } from "react";

interface SqlResult {
  sql: string;
  rows: Record<string, unknown>[];
  ms: number;
  cached: boolean;
  rowCount: number;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sqlResult?: SqlResult;
}

const STARTER_PROMPTS = [
  "Show every grantee paid >$50k with their protocol TVL and 7d change",
  "Flag grantees whose protocol TVL dropped more than 2% this week",
  "Which grantees have merged PRs and what are their protocols?",
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (prompt?: string) => {
    const question = prompt || input.trim();
    if (!question || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            { role: "user", content: question },
          ],
        }),
      });

      const reader = res.body?.getReader();
      if (!reader) return;

      let assistantText = "";
      let currentSqlResult: SqlResult | undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === "text") {
              assistantText += data.text;
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === "assistant") {
                  last.content = assistantText;
                  last.sqlResult = currentSqlResult;
                } else {
                  updated.push({
                    role: "assistant",
                    content: assistantText,
                    sqlResult: currentSqlResult,
                  });
                }
                return updated;
              });
            } else if (data.type === "sql_result") {
              currentSqlResult = {
                sql: data.sql,
                rows: data.rows,
                ms: data.ms,
                cached: data.cached,
                rowCount: data.rowCount,
              };
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === "assistant") {
                  last.sqlResult = currentSqlResult;
                }
                return updated;
              });
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch (err) {
      console.error("Stream error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#0a0a0f] text-gray-100">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-800 p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center text-sm font-bold text-black">
            T
          </div>
          <span className="text-lg font-semibold">Tide</span>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          On-chain risk & reputation co-pilot for DAO treasuries
        </p>
        <div className="text-xs text-gray-600 space-y-1">
          <div>grantees.registry</div>
          <div>defillama.protocols</div>
          <div>github_activity.prs</div>
          <div>etherscan.token_transfers</div>
          <div>reputation.casts_scored</div>
        </div>
        <div className="mt-auto text-xs text-gray-600">
          Powered by{" "}
          <a
            href="https://withcoral.com"
            className="text-cyan-400 hover:underline"
            target="_blank"
            rel="noopener"
          >
            Coral
          </a>{" "}
          +{" "}
          <a
            href="https://anthropic.com"
            className="text-cyan-400 hover:underline"
            target="_blank"
            rel="noopener"
          >
            Claude
          </a>
        </div>
      </aside>

      {/* Main chat area */}
      <main className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="max-w-2xl mx-auto mt-20">
              <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Tide
              </h1>
              <p className="text-gray-400 mb-8">
                Ask questions about DAO treasuries, grantee reputation, protocol
                risk, and on-chain activity — all in one SQL surface.
              </p>
              <div className="space-y-2">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSubmit(prompt)}
                    className="w-full text-left p-3 rounded-lg border border-gray-800 hover:border-cyan-500/50 hover:bg-gray-900/50 transition-colors text-sm text-gray-300"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`max-w-3xl ${msg.role === "user" ? "ml-auto" : ""}`}
            >
              <div
                className={`rounded-lg p-4 ${
                  msg.role === "user"
                    ? "bg-cyan-500/10 border border-cyan-500/20"
                    : "bg-gray-900 border border-gray-800"
                }`}
              >
                <div className="text-sm whitespace-pre-wrap">{msg.content}</div>

                {/* SQL Preview */}
                {msg.sqlResult && (
                  <div className="mt-4 rounded-lg bg-[#0d0d14] border border-gray-800 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
                      <span className="text-xs text-cyan-400 font-mono">
                        SQL
                      </span>
                      <span className="text-xs text-gray-500">
                        {msg.sqlResult.rowCount} rows &middot;{" "}
                        {msg.sqlResult.ms}ms
                        {msg.sqlResult.cached && (
                          <span className="ml-1 text-green-400">
                            &middot; cached
                          </span>
                        )}
                      </span>
                    </div>
                    <pre className="p-3 text-xs text-gray-300 overflow-x-auto">
                      <code>{msg.sqlResult.sql}</code>
                    </pre>
                  </div>
                )}

                {/* Results Grid */}
                {msg.sqlResult && msg.sqlResult.rows.length > 0 && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-800">
                          {Object.keys(msg.sqlResult.rows[0]).map((col) => (
                            <th
                              key={col}
                              className="text-left py-2 px-2 text-gray-500 font-medium"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {msg.sqlResult.rows.map((row, ri) => (
                          <tr
                            key={ri}
                            className="border-b border-gray-800/50 hover:bg-gray-900/50"
                          >
                            {Object.values(row).map((val, vi) => (
                              <td key={vi} className="py-2 px-2 text-gray-300">
                                {val === null
                                  ? "—"
                                  : typeof val === "number"
                                    ? val.toLocaleString()
                                    : String(val).slice(0, 50)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="max-w-3xl">
              <div className="rounded-lg p-4 bg-gray-900 border border-gray-800">
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  Thinking...
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-800 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="max-w-3xl mx-auto flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about DAO treasuries, grantee risk, protocol TVL..."
              className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 placeholder:text-gray-600"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-cyan-500 text-black rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-cyan-400 transition-colors"
            >
              Ask
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
