"use client";

import { useState, useRef, useEffect } from "react";
import { MessageBubble } from "./components/MessageBubble";
import { ChatInput } from "./components/ChatInput";
import { TideGlyph } from "./components/TideGlyph";
import { TideSea } from "./components/TideSea";
import type { Message, SqlResult } from "./components/types";

const STARTER_PROMPTS = [
  "Show me the top grantees by protocol TVL",
  "Flag grantees whose protocol TVL dropped more than 5% this week",
  "Which grantees have merged PRs and what are their protocols?",
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (question: string) => {
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
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
            } else if (data.type === "error") {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === "assistant") {
                  last.error = data.error;
                } else {
                  updated.push({
                    role: "assistant",
                    content: "",
                    error: data.error,
                  });
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
    <div className="flex h-screen bg-surface text-text">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-8">
          <TideGlyph size={32} />
          <span className="font-display text-lg uppercase tracking-wider">
            Tide
          </span>
        </div>
        <p className="text-xs font-editorial italic text-text-secondary mb-4">
          On-chain risk & reputation co-pilot for DAO treasuries
        </p>
        <div className="text-xs text-text-tertiary font-mono space-y-1">
          <div>grantees.registry</div>
          <div>defillama.protocols</div>
          <div>github_activity.prs</div>
          <div>etherscan_transfers.transfers</div>
          <div>reputation.casts_scored</div>
        </div>
        <div className="mt-auto text-xs text-text-tertiary font-mono">
          Powered by{" "}
          <a
            href="https://withcoral.com"
            className="text-accent hover:underline"
            target="_blank"
            rel="noopener"
          >
            Coral
          </a>
          {" + "}
          <a
            href="https://mimo.xiaomi.com"
            className="text-accent hover:underline"
            target="_blank"
            rel="noopener"
          >
            MiMo
          </a>
        </div>
      </aside>

      {/* Main area */}
      <main className="flex-1 flex flex-col">
        {/* Empty state — hero with sea */}
        {messages.length === 0 && (
          <div className="relative flex-1 overflow-hidden">
            {/* 3D sea background */}
            <TideSea />

            {/* horizon glow overlay */}
            <div
              className="absolute left-0 right-0 pointer-events-none z-[2]"
              style={{
                top: "48%",
                height: "34vh",
                background:
                  "radial-gradient(ellipse 70% 100% at 50% 0%, rgba(212,146,103,0.22), transparent 60%), linear-gradient(180deg, transparent, rgba(6,8,10,0.55) 70%, #06080a 100%)",
              }}
            />

            {/* hero content */}
            <div className="relative z-[5] flex flex-col items-center justify-center min-h-full px-[clamp(28px,3.6vw,56px)]">
              {/* wordmark */}
              <h1 className="font-display text-[clamp(120px,22vw,320px)] leading-[0.78] tracking-[-0.04em] text-text select-none">
                T<span className="text-accent">I</span>DE
              </h1>

              {/* tagline */}
              <p className="font-editorial italic text-[clamp(18px,2.4vw,36px)] text-text mt-4 tracking-[-0.01em]">
                Every treasury has a <em className="text-accent">tide-line</em>
              </p>

              {/* subtitle */}
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-secondary mt-6">
                Five sources &middot; One SQL join &middot; Zero guesswork
              </p>

              {/* starter prompts */}
              <div className="mt-12 w-full max-w-xl space-y-2">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSubmit(prompt)}
                    className="w-full text-left p-3 rounded-lg border border-border hover:border-accent/50 hover:bg-surface-2/50 transition-colors text-sm text-text"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* corner ticks */}
            <i className="absolute top-[78px] left-[clamp(28px,3.6vw,56px)] w-3.5 h-3.5 border border-border border-r-0 border-b-0 z-[5]" />
            <i className="absolute top-[78px] right-[clamp(28px,3.6vw,56px)] w-3.5 h-3.5 border border-border border-l-0 border-b-0 z-[5]" />
            <i className="absolute bottom-[clamp(28px,3.6vw,56px)] left-[clamp(28px,3.6vw,56px)] w-3.5 h-3.5 border border-border border-r-0 border-t-0 z-[5]" />
            <i className="absolute bottom-[clamp(28px,3.6vw,56px)] right-[clamp(28px,3.6vw,56px)] w-3.5 h-3.5 border border-border border-l-0 border-t-0 z-[5]" />
          </div>
        )}

        {/* Chat messages */}
        {messages.length > 0 && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}

            {/* Loading indicator */}
            {loading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="max-w-3xl">
                <div className="rounded-lg p-4 bg-surface-2 border border-border">
                  <div className="flex items-center gap-2 text-text-secondary text-sm">
                    <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                    Thinking...
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input — always visible */}
        <ChatInput onSubmit={handleSubmit} loading={loading} />
      </main>
    </div>
  );
}
