// GB 역량사전 — Cloudflare Worker
// 정적 화면(public/)은 Cloudflare가 그대로 내보내고, /api/chat 만 이 코드가 처리합니다.
// API 키는 Cloudflare 비밀값(ANTHROPIC_API_KEY)으로만 보관하며 브라우저에 노출되지 않습니다.

const MODEL = "claude-sonnet-5-5";
const MAX_TOKENS = 1500;
const MAX_SYSTEM_CHARS = 120000;
const MAX_HISTORY_TURNS = 12;
const MAX_TURN_CHARS = 4000;

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

// 브라우저가 보낸 대화는 user/assistant 교대, user로 끝나는 것만 받는다
function cleanMessages(raw) {
  if (!Array.isArray(raw)) return [];
  const turns = raw
    .filter(t => t && (t.role === "user" || t.role === "assistant") && typeof t.content === "string" && t.content.trim())
    .map(t => ({ role: t.role, content: t.content.slice(0, MAX_TURN_CHARS) }))
    .slice(-MAX_HISTORY_TURNS);
  while (turns.length && turns[0].role !== "user") turns.shift();
  if (!turns.length || turns[turns.length - 1].role !== "user") return [];
  for (let i = 0; i < turns.length; i++) if (turns[i].role !== (i % 2 ? "assistant" : "user")) return [];
  return turns;
}

async function handleChat(request, env) {
  // 다른 사이트에서 이 주소를 호출하지 못하게 막는다
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json(403, { error: { message: "허용되지 않은 요청입니다." } });

  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  if (env.CHAT_LIMITER) {
    const { success } = await env.CHAT_LIMITER.limit({ key: ip });
    if (!success) return json(429, { error: { message: "질문이 너무 잦습니다. 1분 뒤에 다시 시도해주세요." } });
  }
  if (!env.ANTHROPIC_API_KEY) {
    return json(500, { error: { message: "API 키가 설정되지 않았습니다. Cloudflare 비밀값 ANTHROPIC_API_KEY를 확인해주세요." } });
  }

  let body;
  try { body = await request.json(); } catch { return json(400, { error: { message: "잘못된 요청 형식입니다." } }); }

  const system = typeof body?.system === "string" ? body.system.slice(0, MAX_SYSTEM_CHARS) : "";
  const messages = cleanMessages(body?.messages);
  if (!messages.length) return json(400, { error: { message: "질문 내용이 없습니다." } });

  const started = Date.now();
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system,
      messages,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
    }),
  });

  const data = await resp.json().catch(() => ({ error: { message: "AI 서버 응답을 읽지 못했습니다." } }));
  console.log(JSON.stringify({
    event: "chat", status: resp.status, ms: Date.now() - started, turns: messages.length,
    stop: data?.stop_reason, usage: data?.usage,
  }));
  return json(resp.status, data);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/chat") {
      if (request.method !== "POST") return json(405, { error: { message: "Method not allowed" } });
      return handleChat(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
