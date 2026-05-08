import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import type { HistoryEntry } from "../../types";

interface Props {
  onLoad: (entry: HistoryEntry) => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function HistoryTab({ onLoad }: Props) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    chrome.storage.local.get(["history"], (res) => {
      setHistory(res.history || []);
    });
  }, []);

  const deleteEntry = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter((h) => h.id !== id);
    setHistory(updated);
    chrome.storage.local.set({ history: updated });
  };

  if (history.length === 0) {
    return (
      <div className="empty-state" style={{ flex: 1 }}>
        <div className="empty-state-icon">🕰️</div>
        <div className="empty-state-title">No history yet</div>
        <div className="empty-state-sub">
          Pages you scan will appear here. Up to 10 recent scans are saved locally.
        </div>
      </div>
    );
  }

  return (
    <div className="tab-panel">
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>
        {history.length} recent scan{history.length !== 1 ? "s" : ""} — click to reload
      </div>
      <div className="history-list">
        {history.map((entry) => {
          let hostname = entry.pageData.url;
          try { hostname = new URL(entry.pageData.url).hostname; } catch {}

          return (
            <div
              key={entry.id}
              className="history-item"
              onClick={() => onLoad(entry)}
              title={entry.pageData.url}
            >
              <img
                className="history-favicon"
                src={entry.pageData.favicon}
                alt=""
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
                }}
              />
              <div className="history-info">
                <div className="history-title">{entry.pageData.title || hostname}</div>
                <div className="history-url">{hostname}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                <div className="history-date">{timeAgo(entry.pageData.scannedAt)}</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                  {entry.pageData.wordCount.toLocaleString()} words
                </div>
              </div>
              <button
                className="delete-btn"
                onClick={(e) => deleteEntry(entry.id, e)}
                title="Remove"
              >
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
