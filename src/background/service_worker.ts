import type { PageData, Insights, ChatMessage } from "../types";

// OpenAI-compatible chat completions — works with OpenAI, Gemini, Groq, OpenRouter, Mistral, Ollama, etc.

interface ApiConfig {
  apiKey: string;
  endpoint: string; // e.g. https://api.openai.com/v1
  model: string;
}

// Strip any character outside ISO-8859-1 range (invisible Unicode, zero-width spaces, etc.)
// HTTP headers only allow Latin-1 — pasted API keys often carry hidden Unicode chars.
function sanitizeLatin1(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/[^\u0000-\u00FF]/g, "").trim();
}

async function getApiConfig(): Promise<ApiConfig | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["apiKey", "apiEndpoint", "modelName"], (result) => {
      if (!result.apiEndpoint || !result.modelName) {
        resolve(null);
        return;
      }
      resolve({
        apiKey: result.apiKey ? sanitizeLatin1(result.apiKey) : "",
        endpoint: result.apiEndpoint,
        model: result.modelName,
      });
    });
  });
}

function buildPageContext(pageData: PageData): string {
  const headingsList = pageData.headings
    .map((h) => `${"#".repeat(h.level)} ${h.text}`)
    .join("\n");

  const linksSample = pageData.links
    .slice(0, 30)
    .map((l) => `- [${l.text || "link"}](${l.href}) ${l.isExternal ? "(external)" : "(internal)"}`)
    .join("\n");

  return `
URL: ${pageData.url}
Title: ${pageData.title}
Author: ${pageData.meta.author || "Unknown"}
Published: ${pageData.meta.publishDate || "Unknown"}
Description: ${pageData.meta.description || "None"}
Word Count: ${pageData.wordCount}
Reading Time: ${pageData.readingTime} min
Internal Links: ${pageData.internalLinkCount} | External Links: ${pageData.externalLinkCount}

=== HEADINGS STRUCTURE ===
${headingsList || "None"}

=== MAIN CONTENT ===
${pageData.bodyText.slice(0, 6000)}

=== LINKS SAMPLE ===
${linksSample || "None"}
  `.trim();
}

// Non-streaming call for insights — with auto-retry on 429 rate limits
async function callAI(config: ApiConfig, systemPrompt: string, userMessage: string): Promise<string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  }
  // OpenRouter requires these headers
  if (config.endpoint.includes("openrouter.ai")) {
    headers["HTTP-Referer"] = "https://pagepilot.extension";
    headers["X-Title"] = "PagePilot";
  }

  const url = `${config.endpoint}/chat/completions`;
  const body = JSON.stringify({
    model: config.model,
    max_tokens: 512,
    stream: false,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });

  const MAX_RETRIES = 3;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    console.log(`[PagePilot] Fetching insights from: ${url} (attempt ${attempt + 1})`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    let response;
    try {
      response = await fetch(url, { method: "POST", headers, body, signal: controller.signal });
    } catch (e) {
      clearTimeout(timeoutId);
      throw new Error(`Connection failed or timed out: ${String(e)}`);
    }
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json() as {
        choices: Array<{ message: { content: string } }>;
      };
      return data.choices[0].message.content.trim();
    }

    if (response.status === 429 && attempt < MAX_RETRIES) {
      // Parse retry-after or use exponential backoff
      const retryAfter = response.headers.get("retry-after");
      const waitMs = retryAfter ? parseFloat(retryAfter) * 1000 : (2 ** attempt) * 2000;
      
      if (waitMs > 10000) {
        throw new Error(`Rate limit exceeded (429). Please try again in ${Math.round(waitMs / 1000)} seconds.`);
      }

      console.log(`[PagePilot] Rate limited (429). Retrying in ${waitMs}ms…`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    const err = await response.text();
    throw new Error(`API error ${response.status}: ${err}`);
  }

  throw new Error("Max retries exceeded for API call.");
}

async function generateInsights(pageData: PageData, config: ApiConfig): Promise<Insights> {
  const pageContext = buildPageContext(pageData);

  const systemPrompt = `You are PagePilot, an AI that analyzes webpages. Given the page content, return a JSON object with these exact fields:
{
  "summary": "2-3 sentence TL;DR of the page",
  "keyTopics": ["topic1", "topic2", ...up to 8 topics],
  "sentiment": "positive" | "neutral" | "negative",
  "sentimentScore": 0-100,
  "pageType": "article" | "e-commerce" | "documentation" | "landing-page" | "social" | "forum" | "other"
}
Return ONLY the raw JSON, no markdown, no explanation.`;

  const raw = await callAI(config, systemPrompt, `Analyze this webpage:\n\n${pageContext}`);

  // Extract JSON object if model is chatty or wraps in markdown
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    const cleaned = match ? match[0] : raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    return JSON.parse(cleaned) as Insights;
  } catch (error) {
    console.warn("[PagePilot] AI returned invalid JSON. Using fallback. Raw response:", raw);
    return {
      summary: "Could not generate summary. The AI model returned an invalid or unsupported format.",
      keyTopics: ["Parsing Error"],
      sentiment: "neutral",
      sentimentScore: 50,
      pageType: "other"
    };
  }
}

// Streaming chat via long-lived port
async function streamChat(
  port: chrome.runtime.Port,
  pageData: PageData,
  messages: ChatMessage[],
  userMessage: string,
  config: ApiConfig
) {
  const pageContext = buildPageContext(pageData);

  const systemPrompt = `You are PagePilot, an AI assistant. The user is asking questions about the webpage they are viewing. Answer ONLY based on the page content below. If the answer is not on the page, say so honestly. Be concise and helpful.

=== PAGE CONTENT ===
${pageContext}`;

  const formattedMessages = [
    { role: "system" as const, content: systemPrompt },
    ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: userMessage },
  ];

  try {
    const streamHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (config.apiKey) {
      streamHeaders["Authorization"] = `Bearer ${config.apiKey}`;
    }
    if (config.endpoint.includes("openrouter.ai")) {
      streamHeaders["HTTP-Referer"] = "https://pagepilot.extension";
      streamHeaders["X-Title"] = "PagePilot";
    }

    const url = `${config.endpoint}/chat/completions`;
    console.log(`[PagePilot] Streaming chat from: ${url}`);

    const response = await fetch(url, {
      method: "POST",
      headers: streamHeaders,
      body: JSON.stringify({
        model: config.model,
        max_tokens: 1024,
        stream: true,
        messages: formattedMessages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      port.postMessage({ type: "ERROR", error: `API error ${response.status}: ${err}` });
      return;
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data) as {
            choices: Array<{ delta?: { content?: string } }>;
          };
          const text = parsed.choices?.[0]?.delta?.content;
          if (text) port.postMessage({ type: "CHUNK", text });
        } catch {
          // skip malformed SSE line
        }
      }
    }

    port.postMessage({ type: "DONE" });
  } catch (err) {
    port.postMessage({ type: "ERROR", error: String(err) });
  }
}

// ——— Message Handlers ———

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_API_KEY") {
    chrome.storage.local.get(["apiKey", "apiEndpoint", "modelName"], (result) => {
      sendResponse({ key: result.apiKey, endpoint: result.apiEndpoint, model: result.modelName });
    });
    return true;
  }

  if (message.type === "SET_API_KEY") {
    chrome.storage.local.set({
      apiKey: message.key,
      apiEndpoint: message.endpoint,
      modelName: message.model,
    }, () => sendResponse({ success: true }));
    return true;
  }

  if (message.type === "GET_INSIGHTS") {
    getApiConfig().then(async (config) => {
      if (!config) { sendResponse({ success: false, error: "Not configured" }); return; }
      try {
        const insights = await generateInsights(message.pageData as PageData, config);
        sendResponse({ success: true, insights });
      } catch (err) {
        sendResponse({ success: false, error: String(err) });
      }
    }).catch((err) => {
      sendResponse({ success: false, error: `Unexpected error: ${String(err)}` });
    });
    return true;
  }
});

// Long-lived port for streaming chat
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "CHAT_STREAM") return;

  port.onMessage.addListener(async (msg) => {
    if (msg.type !== "CHAT_STREAM") return;
    const config = await getApiConfig();
    if (!config) {
      port.postMessage({ type: "ERROR", error: "API not configured. Click ⚙️ to set up." });
      return;
    }
    await streamChat(port, msg.pageData, msg.messages, msg.userMessage, config);
  });
});
