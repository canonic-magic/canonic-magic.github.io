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
        var sep = path.indexOf('?') === -1 ? '?' : '&';
        var res = await fetch(path + sep + 'v=' + Date.now());
        if (!res.ok) throw new Error(path + ' ' + res.status);
        return res.json();
    }

    // ── ACCENT ────────────────────────────────────────────
    function applyAccent(accent) {
        if (!accent) return;
        document.documentElement.style.setProperty('--accent', accent);
        // Decompose hex → RGB for rgba() usage: rgba(var(--accent-rgb), 0.1)
        var hex = accent.replace('#', '');
        if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
        var r = parseInt(hex.substring(0, 2), 16);
        var g = parseInt(hex.substring(2, 4), 16);
        var b = parseInt(hex.substring(4, 6), 16);
        if (!isNaN(r)) document.documentElement.style.setProperty('--accent-rgb', r + ', ' + g + ', ' + b);
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
        html += '<a href="#" class="eco-talk" onclick="TALK.open();return false"><span class="eco-talk-dot"></span>TALK</a>';
        // Extra links (e.g. MammoChat)
        if (fleet.extra) {
            fleet.extra.forEach(function (e) {
                html += '<a href="' + e.href + '">' + e.label + '</a>';
            });
        }
        html += '<button class="theme-toggle" onclick="toggleTheme()" id="theme-btn" title="Toggle light/dark">\u263E</button>';
        html += '</div>';
        bar.innerHTML = html;
    }

    // ── NAV ──────────────────────────────────────────────
    function normalizeNav(nav, sections) {
        if (nav && nav.length) return nav;
        var items = [];
        (sections || []).forEach(function (sec) {
            if (!sec || !sec.id) return;
            if (items.length >= 4) return;
            var id = String(sec.id);
            if (id === 'cta' || id === 'mission' || id === 'axiom-block' || id === 'thesis-lead' || id.indexOf('-lead') !== -1) return;
            var label = sec.title || id.replace(/[-_]/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
            items.push({ label: label, href: '#' + id });
        });
        return items;
    }

    function renderNav(nav, scopeIcon, scopeName, sections) {
        var el = document.getElementById('nav');
        if (!el) return;
        var navItems = normalizeNav(nav, sections);

        var html = '<div class="nav-inner">';
        html += '<a href="/" style="display:flex;align-items:center;gap:12px;text-decoration:none;color:var(--fg);">';
        if (scopeIcon) html += '<span style="font-size:32px;color:var(--accent);transform:rotate(90deg);display:inline-block;line-height:1;">' + scopeIcon + '</span>';
        if (scopeName) html += '<span style="font-size:20px;font-weight:600;letter-spacing:-0.02em;">' + scopeName + '</span>';
        html += '</a>';

        if (navItems && navItems.length) {
            html += '<ul class="nav-links">';
            navItems.forEach(function (item) {
                html += '<li><a href="' + item.href + '">' + item.label + '</a></li>';
            });
            html += '</ul>';
        }
        html += '</div>';
        el.innerHTML = html;
    }

    // ── HERO ──────────────────────────────────────────────
    function renderHero(hero) {
        var el = document.getElementById('hero');
        if (!el || !hero) return;

        // Galaxy hero — delegate to GALAXY.init
        if (hero.galaxy) {
            renderGalaxyHero(el, hero);
            return;
        }

        // Demo hero — split layout with iPhone mock
        if (hero.demo) {
            renderDemoHero(el, hero);
            return;
        }

        // Standard hero
        var html = '';
        if (hero.badge) html += '<div class="hero-badge">' + hero.badge + '</div>';
        html += '<h1 class="gradient-text">' + hero.title + '</h1>';
        if (hero.subtitle) html += '<p class="subtitle">' + hero.subtitle + '</p>';
        if (hero.description) html += '<p class="description">' + hero.description + '</p>';
        if (hero.cta && hero.cta.length) {
            html += '<div class="hero-cta">';
            hero.cta.forEach(function (btn, i) {
                var cls = btn.class || (i === 0 ? 'btn' : 'btn btn-secondary');
                if (cls.indexOf('btn') !== 0) cls = 'btn ' + cls;
                var onclick = btn.talk ? ' onclick="TALK.open();return false"' : '';
                html += '<a href="' + (btn.href || '#') + '" class="' + cls + '"' + onclick + '>' + btn.label + '</a>';
            });
            html += '</div>';
        }
        el.innerHTML = html;
    }

    // ── GALAXY HERO ─────────────────────────────────────
    function renderGalaxyHero(el, hero) {
        var g = hero.galaxy;
        var html = '<div class="galaxy-hero">';
        html += '<div class="galaxy-hero-text">';
        if (hero.badge) html += '<div class="hero-badge">' + hero.badge + '</div>';
        html += '<h1 class="gradient-text">' + hero.title + '</h1>';
        if (hero.subtitle) html += '<p class="subtitle">' + hero.subtitle + '</p>';
        if (hero.description) html += '<p class="description">' + hero.description + '</p>';
        if (hero.cta && hero.cta.length) {
            html += '<div class="hero-cta">';
            hero.cta.forEach(function (btn) {
                var cls = btn.class || 'btn';
                if (cls.indexOf('btn') !== 0) cls = 'btn ' + cls;
                var onclick = btn.talk ? ' onclick="TALK.open();return false"' : '';
                html += '<a href="' + (btn.href || '#') + '" class="' + cls + '"' + onclick + '>' + btn.label + '</a>';
            });
            html += '</div>';
        }
        html += '</div>';
        html += '<div id="galaxyContainer" class="galaxy-container" style="height:' + (g.height || '70vh') + ';"></div>';
        html += '</div>';
        el.innerHTML = html;

        // Initialize Galaxy after DOM insert
        if (typeof GALAXY !== 'undefined') {
            GALAXY.init(document.getElementById('galaxyContainer'), g);
        }
    }

    // ── DEMO HERO (iPhone Mock) ─────────────────────────
    function renderDemoHero(el, hero) {
        var d = hero.demo;
        var msgs = d.messages || [];

        // Left column: text
        var html = '<div class="hero-split"><div class="hero-split-inner">';
        html += '<div class="hero-content">';
        if (hero.badge) html += '<div class="hero-badge">' + hero.badge + '</div>';
        html += '<h1>' + hero.title + '</h1>';
        if (hero.description) html += '<p>' + hero.description + '</p>';
        if (hero.cta && hero.cta.length) {
            html += '<div class="hero-cta">';
            hero.cta.forEach(function (btn) {
                var cls = btn.class || 'btn';
                if (cls.indexOf('btn') !== 0) cls = 'btn ' + cls;
                var onclick = btn.talk ? ' onclick="TALK.open();return false"' : '';
                html += '<a href="' + (btn.href || '#') + '" class="' + cls + '"' + onclick + '>' + btn.label + '</a>';
            });
            html += '</div>';
        }
        html += '</div>';

        // Right column: iPhone mock
        html += '<div class="device-container"><div class="device-glow"></div>';
        html += '<div class="iphone"><div class="iphone-screen"><div class="app-preview">';
        html += '<div class="chat-header">' + (d.productIcon || '') + ' ' + (d.product || '') + '</div>';

        // Chat messages
        html += '<div class="chat-messages">';
        var msgIdx = 0;
        var typIdx = 0;
        msgs.forEach(function (m) {
            msgIdx++;
            if (m.role === 'user') {
                html += '<div class="chat-msg chat-user msg-' + msgIdx + '">' + m.text + '</div>';
                // Add typing indicator after user message
                typIdx++;
                html += '<div class="typing-indicator typing-' + typIdx + '"><span></span><span></span><span></span></div>';
            } else {
                html += '<div class="chat-msg chat-bot msg-' + msgIdx + '">' + m.text + '</div>';
                if (m.citation) {
                    msgIdx++;
                    html += '<div class="chat-msg chat-cite msg-' + msgIdx + '">\ud83d\udccb ' + m.citation + '</div>';
                }
            }
        });
        html += '</div>';

        // Input area with typewriter
        html += '<div class="chat-input-area"><div class="chat-input">';
        var inputIdx = 0;
        msgs.forEach(function (m) {
            if (m.role === 'user') {
                inputIdx++;
                html += '<div class="input-text-wrapper input-wrapper-' + inputIdx + '">';
                html += '<span class="input-text">' + m.text + '</span><span class="input-cursor"></span></div>';
            }
        });
        html += '</div><div class="chat-send">\u279A</div></div>';

        html += '</div></div></div></div>';
        html += '</div></div>';
        el.innerHTML = html;
    }

    // ── STATS ─────────────────────────────────────────────
    function renderStats(stats) {
        var el = document.getElementById('stats');
        if (!el || !stats || !stats.length) return;

        var html = '<div class="stats">';
        stats.forEach(function (s) {
            html += '<div class="stat"><div class="stat-value">' + s.value + '</div>';
            html += '<div class="stat-label">' + s.label + '</div></div>';
        });
        html += '</div>';
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

            // Eyebrow
            if (sec.eyebrow) html += '<div class="section-eyebrow text-center">' + sec.eyebrow + '</div>';
            if (sec.title) html += '<h2 class="section-title text-center">' + sec.title + '</h2>';
            if (sec.description) html += '<p class="description">' + sec.description + '</p>';

            // Cards grid
            if (sec.cards && sec.cards.length) {
                html += renderCards(sec);
            }

            // Products
            if (sec.products) {
                html += renderProducts(sec.products);
            }

            // Deals
            if (sec.deals) {
                html += renderDeals(sec.deals);
            }

            // About
            if (sec.about) {
                html += renderAbout(sec.about);
            }

            // Banner (governance banner)
            if (sec.banner) {
                html += renderBanner(sec.banner);
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

            // Galaxy (inline section — not hero)
            if (sec.galaxy) {
                var gId = 'galaxyContainer-' + sec.id;
                html += '<div id="' + gId + '" class="galaxy-container" style="height:' + (sec.galaxy.height || '70vh') + ';margin-top:32px;border-radius:16px;overflow:hidden;"></div>';
                // Defer init until DOM is written
                (function (containerId, opts) {
                    setTimeout(function () {
                        var c = document.getElementById(containerId);
                        if (c && typeof GALAXY !== 'undefined') GALAXY.init(c, opts);
                    }, 0);
                })(gId, sec.galaxy);
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

            // Generated depth-2 content (compiled from GOV tree)
            if (sec.generated && ((sec.generated.children && sec.generated.children.length) || sec.generated.narrative)) {
                html += '<div style="margin-top:20px;padding:18px;border:1px solid var(--border);border-radius:12px;background:var(--bg-soft);">';
                html += '<div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:var(--fg-tertiary);margin-bottom:12px;">Depth 2 · Gov Derived</div>';
                if (sec.generated.narrative) {
                    html += '<p style="margin:0 0 12px 0;font-size:13px;line-height:1.6;color:var(--fg-secondary);">' + sec.generated.narrative + '</p>';
                }
                if (sec.generated.children && sec.generated.children.length) {
                    html += '<div style="display:flex;flex-wrap:wrap;gap:8px;">';
                    sec.generated.children.forEach(function (c) {
                        html += '<span style="padding:6px 10px;border:1px solid rgba(var(--accent-rgb,59,130,246),0.28);border-radius:999px;font-size:11px;font-weight:600;color:var(--fg-secondary);background:rgba(var(--accent-rgb,59,130,246),0.08);">' + c.label + '</span>';
                    });
                    html += '</div>';
                }
                if (sec.generated.source) {
                    html += '<div style="margin-top:10px;font-size:11px;color:var(--fg-tertiary);font-family:var(--mono);">source: ' + sec.generated.source + '</div>';
                }
                html += '</div>';
            }

            if (sec.wrapClass) html += '</div>';
            el.innerHTML = html;
        });
    }

    // ── CARDS ─────────────────────────────────────────────
    function renderCards(sec) {
        var cols = sec.columns || 'auto-fit, minmax(280px, 1fr)';
        var html = '<div style="display:grid;grid-template-columns:repeat(' + cols + ');gap:' + (sec.gap || '20px') + ';margin-top:32px;">';
        sec.cards.forEach(function (c) {
            html += '<div class="' + (c.class || 'card') + '">';

            // Status badge (top-right, e.g. LIVE)
            if (c.statusBadge) {
                html += '<div class="status-badge">' + c.statusBadge + '</div>';
            }

            // Icon with gradient
            if (c.icon) {
                if (c.iconGradient) {
                    html += '<div class="primitive-icon" style="background:linear-gradient(135deg,' + c.iconGradient[0] + ',' + c.iconGradient[1] + ');">' + c.icon + '</div>';
                } else {
                    html += '<div class="' + (c.iconClass || '') + '">' + c.icon + '</div>';
                }
            }

            if (c.eyebrow) html += '<div style="font-size:12px;color:var(--accent);font-weight:600;letter-spacing:0.1em;margin-bottom:6px;">' + c.eyebrow + '</div>';
            if (c.num) html += '<div style="font-family:var(--mono);font-size:11px;color:var(--accent);font-weight:700;margin-bottom:6px;">' + c.num + '</div>';
            if (c.title) {
                var tStyle = c.titleColor ? ' style="color:' + c.titleColor + ';margin-bottom:8px;"' : '';
                html += '<h3' + tStyle + '>' + c.title + '</h3>';
            }
            if (c.subtitle) html += '<div class="muted" style="font-size:13px;font-weight:600;margin-bottom:8px;">' + c.subtitle + '</div>';
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

            // Badge — object or string
            if (c.badge) {
                if (typeof c.badge === 'object') {
                    html += '<div style="margin-top:16px;"><span class="badge" style="border-color:' + c.badge.color + ';color:' + c.badge.color + ';">' + c.badge.label + '</span></div>';
                } else {
                    html += '<span style="display:inline-block;margin-top:12px;padding:4px 12px;background:rgba(var(--accent-rgb,59,130,246),0.12);color:var(--accent);border-radius:6px;font-size:11px;font-weight:700;">' + c.badge + '</span>';
                }
            }

            // Card-level CTA
            if (c.cta) {
                var cCls = c.cta.class || 'btn';
                if (cCls.indexOf('btn') !== 0) cCls = 'btn ' + cCls;
                html += '<a href="' + (c.cta.href || '#') + '" class="' + cCls + '" style="margin-top:16px;font-size:12px;padding:8px 16px;display:inline-block;">' + c.cta.label + '</a>';
            }

            html += '</div>';
        });
        html += '</div>';
        return html;
    }

    // ── PRODUCTS ──────────────────────────────────────────
    function renderProducts(products) {
        var html = '<div class="apps-grid">';
        products.forEach(function (p) {
            html += '<a href="' + (p.href || '#') + '" class="app-card">';
            html += '<div class="app-icon ' + (p.iconClass || '') + '">' + p.icon + '</div>';
            html += '<div class="app-name">' + p.name + '</div>';
            html += '<div class="app-desc">' + p.description + '</div>';
            var badgeBg = p.statusColor ? 'rgba(' + hexToRgb(p.statusColor) + ',0.15)' : 'rgba(96,165,250,0.15)';
            var badgeColor = p.statusColor || 'var(--accent)';
            html += '<span class="app-badge" style="background:' + badgeBg + ';color:' + badgeColor + ';">' + p.status + '</span>';
            html += '</a>';
        });
        html += '</div>';
        return html;
    }

    // ── DEALS ─────────────────────────────────────────────
    function renderDeals(deals) {
        var html = '<div class="apps-grid">';
        deals.forEach(function (d) {
            var vaultStyle = d.vault ? 'border-color:rgba(212,175,55,0.2);opacity:0.65;' : '';
            html += '<a href="' + (d.href || '#') + '" class="app-card" style="' + vaultStyle + '">';

            // Icon
            if (d.iconGradient) {
                html += '<div class="app-icon" style="background:linear-gradient(135deg,' + d.iconGradient[0] + ',' + d.iconGradient[1] + ');">' + d.icon + '</div>';
            } else {
                html += '<div class="app-icon ' + (d.iconClass || '') + '">' + d.icon + '</div>';
            }

            html += '<div class="app-name">' + d.name + '</div>';
            html += '<div class="app-desc">' + d.description + '</div>';

            var badgeBg = d.badgeColor ? 'rgba(' + hexToRgb(d.badgeColor) + ',0.15)' : d.vault ? 'rgba(212,175,55,0.15)' : 'rgba(96,165,250,0.15)';
            var badgeColor = d.badgeColor || (d.vault ? 'var(--gold)' : 'var(--accent)');
            var lockIcon = d.vault ? '\ud83d\udd12 ' : '';
            html += '<span class="app-badge" style="background:' + badgeBg + ';color:' + badgeColor + ';">' + lockIcon + d.badge + '</span>';
            html += '</a>';
        });
        html += '</div>';
        return html;
    }

    // ── ABOUT ─────────────────────────────────────────────
    function renderAbout(about) {
        var html = '<div class="about-section">';

        // Identity block
        html += '<div class="about-identity">';
        html += '<div class="about-avatar">' + about.initials + '</div>';
        html += '<h3 class="about-name">' + about.name + '</h3>';
        html += '<p class="about-title">' + about.title + '</p>';
        if (about.location) html += '<p class="about-location">' + about.location + (about.institution ? ' · ' + about.institution : '') + '</p>';
        if (about.tagline) html += '<p class="about-tagline">' + about.tagline + '</p>';

        // Links
        if (about.links && about.links.length) {
            html += '<div class="about-links">';
            about.links.forEach(function (l) {
                html += '<a href="' + l.href + '" target="_blank" rel="noopener" class="about-link">' + l.label + ' →</a>';
            });
            html += '</div>';
        }
        html += '</div>';

        // Tags
        if (about.tags && about.tags.length) {
            html += '<div class="about-tags">';
            about.tags.forEach(function (t) {
                html += '<span class="about-tag">' + t + '</span>';
            });
            html += '</div>';
        }

        // Key Publications
        if (about.publications && about.publications.length) {
            html += '<div class="about-pubs">';
            html += '<h4 class="about-section-title">Key Publications</h4>';
            about.publications.forEach(function (p) {
                html += '<div class="about-pub">';
                html += '<span class="about-pub-authors">' + p.authors + '</span> ';
                html += '<em>' + p.title + '</em>. ';
                html += '<span class="about-pub-journal">' + p.journal + '</span>';
                if (p.year) html += ' (' + p.year + ')';
                html += '</div>';
            });
            html += '</div>';
        }

        // Career Lineage
        if (about.lineage && about.lineage.length) {
            html += '<div class="about-lineage">';
            html += '<h4 class="about-section-title">Career Lineage</h4>';
            html += '<div class="lineage-track">';
            about.lineage.forEach(function (l, i) {
                html += '<div class="lineage-node">';
                html += '<div class="lineage-year">' + l.year + '</div>';
                html += '<div class="lineage-dot"></div>';
                html += '<div class="lineage-milestone">' + l.milestone + '</div>';
                html += '<div class="lineage-work">' + l.work + '</div>';
                html += '</div>';
            });
            html += '</div>';
            html += '</div>';
        }

        // Orgs
        if (about.orgs && about.orgs.length) {
            html += '<div class="about-orgs">';
            about.orgs.forEach(function (o) {
                html += '<span class="about-org">' + o.name + ' <span class="about-org-year">' + o.year + '</span></span>';
            });
            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    // ── BANNER ────────────────────────────────────────────
    function renderBanner(banner) {
        var html = '<div class="governance-banner" style="margin-top:64px;">';
        html += '<div style="flex:1;">';
        if (banner.eyebrow) html += '<div class="section-eyebrow">' + banner.eyebrow + '</div>';
        if (banner.title) html += '<h3 style="font-size:28px;margin-bottom:16px;line-height:1.3;">' + banner.title + '</h3>';
        if (banner.text) html += '<p class="muted" style="line-height:1.7;">' + banner.text + '</p>';
        if (banner.badges && banner.badges.length) {
            html += '<div style="display:flex;gap:12px;margin-top:20px;flex-wrap:wrap;">';
            banner.badges.forEach(function (b) {
                html += '<span class="badge" style="border-color:' + b.color + ';color:' + b.color + ';">' + b.label + '</span>';
            });
            html += '</div>';
        }
        html += '</div>';
        html += '<span style="font-size:80px;opacity:0.6;color:var(--accent);">\u2229</span>';
        html += '</div>';
        return html;
    }

    // ── CTA ───────────────────────────────────────────────
    function renderCTA(cta) {
        var el = document.getElementById('cta');
        if (!el || !cta) return;

        var html = '';
        if (cta.class) {
            html += '<div class="' + cta.class + '">';
            html += '<h3>' + cta.title + '</h3>';
            html += '<p>' + cta.description + '</p>';
            html += '<div class="cta-buttons">';
        } else {
            html += '<div class="cta-title">' + cta.title + '</div>';
            html += '<div class="cta-desc">' + cta.description + '</div>';
            html += '<div class="cta-buttons">';
        }
        (cta.buttons || []).forEach(function (btn, i) {
            var cls = btn.class || (i === 0 ? 'btn' : 'btn btn-secondary');
            if (cls.indexOf('btn') !== 0) cls = 'btn ' + cls;
            var onclick = btn.talk ? ' onclick="TALK.open();return false"' : '';
            html += '<a href="' + (btn.href || '#') + '" class="' + cls + '"' + onclick + '>' + btn.label + '</a>';
        });
        html += '</div>';
        if (cta.class) html += '</div>';
        el.innerHTML = html;
    }

    // ── FOOTER ────────────────────────────────────────────
    function renderFooter(fleet, footerData, tagline) {
        var el = document.getElementById('footer');
        if (!el) return;

        var html = '';
        // Custom footer links from CONTENT.json
        if (footerData && footerData.links) {
            html += '<div style="display:flex;gap:24px;justify-content:center;margin-bottom:16px;flex-wrap:wrap;">';
            footerData.links.forEach(function (l) {
                html += '<a href="' + l.href + '">' + l.label + '</a>';
            });
            html += '</div>';
            html += '<p>' + (footerData.tagline || tagline || 'CANONIC') + '</p>';
        } else if (fleet) {
            // Default: fleet links
            fleet.sites.forEach(function (s, i) {
                if (i > 0) html += ' \u00b7 ';
                html += '<a href="' + s.url + '">' + s.label + '</a>';
            });
            html += ' \u00b7 <a href="#" onclick="TALK.open();return false">TALK</a>';
            html += '<br><br>' + (tagline || 'CANONIC');
        }
        el.innerHTML = html;
    }

    // ── THEME TOGGLE ─────────────────────────────────────
    function initTheme() {
        // Make toggleTheme global
        if (typeof window.toggleTheme === 'undefined') {
            window.getTheme = function () {
                return localStorage.getItem('canonic-theme') || 'dark';
            };
            window.applyTheme = function (t) {
                if (t === 'auto') {
                    document.documentElement.removeAttribute('data-theme');
                } else {
                    document.documentElement.setAttribute('data-theme', t);
                }
                var btn = document.getElementById('theme-btn');
                if (btn) btn.textContent = t === 'light' ? '\u2600' : t === 'dark' ? '\u263E' : '\u25D0';
            };
            window.toggleTheme = function () {
                var order = ['auto', 'light', 'dark'];
                var cur = window.getTheme();
                var next = order[(order.indexOf(cur) + 1) % 3];
                localStorage.setItem('canonic-theme', next);
                window.applyTheme(next);
            };
            window.applyTheme(window.getTheme());
        }
    }

    // ── UTIL: hex to rgb ─────────────────────────────────
    function hexToRgb(hex) {
        if (!hex || hex.charAt(0) !== '#') return '96,165,250';
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
        var r = parseInt(hex.substring(0, 2), 16);
        var g = parseInt(hex.substring(2, 4), 16);
        var b = parseInt(hex.substring(4, 6), 16);
        return r + ',' + g + ',' + b;
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

        // Theme toggle
        initTheme();

        // Render from CONTENT.json
        if (content.fleet) renderEcoBar(content.fleet, canon.scope);
        renderNav(content.nav, canon.navIcon, canon.name, content.sections);
        if (content.hero) renderHero(content.hero);
        if (content.stats) renderStats(content.stats);
        if (content.sections) renderSections(content.sections);
        if (content.cta) renderCTA(content.cta);
        if (content.fleet) renderFooter(content.fleet, content.footer, content.footerTagline);
    }

    return { init: init, canon: function () { return canon; }, content: function () { return content; } };
})();
