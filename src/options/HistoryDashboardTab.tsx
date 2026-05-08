import { useState, useEffect } from "react";
import { Trash2, ExternalLink } from "lucide-react";
import type { HistoryEntry } from "../types";

function timeAgo(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString();
}

export default function HistoryDashboardTab() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    chrome.storage.local.get(["history"], (res) => {
      setHistory(res.history || []);
    });
  }, []);

  const deleteEntry = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this scan from history?")) return;
    
    const updated = history.filter((h) => h.id !== id);
    setHistory(updated);
    chrome.storage.local.set({ history: updated });
  };

  const clearAll = () => {
    if (!confirm("Are you sure you want to clear ALL history?")) return;
    setHistory([]);
    chrome.storage.local.set({ history: [] });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 30 }}>
        <div>
          <h1 className="dashboard-title">Scan History</h1>
          <p className="dashboard-subtitle" style={{ marginBottom: 0 }}>View and manage your recently scanned webpages.</p>
        </div>
        {history.length > 0 && (
          <button 
            onClick={clearAll}
            style={{ 
              background: "transparent", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#ef4444",
              padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontSize: 13, fontWeight: 600
            }}
          >
            Clear All History
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🕰️</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text)" }}>No history yet</div>
          <div>Pages you scan will appear here.</div>
        </div>
      ) : (
        <div className="history-grid">
          {history.map((entry) => {
            let hostname = entry.pageData.url;
            try { hostname = new URL(entry.pageData.url).hostname; } catch {}

            return (
              <div key={entry.id} className="history-card">
                <button className="history-card-delete" onClick={(e) => deleteEntry(entry.id, e)}>
                  <Trash2 size={16} />
                </button>
                
                <div className="history-card-header">
                  <img
                    className="history-card-favicon"
                    src={entry.pageData.favicon}
                    alt=""
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
                    }}
                  />
                  <div>
                    <div className="history-card-title">{entry.pageData.title || hostname}</div>
                    <div className="history-card-url">{hostname}</div>
                  </div>
                </div>

                <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5, flex: 1 }}>
                  {entry.insights?.summary}
                </div>

                <div className="history-card-stats">
                  <div>📅 {timeAgo(entry.pageData.scannedAt)}</div>
                  <div>📝 {entry.pageData.wordCount.toLocaleString()} words</div>
                  <a 
                    href={entry.pageData.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    style={{ marginLeft: "auto", color: "var(--accent)", display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}
                  >
                    Open <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
