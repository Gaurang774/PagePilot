import { useState, useEffect } from "react";
import { Eye, EyeOff, Save, Zap, Loader2 } from "lucide-react";

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
    name: "Ollama (Local)",
    endpoint: "http://localhost:11434/v1",
    model: "llama3.2",
    placeholder: "ollama",
    docsUrl: "https://ollama.com",
    badge: "100% Local ✓",
  },
];

function sanitizeLatin1(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/[^\u0000-\u00FF]/g, "").trim();
}

export default function ApiSettingsTab() {
  const [key, setKey] = useState("");
  const [endpoint, setEndpoint] = useState(PROVIDERS[0].endpoint);
  const [model, setModel] = useState(PROVIDERS[0].model);
  const [selectedProvider, setSelectedProvider] = useState(0);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(["apiKey", "apiEndpoint", "modelName"], (result) => {
      if (result.apiEndpoint) {
        setEndpoint(result.apiEndpoint);
        setModel(result.modelName || "");
        if (result.apiKey) setKey(result.apiKey);
        
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
    setSuccess("");
  };

  const handleTestConnection = async () => {
    const trimmedKey = sanitizeLatin1(key);
    const trimmedEndpoint = endpoint.trim();
    const trimmedModel = model.trim();

    if (!trimmedKey) { setError("Please enter an API key first."); return; }
    if (!trimmedEndpoint) { setError("Please enter an endpoint URL."); return; }
    if (!trimmedModel) { setError("Please enter a model name."); return; }

    setTesting(true);
    setError("");
    setSuccess("");

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${trimmedKey}`,
      };
      if (trimmedEndpoint.includes("openrouter.ai")) {
        headers["HTTP-Referer"] = "https://pagepilot.extension";
        headers["X-Title"] = "PagePilot";
      }

      const url = `${trimmedEndpoint}/chat/completions`;
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: trimmedModel,
          max_tokens: 5,
          messages: [
            { role: "user", content: "Say hi" },
          ],
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        if (response.status === 401) {
          setError(`❌ Authentication failed (401). Your API key is invalid or expired. Please get a new key from your provider.`);
        } else if (response.status === 403) {
          setError(`❌ Access denied (403). Your key may not have permission for model "${trimmedModel}".`);
        } else if (response.status === 404) {
          setError(`❌ Endpoint not found (404). Check the endpoint URL or model name "${trimmedModel}".`);
        } else if (response.status === 429) {
          setError(`⚠️ Rate limited (429). Your key works but you've hit the usage limit. Try again later.`);
        } else {
          setError(`❌ API error ${response.status}: ${errBody.slice(0, 200)}`);
        }
      } else {
        setSuccess("✅ Connection successful! Your API key and endpoint are working.");
      }
    } catch (err) {
      setError(`❌ Could not reach endpoint: ${String(err).slice(0, 150)}`);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const trimmedKey = key.trim();
    const trimmedEndpoint = endpoint.trim();
    const trimmedModel = model.trim();

    if (!trimmedKey) { setError("Please enter an API key."); return; }
    if (!trimmedEndpoint) { setError("Please enter an endpoint URL."); return; }
    if (!trimmedModel) { setError("Please enter a model name."); return; }

    chrome.storage.local.set({
      apiKey: trimmedKey,
      apiEndpoint: trimmedEndpoint,
      modelName: trimmedModel,
    }, () => {
      setSuccess("Configuration saved successfully! You can now use the extension.");
      setError("");
      setTimeout(() => setSuccess(""), 4000);
    });
  };

  const provider = PROVIDERS[selectedProvider];

  return (
    <div>
      <h1 className="dashboard-title">API Configuration</h1>
      <p className="dashboard-subtitle">Configure your preferred AI provider. PagePilot uses this configuration to analyze pages and answer questions.</p>

      <div className="settings-section">
        <div className="settings-row">
          <label className="settings-label">Select Provider</label>
          <div className="provider-grid">
            {PROVIDERS.map((p, i) => (
              <div
                key={p.name}
                className={`provider-card ${selectedProvider === i ? "active" : ""}`}
                onClick={() => handleProviderChange(i)}
              >
                <div className="provider-name">{p.name}</div>
                {p.badge && <div className="provider-badge">{p.badge}</div>}
              </div>
            ))}
          </div>
        </div>

        <div className="settings-row" style={{ marginTop: 30 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <label className="settings-label" style={{ margin: 0 }}>API Key</label>
            {provider.docsUrl !== "#" && (
              <a href={provider.docsUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--accent)" }}>
                Get API key →
              </a>
            )}
          </div>
          <div style={{ position: "relative" }}>
            <input
              type={show ? "text" : "password"}
              className="large-input"
              placeholder={provider.placeholder}
              value={key}
              onChange={(e) => { setKey(e.target.value); setError(""); setSuccess(""); }}
            />
            <button
              onClick={() => setShow((s) => !s)}
              style={{
                position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)",
              }}
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="settings-row">
          <label className="settings-label">Endpoint URL</label>
          <input
            className="large-input"
            value={endpoint}
            onChange={(e) => { setEndpoint(e.target.value); setError(""); setSuccess(""); }}
          />
        </div>

        <div className="settings-row">
          <label className="settings-label">Model Name</label>
          <input
            className="large-input"
            value={model}
            onChange={(e) => { setModel(e.target.value); setError(""); setSuccess(""); }}
          />
        </div>

        {error && (
          <div style={{
            color: "#ef4444", fontSize: 13, marginBottom: 16,
            padding: "10px 14px", borderRadius: 8,
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
            lineHeight: 1.5,
          }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{
            color: "#10b981", fontSize: 13, marginBottom: 16,
            padding: "10px 14px", borderRadius: 8,
            background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
            lineHeight: 1.5,
          }}>
            {success}
          </div>
        )}

        <div style={{ display: "flex", gap: 12 }}>
          <button className="save-btn" onClick={handleSave}>
            <Save size={18} /> Save Configuration
          </button>
          <button
            className="save-btn"
            onClick={handleTestConnection}
            disabled={testing}
            style={{
              background: "transparent",
              border: "1px solid var(--accent)",
              color: "var(--accent)",
              opacity: testing ? 0.6 : 1,
            }}
          >
            {testing ? <Loader2 size={18} className="spin" /> : <Zap size={18} />}
            {testing ? "Testing…" : "Test Connection"}
          </button>
        </div>
      </div>
    </div>
  );
}
