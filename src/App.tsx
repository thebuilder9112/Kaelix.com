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
  Sun,
  Moon,
  Settings,
  Palette,
  Type,
  Paintbrush
} from "lucide-react";
import { Message, ChatSession } from "./types";
import Markdown from "./components/Markdown";

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
    const saved = localStorage.getItem("kaelix_sessions") || localStorage.getItem("technova_sessions");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((s: any, idx: number) => ({
            id: s?.id || `session-${Date.now()}-${idx}`,
            title: typeof s?.title === "string" ? s.title.replace(/TechNova/gi, "Kaelix") : "New AI Conversation",
            draft: typeof s?.draft === "string" ? s.draft.replace(/TechNova/gi, "Kaelix") : "",
            messages: Array.isArray(s?.messages)
              ? s.messages.map((m: any, mIdx: number) => ({
                  id: m?.id || `msg-${mIdx}`,
                  sender: m?.sender === "user" ? "user" : "model",
                  text: typeof m?.text === "string" ? m.text.replace(/TechNova/gi, "Kaelix") : "",
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
    const savedActive = localStorage.getItem("kaelix_active_id") || localStorage.getItem("technova_active_id");
    const savedSessions = localStorage.getItem("kaelix_sessions") || localStorage.getItem("technova_sessions");
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
  const [sessionToDelete, setSessionToDelete] = useState<ChatSession | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitleText, setEditTitleText] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Theme & Appearance Customization State
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const savedTheme = localStorage.getItem("kaelix_theme");
    return savedTheme === "light" || savedTheme === "dark" ? savedTheme : "dark";
  });

  const [accentColor, setAccentColor] = useState<"indigo" | "emerald" | "violet" | "rose" | "amber" | "cyan">(() => {
    const saved = localStorage.getItem("kaelix_accent");
    return ["indigo", "emerald", "violet", "rose", "amber", "cyan"].includes(saved as any) ? (saved as any) : "indigo";
  });

  const [bgTheme, setBgTheme] = useState<"slate" | "navy" | "forest" | "obsidian" | "zinc">(() => {
    const saved = localStorage.getItem("kaelix_bg_theme");
    return ["slate", "navy", "forest", "obsidian", "zinc"].includes(saved as any) ? (saved as any) : "slate";
  });

  const [fontFamily, setFontFamily] = useState<"sans" | "serif" | "mono">(() => {
    const saved = localStorage.getItem("kaelix_font");
    return ["sans", "serif", "mono"].includes(saved as any) ? (saved as any) : "sans";
  });

  useEffect(() => {
    localStorage.setItem("kaelix_theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("kaelix_accent", accentColor);
  }, [accentColor]);

  useEffect(() => {
    localStorage.setItem("kaelix_bg_theme", bgTheme);
  }, [bgTheme]);

  useEffect(() => {
    localStorage.setItem("kaelix_font", fontFamily);
  }, [fontFamily]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      showToast(`Switched to ${next === "dark" ? "Dark" : "Light"} theme`);
      return next;
    });
  };

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
    localStorage.setItem("kaelix_sessions", JSON.stringify(sessions));
  }, [sessions]);

  // Sync active session ID to local storage
  useEffect(() => {
    localStorage.setItem("kaelix_active_id", activeSessionId);
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
      const senderLabel = m.sender === "user" ? "### 👤 User" : "### 🤖 Kaelix AI";
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

    const effectiveApiKey =
      import.meta.env.VITE_API_KEY ||
      import.meta.env.VITE_GEMINI_API_KEY ||
      (window as any).VITE_API_KEY ||
      (window as any).GEMINI_API_KEY;

    let accumulatedResponse = "";

    try {
      let response: Response | null = null;
      let isServerStreamSuccess = false;
      let isStaticHost = false;

      try {
        response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: currentMessages,
          }),
          signal: controller.signal
        });

        if (response && response.ok) {
          isServerStreamSuccess = true;
        } else if (response && (response.status === 405 || response.status === 404)) {
          isStaticHost = true;
        }
      } catch (fetchErr) {
        console.warn("Direct fetch /api/chat failed:", fetchErr);
        isStaticHost = true;
      }

      if (isServerStreamSuccess && response) {
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

            let streamItem: any = null;
            try {
              streamItem = JSON.parse(dataStr);
            } catch (err) {
              console.error("Error parsing JSON chunk:", err, dataStr);
              continue;
            }

            if (streamItem?.error) {
              throw new Error(streamItem.error);
            }

            if (streamItem?.text) {
              accumulatedResponse += streamItem.text;
              setStreamedText(accumulatedResponse);
            }
          }
        }
      } else {
        // Fallback to client-side GoogleGenAI SDK (For static deployments like GitHub Pages or when server is unavailable)
        if (effectiveApiKey) {
          console.log("Using client-side Gemini SDK fallback...");
          const { GoogleGenAI } = await import("@google/genai");
          const ai = new GoogleGenAI({ apiKey: effectiveApiKey });
          const formattedContents = currentMessages.map((msg) => ({
            role: msg.sender === "user" ? "user" : "model",
            parts: [{ text: msg.text }],
          }));

          const responseStream = await ai.models.generateContentStream({
            model: "gemini-3.6-flash",
            contents: formattedContents,
            config: {
              systemInstruction: "You are Kaelix AI, a helpful, friendly, and intelligent chat assistant. If anyone asks who created, built, made, or owns this AI, you must always answer that Aum Chauhan and Tirth Pandya made it. Respond clearly and format your output beautifully in clean markdown.",
            },
          });

          for await (const chunk of responseStream) {
            if (chunk.text) {
              accumulatedResponse += chunk.text;
              setStreamedText(accumulatedResponse);
            }
          }
        } else {
          let serverErrorMessage = "";
          if (response) {
            try {
              const errJson = await response.json();
              if (errJson?.error) serverErrorMessage = errJson.error;
            } catch (e) {
              serverErrorMessage = `HTTP error! status: ${response.status}`;
            }
          }
          throw new Error(serverErrorMessage || "VITE_API_KEY environment variable is missing. Please add VITE_API_KEY to your repository secrets and rebuild.");
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
        const errText = err?.message || "An unexpected system error occurred.";

        const errorMessage: Message = {
          id: `msg-${Date.now() + 1}`,
          sender: "model",
          text: `⚠️ **Response Error:** ${errText}`,
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

  const fontClass = fontFamily === "mono" ? "font-mono" : fontFamily === "serif" ? "font-serif" : "font-sans";

  const getBgThemeClass = () => {
    if (theme === "dark") {
      switch (bgTheme) {
        case "navy": return "bg-slate-950 bg-gradient-to-b from-slate-950 via-blue-950/40 to-slate-950 text-slate-100";
        case "forest": return "bg-slate-950 bg-gradient-to-b from-slate-950 via-emerald-950/30 to-slate-950 text-slate-100";
        case "obsidian": return "bg-slate-950 bg-gradient-to-b from-slate-950 via-purple-950/30 to-slate-950 text-slate-100";
        case "zinc": return "bg-zinc-900 text-zinc-100";
        default: return "bg-slate-900 text-slate-100";
      }
    } else {
      switch (bgTheme) {
        case "navy": return "bg-blue-50/50 text-slate-900";
        case "forest": return "bg-emerald-50/40 text-slate-900";
        case "obsidian": return "bg-purple-50/40 text-slate-900";
        case "zinc": return "bg-zinc-100/70 text-zinc-900";
        default: return "bg-slate-50 text-slate-900";
      }
    }
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden antialiased transition-colors duration-300 ${fontClass} ${
      theme === "dark" ? "bg-slate-950 text-slate-100" : "bg-slate-100 text-slate-900"
    }`} id="kaelix-main-layout">
      {/* Toast Popup Notification */}
      {toastMessage && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold shadow-xl border backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200 ${
          theme === "dark"
            ? "bg-slate-800/95 text-white shadow-slate-950/50 border-slate-700/80"
            : "bg-white/95 text-slate-900 shadow-slate-300/50 border-slate-200"
        }`}>
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sidebar */}
      <div
        className={`flex flex-col border-r transition-all duration-300 ease-in-out ${
          theme === "dark"
            ? "bg-slate-950 border-slate-800/90 text-slate-300"
            : "bg-slate-900 border-slate-800 text-slate-200"
        } ${
          isSidebarOpen ? "w-80" : "w-0 overflow-hidden"
        }`}
        id="kaelix-sidebar"
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800/60">
          <button
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className="flex items-center gap-3 cursor-pointer group text-left focus:outline-none"
            title="Toggle sidebar"
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-600 to-violet-700 text-white shadow-lg shadow-indigo-500/25 ring-2 ring-indigo-400/30 flex-shrink-0 group-hover:scale-105 transition-transform">
              <img
                src="/kaelix-logo.jpg"
                alt="Kaelix AI Logo"
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <Sparkles className="h-5 w-5 absolute" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-display font-bold tracking-tight text-white group-hover:text-indigo-300 transition-colors">Kaelix</h1>
              </div>
            </div>
          </button>
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
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            title="Open Settings"
          >
            <Settings className="h-3.5 w-3.5 text-indigo-400" />
            <span>Settings</span>
          </button>
          <button
            onClick={toggleTheme}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} mode`}
          >
            {theme === "dark" ? (
              <>
                <Sun className="h-3.5 w-3.5 text-amber-400" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="h-3.5 w-3.5 text-indigo-400" />
                <span>Dark</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Workspace Canvas */}
      <div className={`flex flex-1 flex-col h-full overflow-hidden relative shadow-2xl transition-colors duration-300 ${getBgThemeClass()}`} id="kaelix-chat-area">
        {/* Toggle sidebar button when collapsed */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className={`absolute top-3.5 left-4 z-50 flex items-center gap-2 rounded-xl p-1.5 pr-3 shadow-lg border transition-all cursor-pointer group ${
              theme === "dark"
                ? "bg-slate-900 text-white border-slate-800 hover:bg-slate-800"
                : "bg-white text-slate-800 border-slate-200 hover:bg-slate-100"
            }`}
            title="Open sidebar"
          >
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-600 to-violet-700 text-white shadow-xs flex-shrink-0 group-hover:scale-105 transition-transform">
              <img
                src="/kaelix-logo.jpg"
                alt="Kaelix AI Logo"
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <Sparkles className="h-4 w-4 absolute" />
            </div>
            <span className="text-xs font-bold font-display tracking-tight hidden sm:inline">Kaelix</span>
            <PanelLeftOpen className="h-4 w-4 text-slate-400 group-hover:text-indigo-400 transition-colors" />
          </button>
        )}

        {/* Executive Workspace Header */}
        <header className={`flex h-16 items-center justify-between px-6 ${
          !isSidebarOpen ? "pl-36 sm:pl-40" : "pl-6"
        } border-b backdrop-blur-md z-10 shadow-xs transition-colors duration-300 ${
          theme === "dark"
            ? "bg-slate-900/90 border-slate-800 text-slate-100"
            : "bg-white/90 border-slate-200 text-slate-900"
        }`}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold font-display tracking-tight">
                {activeSession ? activeSession.title : "Kaelix Workspace"}
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
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
          </div>
        </header>

        {/* Conversation Stream Area */}
        <div className={`flex-1 overflow-y-auto px-4 py-6 md:px-10 space-y-8 transition-colors duration-300 ${
          theme === "dark" ? "bg-slate-900/80 text-slate-100" : "bg-slate-50/50 text-slate-900"
        }`}>
          {!activeSession || !activeSession.messages || activeSession.messages.length === 0 ? (
            /* Vibrant Executive Welcome State */
            <div className="mx-auto max-w-3xl px-4 py-8 mt-2 text-center">
              <div className="relative inline-flex mb-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 text-white shadow-xl shadow-indigo-500/25 ring-4 ring-indigo-500/20">
                  <Sparkles className="h-8 w-8" />
                </div>
              </div>

              <h3 className={`text-3xl font-extrabold font-display tracking-tight mb-3 ${
                theme === "dark" ? "text-white" : "text-slate-900"
              }`}>
                Welcome to Kaelix AI
              </h3>
              <p className={`text-sm max-w-lg mx-auto mb-8 leading-relaxed font-normal ${
                theme === "dark" ? "text-slate-300" : "text-slate-600"
              }`}>
                Your high-performance enterprise AI chat client. Features automatic draft saving across conversation sessions, code synthesis, and structured reasoning.
              </p>

              {/* Status Pills */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-10 text-xs font-semibold">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 shadow-xs border ${
                  theme === "dark"
                    ? "bg-slate-800 text-slate-200 border-slate-700"
                    : "bg-white text-slate-700 border-slate-200"
                }`}>
                  <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
                  Draft Auto-Persistence
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 shadow-xs border ${
                  theme === "dark"
                    ? "bg-slate-800 text-slate-200 border-slate-700"
                    : "bg-white text-slate-700 border-slate-200"
                }`}>
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  Real-time Streaming
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 shadow-xs border ${
                  theme === "dark"
                    ? "bg-slate-800 text-slate-200 border-slate-700"
                    : "bg-white text-slate-700 border-slate-200"
                }`}>
                  <Cpu className="h-3.5 w-3.5 text-emerald-500" />
                  Gemini 3.6 Flash
                </span>
              </div>

              {/* Prompt Suggestion Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-left">
                {[
                  {
                    title: "Architecture & Code",
                    badge: "ENGINEERING",
                    badgeClass: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
                    icon: <Terminal className="h-4 w-4 text-indigo-400" />,
                    text: "Design a clean RESTful microservices architecture with rate limiting and SSE streaming."
                  },
                  {
                    title: "Executive Email",
                    badge: "COMMUNICATION",
                    badgeClass: "bg-purple-500/10 text-purple-400 border-purple-500/20",
                    icon: <Layers className="h-4 w-4 text-purple-400" />,
                    text: "Draft a formal project update for leadership highlighting key milestones and risks."
                  },
                  {
                    title: "Strategic SWOT Brief",
                    badge: "STRATEGY",
                    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                    icon: <Zap className="h-4 w-4 text-emerald-400" />,
                    text: "Conduct a comprehensive SWOT analysis for deploying an enterprise AI assistant."
                  },
                  {
                    title: "Code Review & Refactor",
                    badge: "ANALYSIS",
                    badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
                    icon: <ShieldCheck className="h-4 w-4 text-amber-400" />,
                    text: "Review TypeScript code for potential memory leaks and performance bottlenecks."
                  }
                ].map((suggest, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleApplySuggestion(suggest.text)}
                    className={`group relative flex flex-col justify-between rounded-2xl border p-5 text-left shadow-xs hover:border-indigo-500 hover:shadow-lg transition-all duration-200 cursor-pointer ${
                      theme === "dark"
                        ? "bg-slate-800/80 border-slate-700/80 text-slate-100 hover:shadow-indigo-500/10"
                        : "bg-white border-slate-200 text-slate-900 hover:shadow-indigo-500/10"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className={`p-2 rounded-xl transition-colors ${
                          theme === "dark" ? "bg-slate-700/60 group-hover:bg-indigo-950/60" : "bg-slate-50 group-hover:bg-indigo-50"
                        }`}>
                          {suggest.icon}
                        </div>
                        <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-md border ${suggest.badgeClass}`}>
                          {suggest.badge}
                        </span>
                      </div>
                      <h4 className={`text-sm font-bold font-display group-hover:text-indigo-400 transition-colors ${
                        theme === "dark" ? "text-white" : "text-slate-900"
                      }`}>
                        {suggest.title}
                      </h4>
                      <p className={`mt-1.5 text-xs leading-relaxed ${
                        theme === "dark" ? "text-slate-400" : "text-slate-500"
                      }`}>
                        {suggest.text}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
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
                        : "bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 text-white ring-2 ring-indigo-400/30"
                    }`}
                  >
                    {msg.sender === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>

                  {/* Message Bubble Container */}
                  <div
                    className={`group relative max-w-[88%] rounded-2xl p-5 shadow-sm transition-all ${
                      msg.sender === "user"
                        ? "bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-tr-xs"
                        : theme === "dark"
                          ? "bg-slate-800 text-slate-100 border-t-2 border-t-indigo-500 border-x border-b border-slate-700/80 rounded-tl-xs"
                          : "bg-white text-slate-800 border-t-2 border-t-indigo-500 border-x border-b border-slate-200/80 rounded-tl-xs"
                    }`}
                  >
                    {/* Header bar inside model message */}
                    {msg.sender === "model" && (
                      <div className={`flex items-center justify-between pb-3 mb-3 border-b text-xs ${
                        theme === "dark" ? "border-slate-700/60 text-slate-400" : "border-slate-100 text-slate-400"
                      }`}>
                        <div className="flex items-center gap-1.5 font-semibold text-indigo-400 font-display">
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Kaelix AI</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[11px] text-slate-400">{msg.timestamp}</span>
                          <button
                            onClick={() => handleCopyText(msg.text)}
                            className="p-1 hover:text-indigo-400 transition-colors cursor-pointer"
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
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 text-white ring-2 ring-indigo-400/30 shadow-sm">
                    <Bot className="h-4 w-4 animate-pulse" />
                  </div>
                  <div className={`max-w-[88%] rounded-2xl rounded-tl-xs p-5 border-t-2 border-t-indigo-500 border-x border-b shadow-sm ${
                    theme === "dark" ? "bg-slate-800 border-slate-700 text-slate-100" : "bg-white border-slate-200/80 text-slate-800"
                  }`}>
                    <Markdown content={streamedText} />
                    <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs text-indigo-400 font-semibold">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
                        <span>Generating response...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Streaming loading indicator before first token */}
              {isGenerating && !streamedText && (
                <div className="flex items-start gap-3 flex-row">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 text-white ring-2 ring-indigo-400/30 shadow-sm">
                    <Bot className="h-4 w-4 animate-spin" />
                  </div>
                  <div className={`rounded-2xl rounded-tl-xs px-5 py-4 border shadow-sm flex items-center gap-3 ${
                    theme === "dark" ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-white border-slate-200 text-slate-700"
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-xs font-semibold font-display">Kaelix is processing...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Control Box */}
        <footer className={`p-4 md:px-10 pb-6 transition-colors duration-300 ${
          theme === "dark"
            ? "bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent"
            : "bg-gradient-to-t from-white via-white/95 to-transparent"
        }`}>
          <div className="mx-auto max-w-3xl relative">
            <form onSubmit={handleSendMessage} className="relative">
              <div className={`relative shadow-md rounded-2xl border focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all duration-200 ${
                theme === "dark"
                  ? "bg-slate-800/90 border-slate-700 text-slate-100"
                  : "bg-white border-slate-300 text-slate-800"
              }`}>
                
                {/* Draft Badge Bar inside text area */}
                {inputMessage.trim() && (
                  <div className="px-4 pt-2.5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span className="inline-flex items-center gap-1 text-amber-500 font-sans font-semibold">
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
                  placeholder="Ask Kaelix AI anything or type a prompt... (Shift+Enter for new line)"
                  className={`w-full min-h-[64px] max-h-[220px] resize-none rounded-2xl bg-transparent py-3.5 pl-5 pr-16 text-[15px] focus:outline-none ${
                    theme === "dark"
                      ? "text-slate-100 placeholder-slate-500"
                      : "text-slate-800 placeholder-slate-400"
                  }`}
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

            <div className="text-center mt-2.5 text-[11px] text-slate-400">
              <span>Kaelix can make mistakes. Verify important info.</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className={`w-full max-w-lg rounded-2xl p-6 shadow-2xl border max-h-[90vh] overflow-y-auto transition-colors ${
            theme === "dark" ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <div className={`flex items-center justify-between pb-4 border-b ${
              theme === "dark" ? "border-slate-800" : "border-slate-100"
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl border ${
                  theme === "dark" ? "bg-indigo-950/60 text-indigo-400 border-indigo-800/60" : "bg-indigo-50 text-indigo-600 border-indigo-100"
                }`}>
                  <Settings className="h-5 w-5" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${theme === "dark" ? "text-white" : "text-slate-900"}`}>Settings & Customization</h3>
                  <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>Customize workspace themes, colors, fonts & settings</p>
                </div>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className={`rounded-lg p-1 transition-colors cursor-pointer ${
                  theme === "dark" ? "text-slate-400 hover:bg-slate-800 hover:text-white" : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="py-4 space-y-5">
              {/* Theme Preference Option (Dark vs Light) */}
              <div className={`rounded-xl p-4 border ${
                theme === "dark" ? "bg-slate-800/50 border-slate-800" : "bg-slate-50 border-slate-200"
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className={`text-xs font-bold uppercase tracking-wider ${
                      theme === "dark" ? "text-slate-300" : "text-slate-700"
                    }`}>
                      Theme Mode
                    </h4>
                    <p className={`text-xs mt-0.5 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                      Current: {theme === "dark" ? "Dark Theme" : "Light Theme"}
                    </p>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer shadow-sm"
                  >
                    {theme === "dark" ? (
                      <>
                        <Sun className="h-3.5 w-3.5 text-amber-300" />
                        <span>Switch to Light</span>
                      </>
                    ) : (
                      <>
                        <Moon className="h-3.5 w-3.5" />
                        <span>Switch to Dark</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Accent & Highlight Color Picker */}
              <div className={`rounded-xl p-4 border ${
                theme === "dark" ? "bg-slate-800/50 border-slate-800" : "bg-slate-50 border-slate-200"
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <Palette className="h-4 w-4 text-indigo-400" />
                  <h4 className={`text-xs font-bold uppercase tracking-wider ${
                    theme === "dark" ? "text-slate-300" : "text-slate-700"
                  }`}>
                    Accent & Highlight Color
                  </h4>
                </div>
                <p className={`text-xs mb-3 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                  Choose a signature accent color for buttons, highlights, and active elements.
                </p>
                <div className="grid grid-cols-6 gap-2">
                  {[
                    { id: "indigo", label: "Indigo", bg: "bg-indigo-600" },
                    { id: "emerald", label: "Emerald", bg: "bg-emerald-600" },
                    { id: "violet", label: "Violet", bg: "bg-violet-600" },
                    { id: "rose", label: "Rose", bg: "bg-rose-600" },
                    { id: "amber", label: "Amber", bg: "bg-amber-600" },
                    { id: "cyan", label: "Cyan", bg: "bg-cyan-600" },
                  ].map((col) => (
                    <button
                      key={col.id}
                      onClick={() => {
                        setAccentColor(col.id as any);
                        showToast(`Accent set to ${col.label}`);
                      }}
                      className={`h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
                        col.bg
                      } ${
                        accentColor === col.id
                          ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-105 shadow-md"
                          : "opacity-80 hover:opacity-100 border-transparent"
                      }`}
                      title={col.label}
                    >
                      {accentColor === col.id && <Check className="h-4 w-4 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Background Style Palette */}
              <div className={`rounded-xl p-4 border ${
                theme === "dark" ? "bg-slate-800/50 border-slate-800" : "bg-slate-50 border-slate-200"
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <Paintbrush className="h-4 w-4 text-purple-400" />
                  <h4 className={`text-xs font-bold uppercase tracking-wider ${
                    theme === "dark" ? "text-slate-300" : "text-slate-700"
                  }`}>
                    Background Style & Tint
                  </h4>
                </div>
                <p className={`text-xs mb-3 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                  Select a background color atmosphere for your workspace.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: "slate", name: "Classic Slate", darkBg: "bg-slate-900 border-slate-700", lightBg: "bg-slate-100 border-slate-300" },
                    { id: "navy", name: "Midnight Navy", darkBg: "bg-blue-950 border-blue-800", lightBg: "bg-blue-50 border-blue-200" },
                    { id: "forest", name: "Forest Emerald", darkBg: "bg-emerald-950 border-emerald-800", lightBg: "bg-emerald-50 border-emerald-200" },
                    { id: "obsidian", name: "Obsidian Purple", darkBg: "bg-purple-950 border-purple-800", lightBg: "bg-purple-50 border-purple-200" },
                    { id: "zinc", name: "Carbon Zinc", darkBg: "bg-zinc-900 border-zinc-700", lightBg: "bg-zinc-100 border-zinc-300" },
                  ].map((bg) => {
                    const isSelected = bgTheme === bg.id;
                    return (
                      <button
                        key={bg.id}
                        onClick={() => {
                          setBgTheme(bg.id as any);
                          showToast(`Background set to ${bg.name}`);
                        }}
                        className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                          theme === "dark" ? bg.darkBg : bg.lightBg
                        } ${
                          isSelected
                            ? "ring-2 ring-indigo-500 border-indigo-500 font-semibold"
                            : "opacity-75 hover:opacity-100"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs">{bg.name}</span>
                          {isSelected && <Check className="h-3.5 w-3.5 text-indigo-400" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Typography / Font Selection */}
              <div className={`rounded-xl p-4 border ${
                theme === "dark" ? "bg-slate-800/50 border-slate-800" : "bg-slate-50 border-slate-200"
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <Type className="h-4 w-4 text-emerald-400" />
                  <h4 className={`text-xs font-bold uppercase tracking-wider ${
                    theme === "dark" ? "text-slate-300" : "text-slate-700"
                  }`}>
                    Typography / Font Family
                  </h4>
                </div>
                <p className={`text-xs mb-3 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                  Choose your preferred font style for reading and typing.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "sans", name: "Modern Sans", fontClass: "font-sans" },
                    { id: "serif", name: "Elegant Serif", fontClass: "font-serif" },
                    { id: "mono", name: "Technical Mono", fontClass: "font-mono" },
                  ].map((f) => {
                    const isSelected = fontFamily === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => {
                          setFontFamily(f.id as any);
                          showToast(`Font set to ${f.name}`);
                        }}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${f.fontClass} ${
                          theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
                        } ${
                          isSelected
                            ? "ring-2 ring-indigo-500 border-indigo-500 text-indigo-400 font-bold"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <span className="block text-sm">Aa</span>
                        <span className="block text-[10px] mt-0.5">{f.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Export Chat Option */}
              <div className={`rounded-xl p-4 border ${
                theme === "dark" ? "bg-slate-800/50 border-slate-800" : "bg-slate-50 border-slate-200"
              }`}>
                <div className="mb-2">
                  <h4 className={`text-xs font-bold uppercase tracking-wider ${
                    theme === "dark" ? "text-slate-300" : "text-slate-700"
                  }`}>
                    Export Conversation
                  </h4>
                  <p className={`text-xs mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                    {activeSession && (activeSession.messages || []).length > 0
                      ? `Export "${activeSession.title}" (${activeSession.messages.length} messages) as a Markdown file.`
                      : "Start a conversation to enable exporting."}
                  </p>
                </div>
                <button
                  onClick={() => {
                    handleExportChat();
                  }}
                  disabled={!activeSession || (activeSession.messages || []).length === 0}
                  className={`w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                    !activeSession || (activeSession.messages || []).length === 0
                      ? "opacity-50 cursor-not-allowed bg-slate-800 text-slate-500 border border-slate-700"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
                  }`}
                >
                  <Download className="h-4 w-4" />
                  <span>Export Chat to Markdown (.md)</span>
                </button>
              </div>
            </div>

            <div className={`flex justify-end pt-3 border-t ${
              theme === "dark" ? "border-slate-800" : "border-slate-100"
            }`}>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  theme === "dark" ? "bg-slate-800 hover:bg-slate-700 text-slate-200" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Session Confirmation Modal */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className={`w-full max-w-md rounded-2xl p-6 shadow-2xl border ${
            theme === "dark" ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <div className={`flex items-center justify-between pb-4 border-b ${
              theme === "dark" ? "border-slate-800" : "border-slate-100"
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border ${
                  theme === "dark" ? "bg-rose-950/60 text-rose-400 border-rose-800/60" : "bg-rose-50 text-rose-600 border-rose-100"
                }`}>
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${theme === "dark" ? "text-white" : "text-slate-900"}`}>Delete Session</h3>
                  <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>Confirm workspace deletion</p>
                </div>
              </div>
              <button
                onClick={() => setSessionToDelete(null)}
                className={`rounded-lg p-1 transition-colors cursor-pointer ${
                  theme === "dark" ? "text-slate-400 hover:bg-slate-800 hover:text-white" : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <p className={`text-sm leading-relaxed ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Are you sure you want to delete <span className={`font-bold ${theme === "dark" ? "text-white" : "text-slate-900"}`}>"{sessionToDelete.title}"</span>?
              </p>
              <div className={`text-xs p-3.5 rounded-xl border leading-relaxed ${
                theme === "dark" ? "bg-slate-800/60 text-slate-400 border-slate-700/80" : "bg-slate-50 text-slate-500 border-slate-200/80"
              }`}>
                This action will permanently remove all message history ({(sessionToDelete.messages || []).length} messages), saved drafts, and session data.
              </div>
            </div>

            <div className={`flex items-center justify-end gap-2.5 pt-3 border-t ${
              theme === "dark" ? "border-slate-800" : "border-slate-100"
            }`}>
              <button
                onClick={() => setSessionToDelete(null)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  theme === "dark" ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteSession}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
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
