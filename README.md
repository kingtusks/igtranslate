# igtranslate

Tampermonkey userscript that translates Instagram DM messages in-place using the unofficial Google Translate API. Messages are replaced with translated text directly in the chat bubble. No API key, no Docker, no rate limits.

---

## Requirements

- [Tampermonkey](https://www.tampermonkey.net/) browser extension

---

## Setup

1. Open the Tampermonkey dashboard (click the extension icon → Dashboard)
2. Click the **+** tab
3. Delete the placeholder code
4. Paste the contents of `instagram-dm-translator.user.js`
5. Hit **Ctrl+S** to save
6. Navigate to any Instagram DM (`instagram.com/direct/...`) and refresh

---

## Usage

Messages are translated automatically on load and as new ones come in. Translated messages appear in italics — hover over them to see the original text.

**Double-click** any message bubble to force-translate it, bypassing all filters. Useful for messages that were skipped or already-translated messages you want to re-translate.

---

## Configuration

All options are in the `CONFIG` object at the top of the script:

```js
const CONFIG = {
    targetLang:   'en',   // language to translate into
    sourceLang:   null,   // null = translate all languages, or set e.g. 'tr' for Turkish only
    minLength:    2,      // skip strings shorter than this (chars)
    requestDelay: 300,    // ms between API calls
    doneAttr:     'data-igt-dm',        // DOM attribute used to mark processed elements
    selectors:    ['div[dir="auto"]'],  // CSS selectors targeting message bubbles
};
```

### sourceLang

Controls which language gets translated:

| Value | Behavior |
|---|---|
| `null` | Translates everything that isn't already in `targetLang` |
| `'tr'` | Only translates Turkish messages, skips everything else |
| `'es'` | Only translates Spanish messages, skips everything else |

### Common config changes

| What you want | What to change |
|---|---|
| Translate to Spanish instead | `targetLang: 'es'` |
| Only translate Turkish | `sourceLang: 'tr'` |
| Translate all foreign languages | `sourceLang: null` |
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

Instagram occasionally changes their DOM. If translations stop working, right-click a message bubble → Inspect, find the element containing the message text, and update the `selectors` array in `CONFIG` to match. Then run this in the console to verify:
```js
document.querySelectorAll('div[dir="auto"]').length
```
It should return a number greater than 0.

**A message isn't being translated**

Double-click it to force-translate. If that also fails, open the console and check for network errors — the unofficial Google Translate endpoint can occasionally be unreachable.

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