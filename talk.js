/**
 * TALK — Unified Fleet Conversation Service
 * inherits: CHAT + INTEL
 *
 * One service. Every frontend. Every domain.
 * Advanced MD parsing, typing animation, INTEL ledger wiring.
 *
 * Usage:
 *   <script src="/talk.js"></script>
 *   <script>TALK.init({ scope: 'HADLEY LAB', system: '...' });</script>
 *
 * HTML contract (from DESIGN.css Layer 10):
 *   #talkBar, #talkInput, #talkOverlay, #talkMessages, #talkChatInput
 *
 * Optional INTEL DOM:
 *   #talkIntelTimeline — renders LEARNING.json ledger entries
 *
 * API: https://api.canonic.org/chat (Cloudflare Workers)
 *
 * TALK | CANONIC | 2026-02-11
 */

const TALK = {
    api: 'https://api.canonic.org/chat',
    messages: [],
    scope: 'CANONIC',
    system: 'You are TALK, the CANONIC conversation service. Answer concisely.',
    intelLedger: [],

    // ── Initialize ──────────────────────────────────────────────────
    init(config) {
        if (config.scope) this.scope = config.scope;
        if (config.system) this.system = config.system;
        if (config.api) this.api = config.api;

        // Wire event listeners
        var talkInput = document.getElementById('talkInput');
        var chatInput = document.getElementById('talkChatInput');

        if (talkInput) {
            talkInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') TALK.open();
            });
        }
        if (chatInput) {
            chatInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') TALK.send();
            });
        }
        document.addEventListener('keydown', function(e) {
            var overlay = document.getElementById('talkOverlay');
            if (e.key === 'Escape' && overlay && overlay.classList.contains('open')) {
                TALK.close();
            }
        });

        // Load INTEL ledger (async, non-blocking)
        this.loadIntel();
    },

    // ── Overlay Control ─────────────────────────────────────────────
    open() {
        var overlay = document.getElementById('talkOverlay');
        var barInput = document.getElementById('talkInput');
        var chatInput = document.getElementById('talkChatInput');
        if (!overlay) return;

        overlay.classList.add('open');
        if (barInput && barInput.value.trim()) {
            chatInput.value = barInput.value;
            barInput.value = '';
            setTimeout(function() { TALK.send(); }, 50);
        }
        setTimeout(function() { if (chatInput) chatInput.focus(); }, 100);
    },

    close() {
        var overlay = document.getElementById('talkOverlay');
        if (overlay) overlay.classList.remove('open');
        var barInput = document.getElementById('talkInput');
        if (barInput) barInput.focus();
    },

    // ── Markdown Parser (XSS-safe, headings + lists + code + inline) ──
    md(text) {
        var escaped = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Inline markdown
        var html = escaped
            .replace(/^### (.+)$/gm, '<h4>$1</h4>')
            .replace(/^## (.+)$/gm, '<h3>$1</h3>')
            .replace(/^# (.+)$/gm, '<h2>$1</h2>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>');

        // Block-level: lists + paragraphs
        var lines = html.split('\n');
        var result = [];
        var inList = false;
        var listType = null;

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var ulMatch = line.match(/^- (.+)$/);
            var olMatch = line.match(/^\d+\. (.+)$/);

            if (ulMatch || olMatch) {
                var newType = ulMatch ? 'ul' : 'ol';
                if (!inList) {
                    result.push('<' + newType + '>');
                    inList = true;
                    listType = newType;
                } else if (listType !== newType) {
                    result.push('</' + listType + '><' + newType + '>');
                    listType = newType;
                }
                result.push('<li>' + (ulMatch || olMatch)[1] + '</li>');
            } else {
                if (inList) { result.push('</' + listType + '>'); inList = false; listType = null; }
                if (line.trim()) {
                    result.push(line.indexOf('<h') === 0 ? line : '<p>' + line + '</p>');
                }
            }
        }
        if (inList) result.push('</' + listType + '>');
        return result.join('');
    },

    // ── Scrolling ───────────────────────────────────────────────────
    isNearBottom(el) {
        return el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    },

    scrollToBottom(el) {
        el.scrollTo({ top: el.scrollHeight, behavior: 'auto' });
    },

    // ── Typing Animation ────────────────────────────────────────────
    async typeMessage(rawText, element, container) {
        var wasNearBottom = container ? this.isNearBottom(container) : true;
        var words = rawText.split(/(\s+)/g).filter(function(w) { return w; });
        var displayed = '';
        element.classList.add('typing');

        for (var i = 0; i < words.length; i++) {
            displayed += words[i];
            element.innerHTML = this.md(displayed);
            if (container && (wasNearBottom || this.isNearBottom(container))) {
                this.scrollToBottom(container);
            }
            var word = words[i].trim();
            if (!word) continue;
            var delay = 20 + Math.random() * 12;
            if (/[.?!]$/.test(word)) delay += 80;
            if (/[,:]$/.test(word)) delay += 40;
            await new Promise(function(r) { setTimeout(r, delay); });
        }
        element.classList.remove('typing');
    },

    // ── Add Message ─────────────────────────────────────────────────
    add(content, role) {
        var el = document.getElementById('talkMessages');
        if (!el) return null;

        var div = document.createElement('div');
        div.className = 'message ' + role;

        var textDiv = document.createElement('div');
        if (role === 'assistant' && content && content.indexOf('Thinking') === -1) {
            textDiv.innerHTML = this.md(content);
        } else {
            textDiv.textContent = content;
        }

        div.appendChild(textDiv);
        el.appendChild(div);
        el.scrollTop = el.scrollHeight;
        return div;
    },

    // ── INTEL Ledger ────────────────────────────────────────────────
    async loadIntel() {
        var scope = this.scope.toUpperCase().replace(/\s/g, '');

        // Try FaaS first
        try {
            var res = await fetch('/api/faas/TALK/' + scope + '/learning');
            if (res.ok) {
                var data = await res.json();
                this.intelLedger = data.ledger || [];
                this.renderIntel();
                return;
            }
        } catch(e) { /* FaaS unavailable */ }

        // Try static LEARNING.json
        try {
            var res2 = await fetch('./LEARNING.json');
            if (res2.ok) {
                var data2 = await res2.json();
                this.intelLedger = data2.ledger || [];
                this.renderIntel();
                return;
            }
        } catch(e) { /* Static unavailable */ }
    },

    renderIntel() {
        var el = document.getElementById('talkIntelTimeline');
        if (!el || !this.intelLedger.length) return;

        el.innerHTML = '<div style="font-size:10px;font-weight:600;color:var(--fg-secondary,#6b7280);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">INTEL Ledger</div>' +
            this.intelLedger.map(function(e) {
                return '<div style="display:flex;gap:8px;font-size:11px;padding:4px 0;border-bottom:1px solid var(--border,#e5e7eb);">' +
                    '<span style="color:var(--fg-secondary,#6b7280);font-family:\'SF Mono\',Monaco,monospace;white-space:nowrap;">' + e.date + '</span>' +
                    '<span style="color:var(--fg,#374151);">' + e.text + '</span></div>';
            }).join('');
    },

    // ── Send Message ────────────────────────────────────────────────
    async send() {
        var input = document.getElementById('talkChatInput');
        if (!input) return;

        var text = input.value.trim();
        if (!text) return;
        input.value = '';

        this.add(text, 'user');
        this.messages.push({ role: 'user', content: text });

        var typing = this.add('Thinking...', 'assistant');
        var msgContainer = document.getElementById('talkMessages');

        try {
            var res = await fetch(this.api, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    history: this.messages.slice(-10),
                    system: this.system,
                    scope: this.scope
                })
            });

            if (!res.ok) throw new Error('API ' + res.status);

            var data = await res.json();
            if (typing) typing.remove();

            var reply = data.message || data.text ||
                (data.content && data.content[0] && data.content[0].text) ||
                'Could not process that.';

            // Render with typing animation
            var msgEl = this.add('', 'assistant');
            var textEl = msgEl ? (msgEl.querySelector('div') || msgEl.firstChild) : null;
            if (textEl) {
                await this.typeMessage(reply, textEl, msgContainer);
            } else {
                this.add(reply, 'assistant');
            }
            this.messages.push({ role: 'assistant', content: reply });
        } catch (e) {
            if (typing) typing.remove();
            this.add('Connection issue. Try again in a moment.', 'error');
        }

        input.focus();
    }
};

