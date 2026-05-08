import { useState, useRef, useEffect, useCallback } from "react";
import { Send } from "lucide-react";
import type { PageData, ChatMessage } from "../../types";

interface Props {
  pageData: PageData | null;
  chatHistory: ChatMessage[];
  onChatUpdate: (msgs: ChatMessage[]) => void;
  onScan: () => void;
}

const SUGGESTIONS = [
  "Summarize the main argument",
  "Who is the target audience?",
  "List all prices mentioned",
  "What is the author's conclusion?",
  "Extract all email addresses",
  "Is this page trying to sell me something?",
];

function TypingIndicator() {
  return (
    <div className="chat-bubble-wrap assistant">
      <div className="typing-indicator">
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </div>
  );
}

function ChatBubble({ msg }: { msg: ChatMessage }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className={`chat-bubble-wrap ${msg.role}`}>
      <div className={`chat-bubble ${msg.role}`}>{msg.content}</div>
      <div className="chat-meta">
        <span className="chat-time">{time}</span>
        {msg.role === "assistant" && (
          <button className="copy-btn" onClick={copy}>
            {copied ? "✓ Copied" : "Copy"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function AskTab({ pageData, chatHistory, onChatUpdate, onScan }: Props) {
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const portRef = useRef<chrome.runtime.Port | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, streamingText, isStreaming]);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming || !pageData) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: trimmed,
      timestamp: Date.now(),
    };

    const newHistory = [...chatHistory, userMsg];
    onChatUpdate(newHistory);
    setInput("");
    setIsStreaming(true);
    setStreamingText("");

    // Open port for streaming
    const port = chrome.runtime.connect({ name: "CHAT_STREAM" });
    portRef.current = port;

    let accumulated = "";

    port.onMessage.addListener((msg) => {
      if (msg.type === "CHUNK") {
        accumulated += msg.text;
        setStreamingText(accumulated);
      } else if (msg.type === "DONE") {
        const assistantMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: accumulated,
          timestamp: Date.now(),
        };
        onChatUpdate([...newHistory, assistantMsg]);
        setStreamingText("");
        setIsStreaming(false);
        port.disconnect();
      } else if (msg.type === "ERROR") {
        const errMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `⚠️ Error: ${msg.error}`,
          timestamp: Date.now(),
        };
        onChatUpdate([...newHistory, errMsg]);
        setStreamingText("");
        setIsStreaming(false);
        port.disconnect();
      }
    });

    port.postMessage({
      type: "CHAT_STREAM",
      pageData,
      messages: chatHistory,
      userMessage: trimmed,
    });
  }, [input, isStreaming, pageData, chatHistory, onChatUpdate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Not scanned yet
  if (!pageData) {
    return (
      <div className="empty-state" style={{ flex: 1 }}>
        <div className="empty-state-icon">💬</div>
        <div className="empty-state-title">No page scanned yet</div>
        <div className="empty-state-sub">
          Go to the Cockpit tab and click "Start Flight" to scan the current page first.
        </div>
        <button className="btn-primary" onClick={onScan} style={{ fontSize: 12, padding: "7px 18px" }}>
          Start Flight
        </button>
      </div>
    );
  }

  return (
    <div className="chat-panel">
      {/* Messages */}
      <div className="chat-messages">
        {chatHistory.length === 0 && !isStreaming && (
          <div style={{ padding: "12px 0 6px" }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
              Ask anything about this page:
            </div>
            <div className="topics-wrap">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className="suggestion-chip"
                  onClick={() => { setInput(s); textareaRef.current?.focus(); }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {chatHistory.map((msg) => (
          <ChatBubble key={msg.id} msg={msg} />
        ))}

        {isStreaming && streamingText && (
          <div className="chat-bubble-wrap assistant">
            <div className="chat-bubble assistant">{streamingText}</div>
          </div>
        )}

        {isStreaming && !streamingText && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="chat-input-bar">
        <textarea
          ref={textareaRef}
          id="chat-input"
          className="chat-input"
          placeholder="Ask anything about this page…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={isStreaming}
        />
        <button
          className="chat-send-btn"
          onClick={sendMessage}
          disabled={!input.trim() || isStreaming}
          title="Send"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
