import React, { useState, useEffect, useRef } from "react";
import { GoogleGenAI } from "@google/genai";
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
  HelpCircle,
  Copy,
  Download,
  X,
  Zap,
  CheckCircle2,
  Layers,
  Bot,
  User,
  ShieldCheck,
  Terminal,
  Cpu,
  Eraser,
  Key
} from "lucide-react";
import { Message, ChatSession } from "./types";
import Markdown from "./components/Markdown";

// Client-side fallback generator for static host deployments (like GitHub Pages) where Node Express backend API is not available
async function generateStreamClientSide(
  messages: Message[],
  onChunk: (accumulatedText: string) => void,
  userCustomKey?: string,
  signal?: AbortSignal
): Promise<string> {
  const env = (import.meta as any).env || {};
  const apiKey = userCustomKey?.trim() || env.VITE_API_KEY || env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GitHub Pages is a static file host without a backend server.\n\n" +
      "To use AI on GitHub Pages:\n" +
      "1. Click the 'API Key' (🔑) button in the top right header.\n" +
      "2. Enter your Gemini API key (it will be saved safely in your browser's localStorage).\n\n" +
      "Or use this app in AI Studio where the server backend manages the API key automatically with zero setup!"
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  const formattedContents = messages.map(m => ({
    role: m.sender === "user" ? "user" : "model",
    parts: [{ text: m.text }]
  }));

  const responseStream = await ai.models.generateContentStream({
    model: "gemini-3.6-flash",
    contents: formattedContents,
    config: {
      systemInstruction: "You are TechNova AI, a helpful, friendly, and intelligent chat assistant. Respond clearly and format your output beautifully in clean markdown.",
    }
  });

  let accumulated = "";
  for await (const chunk of responseStream) {
    if (signal?.aborted) {
      break;
    }
    if (chunk.text) {
      accumulated += chunk.text;
      onChunk(accumulated);
    }
  }

  return accumulated;
}

// Initial default sessions with formal enterprise topics
const DEFAULT_SESSIONS: ChatSession[] = [
  {
    id: "session-1",
    title: "RESTful API Architecture",
    draft: "How can I design a clean, RESTful API endpoint with rate limiting for...",
    messages: [
      {
        id: "m1",
        sender: "user",
        text: "I want to draft a technical guide on REST API best practices for our engineering team.",
        timestamp: new Date(Date.now() - 3600000 * 2).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      },
      {
        id: "m2",
        sender: "model",
        text: "Designing clean, scalable RESTful APIs is crucial for long-term architecture. Here are key pillars for your guide:\n\n1. **Resource Nouns**: Use plural nouns for endpoints (e.g., `/api/v1/services` instead of `/api/v1/getServices`).\n2. **HTTP Verbs**: Reserve `GET`, `POST`, `PUT`, `PATCH`, and `DELETE` for exact state operations.\n3. **Structured Errors**: Return standardized JSON error envelopes with code, message, and error trace.\n4. **Idempotency & Rate Limiting**: Include `X-RateLimit` headers and idempotency keys for transaction safety.",
        timestamp: new Date(Date.now() - 3600000 * 2 + 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ],
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: "session-2",
    title: "Executive Q3 Strategy Brief",
    draft: "Key strategic objectives:\n- Product feature roadmap alignment\n- Infrastructure optimization\n- ",
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
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((s: any, idx: number) => ({
            id: s?.id || `session-${Date.now()}-${idx}`,
            title: s?.title || "New AI Conversation",
            draft: typeof s?.draft === "string" ? s.draft : "",
            messages: Array.isArray(s?.messages)
              ? s.messages.map((m: any, mIdx: number) => ({
                  id: m?.id || `msg-${mIdx}`,
                  sender: m?.sender === "user" ? "user" : "model",
                  text: typeof m?.text === "string" ? m.text : "",
                  timestamp: m?.timestamp || "",
                }))
              : [],
            createdAt: s?.createdAt || new Date().toISOString(),
            updatedAt: s?.updatedAt || new Date().toISOString(),
          }));
        }
      } catch (e) {
        console.error("Failed to parse sessions from localStorage", e);
      }
    }
    return DEFAULT_SESSIONS;
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const savedActive = localStorage.getItem("technova_active_id");
    const savedSessions = localStorage.getItem("technova_sessions");
    let currentSessions = DEFAULT_SESSIONS;
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        if (Array.isArray(parsed) && parsed.length > 0) {
          currentSessions = parsed;
        }
      } catch (_) {}
    }
    if (savedActive && currentSessions.some(s => s.id === savedActive)) {
      return savedActive;
    }
    return currentSessions[0]?.id || "";
  });

  const [inputMessage, setInputMessage] = useState("");
  const [loadedSessionId, setLoadedSessionId] = useState<string | null>(null);
  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    return localStorage.getItem("technova_custom_api_key") || "";
  });
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [keyInputText, setKeyInputText] = useState("");
  const [sessionToDelete, setSessionToDelete] = useState<ChatSession | null>(null);

  const handleSaveApiKey = () => {
    const trimmed = keyInputText.trim();
    if (trimmed) {
      localStorage.setItem("technova_custom_api_key", trimmed);
      setCustomApiKey(trimmed);
      showToast("API Key saved for browser mode!");
    } else {
      localStorage.removeItem("technova_custom_api_key");
      setCustomApiKey("");
      showToast("API Key cleared!");
    }
    setIsKeyModalOpen(false);
  };
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitleText, setEditTitleText] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // SSE loading and streaming states
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

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

  // Handle clear draft manually
  const handleClearDraft = () => {
    setInputMessage("");
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          draft: "",
          updatedAt: new Date().toISOString()
        };
      }
      return s;
    }));
    showToast("Draft cleared");
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
    showToast("Created new conversation");
  };

  // Open delete confirmation modal for a specific session
  const handleDeleteSession = (session: ChatSession, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSessionToDelete(session);
  };

  // Perform actual confirmed session deletion
  const confirmDeleteSession = () => {
    if (!sessionToDelete) return;
    const targetId = sessionToDelete.id;
    const remaining = sessions.filter(s => s.id !== targetId);
    setSessions(remaining);

    if (activeSessionId === targetId) {
      if (remaining.length > 0) {
        setActiveSessionId(remaining[0].id);
        setInputMessage(remaining[0].draft || "");
      } else {
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
        setInputMessage("");
      }
    }
    setSessionToDelete(null);
    showToast("Session deleted successfully");
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

  // Export current session as Markdown file
  const handleExportChat = () => {
    if (!activeSession) return;
    let exportText = `# ${activeSession.title}\n\n*Exported on ${new Date().toLocaleString()}*\n\n---\n\n`;
    activeSession.messages.forEach((m) => {
      const senderLabel = m.sender === "user" ? "### 👤 User" : "### 🤖 TechNova AI";
      exportText += `${senderLabel} *(${m.timestamp})*\n\n${m.text}\n\n---\n\n`;
    });

    const blob = new Blob([exportText], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeSession.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_chat.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Exported chat to Markdown");
  };

  // Copy text to clipboard
  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("Copied to clipboard");
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
    const currentMessages = activeSession ? [...(activeSession.messages || []), userMessage] : [userMessage];

    // Clear input state and draft
    setInputMessage("");
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          draft: "",
          messages: currentMessages,
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

    let accumulatedResponse = "";

    try {
      let response: Response | null = null;
      let isStaticHost = false;

      try {
        response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: currentMessages }),
          signal: controller.signal
        });

        if (response.status === 405 || response.status === 404) {
          isStaticHost = true;
        }
      } catch (netErr: any) {
        if (netErr.name === "AbortError") throw netErr;
        isStaticHost = true;
      }

      if (isStaticHost || !response || !response.ok) {
        if (isStaticHost || (response && (response.status === 405 || response.status === 404))) {
          // Client-side direct generation for static hosts (GitHub Pages)
          accumulatedResponse = await generateStreamClientSide(
            currentMessages,
            (text) => setStreamedText(text),
            customApiKey,
            controller.signal
          );
        } else {
          throw new Error(`HTTP error! status: ${response?.status}`);
        }
      } else {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder("utf-8");
        if (!reader) throw new Error("No response body reader.");

        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

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
        const stoppedMessage: Message = {
          id: `msg-${Date.now() + 1}`,
          sender: "model",
          text: streamedText + "\n\n*(Generation stopped by user)*",
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
          text: `⚠️ **Response Error:** ${err.message || "An unexpected system error occurred."}`,
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

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleApplySuggestion = (text: string) => {
    setInputMessage(text);
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

  const filteredSessions = sessions.filter(s => {
    const title = s?.title || "";
    const draft = s?.draft || "";
    const msgs = Array.isArray(s?.messages) ? s.messages : [];
    const query = searchQuery.toLowerCase();
    return (
      title.toLowerCase().includes(query) ||
      draft.toLowerCase().includes(query) ||
      msgs.some(m => (m?.text || "").toLowerCase().includes(query))
    );
  });

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-900 font-sans text-slate-100 antialiased" id="technova-main-layout">
      {/* Toast Popup Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-slate-800/95 px-4 py-2.5 text-xs font-semibold text-white shadow-xl shadow-slate-950/50 border border-slate-700/80 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Dark Formal Executive Sidebar */}
      <div
        className={`flex flex-col border-r border-slate-800/90 bg-slate-950 text-slate-300 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? "w-80" : "w-0 overflow-hidden"
        }`}
        id="technova-sidebar"
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-violet-700 text-white shadow-lg shadow-indigo-500/25 ring-2 ring-indigo-400/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-display font-bold tracking-tight text-white">TechNova</h1>
                <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-400 border border-indigo-500/20">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">Enterprise AI Client</p>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        {/* Primary Action */}
        <div className="p-4 pb-3">
          <button
            onClick={handleNewSession}
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/50 hover:from-indigo-500 hover:via-violet-500 hover:to-purple-500 transition-all duration-200 cursor-pointer hover:shadow-indigo-500/20 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4 transition-transform group-hover:rotate-90 duration-200" />
            <span>New Conversation</span>
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute top-2.5 left-3 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search conversations & drafts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg bg-slate-900/80 border border-slate-800 py-2 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:bg-slate-900 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/80 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute top-2.5 right-3 text-slate-500 hover:text-slate-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Conversations List Header */}
        <div className="px-5 py-2 flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          <span>Recent Workspaces</span>
          <span className="text-slate-600 font-mono">{filteredSessions.length}</span>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto px-3 space-y-1 py-1">
          {filteredSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <MessageSquare className="h-8 w-8 text-slate-700 mb-2" />
              <p className="text-xs text-slate-500">No matching conversations found</p>
            </div>
          ) : (
            filteredSessions.map((session) => {
              const isActive = session.id === activeSessionId;
              const hasDraft = session.draft.trim().length > 0;
              const messageCount = (session.messages || []).length;

              return (
                <div
                  key={session.id}
                  onClick={() => {
                    if (editingSessionId !== session.id) {
                      setActiveSessionId(session.id);
                    }
                  }}
                  className={`group relative flex flex-col rounded-xl p-3 text-left transition-all duration-200 cursor-pointer border ${
                    isActive
                      ? "bg-gradient-to-r from-indigo-950/80 to-slate-900 text-white border-indigo-500/40 shadow-md shadow-indigo-950/60"
                      : "text-slate-400 border-transparent hover:bg-slate-900/80 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className={`h-2 w-2 rounded-full flex-shrink-0 ${
                        isActive ? "bg-indigo-400 shadow-sm shadow-indigo-400" : "bg-slate-700"
                      }`} />
                      {editingSessionId === session.id ? (
                        <input
                          type="text"
                          value={editTitleText}
                          onChange={(e) => setEditTitleText(e.target.value)}
                          onBlur={() => saveSessionTitle(session.id)}
                          onKeyDown={(e) => handleTitleKeyDown(e, session.id)}
                          className="w-full rounded border border-indigo-500 bg-slate-900 px-2 py-0.5 text-xs text-white focus:outline-none"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="truncate text-xs font-semibold leading-tight font-display text-slate-200 group-hover:text-white">
                          {session.title}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {editingSessionId !== session.id && (
                        <button
                          onClick={(e) => startEditingSession(session, e)}
                          className="p-1 text-slate-500 hover:text-slate-200 rounded"
                          title="Rename"
                        >
                          <FileEdit className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDeleteSession(session, e)}
                        className="p-1 text-slate-500 hover:text-rose-400 rounded"
                        title="Delete Session"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Subtitle / Draft preview */}
                  <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span className="truncate max-w-[170px]">
                      {hasDraft ? (
                        <span className="inline-flex items-center gap-1 text-amber-400 font-sans font-medium bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 text-[10px]">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                          Draft saved
                        </span>
                      ) : messageCount > 0 ? (
                        <span className="text-slate-400 font-sans truncate">
                          {session.messages[session.messages.length - 1].text}
                        </span>
                      ) : (
                        <span className="text-slate-600 font-sans italic">Empty session</span>
                      )}
                    </span>
                    <span className="flex-shrink-0 text-[10px] text-slate-600">
                      {new Date(session.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
            <span className="font-mono text-[11px]">Gemini 3.6 Flash</span>
          </div>
          <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 border border-slate-700">
            Auto-Sync
          </span>
        </div>
      </div>

      {/* Main Workspace Canvas */}
      <div className="flex flex-1 flex-col h-full bg-slate-50 text-slate-900 overflow-hidden relative shadow-2xl" id="technova-chat-area">
        {/* Toggle sidebar button when collapsed */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-4 left-4 z-50 rounded-xl bg-slate-900 text-white p-2.5 shadow-lg border border-slate-800 hover:bg-slate-800 transition-all cursor-pointer"
            title="Expand sidebar"
          >
            <PanelLeftOpen className="h-5 w-5" />
          </button>
        )}

        {/* Executive Workspace Header */}
        <header className="flex h-16 items-center justify-between px-6 pl-16 md:pl-8 border-b border-slate-200/80 bg-white/90 backdrop-blur-md z-10 shadow-xs">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold text-slate-900 font-display tracking-tight">
                  {activeSession ? activeSession.title : "TechNova Workspace"}
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {activeSession?.draft && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                  <span className="h-2 w-2 bg-amber-500 rounded-full animate-pulse" />
                  Draft Auto-Saved
                </span>
                <button
                  onClick={handleClearDraft}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Clear draft"
                >
                  <Eraser className="h-4 w-4" />
                </button>
              </div>
            )}

            {activeSession && (activeSession.messages || []).length > 0 && (
              <button
                onClick={handleExportChat}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer border border-slate-200"
                title="Export session to Markdown"
              >
                <Download className="h-3.5 w-3.5 text-slate-600" />
                <span>Export</span>
              </button>
            )}

            {activeSession && (
              <button
                onClick={() => handleDeleteSession(activeSession)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer border border-rose-200"
                title="Delete this chat session"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}

            <button
              onClick={() => {
                setKeyInputText(customApiKey);
                setIsKeyModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer border border-slate-200"
              title="API Key Settings (for static browser mode)"
            >
              <Key className="h-3.5 w-3.5 text-indigo-600" />
              <span>{customApiKey ? "Key Set" : "API Key"}</span>
            </button>
          </div>
        </header>

        {/* Conversation Stream Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-10 space-y-8 bg-slate-50/50">
          {!activeSession || !activeSession.messages || activeSession.messages.length === 0 ? (
            /* Vibrant Executive Welcome State */
            <div className="mx-auto max-w-3xl px-4 py-8 mt-2 text-center">
              <div className="relative inline-flex mb-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 text-white shadow-xl shadow-indigo-500/25 ring-4 ring-indigo-100">
                  <Sparkles className="h-8 w-8" />
                </div>
              </div>

              <h3 className="text-3xl font-extrabold font-display text-slate-900 tracking-tight mb-3">
                Welcome to TechNova AI
              </h3>
              <p className="text-sm text-slate-600 max-w-lg mx-auto mb-8 leading-relaxed font-normal">
                Your high-performance enterprise AI chat client. Features automatic draft saving across conversation sessions, code synthesis, and structured reasoning.
              </p>

              {/* Status Pills */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-10 text-xs font-semibold text-slate-600">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 shadow-xs border border-slate-200">
                  <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
                  Draft Auto-Persistence
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 shadow-xs border border-slate-200">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  Real-time Streaming
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 shadow-xs border border-slate-200">
                  <Cpu className="h-3.5 w-3.5 text-emerald-600" />
                  Gemini 3.6 Flash
                </span>
              </div>

              {/* Prompt Suggestion Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-left">
                {[
                  {
                    title: "Architecture & Code",
                    badge: "ENGINEERING",
                    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
                    icon: <Terminal className="h-4 w-4 text-indigo-600" />,
                    text: "Design a clean RESTful microservices architecture with rate limiting and SSE streaming."
                  },
                  {
                    title: "Executive Email",
                    badge: "COMMUNICATION",
                    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
                    icon: <Layers className="h-4 w-4 text-purple-600" />,
                    text: "Draft a formal project update for leadership highlighting key milestones and risks."
                  },
                  {
                    title: "Strategic SWOT Brief",
                    badge: "STRATEGY",
                    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
                    icon: <Zap className="h-4 w-4 text-emerald-600" />,
                    text: "Conduct a comprehensive SWOT analysis for deploying an enterprise AI assistant."
                  },
                  {
                    title: "Code Review & Refactor",
                    badge: "ANALYSIS",
                    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
                    icon: <ShieldCheck className="h-4 w-4 text-amber-600" />,
                    text: "Review TypeScript code for potential memory leaks and performance bottlenecks."
                  }
                ].map((suggest, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleApplySuggestion(suggest.text)}
                    className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-xs hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-200 cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 rounded-xl bg-slate-50 group-hover:bg-indigo-50 transition-colors">
                          {suggest.icon}
                        </div>
                        <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-md border ${suggest.badgeClass}`}>
                          {suggest.badge}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 font-display group-hover:text-indigo-600 transition-colors">
                        {suggest.title}
                      </h4>
                      <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                        {suggest.text}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Use this template</span>
                      <Plus className="h-3.5 w-3.5" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-6 pb-8">
              {activeSession.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${
                    msg.sender === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {/* Sender Avatar */}
                  <div
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl shadow-sm text-xs font-bold ${
                      msg.sender === "user"
                        ? "bg-slate-900 text-white ring-2 ring-slate-800"
                        : "bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 text-white ring-2 ring-indigo-200"
                    }`}
                  >
                    {msg.sender === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>

                  {/* Message Bubble Container */}
                  <div
                    className={`group relative max-w-[88%] rounded-2xl p-5 shadow-sm transition-all ${
                      msg.sender === "user"
                        ? "bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-tr-xs"
                        : "bg-white text-slate-800 border-t-2 border-t-indigo-500 border-x border-b border-slate-200/80 rounded-tl-xs"
                    }`}
                  >
                    {/* Header bar inside model message */}
                    {msg.sender === "model" && (
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 text-xs text-slate-400">
                        <div className="flex items-center gap-1.5 font-semibold text-indigo-600 font-display">
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>TechNova AI</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[11px] text-slate-400">{msg.timestamp}</span>
                          <button
                            onClick={() => handleCopyText(msg.text)}
                            className="p-1 hover:text-indigo-600 transition-colors"
                            title="Copy response"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Content */}
                    {msg.sender === "model" ? (
                      <Markdown content={msg.text} />
                    ) : (
                      <div>
                        <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{msg.text}</p>
                        <div className="mt-2 text-right text-[10px] text-slate-400 font-mono">
                          {msg.timestamp}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Streaming state UI */}
              {isGenerating && streamedText && (
                <div className="flex items-start gap-3 flex-row">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 text-white ring-2 ring-indigo-200 shadow-sm">
                    <Bot className="h-4 w-4 animate-pulse" />
                  </div>
                  <div className="max-w-[88%] rounded-2xl rounded-tl-xs p-5 bg-white border-t-2 border-t-indigo-500 border-x border-b border-slate-200/80 shadow-sm">
                    <Markdown content={streamedText} />
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-indigo-600 font-semibold">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-indigo-600 animate-ping" />
                        <span>Generating response...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Streaming loading indicator before first token */}
              {isGenerating && !streamedText && (
                <div className="flex items-start gap-3 flex-row">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 text-white ring-2 ring-indigo-200 shadow-sm">
                    <Bot className="h-4 w-4 animate-spin" />
                  </div>
                  <div className="rounded-2xl rounded-tl-xs px-5 py-4 bg-white border border-slate-200 shadow-sm flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-xs font-semibold text-slate-600 font-display">TechNova is processing...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Control Box */}
        <footer className="p-4 md:px-10 pb-6 bg-gradient-to-t from-white via-white/90 to-transparent">
          <div className="mx-auto max-w-3xl relative">
            <form onSubmit={handleSendMessage} className="relative">
              <div className="relative shadow-md rounded-2xl bg-white border border-slate-300 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all duration-200">
                
                {/* Draft Badge Bar inside text area */}
                {inputMessage.trim() && (
                  <div className="px-4 pt-2.5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span className="inline-flex items-center gap-1 text-amber-600 font-sans font-semibold">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Auto-saving draft
                    </span>
                    <span>{inputMessage.length} characters</span>
                  </div>
                )}

                <textarea
                  value={inputMessage}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Ask TechNova AI anything or type a prompt... (Shift+Enter for new line)"
                  className="w-full min-h-[64px] max-h-[220px] resize-none rounded-2xl bg-transparent py-3.5 pl-5 pr-16 text-[15px] text-slate-800 placeholder-slate-400 focus:outline-none"
                  rows={2}
                  disabled={!activeSession}
                />

                {/* Control Action Buttons */}
                <div className="absolute right-3 bottom-3 flex items-center gap-2">
                  {isGenerating ? (
                    <button
                      type="button"
                      onClick={handleStopGeneration}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer shadow-md"
                      title="Stop generation"
                    >
                      <Square className="h-4 w-4 fill-current" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!inputMessage.trim() || !activeSession}
                      className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all cursor-pointer ${
                        inputMessage.trim() && activeSession
                          ? "bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5"
                          : "bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200"
                      }`}
                      title="Send message"
                    >
                      <Send className="h-4 w-4 ml-0.5" />
                    </button>
                  )}
                </div>
              </div>
            </form>

            <div className="flex items-center justify-between text-center mt-3 text-[11px] text-slate-400 px-1">
              <span>TechNova AI Assistant • Powered by Gemini 3.6 Flash</span>
              <span>Drafts are saved automatically in session memory</span>
            </div>
          </div>
        </footer>
      </div>

      {/* API Key Modal for Static Deployments */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <Key className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Gemini API Key</h3>
                  <p className="text-xs text-slate-500">For Browser & Static Deployments</p>
                </div>
              </div>
              <button
                onClick={() => setIsKeyModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 leading-relaxed border border-slate-200/80">
                <p className="font-semibold text-slate-800 mb-1">How AI Studio API Keys Work:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong>AI Studio / Cloud Run:</strong> No key needed! The server backend handles authentication automatically.</li>
                  <li><strong>GitHub Pages:</strong> Since GitHub Pages is static and has no backend server, enter your key below to use Gemini directly in your browser.</li>
                </ul>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Your Gemini API Key
                </label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={keyInputText}
                  onChange={(e) => setKeyInputText(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              {customApiKey ? (
                <button
                  onClick={() => {
                    setKeyInputText("");
                    handleSaveApiKey();
                  }}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                >
                  Clear Saved Key
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsKeyModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveApiKey}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20"
                >
                  Save Key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Session Confirmation Modal */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Delete Session</h3>
                  <p className="text-xs text-slate-500">Confirm workspace deletion</p>
                </div>
              </div>
              <button
                onClick={() => setSessionToDelete(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <p className="text-sm text-slate-700 leading-relaxed">
                Are you sure you want to delete <span className="font-bold text-slate-900">"{sessionToDelete.title}"</span>?
              </p>
              <div className="text-xs text-slate-500 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 leading-relaxed">
                This action will permanently remove all message history ({(sessionToDelete.messages || []).length} messages), saved drafts, and session data.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                onClick={() => setSessionToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteSession}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 transition-colors inline-flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Session</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
