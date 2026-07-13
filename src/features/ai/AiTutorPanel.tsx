import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, Send, Sparkles, Trash2, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useEngine } from "@/lib/db/engine-provider";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lastQuery: string;
  lastError: string | null;
  onApplyQuery: (sql: string) => void;
}

const SUGGESTIONS = [
  "Explain the last error",
  "Optimize my last query",
  "Generate a query: total revenue per artist",
  "Explain LEFT JOIN vs INNER JOIN",
];

export function AiTutorPanel({ isOpen, onClose, lastQuery, lastError, onApplyQuery }: Props) {
  const { engineId, tables } = useEngine();
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [draft, setDraft] = useState("");

  const chatContext = useMemo(
    () => ({
      engine: engineId,
      schema: tables.map((t) => ({
        name: t.name,
        columns: t.columns.map((c) => ({ name: c.name, type: c.type })),
      })),
      lastQuery,
      lastError,
    }),
    [engineId, tables, lastQuery, lastError],
  );
  const contextRef = useRef(chatContext);
  useEffect(() => {
    contextRef.current = chatContext;
  }, [chatContext]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/tutor/chat-stream",
        prepareSendMessagesRequest: ({ messages, id }) => ({
          body: { id, messages, context: contextRef.current },
        }),
      }),
    [],
  );

  const { messages, sendMessage, status, setMessages, error } = useChat({
    id: "workbench-tutor",
    transport,
    onError(err: Error) {
      toast.error(err.message || "AI tutor request failed");
    },
  });

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen, messages.length]);

  const submit = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || status === "streaming" || status === "submitted") return;
      void sendMessage({ text: trimmed });
      setDraft("");
    },
    [sendMessage, status],
  );

  if (!isOpen) return null;

  const busy = status === "streaming" || status === "submitted";

  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      <div className="pointer-events-auto absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <aside className="pointer-events-auto absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l bg-background shadow-2xl">
        <header className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="rounded bg-primary/10 p-1.5 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold">AI SQL Tutor</div>
              <div className="text-[11px] text-muted-foreground">
                Context: {engineId} · {tables.length} tables
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-8"
              onClick={() => setMessages([])}
              title="Clear conversation"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {!messages.length && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Ask anything about your SQL. The tutor sees the live schema and your last query.
              </p>
              <div className="grid gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => submit(s)}
                    className="rounded-lg border bg-muted/30 px-3 py-2 text-left text-xs hover:bg-muted"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m: UIMessage) => {
            const text = m.parts
              .map((p) => (p.type === "text" ? p.text : ""))
              .join("");
            const isUser = m.role === "user";
            return (
              <div key={m.id} className={`flex gap-2 ${isUser ? "justify-end" : ""}`}>
                {!isUser && (
                  <div className="mt-0.5 shrink-0 rounded bg-primary/10 p-1 text-primary">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                )}
                <div
                  className={`prose prose-sm max-w-[85%] rounded-lg px-3 py-2 text-sm dark:prose-invert prose-pre:my-2 ${
                    isUser
                      ? "bg-primary text-primary-foreground"
                      : "border bg-muted/30"
                  }`}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || "");
                        const raw = String(children).replace(/\n$/, "");
                        if (match && match[1] === "sql") {
                          return (
                            <div className="not-prose my-2 overflow-hidden rounded border bg-slate-950 text-slate-100">
                              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-3 py-1 text-[10px] uppercase tracking-wider">
                                <span>sql</span>
                                <div className="flex gap-2">
                                  <button
                                    className="hover:text-white"
                                    onClick={() => {
                                      void navigator.clipboard.writeText(raw);
                                      toast.success("Copied");
                                    }}
                                  >
                                    copy
                                  </button>
                                  <button
                                    className="text-emerald-400 hover:text-emerald-300"
                                    onClick={() => onApplyQuery(raw)}
                                  >
                                    apply
                                  </button>
                                </div>
                              </div>
                              <pre className="overflow-x-auto p-3 text-xs">
                                <code>{raw}</code>
                              </pre>
                            </div>
                          );
                        }
                        return (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {text || (busy && m === messages[messages.length - 1] ? "…" : "")}
                  </ReactMarkdown>
                </div>
                {isUser && (
                  <div className="mt-0.5 shrink-0 rounded bg-primary p-1 text-primary-foreground">
                    <User className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            );
          })}
          {busy && (
            <div className="text-xs text-muted-foreground">Tutor is thinking…</div>
          )}
          {error && (
            <div className="rounded border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
              {error.message}
            </div>
          )}
        </div>

        <form
          className="border-t bg-background p-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit(draft);
          }}
        >
          <div className="flex items-end gap-2">
            <Textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit(draft);
                }
              }}
              placeholder="Ask about SQL, errors, or optimizations…"
              className="max-h-32 min-h-[44px] resize-none text-sm"
              rows={1}
            />
            <Button type="submit" size="sm" disabled={busy || !draft.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">Enter to send · Shift+Enter for newline</div>
        </form>
      </aside>
    </div>
  );
}
