import { Send, Plane, Settings } from "lucide-react";
import type { TabId } from "../App";

interface Props {
  scanning: boolean;
  activeTab: TabId;
  onTabChange: (t: TabId) => void;
}

const TABS: Array<{ id: TabId; label: string; icon: string }> = [
  { id: "cockpit", label: "Cockpit", icon: "🛩️" },
  { id: "ask", label: "Ask", icon: "💬" },
  { id: "history", label: "History", icon: "🕰️" },
];

export default function Header({ scanning, activeTab, onTabChange }: Props) {
  return (
    <>
      <div className="header">
        <div className="header-brand">
          <div className={`header-logo ${scanning ? "scanning" : ""}`}>
            <Plane size={15} strokeWidth={2.5} />
          </div>
          <div>
            <div className="header-title">PagePilot</div>
            <div className="header-subtitle">AI co-pilot for every webpage</div>
          </div>
        </div>
        <button
          className="btn-icon"
          title="Dashboard & Settings"
          onClick={() => chrome.runtime.openOptionsPage()}
        >
          <Settings size={13} />
        </button>
      </div>

      <div className="tab-nav">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
    </>
  );
}
