// ==UserScript==
// @name         Instagram DM Translator (Google)
// @namespace    https://github.com/kingtusks
// @version      3.2.0
// @description  Translates Instagram DM messages in-place using unofficial Google Translate.
// @author       kingtusks
// @match        https://www.instagram.com/direct/*
// @grant        GM_xmlhttpRequest
// @connect      translate.googleapis.com
// ==/UserScript==

(function () {
    'use strict';

    const CONFIG = {
        targetLang:   'en',
        sourceLang:   null, //null detects then translates but u can set a specific with 'tr' for turkish for ex
        minLength:    2,
        requestDelay: 300,
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
            const sl = CONFIG.sourceLang || 'auto';
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${CONFIG.targetLang}&dt=t&q=${encodeURIComponent(text)}`;
            GM_xmlhttpRequest({
                method: 'GET',
                url,
                onload(res) {
                    try {
                        const data = JSON.parse(res.responseText);
                        const translated = data[0].map(chunk => chunk[0]).join('');
                        const detectedLang = data[2];
                        resolve({ translated, detectedLang });
                    } catch {
                        resolve(null);
                    }
                },
                onerror:   () => resolve(null),
                ontimeout: () => resolve(null),
            });
        });
    }

    async function translateElement(el, force = false) {
        if (!force && el.getAttribute(CONFIG.doneAttr)) return;

        const original = force
            ? (el.title || el.innerText.trim())
            : el.innerText.trim();

        if (!original || original.length < CONFIG.minLength) return;
        if (!force && /^[\d\s\p{Emoji}]+$/u.test(original)) return;

        el.setAttribute(CONFIG.doneAttr, 'pending');
        el.style.opacity = '0.5';

        const result = await translate(original);

        if (!result) {
            el.setAttribute(CONFIG.doneAttr, 'skip');
            el.style.opacity = '1';
            return;
        }

        const { translated, detectedLang } = result;

        if (!force) {
            const isTargetLang = detectedLang === CONFIG.targetLang;
            const isWrongSourceLang = CONFIG.sourceLang && detectedLang !== CONFIG.sourceLang;

            if (isTargetLang || isWrongSourceLang || translated.trim() === original) {
                el.setAttribute(CONFIG.doneAttr, 'skip');
                el.style.opacity = '1';
                return;
            }
        }

        el.innerText = translated;
        el.title = original;
        el.setAttribute(CONFIG.doneAttr, 'done');
        el.style.opacity = '1';
        el.style.fontStyle = 'italic';
    }

    function onDoubleClick(e) {
        const el = e.target.closest(CONFIG.selectors.join(','));
        if (!el) return;
        e.preventDefault();
        translateElement(el, true);
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
    document.addEventListener('dblclick', onDoubleClick);

    function sleep(ms) {
        return new Promise((res) => setTimeout(res, ms));
    }

    scanMessages();
})();