// ==UserScript==
// @name         Instagram DM Translator (LibreTranslate)
// @namespace    https://github.com/kingtusks
// @version      2.1.0
// @description  Translates Instagram DM messages in-place using local LibreTranslate.
// @author       kingtusks
// @match        https://www.instagram.com/direct/*
// @grant        GM_xmlhttpRequest
// @connect      localhost
// ==/UserScript==

(function () {
    'use strict';

    const CONFIG = {
        libreUrl:     'http://localhost:5000/translate',
        sourceLang:   'tr',
        targetLang:   'en',
        minLength:    2,
        requestDelay: 200,
        doneAttr:     'data-igt-dm',
        selectors:    ['div[dir="auto"]'],
    };

    const queue = [];
    let processing = false;

    function enqueue(el) {
        if (!queue.includes(el)) queue.push(el);
        if (!processing) processQueue();
    }

    async function processQueue() {
        processing = true;
        while (queue.length > 0) {
            const el = queue.shift();
            await translateElement(el);
            await sleep(CONFIG.requestDelay);
        }
        processing = false;
    }

    function translate(text) {
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: CONFIG.libreUrl,
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify({
                    q: text,
                    source: CONFIG.sourceLang,
                    target: CONFIG.targetLang,
                    format: 'text',
                }),
                onload(res) {
                    try {
                        const data = JSON.parse(res.responseText);
                        resolve(data.translatedText ?? null);
                    } catch {
                        resolve(null);
                    }
                },
                onerror:   () => resolve(null),
                ontimeout: () => resolve(null),
            });
        });
    }

    async function translateElement(el) {
        if (el.getAttribute(CONFIG.doneAttr)) return;

        const original = el.innerText.trim();
        if (!original || original.length < CONFIG.minLength) return;
        if (looksLikeTarget(original)) return;

        el.setAttribute(CONFIG.doneAttr, 'pending');
        el.style.opacity = '0.5';

        const result = await translate(original);

        if (result && result.trim() !== original) {
            el.innerText = result;
            el.title = original;
            el.setAttribute(CONFIG.doneAttr, 'done');
            el.style.opacity = '1';
            el.style.fontStyle = 'italic';
        } else {
            el.setAttribute(CONFIG.doneAttr, 'skip');
            el.style.opacity = '1';
        }
    }

    function looksLikeTarget(text) {
        return /^[\d\s\p{Emoji}]+$/u.test(text);
    }

    function scanMessages() {
        CONFIG.selectors.forEach((sel) => {
            document.querySelectorAll(sel).forEach((el) => {
                if (!el.getAttribute(CONFIG.doneAttr)) enqueue(el);
            });
        });
    }

    let debounce = null;
    const observer = new MutationObserver(() => {
        clearTimeout(debounce);
        debounce = setTimeout(scanMessages, 400);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    function sleep(ms) {
        return new Promise((res) => setTimeout(res, ms));
    }

    scanMessages();
})();