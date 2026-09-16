"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hey — I'm Arbiter. I don't have access to your live opportunities or inventory data yet (that's coming in a future update), but I can help with strategy, general FBA questions, or anything you want to think through.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const nextMessages: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setLoading(false);
        return;
      }

      setMessages([...nextMessages, { role: "assistant", content: data.reply }]);
    } catch {
      setError("Failed to reach the server");
    }

    setLoading(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] card p-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[75%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-accent text-white"
                  : "bg-surface2 text-gray-100"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[75%] rounded-lg px-3 py-2 text-sm bg-surface2 text-muted">
              Thinking...
            </div>
          </div>
        )}
        {error && (
          <div className="text-xs text-pass bg-pass/10 border border-pass/30 rounded-md px-3 py-2">
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border p-3 flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Arbiter anything..."
          rows={1}
          className="flex-1 bg-surface2 border border-border rounded-md px-3 py-2 text-sm text-gray-100 resize-none focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="px-4 py-2 text-sm rounded-md bg-accent text-white hover:bg-accent/90 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
