import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as Icons from "lucide-react";

interface AiTutorProps {
  isOpen: boolean;
  onClose: () => void;
  lastQuery: string;
  errorMessage: string | null;
  schemaContext: any;
  questionContext: any;
  theme: "light" | "dark";
  onApplyQuery: (query: string) => void;
}

interface Message {
  role: "user" | "model";
  text: string;
}

export const AiTutor: React.FC<AiTutorProps> = ({
  isOpen,
  onClose,
  lastQuery,
  errorMessage,
  schemaContext,
  questionContext,
  theme,
  onApplyQuery,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  
  // Follow-up chat state
  const [chatInput, setChatInput] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Trigger analysis when slide-out is opened with a new failed query
  useEffect(() => {
    if (isOpen && lastQuery) {
      handleAnalyze();
    }
  }, [isOpen, lastQuery]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setAnalysis("");
    setMessages([]); // Reset chat history for a new analysis
    
    try {
      const response = await fetch("/api/tutor/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: lastQuery,
          errorMessage,
          schemaContext,
          questionContext,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to analyze query.");
      }

      const data = await response.json();
      setAnalysis(data.analysis);
      
      // Initialize chat messages with the analysis
      setMessages([
        { role: "model", text: data.analysis }
      ]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while calling the AI Tutor.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = chatInput.trim();
    setChatInput("");
    
    // Append user message
    const updatedMessages = [...messages, { role: "user", text: userMsg } as Message];
    setMessages(updatedMessages);
    setChatLoading(true);

    try {
      // Map message history to Gemini API format
      // { role: "user" | "model", parts: [{ text: "..." }] }
      const geminiHistory = updatedMessages.slice(0, -1).map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.text }],
      }));

      const response = await fetch("/api/tutor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: geminiHistory,
          message: userMsg,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to get tutor response.");
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { role: "model", text: data.response }]);
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "model", text: `⚠️ Error: ${err.message || "Could not retrieve answer. Check network connection."}` },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Safe manual markdown renderer to format code blocks, bold text, list items, etc.
  const renderMarkdown = (text: string) => {
    if (!text) return null;

    // Split text by markdown code blocks ```sql ... ```
    const parts = text.split(/(```sql[\s\S]*?```|```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      // Check if code block
      if (part.startsWith("```")) {
        const code = part.replace(/```sql|```/g, "").trim();
        return (
          <div key={index} className="my-3 rounded-lg overflow-hidden border border-slate-700/80 bg-slate-900 shadow-md">
            <div className="bg-slate-800 px-4 py-1.5 flex items-center justify-between text-[10px] font-mono font-bold text-slate-400 border-b border-slate-700/80">
              <span className="flex items-center text-blue-400">
                <Icons.Code className="w-3.5 h-3.5 mr-1.5" />
                CORRECTED SQL
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(code);
                  }}
                  className="hover:text-white transition flex items-center cursor-pointer"
                  title="Copy SQL code"
                >
                  <Icons.Copy className="w-3 h-3 mr-1" />
                  Copy
                </button>
                <button
                  onClick={() => {
                    onApplyQuery(code);
                  }}
                  className="text-emerald-400 hover:text-emerald-300 transition flex items-center cursor-pointer"
                  title="Load SQL into Student Console"
                >
                  <Icons.Play className="w-3 h-3 mr-1" />
                  Apply
                </button>
              </div>
            </div>
            <pre className="p-4 overflow-x-auto text-xs font-mono text-emerald-400 whitespace-pre leading-relaxed select-text">
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      // Plain text block - handle lines, bold blocks, headers
      const lines = part.split("\n");
      return (
        <div key={index} className="space-y-1.5 select-text text-sm leading-relaxed">
          {lines.map((line, lIdx) => {
            const trimmed = line.trim();
            if (!trimmed) return <div key={lIdx} className="h-2" />;

            // Header 1 / 2 / 3
            if (trimmed.startsWith("###")) {
              return (
                <h4 key={lIdx} className="text-sm font-extrabold text-blue-505 dark:text-blue-400 uppercase tracking-wide mt-4 border-b border-slate-700/35 pb-1">
                  {trimmed.replace("###", "").trim()}
                </h4>
              );
            }
            if (trimmed.startsWith("##")) {
              return (
                <h3 key={lIdx} className="text-base font-extrabold text-blue-500 dark:text-blue-400 mt-5 border-b border-slate-700 pb-1 flex items-center">
                  {trimmed.replace("##", "").trim()}
                </h3>
              );
            }
            if (trimmed.startsWith("**")) {
              return (
                <h3 key={lIdx} className="text-base font-bold text-slate-900 dark:text-white mt-4">
                  {trimmed.replace(/\*\*/g, "").trim()}
                </h3>
              );
            }

            // Bullet items
            if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
              const content = line.replace(/^[-*]\s*/, "");
              return (
                <div key={lIdx} className="flex items-start space-x-2 pl-2 text-xs">
                  <span className="text-blue-500 mt-1 shrink-0">•</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {formatBoldAndItalic(content)}
                  </span>
                </div>
              );
            }

            // Numbered items
            if (/^\d+\.\s+/.test(trimmed)) {
              return (
                <div key={lIdx} className="flex items-start space-x-2 pl-2 text-xs">
                  <span className="font-bold text-blue-500 shrink-0">{trimmed.match(/^\d+\./)?.[0]}</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {formatBoldAndItalic(trimmed.replace(/^\d+\.\s+/, ""))}
                  </span>
                </div>
              );
            }

            // Default line
            return (
              <p key={lIdx} className="text-xs font-medium text-slate-700 dark:text-slate-300 pl-1 leading-relaxed">
                {formatBoldAndItalic(line)}
              </p>
            );
          })}
        </div>
      );
    });
  };

  // Helper to parse **bold** and `code` inline formatting
  const formatBoldAndItalic = (text: string) => {
    const regex = /(\*\*.*?\*\*|`.*?`)/g;
    const parts = text.split(regex);
    if (parts.length === 1) return text;

    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="font-extrabold text-slate-900 dark:text-slate-100">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return <code key={i} className="bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded font-mono text-[10.5px] text-amber-600 dark:text-amber-400 font-bold">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay mask */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black backdrop-blur-2xs"
          />

          {/* Drawer slide panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={`fixed top-0 right-0 bottom-0 z-50 w-full md:w-[480px] border-l shadow-2xl flex flex-col overflow-hidden ${
              theme === "dark" ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-white border-slate-250 text-slate-800"
            }`}
          >
            {/* Header */}
            <div className={`p-4 border-b flex items-center justify-between select-none shrink-0 ${
              theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"
            }`}>
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-sm flex items-center justify-center">
                  <Icons.Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold tracking-tight">AI SQL Tutor</h3>
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-blue-500 block">Personalized Guidance</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`p-1.5 rounded-lg border transition cursor-pointer flex items-center justify-center ${
                  theme === "dark" ? "border-slate-800 hover:bg-slate-800 text-slate-400" : "border-slate-200 hover:bg-slate-100 text-slate-500"
                }`}
              >
                <Icons.X className="w-4 h-4" />
              </button>
            </div>

            {/* Main content body (Scrollable chat and feedback loop) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col">
              
              {/* Context Summary */}
              {lastQuery && (
                <div className={`p-3 rounded-lg border text-xs select-none shrink-0 ${
                  theme === "dark" ? "bg-slate-900/60 border-slate-850" : "bg-slate-50 border-slate-200"
                }`}>
                  <span className="font-bold text-[9px] uppercase tracking-wider text-amber-500 block mb-1">Your Query:</span>
                  <pre className="font-mono bg-slate-950 text-slate-250 p-2 rounded text-[10.5px] overflow-x-auto max-h-24">
                    {lastQuery}
                  </pre>
                  {errorMessage && (
                    <div className="mt-2 text-rose-500 dark:text-rose-400 font-mono text-[10px] leading-tight">
                      <strong>Error:</strong> {errorMessage}
                    </div>
                  )}
                </div>
              )}

              {/* Loader */}
              {loading && (
                <div className="flex-1 flex flex-col items-center justify-center py-10 space-y-4">
                  <div className="relative">
                    <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-600 rounded-full animate-spin" />
                    <Icons.Sparkles className="w-5 h-5 text-blue-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                  </div>
                  <div className="text-center">
                    <span className="font-bold text-xs block">AI Tutor is Thinking...</span>
                    <span className="text-[10px] text-slate-500 font-medium italic mt-1 block">Analyzing AST parse trees & compiling solutions</span>
                  </div>
                </div>
              )}

              {/* Error Callout */}
              {error && (
                <div className="p-4 rounded-xl border border-rose-900 bg-rose-950/20 text-rose-300 text-xs">
                  <div className="font-bold mb-1 flex items-center">
                    <Icons.AlertTriangle className="w-4 h-4 mr-1.5 shrink-0" />
                    Tutor Connection Faulted
                  </div>
                  <p>{error}</p>
                  <button
                    onClick={handleAnalyze}
                    className="mt-3 px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded font-bold text-[10px] cursor-pointer"
                  >
                    Retry Analysis
                  </button>
                </div>
              )}

              {/* Conversation Stream */}
              {!loading && !error && messages.length > 0 && (
                <div className="flex-1 flex flex-col space-y-4">
                  {messages.map((msg, idx) => {
                    const isModel = msg.role === "model";
                    return (
                      <div
                        key={idx}
                        className={`flex items-start space-x-2.5 ${isModel ? "" : "flex-row-reverse space-x-reverse"}`}
                      >
                        {/* Avatar */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border shadow-2xs ${
                          isModel 
                            ? "bg-blue-600 border-blue-500 text-white" 
                            : (theme === "dark" ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-600")
                        }`}>
                          {isModel ? (
                            <Icons.Sparkles className="w-4 h-4" />
                          ) : (
                            <Icons.GraduationCap className="w-4 h-4" />
                          )}
                        </div>

                        {/* Speech Bubble */}
                        <div className={`p-3.5 rounded-2xl max-w-[85%] border shadow-3xs ${
                          isModel
                            ? (theme === "dark" ? "bg-slate-900 border-slate-850" : "bg-slate-50 border-slate-200")
                            : "bg-blue-600 border-blue-550 text-white"
                        }`}>
                          {isModel ? (
                            <div className="space-y-2">
                              {renderMarkdown(msg.text)}
                            </div>
                          ) : (
                            <p className="text-xs font-semibold leading-relaxed whitespace-pre-wrap select-text">{msg.text}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Chat Loader */}
                  {chatLoading && (
                    <div className="flex items-start space-x-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-600 border-blue-500 text-white flex items-center justify-center shrink-0">
                        <Icons.Sparkles className="w-4 h-4 animate-spin" />
                      </div>
                      <div className={`p-3.5 rounded-2xl border text-xs font-medium italic ${
                        theme === "dark" ? "bg-slate-900 border-slate-850 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500"
                      }`}>
                        Writing explanation...
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            {/* Chat Input Footer */}
            {!loading && !error && messages.length > 0 && (
              <form
                onSubmit={handleSendMessage}
                className={`p-3 border-t flex items-center space-x-2 shrink-0 ${
                  theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"
                }`}
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask the AI Tutor a follow-up question..."
                  disabled={chatLoading}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border outline-none transition-all shadow-3xs ${
                    theme === "dark" 
                      ? "bg-slate-950 border-slate-800 text-slate-200 focus:border-blue-500" 
                      : "bg-white border-slate-250 text-slate-800 focus:border-blue-500"
                  }`}
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || chatLoading}
                  className="bg-blue-600 hover:bg-blue-550 disabled:opacity-50 text-white p-2 rounded-lg cursor-pointer shrink-0 transition-colors shadow-xs flex items-center justify-center"
                >
                  <Icons.Send className="w-3.5 h-3.5" />
                </button>
              </form>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
