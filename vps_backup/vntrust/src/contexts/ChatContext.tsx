"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ChatMsg { from: string; text: string; }

interface ChatContextValue {
  msgs: ChatMsg[];
  addMsg: (msg: ChatMsg) => void;
  setMsgs: (msgs: ChatMsg[]) => void;
  clearHistory: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const ChatContext = createContext<ChatContextValue | null>(null);

// Build a per-account storage key — isolated per userId (most reliable)
function getChatKey(userId?: string): string {
  try {
    const id = userId || localStorage.getItem("userId") || localStorage.getItem("userName") || "guest";
    return `vntrust_chat_${id}`;
  } catch {
    return "vntrust_chat_guest";
  }
}

// Get current unique user identifier
function getCurrentUserId(): string {
  try {
    return localStorage.getItem("userId") || localStorage.getItem("userName") || "guest";
  } catch {
    return "guest";
  }
}

// ─── Old greeting patterns (for migration) ────────────────────────────────────
const OLD_GREETINGS = [
  "Chào! Tôi là AI VNTrust",
  "Mình là AI VNTrust. Bạn cần phân tích",
  "ở đây để giúp bạn",
  "Chào bạn! 👋 Mình là AI VNTrust",
];
function isOldGreeting(text: string) {
  return OLD_GREETINGS.some(g => text.includes(g));
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const { t } = useLanguage();

  const getInitMsg = (): ChatMsg => ({
    from: "ai",
    text: t("chat_greeting"),
  });

  // Start with greeting only — localStorage loads in useEffect
  const [msgs, setMsgsState] = useState<ChatMsg[]>([getInitMsg()]);

  // Track current userName so we can detect account switch
  const [currentUser, setCurrentUser] = useState<string>("guest");

  // Load history for the correct user on mount, and whenever account changes
  useEffect(() => {
    const loadHistory = () => {
      const userId = getCurrentUserId();
      setCurrentUser(userId);

      const key = getChatKey(userId);
      try {
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed: ChatMsg[] = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            if (parsed[0]?.from === "ai" && isOldGreeting(parsed[0].text)) {
              parsed[0] = getInitMsg();
            }
            setMsgsState(parsed);
            return;
          }
        }
      } catch {}
      // No saved history → fresh greeting
      setMsgsState([getInitMsg()]);
    };

    // Initial load
    loadHistory();

    // Listen to storage events (account switch from another tab)
    const onStorage = (e: StorageEvent) => {
      if (e.key === "userId" || e.key === "userName" || e.key === "userRole") loadHistory();
    };
    window.addEventListener("storage", onStorage);

    // Poll for account change (same-tab login/logout) — check userId AND userName
    let lastUserId = getCurrentUserId();
    const poll = setInterval(() => {
      const u = getCurrentUserId();
      if (u !== lastUserId) {
        lastUserId = u;
        loadHistory();
      }
    }, 800);

    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(poll);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update greeting when language changes (only first message if it's a greeting)
  useEffect(() => {
    setMsgsState(prev => {
      if (prev.length > 0 && prev[0].from === "ai") {
        const next = [...prev];
        next[0] = getInitMsg();
        return next;
      }
      return prev;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  // Persist to localStorage whenever messages change
  useEffect(() => {
    const key = getChatKey(currentUser);
    try { localStorage.setItem(key, JSON.stringify(msgs)); } catch {}
  }, [msgs, currentUser]);

  const addMsg = useCallback((msg: ChatMsg) => {
    setMsgsState(prev => [...prev, msg]);
  }, []);

  const setMsgs = useCallback((newMsgs: ChatMsg[]) => {
    setMsgsState(newMsgs);
  }, []);

  const clearHistory = useCallback(() => {
    const key = getChatKey();
    try { localStorage.removeItem(key); } catch {}
    setMsgsState([getInitMsg()]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  return (
    <ChatContext.Provider value={{ msgs, addMsg, setMsgs, clearHistory }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used inside <ChatProvider>");
  return ctx;
}
