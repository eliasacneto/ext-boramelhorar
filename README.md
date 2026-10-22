# ext-boramelhorar — Melhore o texto

Extensão para Google Chrome que melhora as mensagens digitadas no **WhatsApp Web** usando IA (**Groq** ou **OpenAI**).

Ao digitar uma mensagem, aparece um botão ✨ acima da caixa de texto. Com um clique, o texto é reescrito pela IA e substituído na caixa, com opção de **Desfazer**.

## Instalação

1. Abra `chrome://extensions` e ative o **Modo do desenvolvedor**.
2. Clique em **Carregar sem compactação** e selecione esta pasta.
3. Clique no ícone da extensão, escolha o provedor (Groq ou OpenAI), cole o token, escolha o modelo e o estilo, e clique em **Salvar**.
4. Abra (ou recarregue) o [WhatsApp Web](https://web.whatsapp.com).

Tokens:
- Groq: https://console.groq.com/keys
- OpenAI: https://platform.openai.com/api-keys

O token fica salvo apenas no navegador (`chrome.storage.local`) e é enviado somente à API do provedor escolhido.

## Estilos

- **Natural** — tom amigável de conversa
- **Formal / profissional**
- **Descontraído**
- **Só corrigir erros** — apenas ortografia, gramática e pontuação

## Estrutura

| Arquivo | Função |
| --- | --- |
| `manifest.json` | Configuração da extensão (Manifest V3) |
| `content.js` / `content.css` | Botão e substituição do texto no WhatsApp Web |
| `background.js` | Chamadas às APIs do Groq e da OpenAI |
| `popup.html` / `popup.js` / `popup.css` | Tela de configuração |

---

Desenvolvido por **AllyTech**.
