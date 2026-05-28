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
    <div className="border-t border-gray-800 p-4">
      <form
        onSubmit={handleSubmit}
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
  );
}
