import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Plus,
  Trash2,
  Send,
  Loader2,
  Square,
  FileEdit,
  Sparkles,
  RefreshCw,
  Search,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowDownCircle,
  HelpCircle
} from "lucide-react";
import { Message, ChatSession } from "./types";
import Markdown from "./components/Markdown";

// Initial default sessions
const DEFAULT_SESSIONS: ChatSession[] = [
  {
    id: "session-1",
    title: "Drafting an API Guide",
    draft: "How can I design a clean, RESTful API endpoint for...",
    messages: [
      {
        id: "m1",
        sender: "user",
        text: "I want to draft a tutorial on API best practices.",
        timestamp: new Date(Date.now() - 3600000 * 2).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      },
      {
        id: "m2",
        sender: "model",
        text: "That sounds excellent! Designing clean APIs is a great topic. A few quick suggestions:\n\n1. Use clear, nouns for resources (e.g. `/api/v1/users` instead of `/api/v1/getUsers`).\n2. Consistently return appropriate HTTP status codes.\n3. Incorporate robust error bodies.",
        timestamp: new Date(Date.now() - 3600000 * 2 + 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ],
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: "session-2",
    title: "Meeting Outline Draft",
    draft: "Weekly sync items:\n- Product feature review\n- Release schedule checks\n- ",
    messages: [],
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 23).toISOString()
  }
];

export default function App() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem("technova_sessions");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse sessions from localStorage", e);
      }
    }
    return DEFAULT_SESSIONS;
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const savedActive = localStorage.getItem("technova_active_id");
    if (savedActive && DEFAULT_SESSIONS.some(s => s.id === savedActive || savedActive)) {
      return savedActive;
    }
    return DEFAULT_SESSIONS[0]?.id || "";
  });

  const [inputMessage, setInputMessage] = useState("");
  const [loadedSessionId, setLoadedSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitleText, setEditTitleText] = useState("");

  // SSE loading and streaming states
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Keep a reference of sessions to avoid dependency loops
  const sessionsRef = useRef(sessions);
  useEffect(() => {
    sessionsRef.current = sessions;
    localStorage.setItem("technova_sessions", JSON.stringify(sessions));
  }, [sessions]);

  // Sync active session ID to local storage
  useEffect(() => {
    localStorage.setItem("technova_active_id", activeSessionId);
  }, [activeSessionId]);

  // Load and restore draft when activeSessionId changes (subsequent switches)
  useEffect(() => {
    if (activeSessionId && sessionsRef.current.length > 0) {
      const active = sessionsRef.current.find(s => s.id === activeSessionId);
      setInputMessage(active?.draft || "");
      setLoadedSessionId(activeSessionId);
    }
  }, [activeSessionId]);

  // Scroll to bottom when messages change or streaming happens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessions, streamedText, isGenerating]);

  // Current active session helper
  const activeSession = sessions.find(s => s.id === activeSessionId);

  // Handle draft updating as user types
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputMessage(value);

    // Save to drafts in the sessions state
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          draft: value,
          updatedAt: new Date().toISOString()
        };
      }
      return s;
    }));
  };

  // Handle creating a new chat session
  const handleNewSession = () => {
    const newSessionId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newSessionId,
      title: "New AI Conversation",
      draft: "",
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSessionId);
    setInputMessage("");
    setLoadedSessionId(newSessionId);
  };

  // Handle deleting a session
  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = sessions.filter(s => s.id !== id);
    setSessions(remaining);

    if (activeSessionId === id) {
      if (remaining.length > 0) {
        setActiveSessionId(remaining[0].id);
      } else {
        // Create a default clean one if empty
        const defaultId = `session-${Date.now()}`;
        const newSession: ChatSession = {
          id: defaultId,
          title: "New AI Conversation",
          draft: "",
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setSessions([newSession]);
        setActiveSessionId(defaultId);
      }
    }
  };

  // Handle renaming a session
  const startEditingSession = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitleText(session.title);
  };

  const saveSessionTitle = (id: string) => {
    if (!editTitleText.trim()) return;
    setSessions(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, title: editTitleText.trim(), updatedAt: new Date().toISOString() };
      }
      return s;
    }));
    setEditingSessionId(null);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter") {
      saveSessionTitle(id);
    } else if (e.key === "Escape") {
      setEditingSessionId(null);
    }
  };

  // SSE Stream generation trigger
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || isGenerating) return;

    const promptText = inputMessage.trim();

    // 1. Create user message
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Prepare current history
    const currentMessages = activeSession ? [...activeSession.messages, userMessage] : [userMessage];

    // Clear input state and draft
    setInputMessage("");
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          draft: "", // Reset draft on send
          messages: currentMessages,
          // Auto rename title if it was default
          title: s.title === "New AI Conversation" || s.title === "New Conversation"
            ? (promptText.length > 32 ? promptText.substring(0, 32) + "..." : promptText)
            : s.title,
          updatedAt: new Date().toISOString()
        };
      }
      return s;
    }));

    // Start streaming
    setIsGenerating(true);
    setStreamedText("");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: currentMessages }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      if (!reader) throw new Error("No response body reader.");

      let buffer = "";
      let accumulatedResponse = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // keep incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          const dataStr = trimmed.substring(6);
          if (dataStr === "[DONE]") {
            break;
          }

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.text) {
              accumulatedResponse += parsed.text;
              setStreamedText(accumulatedResponse);
            }
          } catch (err) {
            console.error("Error parsing stream chunk:", err, dataStr);
          }
        }
      }

      // Finalize and save model message
      const botMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        sender: "model",
        text: accumulatedResponse || "No response received.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            messages: [...currentMessages, botMessage],
            updatedAt: new Date().toISOString()
          };
        }
        return s;
      }));

    } catch (err: any) {
      if (err.name === "AbortError") {
        // Stopped by user
        const stoppedMessage: Message = {
          id: `msg-${Date.now() + 1}`,
          sender: "model",
          text: streamedText + "\n\n*(Generation stopped)*",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setSessions(prev => prev.map(s => {
          if (s.id === activeSessionId) {
            return {
              ...s,
              messages: [...currentMessages, stoppedMessage],
              updatedAt: new Date().toISOString()
            };
          }
          return s;
        }));
      } else {
        console.error("Stream error:", err);
        const errorMessage: Message = {
          id: `msg-${Date.now() + 1}`,
          sender: "model",
          text: `⚠️ **Error receiving response:** ${err.message || "An unexpected error occurred."}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setSessions(prev => prev.map(s => {
          if (s.id === activeSessionId) {
            return {
              ...s,
              messages: [...currentMessages, errorMessage],
              updatedAt: new Date().toISOString()
            };
          }
          return s;
        }));
      }
    } finally {
      setIsGenerating(false);
      setStreamedText("");
      abortControllerRef.current = null;
    }
  };

  // Stop current active SSE generation
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // Apply quick suggestion prompt to input
  const handleApplySuggestion = (text: string) => {
    setInputMessage(text);
    // Also save directly to draft
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          draft: text,
          updatedAt: new Date().toISOString()
        };
      }
      return s;
    }));
  };

  // Filtered session list based on search query
  const filteredSessions = sessions.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.draft.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.messages.some(m => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-900" id="technova-main-layout">
      {/* Sidebar navigation */}
      <div
        className={`flex flex-col border-r border-slate-200 bg-white/80 backdrop-blur-xl transition-all duration-300 ease-in-out ${
          isSidebarOpen ? "w-72" : "w-0 overflow-hidden"
        }`}
        id="technova-sidebar"
      >
        <div className="flex items-center justify-between p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm shadow-indigo-200/50">
              <Sparkles className="h-4 w-4" />
            </div>
            <h1 className="text-lg font-display font-bold tracking-tight text-slate-900">TechNova</h1>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        {/* New chat action */}
        <div className="px-4 pb-4">
          <button
            onClick={handleNewSession}
            className="flex w-full items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-indigo-200 hover:from-indigo-700 hover:to-indigo-800 transition-all cursor-pointer hover:shadow focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            New Conversation
          </button>
        </div>

        {/* Search filter */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute top-2 left-3 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md bg-gray-50 py-1.5 pl-8 pr-3 text-xs placeholder-gray-400 focus:bg-white focus:ring-1 focus:ring-black focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* List of chat sessions */}
        <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {filteredSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <p className="text-xs text-gray-400">No conversations</p>
            </div>
          ) : (
            filteredSessions.map((session) => {
              const isActive = session.id === activeSessionId;
              const hasDraft = session.draft.trim().length > 0;

              return (
                <div
                  key={session.id}
                  onClick={() => {
                    if (editingSessionId !== session.id) {
                      setActiveSessionId(session.id);
                    }
                  }}
                  className={`group relative flex flex-col rounded-xl p-3 text-left transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-gradient-to-r from-indigo-50 to-white text-indigo-950 border border-indigo-100 shadow-sm"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    {editingSessionId === session.id ? (
                      <input
                        type="text"
                        value={editTitleText}
                        onChange={(e) => setEditTitleText(e.target.value)}
                        onBlur={() => saveSessionTitle(session.id)}
                        onKeyDown={(e) => handleTitleKeyDown(e, session.id)}
                        className="w-full rounded border border-indigo-300 bg-white px-1.5 py-0.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="truncate text-sm font-medium leading-tight flex-1 font-display">
                        {session.title}
                      </span>
                    )}

                    {/* Actions panel */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {editingSessionId !== session.id && (
                        <button
                          onClick={(e) => startEditingSession(session, e)}
                          className="text-gray-400 hover:text-black"
                          title="Rename"
                        >
                          <FileEdit className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        className="text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Subtitle / Draft preview */}
                  <div className="mt-1.5 flex items-center justify-between text-[11px]">
                    <span className="truncate max-w-[150px]">
                      {hasDraft ? (
                        <span className="text-amber-600 font-medium bg-amber-50 px-1.5 py-0.5 rounded italic">Draft saved</span>
                      ) : session.messages.length > 0 ? (
                        session.messages[session.messages.length - 1].text
                      ) : (
                        "Empty"
                      )}
                    </span>
                    <span className="flex-shrink-0 opacity-40">
                      {new Date(session.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main chat window container */}
      <div className="flex flex-1 flex-col h-full bg-white overflow-hidden relative shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.03)]" id="technova-chat-area">
        {/* Toggle sidebar button when collapsed */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-5 left-5 z-50 rounded-lg bg-white p-2 shadow-sm border border-slate-200 text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition-all cursor-pointer"
            title="Expand sidebar"
          >
            <PanelLeftOpen className="h-5 w-5" />
          </button>
        )}

        {/* Chat window top header */}
        <header className="flex h-16 items-center justify-between px-8 pl-16 md:pl-8 border-b border-slate-100/50 bg-white/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-800 font-display">
                {activeSession ? activeSession.title : "TechNova"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeSession?.draft ? (
              <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                <span className="h-1.5 w-1.5 bg-amber-500 rounded-full animate-pulse" />
                Draft saved
              </span>
            ) : null}
          </div>
        </header>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-8 space-y-8 bg-gradient-to-b from-white to-slate-50/50">
          {!activeSession || activeSession.messages.length === 0 ? (
            /* Welcome state when empty messages */
            <div className="mx-auto max-w-2xl px-4 py-16 mt-4 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600 mb-6 border border-indigo-200 shadow-inner">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold font-display text-slate-800 tracking-tight mb-2">Hello there.</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mb-10">
                How can I help you today?
              </p>

              {/* Sample suggestion templates */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-left">
                {[
                  {
                    title: "Write an email",
                    desc: "Draft a professional response.",
                    text: "Write a professional email declining a job offer, expressing gratitude."
                  },
                  {
                    title: "Explain a concept",
                    desc: "Understand complex topics.",
                    text: "Explain quantum computing in simple terms."
                  },
                  {
                    title: "Review code",
                    desc: "Find bugs and improve logic.",
                    text: "Review this Python code and suggest improvements for readability."
                  },
                  {
                    title: "Brainstorm ideas",
                    desc: "Get creative suggestions.",
                    text: "Give me 5 unique ideas for a hackathon project using AI."
                  }
                ].map((suggest, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleApplySuggestion(suggest.text)}
                    className="group rounded-2xl border border-slate-200 bg-white p-5 text-left hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-100/50 transition-all cursor-pointer"
                  >
                    <span className="block text-sm font-semibold text-slate-800 font-display group-hover:text-indigo-700 transition-colors">{suggest.title}</span>
                    <span className="block mt-1 text-xs text-slate-500 leading-relaxed">{suggest.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-8 pb-8">
              {activeSession.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] text-[15px] leading-relaxed shadow-sm border ${
                      msg.sender === "user"
                        ? "bg-gradient-to-br from-slate-800 to-slate-900 text-white px-5 py-3.5 rounded-2xl rounded-tr-sm border-transparent"
                        : "bg-white text-slate-800 px-5 py-4 rounded-2xl rounded-tl-sm border-slate-100"
                    }`}
                  >
                    {msg.sender === "model" ? (
                      <Markdown content={msg.text} />
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    )}
                  </div>
                </div>
              ))}

              {/* Streaming AI text representation */}
              {isGenerating && streamedText && (
                <div className="flex flex-col items-start">
                  <div className="max-w-[85%] text-[15px] leading-relaxed bg-white border border-slate-100 text-slate-800 px-5 py-4 rounded-2xl rounded-tl-sm shadow-sm">
                    <Markdown content={streamedText} />
                    <div className="mt-3 flex items-center gap-2 text-xs text-indigo-400 font-medium">
                      <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
                      <span>TechNova is thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Loader only without response text yet */}
              {isGenerating && !streamedText && (
                <div className="flex flex-col items-start">
                  <div className="max-w-[85%] text-sm text-slate-400 bg-white border border-slate-100 px-5 py-4 rounded-2xl rounded-tl-sm flex items-center gap-2 shadow-sm">
                    <span className="flex gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                    <span className="ml-1 font-medium">Processing...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Bottom chat control bar */}
        <footer className="p-4 md:px-8 pb-6 bg-gradient-to-t from-white via-white to-transparent">
          <div className="mx-auto max-w-3xl relative">
            <form onSubmit={handleSendMessage} className="relative">
              <div className="relative shadow-sm rounded-2xl bg-white border border-slate-200 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-50 transition-all duration-300">
                <textarea
                  value={inputMessage}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Message TechNova..."
                  className="w-full min-h-[56px] max-h-[200px] resize-none rounded-2xl bg-transparent py-4 pl-5 pr-14 text-[15px] text-slate-800 placeholder-slate-400 focus:outline-none"
                  rows={1}
                  disabled={!activeSession}
                />

                {/* Submit / Cancel actions embedded */}
                <div className="absolute right-2.5 bottom-2.5">
                  {isGenerating ? (
                    <button
                      type="button"
                      onClick={handleStopGeneration}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-white hover:bg-slate-700 transition-colors cursor-pointer shadow-sm"
                      title="Stop generation"
                    >
                      <Square className="h-3.5 w-3.5 fill-current" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!inputMessage.trim() || !activeSession}
                      className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all cursor-pointer ${
                        inputMessage.trim() && activeSession
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-0.5"
                          : "bg-slate-100 text-slate-300 cursor-not-allowed"
                      }`}
                    >
                      <Send className="h-4 w-4 ml-0.5" />
                    </button>
                  )}
                </div>
              </div>
            </form>
            <div className="text-center mt-3 text-xs text-slate-400">
              TechNova is an AI and can make mistakes. Consider verifying important information.
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
