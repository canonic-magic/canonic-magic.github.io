/**
 * TALK — Fleet-wide Chat Primitive
 * inherits: CHAT + INTEL
 *
 * The universal conversation service. Every frontend gets it.
 * Abstracted to AXIOMS in the GALAXY.
 *
 * Usage:
 *   <script src="/talk.js"></script>
 *   <script>TALK.init({ scope: 'HADLEY LAB', system: '...' });</script>
 *
 * HTML contract (from DESIGN.css Layer 10):
 *   #talkBar, #talkInput, #talkOverlay, #talkMessages, #talkChatInput
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

    // Initialize with page-specific config
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
    },

    // Open the overlay
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

    // Close the overlay
    close() {
        var overlay = document.getElementById('talkOverlay');
        if (overlay) overlay.classList.remove('open');
        var barInput = document.getElementById('talkInput');
        if (barInput) barInput.focus();
    },

    // XSS-safe markdown (minimal — matches base/chat.js pattern)
    md(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .split('\n')
            .filter(function(l) { return l.trim(); })
            .map(function(l) {
                return l.match(/^- /) ? '<li>' + l.slice(2) + '</li>' : '<p>' + l + '</p>';
            })
            .join('');
    },

    // Add message to the overlay
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

    // Send message to api.canonic.org/chat
    async send() {
        var input = document.getElementById('talkChatInput');
        if (!input) return;

        var text = input.value.trim();
        if (!text) return;
        input.value = '';

        this.add(text, 'user');
        this.messages.push({ role: 'user', content: text });

        var typing = this.add('Thinking...', 'assistant');

        try {
            var res = await fetch(this.api, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    history: this.messages.slice(-10),
                    system: this.system
                })
            });

            if (!res.ok) throw new Error('API ' + res.status);

            var data = await res.json();
            if (typing) typing.remove();

            var reply = data.message || data.text ||
                (data.content && data.content[0] && data.content[0].text) ||
                'Could not process that.';

            this.add(reply, 'assistant');
            this.messages.push({ role: 'assistant', content: reply });
        } catch (e) {
            if (typing) typing.remove();
            this.add('Connection issue. Try again in a moment.', 'error');
        }

        input.focus();
    }
};
