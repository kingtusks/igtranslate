// ==UserScript==
// @name         Instagram DM Translator (Google)
// @namespace    https://github.com/kingtusks
// @version      3.6.0
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
        sourceLang:   null,
        outgoingLang: 'tr',
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

    function translate(text, sourceLang, targetLang) {
        return new Promise((resolve) => {
            const sl = sourceLang || 'auto';
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
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

        const result = await translate(original, CONFIG.sourceLang, CONFIG.targetLang);

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

        el.innerText = translated.toLowerCase();
        el.title = original;
        el.setAttribute(CONFIG.doneAttr, 'done');
        el.style.opacity = '1';
        el.style.fontStyle = 'italic';
    }

    function getInputBox() {
        return document.querySelector('div[contenteditable="true"][role="textbox"]');
    }

    function getInputText(inputEl) {
        return [...inputEl.querySelectorAll('span[data-lexical-text="true"]')]
            .map(s => s.innerText)
            .join('') || inputEl.innerText.trim();
    }

    function setInputText(inputEl, text) {
        inputEl.focus();
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(inputEl);
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand('insertText', false, text);
    }

    function createTranslateButton() {
        const btn = document.createElement('button');
        btn.id = 'igt-send-btn';
        btn.title = `Translate to ${CONFIG.outgoingLang.toUpperCase()}`;
        Object.assign(btn.style, {
            background:     'none',
            border:         'none',
            padding:        '0 8px',
            margin:         '0',
            cursor:         'pointer',
            display:        'inline-flex',
            alignItems:     'center',
            alignSelf:      'center',
            justifyContent: 'center',
            color:          'currentColor',
            opacity:        '0.85',
            flexShrink:     '0',
        });

        btn.innerHTML = `
            <svg aria-label="Translate message" fill="currentColor" height="24" role="img" viewBox="0 0 24 24" width="24">
                <path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0 0 14.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
            </svg>
        `;

        btn.addEventListener('mouseenter', () => btn.style.opacity = '1');
        btn.addEventListener('mouseleave', () => btn.style.opacity = '0.85');

        return btn;
    }

    async function handleTranslateClick() {
        const btn = document.getElementById('igt-send-btn');
        const inputEl = getInputBox();
        if (!inputEl) { console.log('[IGT] no input box found'); return; }

        const text = getInputText(inputEl);
        if (!text) { console.log('[IGT] empty text, aborting'); return; }

        if (btn) { btn.style.opacity = '0.4'; btn.disabled = true; }

        const result = await translate(text, 'auto', CONFIG.outgoingLang);

        if (result?.translated) {
            setInputText(inputEl, result.translated.toLowerCase());
        } else {
        }

        if (btn) { btn.style.opacity = '0.85'; btn.disabled = false; }
    }

    function injectButton() {
        if (document.getElementById('igt-send-btn')) return;

        const sendBtn = [...document.querySelectorAll('div[role="button"]')]
            .find(b => b.innerText.trim() === 'Send');
        if (!sendBtn) return;

        sendBtn.parentElement.insertBefore(createTranslateButton(), sendBtn);
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
        injectButton();
    }

    let debounce = null;
    const observer = new MutationObserver(() => {
        clearTimeout(debounce);
        debounce = setTimeout(scanMessages, 400);
    });

    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('dblclick', onDoubleClick);
    document.addEventListener('click', (e) => {
        if (e.target.closest('#igt-send-btn')) handleTranslateClick();
    });

    function sleep(ms) {
        return new Promise((res) => setTimeout(res, ms));
    }

    scanMessages();
})();