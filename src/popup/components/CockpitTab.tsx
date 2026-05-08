import type { PageData, Insights } from "../../types";
import type { ScanState } from "../App";
import LoadingBar from "./LoadingBar";

interface Props {
  scanState: ScanState;
  scanStep: string;
  scanProgress: number;
  pageData: PageData | null;
  insights: Insights | null;
  onScan: () => void;
}

const PAGE_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  article:       { label: "Article",       color: "#60a5fa", bg: "rgba(59,130,246,0.12)", icon: "📰" },
  "e-commerce":  { label: "E-Commerce",    color: "#f59e0b", bg: "rgba(245,158,11,0.12)", icon: "🛒" },
  documentation: { label: "Documentation", color: "#a78bfa", bg: "rgba(167,139,250,0.12)", icon: "📚" },
  "landing-page":{ label: "Landing Page",  color: "#10b981", bg: "rgba(16,185,129,0.12)", icon: "🚀" },
  social:        { label: "Social",        color: "#f472b6", bg: "rgba(244,114,182,0.12)", icon: "💬" },
  forum:         { label: "Forum",         color: "#fb923c", bg: "rgba(251,146,60,0.12)", icon: "🗣️" },
  other:         { label: "Other",         color: "#94a3b8", bg: "rgba(148,163,184,0.12)", icon: "🌐" },
};

const SENTIMENT_CONFIG = {
  positive: { color: "#10b981", label: "Positive tone" },
  neutral:  { color: "#60a5fa", label: "Neutral tone" },
  negative: { color: "#ef4444", label: "Negative tone" },
};

function formatNumber(n: number) {
  return n > 999 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export default function CockpitTab({ scanState, scanStep, scanProgress, pageData, insights, onScan }: Props) {
  // Idle — show scan CTA
  if (scanState === "idle" || (scanState === "error" && !pageData)) {
    return (
      <div className="scan-hero">
        <div style={{ fontSize: 42 }}>🛩️</div>
        <div>
          <div className="scan-hero-title">Ready for takeoff?</div>
          <div className="scan-hero-sub" style={{ marginTop: 4 }}>
            Scan any webpage to get instant AI insights, summaries, and answers.
          </div>
        </div>
        <button className="btn-primary" onClick={onScan} id="start-flight-btn">
          <span>✦</span> Start Flight
        </button>
      </div>
    );
  }

  // Scanning
  if (scanState === "scanning") {
    return (
      <div className="scan-hero">
        <div style={{ fontSize: 36 }}>🔍</div>
        <div className="scan-hero-title">Scanning…</div>
        <LoadingBar progress={scanProgress} label={scanStep} />
      </div>
    );
  }

  // Done — show insights
  if (!pageData || !insights) return null;

  const ptConfig = PAGE_TYPE_CONFIG[insights.pageType] || PAGE_TYPE_CONFIG.other;
  const sentConfig = SENTIMENT_CONFIG[insights.sentiment];

  return (
    <div className="tab-panel">
      {/* Page title */}
      <div style={{ padding: "2px 0 4px" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", lineHeight: 1.3 }}>
          {pageData.title || "Untitled Page"}
        </div>
        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>
          {new URL(pageData.url).hostname}
        </div>
      </div>

      {/* Stats row */}
      <div className="stats-row">
        <div className="stat-cell">
          <div className="stat-value">{formatNumber(pageData.wordCount)}</div>
          <div className="stat-label">Words</div>
        </div>
        <div className="stat-cell">
          <div className="stat-value">{pageData.readingTime}m</div>
          <div className="stat-label">Read time</div>
        </div>
        <div className="stat-cell">
          <div className="stat-value">{pageData.internalLinkCount}</div>
          <div className="stat-label">Int. links</div>
        </div>
        <div className="stat-cell">
          <div className="stat-value">{pageData.externalLinkCount}</div>
          <div className="stat-label">Ext. links</div>
        </div>
      </div>

      {/* TL;DR */}
      <div className="insight-card">
        <div className="insight-card-header">
          <div className="insight-card-icon" style={{ background: "rgba(59,130,246,0.12)" }}>📄</div>
          <span className="insight-card-label">TL;DR Summary</span>
        </div>
        <div className="insight-card-value" style={{ lineHeight: 1.6 }}>
          {insights.summary}
        </div>
      </div>

      {/* Key Topics */}
      <div className="insight-card">
        <div className="insight-card-header">
          <div className="insight-card-icon" style={{ background: "rgba(167,139,250,0.12)" }}>🏷️</div>
          <span className="insight-card-label">Key Topics</span>
        </div>
        <div className="topics-wrap">
          {insights.keyTopics.map((t) => (
            <span key={t} className="topic-chip">{t}</span>
          ))}
        </div>
      </div>

      {/* Sentiment */}
      <div className="insight-card">
        <div className="insight-card-header">
          <div className="insight-card-icon" style={{ background: "rgba(16,185,129,0.12)" }}>
            {insights.sentiment === "positive" ? "😊" : insights.sentiment === "negative" ? "😟" : "😐"}
          </div>
          <span className="insight-card-label">Sentiment</span>
          <span style={{ marginLeft: "auto", fontSize: 11, color: sentConfig.color, fontWeight: 600 }}>
            {sentConfig.label}
          </span>
        </div>
        <div className="sentiment-bar">
          <div
            className="sentiment-fill"
            style={{
              width: `${insights.sentimentScore}%`,
              background: sentConfig.color,
            }}
          />
        </div>
      </div>

      {/* Page Type + Author */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span
          className="page-type-badge"
          style={{ background: ptConfig.bg, color: ptConfig.color, border: `1px solid ${ptConfig.color}33` }}
        >
          {ptConfig.icon} {ptConfig.label}
        </span>
        {pageData.meta.author && (
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            ✍️ {pageData.meta.author}
          </span>
        )}
        {pageData.meta.publishDate && (
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            📅 {new Date(pageData.meta.publishDate).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Headings */}
      {pageData.headings.length > 0 && (
        <div className="insight-card">
          <div className="insight-card-header">
            <div className="insight-card-icon" style={{ background: "rgba(245,158,11,0.12)" }}>📑</div>
            <span className="insight-card-label">Page Structure ({pageData.headings.length} headings)</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 120, overflowY: "auto" }}>
            {pageData.headings.slice(0, 12).map((h, i) => (
              <div
                key={i}
                style={{
                  fontSize: 11,
                  color: h.level === 1 ? "var(--text)" : "var(--text-dim)",
                  paddingLeft: `${(h.level - 1) * 10}px`,
                  fontWeight: h.level <= 2 ? 600 : 400,
                  lineHeight: 1.4,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {h.text}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
