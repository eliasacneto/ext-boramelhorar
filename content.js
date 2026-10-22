// Content script: mostra o botão "Melhorar" ao lado da caixa de mensagem do WhatsApp Web.
(() => {
  const ICON = `
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path fill="currentColor" d="M9.5 2l1.6 4.4L15.5 8l-4.4 1.6L9.5 14l-1.6-4.4L3.5 8l4.4-1.6L9.5 2zm8 7l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1 1-2.5zM6 15l.8 2.2L9 18l-2.2.8L6 21l-.8-2.2L3 18l2.2-.8L6 15z"/>
    </svg>`;
  const SPINNER = `<span class="mt-spinner" aria-hidden="true"></span>`;

  let button = null;
  let toast = null;
  let busy = false;
  let lastText = null; // texto original, para desfazer

  function getComposer() {
    return (
      document.querySelector('footer div[contenteditable="true"][role="textbox"]') ||
      document.querySelector('footer div[contenteditable="true"]') ||
      document.querySelector('#main footer [contenteditable="true"]')
    );
  }

  function getText(el) {
    return (el?.innerText || "").replace(/ /g, " ").trim();
  }

  function createButton() {
    button = document.createElement("button");
    button.type = "button";
    button.className = "mt-improve-btn";
    button.title = "Melhorar o texto";
    button.innerHTML = ICON;
    // mousedown evita que o editor perca o foco/seleção
    button.addEventListener("mousedown", (e) => e.preventDefault());
    button.addEventListener("click", onClick);
    document.body.appendChild(button);
  }

  function showToast(message, actionLabel, onAction) {
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "mt-toast";
      document.body.appendChild(toast);
    }
    toast.innerHTML = "";
    const span = document.createElement("span");
    span.textContent = message;
    toast.appendChild(span);
    if (actionLabel) {
      const action = document.createElement("button");
      action.type = "button";
      action.textContent = actionLabel;
      action.addEventListener("mousedown", (e) => e.preventDefault());
      action.addEventListener("click", () => {
        onAction();
        toast.classList.remove("mt-visible");
      });
      toast.appendChild(action);
    }
    toast.classList.add("mt-visible");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove("mt-visible"), 6000);
  }

  function position() {
    const composer = getComposer();
    if (!button) createButton();

    const hasText = composer && getText(composer).length > 0;
    if (!composer || (!hasText && !busy)) {
      button.classList.remove("mt-visible");
      return;
    }

    const rect = composer.getBoundingClientRect();
    const size = 34;
    // Fica logo acima do canto direito da caixa de texto, sem cobrir o que foi digitado.
    button.style.top = `${rect.top - size - 10}px`;
    button.style.left = `${rect.right - size}px`;
    button.classList.add("mt-visible");

    if (toast) {
      toast.style.left = `${rect.left}px`;
      toast.style.bottom = `${window.innerHeight - rect.top + 12}px`;
    }
  }

  // Substitui o conteúdo do editor (Lexical) do WhatsApp simulando uma colagem.
  function replaceText(composer, text) {
    composer.focus();
    document.execCommand("selectAll", false, null);

    const data = new DataTransfer();
    data.setData("text/plain", text);
    const pasteEvent = new ClipboardEvent("paste", {
      clipboardData: data,
      bubbles: true,
      cancelable: true,
    });
    composer.dispatchEvent(pasteEvent);

    // Fallback caso o editor não tenha tratado o evento de colagem.
    setTimeout(() => {
      if (getText(composer) !== text.trim()) {
        composer.focus();
        document.execCommand("selectAll", false, null);
        document.execCommand("insertText", false, text);
      }
      position();
    }, 50);
  }

  function setBusy(value) {
    busy = value;
    button.disabled = value;
    button.classList.toggle("mt-busy", value);
    button.innerHTML = value ? SPINNER : ICON;
  }

  async function onClick() {
    if (busy) return;
    const composer = getComposer();
    const original = getText(composer);
    if (!original) return;

    setBusy(true);
    try {
      const response = await chrome.runtime.sendMessage({
        type: "IMPROVE_TEXT",
        text: original,
      });
      if (!response?.ok) throw new Error(response?.error || "Erro desconhecido.");

      lastText = original;
      replaceText(getComposer(), response.text);
      showToast("Texto melhorado ✨", "Desfazer", () => {
        if (lastText != null) replaceText(getComposer(), lastText);
      });
    } catch (err) {
      const msg = String(err?.message || err);
      showToast(
        msg.includes("Extension context invalidated")
          ? "A extensão foi atualizada. Recarregue a página do WhatsApp."
          : msg
      );
    } finally {
      setBusy(false);
      position();
    }
  }

  // Reposiciona em qualquer mudança (digitação, troca de conversa, resize).
  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      position();
    });
  }

  new MutationObserver(schedule).observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  document.addEventListener("input", schedule, true);
  window.addEventListener("resize", schedule);
  schedule();
})();
