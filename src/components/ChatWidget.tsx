"use client";

import { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Loader2,
  ChevronRight,
  ExternalLink,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: string[];
  refundData?: any;
  timestamp: string;
}

interface ChatWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
}

export default function ChatWidget({ isOpen, onClose, initialPrompt }: ChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "👋 Hi! I'm **Eren**, your ApexStore Concierge.\n\nHow can I help today? I can help you **track orders**, check **top deals**, or verify **return & refund eligibility**.",
      timestamp: "Just now",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [usedChips, setUsedChips] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversation memory from localStorage on initial mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("apexstore_chat_history");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch (e) {
      console.warn("Could not load chat memory from localStorage:", e);
    }
  }, []);

  // Persist conversation memory whenever messages change
  useEffect(() => {
    try {
      if (messages.length > 1) {
        localStorage.setItem("apexstore_chat_history", JSON.stringify(messages));
      }
    } catch (e) {
      console.warn("Could not save chat memory to localStorage:", e);
    }
  }, [messages]);

  // Handle initial prompt passed from outside
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt]);

  // Scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, isOpen]);

  async function handleSendMessage(overrideText?: string) {
    const textToSend = overrideText || input;
    if (!textToSend.trim() || loading) return;

    const userMessage: Message = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newThread = [...messages, userMessage];
    setMessages(newThread);
    if (!overrideText) setInput("");
    setLoading(true);

    setActiveTool("Eren is thinking...");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newThread.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          customerEmail: "sarah.connor@example.com",
        }),
      });

      const data = await res.json();
      setActiveTool(null);

      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to process message.");
      }

      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        content: data.reply,
        toolCalls: data.toolCalls,
        refundData: data.refundData,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      setActiveTool(null);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          role: "assistant",
          content: `⚠️ ${err.message || "Something went wrong while connecting to the agent."}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleClearChat() {
    try {
      localStorage.removeItem("apexstore_chat_history");
    } catch (e) {
      console.warn("Could not clear localStorage:", e);
    }
    setUsedChips([]);
    setMessages([
      {
        id: "welcome-reset",
        role: "assistant",
        content: "Chat cleared. How can I assist you with products, orders, or return policies?",
        timestamp: "Just now",
      },
    ]);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-[460px] h-[640px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
      {/* Header */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white">
              <Bot className="w-5 h-5" />
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-indigo-700 absolute -bottom-0.5 -right-0.5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h3 className="font-semibold text-sm leading-none">Eren Support</h3>
            </div>
            <p className="text-[11px] text-indigo-100/80 mt-0.5">
              Online
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={handleClearChat}
            title="Reset Conversation"
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            <div className="flex items-end space-x-2 max-w-[90%]">
              {msg.role === "assistant" && (
                <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mb-1 text-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`p-3.5 rounded-2xl text-xs sm:text-[13px] leading-relaxed shadow-sm ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white rounded-br-xs"
                    : "bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs"
                }`}
              >
                {/* Text body with simple markdown rendering */}
                <div className="whitespace-pre-wrap space-y-1.5">
                  {msg.content.split("\n\n").map((para, i) => (
                    <p key={i}>
                      {para.split("**").map((chunk, j) =>
                        j % 2 === 1 ? (
                          <strong key={j} className={msg.role === "user" ? "text-white font-bold" : "text-slate-900 font-semibold"}>
                            {chunk}
                          </strong>
                        ) : (
                          chunk
                        )
                      )}
                    </p>
                  ))}
                </div>

                {/* Refund Card Badge if present */}
                {msg.refundData && (
                  msg.refundData.isEligible ? (
                    <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-indigo-200/60 text-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-bold text-indigo-700 flex items-center space-x-1">
                          <Receipt className="w-3.5 h-3.5" />
                          <span>{msg.refundData.refundId}</span>
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                            msg.refundData.adminStatus === "APPROVED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {msg.refundData.adminStatus === "APPROVED" ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Approved</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" />
                              <span>Pending Review</span>
                            </>
                          )}
                        </span>
                      </div>

                      <div className="text-xs pt-1 border-t border-slate-200/70 flex items-baseline justify-between">
                        <span className="text-slate-500">Refund Amount:</span>
                        <span className="font-bold text-slate-900 text-sm">
                          ${msg.refundData.refundAmount?.toFixed(2) || "0.00"}
                        </span>
                      </div>

                      {msg.refundData.policyCitation && (
                        <div className="text-[11px] text-slate-700 bg-white p-2.5 rounded-xl border border-indigo-200/80 space-y-1 shadow-2xs">
                          <div className="flex items-center space-x-1 font-semibold text-slate-900">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Store Policy Verified</span>
                          </div>
                          <p className="text-slate-600 font-sans text-[11px] leading-relaxed pt-0.5">
                            {msg.refundData.policyCitation}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 p-3 rounded-xl bg-rose-50/70 border border-rose-200 text-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-rose-900 flex items-center space-x-1.5">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>Store Policy Notice</span>
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                          Ineligible for Return
                        </span>
                      </div>
                      {msg.refundData.policyCitation && (
                        <p className="text-slate-600 text-[11px] leading-relaxed pt-1.5 border-t border-rose-200/60 font-sans">
                          {msg.refundData.policyCitation}
                        </p>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
          </div>
        ))}

        {/* Active Tool Calling indicator */}
        {loading && (
          <div className="flex items-center space-x-2 text-xs text-indigo-700 bg-indigo-50/80 border border-indigo-100 p-2.5 rounded-xl animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin shrink-0 text-indigo-600" />
            <span className="font-medium">{activeTool || "Eren is thinking..."}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompt Suggestion Chips (auto-hide clicked chips) */}
      {(() => {
        const availableChips = [
          { label: "🔥 Top Deals", prompt: "What discounts do you have right now?" },
          { label: "📦 Track ORD-1001", prompt: "Where is my order ORD-1001?" },
          { label: "🛡️ Refund ORD-1003", prompt: "Can I get a refund for ORD-1003? The smartwatch screen arrived cracked." },
          { label: "🎧 Earbuds Policy", prompt: "Can I return opened wireless earbuds?" },
          { label: "👑 Gold Tier Perk", prompt: "What is the return window for Gold tier members?" },
        ].filter((chip) => !usedChips.includes(chip.label));

        if (availableChips.length === 0) return null;

        return (
          <div className="px-3 py-2 bg-white border-t border-slate-100 overflow-x-auto flex space-x-1.5 no-scrollbar shrink-0">
            {availableChips.map((chip, idx) => (
              <button
                key={idx}
                disabled={loading}
                onClick={() => {
                  setUsedChips((prev) => [...prev, chip.label]);
                  handleSendMessage(chip.prompt);
                }}
                className="shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 border border-slate-200 transition-colors"
              >
                {chip.label}
              </button>
            ))}
          </div>
        );
      })()}

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2 shrink-0"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question or request a refund..."
          disabled={loading}
          className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white flex items-center justify-center shadow-md shadow-indigo-100 transition-all hover:scale-105 active:scale-95 shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
