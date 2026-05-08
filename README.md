# PagePilot Chrome Extension

**Your AI co-pilot for every webpage** — powered by your choice of AI provider.

## 🚀 Features

- **Page Scanner** — Extracts text, headings, links, metadata, and structured data from any webpage
- **Auto Insights** — TL;DR summary, key topics, sentiment, reading time, page type detection
- **AI Chat** — Ask natural language questions about the scanned page with streaming responses
- **History** — Last 10 scanned pages saved locally for later reference
- **Multi-Provider** — Works with NVIDIA NIM, OpenRouter, Groq, OpenAI, Ollama, and more

## 🛠 Development Setup

### Prerequisites
- Node.js 18+
- An API key from any supported provider (Groq, OpenRouter, NVIDIA NIM, OpenAI, or local Ollama)

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
6. Open the Dashboard (⚙️ icon) and configure your API provider
7. Navigate to any webpage and click **Start Flight** ✈️

## 📁 Project Structure

```
src/
├── types/           # Shared TypeScript interfaces
├── content/         # DOM scraper content script
├── background/      # Service worker + AI API calls
├── options/         # Full-page Dashboard (settings + history)
└── popup/
    ├── App.tsx      # Root component + state machine
    ├── index.css    # Design system (navy + electric blue)
    └── components/
        ├── Header.tsx
        ├── CockpitTab.tsx   # Auto-insights panel
        ├── AskTab.tsx       # AI chat interface
        ├── HistoryTab.tsx   # Scan history
        ├── ApiKeyModal.tsx  # Provider setup
        └── LoadingBar.tsx
```

## 🔑 API Key

PagePilot uses your own API key stored in `chrome.storage.local`. It never leaves your browser or goes through any server. Configure your preferred provider from the Dashboard.

**Free providers to get started:**
- [Groq](https://console.groq.com/keys) — Free & fast
- [OpenRouter](https://openrouter.ai/keys) — Free models available
- [NVIDIA NIM](https://build.nvidia.com/explore/discover) — Free tier

## ⚙️ Tech Stack

| Layer | Technology |
|---|---|
| Extension | Chrome Manifest V3 |
| UI | React 18 + Tailwind CSS |
| Build | Vite + vite-plugin-web-extension |
| AI | OpenAI-compatible API (multi-provider) |
| Storage | `chrome.storage.local` (fully local) |
