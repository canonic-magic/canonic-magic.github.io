/**
 * RENDER.js — Fleet-wide Content Renderer
 *
 * Loads CANON.json + CONTENT.json → renders the page.
 * Zero hardcoded content. Governance to frontend.
 *
 * CANON.json  = WHO you are (scope, accent, systemPrompt)
 * CONTENT.json = WHAT you show (hero, sections, stats, tiers)
 *
 * Usage: <script src="./render.js"></script>
 *        RENDER.init()
 *
 * MAGIC DESIGN | CANONIC | 2026-02
 */

var RENDER = (function () {
    'use strict';

    var canon = null;
    var content = null;

    // ── LOAD ──────────────────────────────────────────────
    async function loadJSON(path) {
        var res = await fetch(path);
        if (!res.ok) throw new Error(path + ' ' + res.status);
        return res.json();
    }

    // ── ACCENT ────────────────────────────────────────────
    function applyAccent(accent) {
        if (!accent) return;
        document.documentElement.style.setProperty('--accent', accent);
    }

    // ── ECO-BAR ───────────────────────────────────────────
    function renderEcoBar(fleet, currentScope) {
        var bar = document.getElementById('ecoBar');
        if (!bar || !fleet) return;

        var brand = fleet.brand || { label: 'CANONIC', mark: '\u2229', url: fleet.sites[0].url };
        var html = '<a href="' + brand.url + '" class="eco-brand"><span class="eco-mark">' + brand.mark + '</span> ' + brand.label + '</a>';
        html += '<div class="eco-links">';
        fleet.sites.forEach(function (s) {
            var active = s.scope === currentScope ? ' eco-active' : '';
            html += '<a href="' + s.url + '" class="' + active + '">' + s.label + '</a>';
        });
        html += '<a href="#" onclick="TALK.open();return false">TALK</a>';
        html += '<button class="theme-toggle" onclick="toggleTheme()" id="theme-btn" title="Toggle light/dark">\u263E</button>';
        html += '</div>';
        bar.innerHTML = html;
    }

    // ── HERO ──────────────────────────────────────────────
    function renderHero(hero) {
        var el = document.getElementById('hero');
        if (!el || !hero) return;

        var html = '';
        if (hero.badge) html += '<div class="hero-badge">' + hero.badge + '</div>';
        html += '<h1 class="gradient-text">' + hero.title + '</h1>';
        if (hero.subtitle) html += '<p class="subtitle">' + hero.subtitle + '</p>';
        if (hero.description) html += '<p class="description">' + hero.description + '</p>';
        if (hero.cta && hero.cta.length) {
            html += '<div class="hero-cta">';
            hero.cta.forEach(function (btn, i) {
                var cls = i === 0 ? 'btn' : 'btn btn-secondary';
                var onclick = btn.talk ? ' onclick="TALK.open();return false"' : '';
                html += '<a href="' + (btn.href || '#') + '" class="' + cls + '"' + onclick + '>' + btn.label + '</a>';
            });
            html += '</div>';
        }
        el.innerHTML = html;
    }

    // ── STATS ─────────────────────────────────────────────
    function renderStats(stats) {
        var el = document.getElementById('stats');
        if (!el || !stats || !stats.length) return;

        var html = '';
        stats.forEach(function (s) {
            html += '<div class="stat"><div class="stat-value">' + s.value + '</div>';
            html += '<div class="stat-label">' + s.label + '</div></div>';
        });
        el.innerHTML = html;
    }

    // ── SECTIONS ──────────────────────────────────────────
    function renderSections(sections) {
        if (!sections || !sections.length) return;

        sections.forEach(function (sec) {
            var el = document.getElementById(sec.id);
            if (!el) return;

            var html = '';
            if (sec.wrapClass) html += '<div class="' + sec.wrapClass + '">';
            if (sec.title) html += '<h2>' + sec.title + '</h2>';
            if (sec.description) html += '<p class="description">' + sec.description + '</p>';

            // Cards grid
            if (sec.cards && sec.cards.length) {
                var cols = sec.columns || 'auto-fit, minmax(280px, 1fr)';
                html += '<div style="display:grid;grid-template-columns:repeat(' + cols + ');gap:' + (sec.gap || '20px') + ';margin-top:32px;">';
                sec.cards.forEach(function (c) {
                    html += '<div class="' + (c.class || 'card') + '">';
                    if (c.icon) html += '<div class="' + (c.iconClass || '') + '">' + c.icon + '</div>';
                    if (c.eyebrow) html += '<div style="font-size:12px;color:var(--accent);font-weight:600;letter-spacing:0.1em;margin-bottom:6px;">' + c.eyebrow + '</div>';
                    if (c.num) html += '<div style="font-family:var(--mono);font-size:11px;color:var(--accent);font-weight:700;margin-bottom:6px;">' + c.num + '</div>';
                    if (c.title) html += '<h3>' + c.title + '</h3>';
                    if (c.subtitle) html += '<div style="font-family:var(--mono);font-size:12px;color:var(--accent);margin-bottom:12px;">' + c.subtitle + '</div>';
                    if (c.text) html += '<p style="font-size:13px;color:var(--fg-secondary);line-height:1.6;">' + c.text + '</p>';
                    if (c.tags && c.tags.length) {
                        html += '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">';
                        c.tags.forEach(function (t) {
                            html += '<span style="padding:4px 10px;background:rgba(var(--accent-rgb,59,130,246),0.08);border:1px solid rgba(var(--accent-rgb,59,130,246),0.2);border-radius:6px;font-size:11px;font-weight:600;color:var(--accent);">' + t + '</span>';
                        });
                        html += '</div>';
                    }
                    if (c.flow && c.flow.length) {
                        html += '<div class="flow">';
                        c.flow.forEach(function (node, i) {
                            if (i > 0) html += '<div class="flow-arrow">&rarr;</div>';
                            var accentCls = (i === Math.floor(c.flow.length / 2)) ? ' accent' : '';
                            html += '<div class="flow-node' + accentCls + '">' + node + '</div>';
                        });
                        html += '</div>';
                    }
                    if (c.badge) html += '<span style="display:inline-block;margin-top:12px;padding:4px 12px;background:rgba(var(--accent-rgb,59,130,246),0.12);color:var(--accent);border-radius:6px;font-size:11px;font-weight:700;">' + c.badge + '</span>';
                    html += '</div>';
                });
                html += '</div>';
            }

            // Table
            if (sec.table) {
                html += '<table class="comp-table"><thead><tr>';
                sec.table.headers.forEach(function (h) { html += '<th>' + h + '</th>'; });
                html += '</tr></thead><tbody>';
                sec.table.rows.forEach(function (r) {
                    html += '<tr>';
                    r.forEach(function (cell, i) {
                        var cls = sec.table.cellClasses && sec.table.cellClasses[i] ? ' class="' + sec.table.cellClasses[i] + '"' : '';
                        html += '<td' + cls + '>' + cell + '</td>';
                    });
                    html += '</tr>';
                });
                html += '</tbody></table>';
            }

            // Tiers
            if (sec.tiers && sec.tiers.length) {
                html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px;margin-top:32px;">';
                sec.tiers.forEach(function (t) {
                    var cls = t.featured ? 'tier featured' : 'tier';
                    html += '<div class="' + cls + '">';
                    html += '<div class="tier-name">' + t.name + '</div>';
                    html += '<div class="tier-price">' + t.price + '</div>';
                    html += '<div class="tier-price-sub">' + t.sub + '</div>';
                    html += '<ul class="tier-list">';
                    t.features.forEach(function (f) { html += '<li>' + f + '</li>'; });
                    html += '</ul>';
                    var ctaCls = t.featured ? 'tier-cta tier-cta-primary' : 'tier-cta tier-cta-secondary';
                    var onclick = t.ctaTalk ? ' onclick="TALK.open();return false"' : '';
                    html += '<a href="' + (t.ctaHref || '#') + '" class="' + ctaCls + '"' + onclick + '>' + t.ctaLabel + '</a>';
                    html += '</div>';
                });
                html += '</div>';
                if (sec.axiom) html += '<div style="text-align:center;padding:32px 24px;font-size:15px;color:var(--fg-secondary);font-style:italic;"><strong style="color:var(--fg);font-style:normal;">' + sec.axiom + '</strong></div>';
            }

            // Feature block (vaas-style)
            if (sec.feature) {
                var f = sec.feature;
                html += '<div class="vaas"><div class="vaas-content">';
                if (f.eyebrow) html += '<div class="vaas-eyebrow">' + f.eyebrow + '</div>';
                if (f.title) html += '<div class="vaas-title">' + f.title + '</div>';
                if (f.text) html += '<div class="vaas-desc">' + f.text + '</div>';
                if (f.tags && f.tags.length) {
                    html += '<div class="vaas-tags">';
                    f.tags.forEach(function (t) { html += '<span class="vaas-tag">' + t + '</span>'; });
                    html += '</div>';
                }
                html += '</div><span class="vaas-mark">\u2229</span></div>';
            }

            // Galaxy stats
            if (sec.galaxyStats && sec.galaxyStats.length) {
                html += '<div class="galaxy-stats">';
                sec.galaxyStats.forEach(function (s) {
                    html += '<div><div class="galaxy-val">' + s.value + '</div>';
                    html += '<div class="galaxy-lbl">' + s.label + '</div></div>';
                });
                html += '</div>';
            }

            // Section CTA (inline button)
            if (sec.cta) {
                var onclick = sec.cta.talk ? ' onclick="TALK.open();return false"' : '';
                html += '<div style="text-align:center;margin-top:32px;"><a href="' + (sec.cta.href || '#') + '" class="btn"' + onclick + '>' + sec.cta.label + '</a></div>';
            }

            // Axiom quote
            if (sec.quote) {
                html += '<div style="text-align:center;padding:48px 24px;font-size:15px;color:var(--fg-secondary);font-style:italic;max-width:700px;margin:0 auto;">';
                html += '<strong style="color:var(--fg);font-style:normal;">' + sec.quote.bold + '</strong> ' + (sec.quote.rest || '');
                html += '</div>';
            }

            if (sec.wrapClass) html += '</div>';
            el.innerHTML = html;
        });
    }

    // ── CTA ───────────────────────────────────────────────
    function renderCTA(cta) {
        var el = document.getElementById('cta');
        if (!el || !cta) return;

        var html = '';
        if (cta.class) {
            // Wrapped CTA (e.g. MAGIC's gradient .cta div)
            html += '<div class="' + cta.class + '">';
            html += '<h3>' + cta.title + '</h3>';
            html += '<p>' + cta.description + '</p>';
            html += '<div class="cta-buttons">';
        } else {
            // Bare CTA (Foundation style)
            html += '<div class="cta-title">' + cta.title + '</div>';
            html += '<div class="cta-desc">' + cta.description + '</div>';
            html += '<div class="cta-buttons">';
        }
        (cta.buttons || []).forEach(function (btn, i) {
            var cls = i === 0 ? 'btn' : 'btn btn-secondary';
            var onclick = btn.talk ? ' onclick="TALK.open();return false"' : '';
            html += '<a href="' + (btn.href || '#') + '" class="' + cls + '"' + onclick + '>' + btn.label + '</a>';
        });
        html += '</div>';
        if (cta.class) html += '</div>';
        el.innerHTML = html;
    }

    // ── FOOTER ────────────────────────────────────────────
    function renderFooter(fleet, tagline) {
        var el = document.getElementById('footer');
        if (!el || !fleet) return;

        var html = '';
        fleet.sites.forEach(function (s, i) {
            if (i > 0) html += ' · ';
            html += '<a href="' + s.url + '">' + s.label + '</a>';
        });
        html += ' · <a href="#" onclick="TALK.open();return false">TALK</a>';
        html += '<br><br>' + (tagline || 'CANONIC');
        el.innerHTML = html;
    }

    // ── INIT ──────────────────────────────────────────────
    async function init() {
        try {
            var results = await Promise.all([
                loadJSON('./CANON.json'),
                loadJSON('./CONTENT.json')
            ]);
            canon = results[0];
            content = results[1];
        } catch (e) {
            console.warn('[RENDER] ' + e.message);
            return;
        }

        // Apply accent from governance
        applyAccent(canon.accent);

        // Set scope attribute
        if (canon.scope) {
            document.documentElement.setAttribute('data-scope', canon.scope.toLowerCase());
        }

        // Render from CONTENT.json
        if (content.fleet) renderEcoBar(content.fleet, canon.scope);
        if (content.hero) renderHero(content.hero);
        if (content.stats) renderStats(content.stats);
        if (content.sections) renderSections(content.sections);
        if (content.cta) renderCTA(content.cta);
        if (content.fleet) renderFooter(content.fleet, content.footerTagline);
    }

    return { init: init, canon: function () { return canon; }, content: function () { return content; } };
})();
