const FIELDS = ["provider", "groqKey", "groqModel", "openaiKey", "openaiModel", "style"];

// Modelos mostrados antes de consultar a API (ou se a consulta falhar).
const PROVIDERS = {
  groq: {
    keyField: "groqKey",
    modelField: "groqModel",
    modelsUrl: "https://api.groq.com/openai/v1/models",
    defaults: [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
    ],
    // Remove modelos que não geram texto (áudio, moderação etc.).
    isChatModel: (id) => !/whisper|tts|guard|distil|playai|orpheus/i.test(id),
  },
  openai: {
    keyField: "openaiKey",
    modelField: "openaiModel",
    modelsUrl: "https://api.openai.com/v1/models",
    defaults: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"],
    isChatModel: (id) =>
      /^(gpt-|o\d|chatgpt-)/.test(id) &&
      !/audio|realtime|tts|transcribe|image|search|instruct|embedding/i.test(id),
  },
};

const $ = (id) => document.getElementById(id);

function showProviderFields() {
  const provider = $("provider").value;
  document.querySelectorAll("fieldset[data-provider]").forEach((fs) => {
    fs.classList.toggle("active", fs.dataset.provider === provider);
  });
}

function fillModels(provider, models, selected) {
  const select = $(PROVIDERS[provider].modelField);
  const current = selected || select.value || PROVIDERS[provider].defaults[0];
  const list = [...new Set(models)];
  if (current && !list.includes(current)) list.unshift(current);

  select.innerHTML = "";
  list.forEach((id) => select.add(new Option(id, id)));
  select.value = current;
}

async function loadModelsFromApi(provider) {
  const config = PROVIDERS[provider];
  const key = $(config.keyField).value.trim();
  if (!key) return;

  try {
    const res = await fetch(config.modelsUrl, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    const ids = (data?.data || [])
      .map((m) => m.id)
      .filter(config.isChatModel)
      .sort();
    if (ids.length) {
      // Os padrões recomendados ficam no topo da lista.
      const preferred = config.defaults.filter((id) => ids.includes(id));
      fillModels(provider, [...preferred, ...ids]);
    }
  } catch (_) {
    // Sem rede ou token inválido: mantém a lista padrão.
  }
}

async function load() {
  // Tokens ficam só neste navegador (storage.local, sem sincronizar).
  const saved = await chrome.storage.local.get(FIELDS);
  ["provider", "groqKey", "openaiKey", "style"].forEach((key) => {
    if (saved[key]) $(key).value = saved[key];
  });
  for (const provider of Object.keys(PROVIDERS)) {
    const config = PROVIDERS[provider];
    fillModels(provider, config.defaults, saved[config.modelField]);
    loadModelsFromApi(provider);
  }
  showProviderFields();
}

$("provider").addEventListener("change", showProviderFields);
Object.keys(PROVIDERS).forEach((provider) => {
  $(PROVIDERS[provider].keyField).addEventListener("change", () =>
    loadModelsFromApi(provider)
  );
});

$("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = {};
  FIELDS.forEach((key) => (data[key] = $(key).value.trim()));

  const key = data.provider === "groq" ? data.groqKey : data.openaiKey;
  if (!key) {
    $("status").style.color = "#d93025";
    $("status").textContent = "Informe o token do provedor selecionado.";
    return;
  }

  await chrome.storage.local.set(data);
  $("status").style.color = "";
  $("status").textContent = "Configurações salvas ✓";
  setTimeout(() => ($("status").textContent = ""), 2500);
});

load();
