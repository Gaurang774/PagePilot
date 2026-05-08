import { useState, useEffect, useCallback } from "react";
import type { PageData, Insights, ChatMessage, HistoryEntry } from "../types";
import Header from "./components/Header";
import CockpitTab from "./components/CockpitTab";
import AskTab from "./components/AskTab";
import HistoryTab from "./components/HistoryTab";

export type TabId = "cockpit" | "ask" | "history";
export type ScanState = "idle" | "scanning" | "done" | "error";

export interface AppState {
  scanState: ScanState;
  scanStep: string;
  scanProgress: number;
  pageData: PageData | null;
  insights: Insights | null;
  insightsLoading: boolean;
  chatHistory: ChatMessage[];
  activeTab: TabId;
  error: string | null;
  hasApiKey: boolean;
}

export default function App() {
  const [state, setState] = useState<AppState>({
    scanState: "idle",
    scanStep: "",
    scanProgress: 0,
    pageData: null,
    insights: null,
    insightsLoading: false,
    chatHistory: [],
    activeTab: "cockpit",
    error: null,
    hasApiKey: false,
  });

  const set = useCallback((patch: Partial<AppState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  // Check for API key on mount
  useEffect(() => {
    chrome.storage.local.get(["apiKey"], (result) => {
      set({ hasApiKey: !!result.apiKey });
    });
  }, [set]);



  const handleScan = useCallback(async () => {
    if (!state.hasApiKey) {
      set({ error: "API Key missing. Click the settings icon to configure." });
      return;
    }

    set({ scanState: "scanning", scanStep: "Extracting page content…", scanProgress: 20, error: null });

    // Get the active tab and send SCAN_PAGE to content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      set({ scanState: "error", error: "No active tab found." });
      return;
    }

    let pageData: PageData | null = null;

    try {
      // Inject content script if needed (ping first)
      try {
        await chrome.tabs.sendMessage(tab.id, { type: "PING" });
      } catch {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["src/content/content_script.js"],
        });
      }

      set({ scanStep: "Scanning DOM…", scanProgress: 45 });

      const scanRes = await chrome.tabs.sendMessage(tab.id, { type: "SCAN_PAGE" }) as {
        success: boolean; pageData?: PageData; error?: string;
      };

      if (!scanRes.success || !scanRes.pageData) {
        throw new Error(scanRes.error || "Failed to scan page");
      }
      pageData = scanRes.pageData;

      set({ scanStep: "Analyzing with Claude AI…", scanProgress: 70, pageData });

      // Get insights from background
      const insightRes = await chrome.runtime.sendMessage({
        type: "GET_INSIGHTS",
        pageData,
      }) as { success: boolean; insights?: Insights; error?: string };

      set({ scanProgress: 95, scanStep: "Ready for takeoff!" });

      if (!insightRes.success || !insightRes.insights) {
        throw new Error(insightRes.error || "Failed to generate insights");
      }

      // Save to history
      const entry: HistoryEntry = {
        id: Date.now().toString(),
        pageData,
        insights: insightRes.insights,
        chatHistory: [],
      };
      chrome.storage.local.get(["history"], (res) => {
        const history: HistoryEntry[] = res.history || [];
        const updated = [entry, ...history].slice(0, 10);
        chrome.storage.local.set({ history: updated });
      });

      setTimeout(() => {
        set({
          scanState: "done",
          insights: insightRes.insights!,
          scanProgress: 100,
          scanStep: "",
          chatHistory: [],
          activeTab: "cockpit",
        });
      }, 400);

    } catch (err) {
      set({ scanState: "error", error: String(err), scanProgress: 0 });
    }
  }, [state.hasApiKey, set]);

  const handleLoadFromHistory = useCallback((entry: HistoryEntry) => {
    set({
      pageData: entry.pageData,
      insights: entry.insights,
      chatHistory: entry.chatHistory,
      scanState: "done",
      activeTab: "cockpit",
    });
  }, [set]);

  return (
    <div className="app-shell">
      <Header
        scanning={state.scanState === "scanning"}
        activeTab={state.activeTab}
        onTabChange={(t) => set({ activeTab: t })}
      />

      <div className="content-area">
        {/* Scan status bar */}
        {state.scanState === "done" && state.pageData && (
          <div className="scan-bar">
            <div className="scan-bar-info">
              <span>✓</span>
              <span>Flight ready</span>
            </div>
            <span className="scan-bar-url">
              {new URL(state.pageData.url).hostname}
            </span>
            <button
              className="btn-icon"
              title="Re-scan page"
              onClick={handleScan}
              style={{ width: 22, height: 22, fontSize: 11 }}
            >
              ↻
            </button>
          </div>
        )}

        {state.error && (
          <div className="error-banner" style={{ margin: "8px 14px 0" }}>
            <span>⚠</span>
            <span>{state.error}</span>
          </div>
        )}

        {/* Tab panels */}
        {state.activeTab === "cockpit" && (
          <CockpitTab
            scanState={state.scanState}
            scanStep={state.scanStep}
            scanProgress={state.scanProgress}
            pageData={state.pageData}
            insights={state.insights}
            onScan={handleScan}
          />
        )}
        {state.activeTab === "ask" && (
          <AskTab
            pageData={state.pageData}
            chatHistory={state.chatHistory}
            onChatUpdate={(msgs) => set({ chatHistory: msgs })}
            onScan={handleScan}
          />
        )}
        {state.activeTab === "history" && (
          <HistoryTab onLoad={handleLoadFromHistory} />
        )}
      </div>
    </div>
  );
}
