# PagePilot Chrome Extension

**Your AI co-pilot for every webpage** — powered by Claude AI.

## 🚀 Features

- **Page Scanner** — Extracts text, headings, links, metadata, and structured data from any webpage
- **Auto Insights** — TL;DR summary, key topics, sentiment, reading time, page type detection
- **AI Chat** — Ask natural language questions about the scanned page with streaming responses
- **History** — Last 10 scanned pages saved locally for later reference

## 🛠 Development Setup

### Prerequisites
- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/keys)

### Build

```bash
npm install
npm run build        # production build → dist/
npm run dev          # watch mode (rebuilds on save)
```

### Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `dist/` folder
5. Click the PagePilot icon in the toolbar
6. Enter your Anthropic API key when prompted
7. Navigate to any webpage and click **Start Flight** ✈️

## 📁 Project Structure

```
src/
├── types/           # Shared TypeScript interfaces
├── content/         # DOM scraper content script
├── background/      # Service worker + Claude API calls
└── popup/
    ├── App.tsx      # Root component + state machine
    ├── index.css    # Design system (navy + electric blue)
    └── components/
        ├── Header.tsx
        ├── CockpitTab.tsx   # Auto-insights panel
        ├── AskTab.tsx       # AI chat interface
        ├── HistoryTab.tsx   # Scan history
        ├── ApiKeyModal.tsx  # First-run API key setup
        └── LoadingBar.tsx
```

## 🔑 API Key

PagePilot uses your own Anthropic API key stored in `chrome.storage.local`. It never leaves your browser or goes through any server.

Get your free key at [console.anthropic.com](https://console.anthropic.com/keys).

## ⚙️ Tech Stack

| Layer | Technology |
|---|---|
| Extension | Chrome Manifest V3 |
| UI | React 18 + Tailwind CSS |
| Build | Vite + vite-plugin-web-extension |
| AI | Claude claude-sonnet-4-5 (Anthropic) |
| Storage | `chrome.storage.local` (fully local) |
