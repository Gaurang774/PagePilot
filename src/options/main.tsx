import React from "react";
import ReactDOM from "react-dom/client";
import DashboardApp from "./DashboardApp";
import "../popup/index.css"; // Reuse popup styles as base
import "./options.css"; // Specific options styles

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DashboardApp />
  </React.StrictMode>
);
