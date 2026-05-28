"use client";

import { useState } from "react";

interface ChatInputProps {
  onSubmit: (text: string) => void;
  loading: boolean;
}

export function ChatInput({ onSubmit, loading }: ChatInputProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    onSubmit(text);
  };

  return (
    <div className="border-t border-border p-4">
      <form
        onSubmit={handleSubmit}
        className="max-w-3xl mx-auto flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about DAO treasuries, grantee risk, protocol TVL..."
          className="flex-1 bg-surface-2 border border-border rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:border-accent/50 placeholder:text-text-tertiary"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-6 py-3 bg-accent text-surface rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-accent-deep transition-colors"
        >
          Ask
        </button>
      </form>
    </div>
  );
}
