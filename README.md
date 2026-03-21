# igtranslate

Tampermonkey userscript that translates Instagram DM messages in-place using a self-hosted [LibreTranslate](https://github.com/LibreTranslate/LibreTranslate) instance. Messages are replaced with translated text directly in the chat bubble. No external APIs, no rate limits.

---

## Requirements

- [Tampermonkey](https://www.tampermonkey.net/) browser extension
- [Docker](https://www.docker.com/)

---

## Setup

### 1. Start LibreTranslate

Run the container with only the languages you need (each model is ~300MB):

```bash
docker run -d \
  --name libretranslate \
  --restart unless-stopped \
  -p 5000:5000 \
  libretranslate/libretranslate \
  --load-only en,tr
```

Add any additional language codes to `--load-only` as needed (e.g. `en,tr,es,fr`).

Verify it's working:

```bash
curl -X POST http://localhost:5000/translate \
  -H "Content-Type: application/json" \
  -d '{"q": "Merhaba", "source": "tr", "target": "en"}'
```

Expected response: `{"translatedText": "Hello"}`

### 2. Install the script

1. Open the Tampermonkey dashboard (click the extension icon → Dashboard)
2. Click the **+** tab
3. Delete the placeholder code
4. Paste the contents of `instagram-dm-translator.user.js`
5. Hit **Ctrl+S** to save

### 3. Use it

Navigate to any Instagram DM (`instagram.com/direct/...`) and refresh. Messages will be detected and translated automatically. Translated messages appear in italics — hover over them to see the original text.

---

## Configuration

All options are in the `CONFIG` object at the top of the script:

```js
const CONFIG = {
    libreUrl:     'http://localhost:5000',  // LibreTranslate base URL
    sourceLang:   'auto',                  // source language ('auto' for detection, or e.g. 'tr', 'es')
    targetLang:   'en',                    // language to translate into
    minLength:    2,                        // skip strings shorter than this (chars)
    requestDelay: 200,                      // ms between API calls
    doneAttr:     'data-igt-dm',           // DOM attribute used to mark processed elements
    selectors:    ['div[dir="auto"]'],      // CSS selectors targeting message bubbles
};
```

### Common config changes

| What you want | What to change |
|---|---|
| Translate to Spanish instead | `targetLang: 'es'` |
| Lock source to Turkish (faster, skips detection) | `sourceLang: 'tr'` |
| LibreTranslate running on a different port | `libreUrl: 'http://localhost:YOUR_PORT'` |
| LibreTranslate on another machine in your network | `libreUrl: 'http://YOUR_IP:5000'` — also update `@connect` in the header |
| Slow down API calls | Increase `requestDelay` |

---

## Troubleshooting

**Nothing is being translated**

Open the browser console (F12) and run:
```js
document.querySelectorAll('[data-igt-dm]').length
```
If this returns `0`, the script isn't touching any elements. Check that Tampermonkey is enabled on the page (click the icon — it should show your script with a checkmark).

**Selectors stopped working**

Instagram occasionally changes their DOM. If translations stop working, right-click a message bubble → Inspect, find the element containing the message text, and update the `selectors` array in `CONFIG` to match.

**LibreTranslate connection error**

Check the container is running:
```bash
docker ps
```
If it's not listed, restart it:
```bash
docker start libretranslate
```

---

## Language codes

Some common codes for `sourceLang` / `targetLang`:

| Language | Code |
|---|---|
| English | `en` |
| Turkish | `tr` |
| Spanish | `es` |
| French | `fr` |
| German | `de` |
| Arabic | `ar` |
| Japanese | `ja` |
| Chinese | `zh` |
| Russian | `ru` |
| Korean | `ko` |
| Portuguese | `pt` |

Full list: [LibreTranslate language support](https://github.com/LibreTranslate/LibreTranslate#language-support)