// Service worker: faz as chamadas à API (Groq ou OpenAI) fora da página do WhatsApp.

const PROVIDERS = {
  groq: {
    url: "https://api.groq.com/openai/v1/chat/completions",
    defaultModel: "llama-3.3-70b-versatile",
  },
  openai: {
    url: "https://api.openai.com/v1/chat/completions",
    defaultModel: "gpt-4o-mini",
  },
};

const STYLES = {
  natural:
    "Melhore o texto mantendo um tom natural e amigável, adequado para uma conversa de WhatsApp.",
  formal:
    "Reescreva o texto em um tom profissional e educado, adequado para comunicação de trabalho.",
  informal:
    "Reescreva o texto em um tom descontraído e próximo, como entre amigos.",
  corrigir:
    "Apenas corrija ortografia, gramática e pontuação. Não mude o estilo nem as palavras além do necessário.",
};

function buildSystemPrompt(style) {
  return [
    "Você é um assistente que melhora mensagens escritas por um usuário.",
    STYLES[style] || STYLES.natural,
    "Regras:",
    "- Mantenha o mesmo idioma do texto original.",
    "- Preserve o sentido, nomes, números, links e emojis.",
    "- Não adicione informações novas nem saudações que não existiam.",
    "- Responda SOMENTE com o texto final melhorado, sem aspas, sem explicações e sem prefixos.",
  ].join("\n");
}

async function improveText(text) {
  const settings = await chrome.storage.local.get([
    "provider",
    "groqKey",
    "openaiKey",
    "groqModel",
    "openaiModel",
    "style",
  ]);

  const provider = settings.provider || "groq";
  const config = PROVIDERS[provider];
  const apiKey = provider === "groq" ? settings.groqKey : settings.openaiKey;
  const model =
    (provider === "groq" ? settings.groqModel : settings.openaiModel) ||
    config.defaultModel;

  if (!apiKey) {
    throw new Error(
      `Nenhum token ${provider === "groq" ? "do Groq" : "da OpenAI"} salvo. Clique no ícone da extensão para configurar.`
    );
  }

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages: [
        { role: "system", content: buildSystemPrompt(settings.style) },
        { role: "user", content: text },
      ],
    }),
  });

  if (!response.ok) {
    let detail = "";
    try {
      const data = await response.json();
      detail = data?.error?.message || "";
    } catch (_) {}
    if (response.status === 401) {
      throw new Error("Token inválido. Verifique o token nas configurações da extensão.");
    }
    throw new Error(`Erro ${response.status}${detail ? `: ${detail}` : ""}`);
  }

  const data = await response.json();
  const result = data?.choices?.[0]?.message?.content?.trim();
  if (!result) throw new Error("A IA não retornou nenhum texto.");
  return result;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "IMPROVE_TEXT") return;
  improveText(message.text)
    .then((text) => sendResponse({ ok: true, text }))
    .catch((err) => sendResponse({ ok: false, error: err.message }));
  return true; // resposta assíncrona
});
