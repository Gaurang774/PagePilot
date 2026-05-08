import { useState } from "react";
import { Settings, History, Map } from "lucide-react";
import ApiSettingsTab from "./ApiSettingsTab";
import HistoryDashboardTab from "./HistoryDashboardTab";

type TabId = "history" | "api";

export default function DashboardApp() {
  const [activeTab, setActiveTab] = useState<TabId>("api");

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <Map size={24} style={{ color: "var(--accent)" }} />
          PagePilot
        </div>
        
        <div 
          className={`nav-item ${activeTab === "api" ? "active" : ""}`}
          onClick={() => setActiveTab("api")}
        >
          <Settings size={18} />
          API Configuration
        </div>
        <div 
          className={`nav-item ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          <History size={18} />
          Scan History
        </div>
      </div>

      <div className="main-content">
        {activeTab === "api" && <ApiSettingsTab />}
        {activeTab === "history" && <HistoryDashboardTab />}
      </div>
    </div>
  );
}
