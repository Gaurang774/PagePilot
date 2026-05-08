import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";

interface Props {
  onSave: (key: string, endpoint: string, model: string) => void;
  onClose: () => void;
}

interface Provider {
  name: string;
  endpoint: string;
  model: string;
  placeholder: string;
  docsUrl: string;
  badge?: string;
}

const PROVIDERS: Provider[] = [
  {
    name: "NVIDIA NIM",
    endpoint: "https://integrate.api.nvidia.com/v1",
    model: "meta/llama-3.1-70b-instruct",
    placeholder: "nvapi-...",
    docsUrl: "https://build.nvidia.com/explore/discover",
    badge: "Fast & Free ✓",
  },
  {
    name: "OpenRouter",
    endpoint: "https://openrouter.ai/api/v1",
    model: "mistralai/mistral-7b-instruct:free",
    placeholder: "sk-or-v1-...",
    docsUrl: "https://openrouter.ai/keys",
    badge: "Free models ✓",
  },
  {
    name: "Groq",
    endpoint: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    placeholder: "gsk_...",
    docsUrl: "https://console.groq.com/keys",
    badge: "Free ✓",
  },
  {
    name: "OpenAI",
    endpoint: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    placeholder: "sk-...",
    docsUrl: "https://platform.openai.com/api-keys",
  },
  {
    name: "Anthropic",
    endpoint: "https://api.anthropic.com/v1",
    model: "claude-sonnet-4-5",
    placeholder: "sk-ant-...",
    docsUrl: "https://console.anthropic.com/keys",
  },
  {
    name: "Ollama (Local)",
    endpoint: "http://localhost:11434/v1",
    model: "llama3.2",
    placeholder: "ollama",
    docsUrl: "https://ollama.com",
    badge: "100% Local ✓",
  },
];

export default function ApiKeyModal({ onSave, onClose }: Props) {
  const [key, setKey] = useState("");
  const [endpoint, setEndpoint] = useState(PROVIDERS[0].endpoint);
  const [model, setModel] = useState(PROVIDERS[0].model);
  const [selectedProvider, setSelectedProvider] = useState(0);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [savedConfig, setSavedConfig] = useState<{ endpoint: string; model: string } | null>(null);

  // Load existing saved config on open
  useEffect(() => {
    chrome.storage.local.get(["apiKey", "apiEndpoint", "modelName"], (result) => {
      if (result.apiEndpoint) {
        setEndpoint(result.apiEndpoint);
        setModel(result.modelName || "");
        // Show masked key hint
        if (result.apiKey) {
          const k = result.apiKey as string;
          setKey(k);
        }
        setSavedConfig({ endpoint: result.apiEndpoint, model: result.modelName });
        // Auto-select matching provider
        const idx = PROVIDERS.findIndex((p) => p.endpoint === result.apiEndpoint);
        if (idx >= 0) setSelectedProvider(idx);
      }
    });
  }, []);

  const handleProviderChange = (idx: number) => {
    setSelectedProvider(idx);
    setEndpoint(PROVIDERS[idx].endpoint);
    setModel(PROVIDERS[idx].model);
    setKey("");
    setError("");
  };

  const handleSave = () => {
    const trimmedKey = key.trim();
    const trimmedEndpoint = endpoint.trim();
    const trimmedModel = model.trim();

    if (!trimmedKey) { setError("Please enter an API key."); return; }
    if (!trimmedEndpoint) { setError("Please enter an endpoint URL."); return; }
    if (!trimmedModel) { setError("Please enter a model name."); return; }

    onSave(trimmedKey, trimmedEndpoint, trimmedModel);
  };

  const provider = PROVIDERS[selectedProvider];

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ width: 340, maxHeight: 560, overflowY: "auto" }}>

        <div>
          <div className="modal-title">⚙️ AI Provider Setup</div>
          {savedConfig && (
            <div style={{
              marginTop: 6, padding: "5px 9px", borderRadius: 7, fontSize: 10,
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
              color: "#ef4444",
            }}>
              ⚠ Currently saved: <strong>{savedConfig.endpoint}</strong>
              <br />Select a provider below to change it.
            </div>
          )}
        </div>

        {/* Provider grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)" }}>
            Select Provider
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
            {PROVIDERS.map((p, i) => (
              <button
                key={p.name}
                onClick={() => handleProviderChange(i)}
                style={{
                  padding: "7px 10px",
                  borderRadius: 8,
                  border: `1px solid ${selectedProvider === i ? "var(--accent)" : "var(--border)"}`,
                  background: selectedProvider === i ? "rgba(59,130,246,0.15)" : "var(--bg-card)",
                  color: selectedProvider === i ? "var(--accent-glow)" : "var(--text-dim)",
                  fontSize: 11,
                  fontWeight: selectedProvider === i ? 600 : 400,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textAlign: "left",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  transition: "all 0.15s",
                  outline: "none",
                }}
              >
                <span>{p.name}</span>
                {p.badge && (
                  <span style={{ fontSize: 9, color: "#10b981", fontWeight: 700 }}>{p.badge}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* API Key */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)" }}>
              API Key
            </div>
            {provider.docsUrl !== "#" && (
              <a href={provider.docsUrl} target="_blank" rel="noopener noreferrer" className="modal-link">
                Get free key →
              </a>
            )}
          </div>
          <div style={{ position: "relative" }}>
            <input
              id="api-key-input"
              type={show ? "text" : "password"}
              className="input-field"
              placeholder={provider.placeholder}
              value={key}
              onChange={(e) => { setKey(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              autoFocus
            />
            <button
              onClick={() => setShow((s) => !s)}
              style={{
                position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)",
                display: "flex", alignItems: "center",
              }}
            >
              {show ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
        </div>

        {/* Endpoint */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)" }}>
            Endpoint URL
          </div>
          <input
            className="input-field"
            style={{ fontSize: 11 }}
            placeholder="https://openrouter.ai/api/v1"
            value={endpoint}
            onChange={(e) => { setEndpoint(e.target.value); setError(""); }}
          />
        </div>

        {/* Model */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)" }}>
            Model
          </div>
          <input
            className="input-field"
            style={{ fontSize: 11 }}
            placeholder="mistralai/mistral-7b-instruct:free"
            value={model}
            onChange={(e) => { setModel(e.target.value); setError(""); }}
          />
        </div>

        {error && (
          <div style={{ fontSize: 11, color: "var(--error)", padding: "4px 0" }}>{error}</div>
        )}

        {/* Preview of what will be saved */}
        <div style={{
          padding: "7px 10px", borderRadius: 8, fontSize: 10,
          background: "rgba(59,130,246,0.06)", border: "1px solid var(--border)",
          color: "var(--text-muted)", lineHeight: 1.6,
        }}>
          Will save → <strong style={{ color: "var(--accent-glow)" }}>{endpoint || "…"}</strong><br />
          Model → <strong style={{ color: "var(--accent-glow)" }}>{model || "…"}</strong>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button
            className="btn-primary"
            onClick={handleSave}
            style={{ flex: 1, justifyContent: "center" }}
          >
            💾 Save & Connect
          </button>
          <button
            onClick={() => {
              if (confirm("Clear all API settings?")) {
                chrome.storage.local.remove(["apiKey", "apiEndpoint", "modelName"], () => window.location.reload());
              }
            }}
            style={{
              width: 36, height: 36, borderRadius: 9, border: "1px solid var(--border)",
              background: "rgba(239,68,68,0.1)", color: "#ef4444", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
            title="Reset Settings"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
