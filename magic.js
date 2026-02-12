/**
 * magic.js — Galaxy Graph Controller
 *
 * Loads scopes.json → renders vis-network Galaxy.
 * Shared data layer: web (vis-network), iOS (SwiftUI), Android (Compose).
 * Min code. Max reuse. All native.
 *
 * MAGIC DESIGN | CANONIC | 2026-02
 */

var GALAXY = (function () {
    'use strict';

    var network = null;
    var scopes = [];
    var detail = null;

    // ── TIER ────────────────────────────────────────────
    function tierFor(bits) {
        if (bits >= 255) return { name: 'MAGIC', color: '#00ff88', badge: '\u2726' };
        if (bits >= 127) return { name: 'AGENT', color: '#2997ff', badge: '\u25C6' };
        if (bits >= 63)  return { name: 'ENTERPRISE', color: '#bf5af2', badge: 'E' };
        if (bits >= 39)  return { name: 'BUSINESS', color: '#ff9f0a', badge: 'B' };
        if (bits >= 35)  return { name: 'COMMUNITY', color: '#fbbf24', badge: 'C' };
        return { name: 'NONE', color: '#ff453a', badge: '\u2014' };
    }

    // ── COMPLIANCE RING SVG ─────────────────────────────
    function ringHTML(bits, ringSize) {
        var sz = ringSize || 90;
        var cx = sz / 2;
        var tiers = [
            { threshold: 35, r: sz * 0.47, stroke: 4, opacity: 0.15 },
            { threshold: 39, r: sz * 0.40, stroke: 5, opacity: 0.35 },
            { threshold: 63, r: sz * 0.33, stroke: 6, opacity: 0.70 }
        ];
        var svg = '<svg width="' + sz + '" height="' + sz + '" viewBox="0 0 ' + sz + ' ' + sz + '">';
        tiers.forEach(function (t) {
            var circ = 2 * Math.PI * t.r;
            var pct = Math.min(bits / 255, 1);
            svg += '<circle cx="' + cx + '" cy="' + cx + '" r="' + t.r + '" fill="none" stroke="#00ff88" stroke-width="' + t.stroke + '" opacity="' + t.opacity + '" stroke-dasharray="' + (circ * pct) + ' ' + circ + '" stroke-linecap="round" transform="rotate(-90 ' + cx + ' ' + cx + ')" style="transition:stroke-dasharray 0.8s"/>';
        });
        svg += '<text x="' + cx + '" y="' + cx + '" text-anchor="middle" dominant-baseline="central" fill="#fff" font-size="' + (sz * 0.22) + '" font-weight="700" font-family="-apple-system,system-ui,sans-serif">' + bits + '</text>';
        svg += '</svg>';
        return svg;
    }

    // ── DETAIL PANEL ────────────────────────────────────
    function showDetail(scope) {
        detail = scope;
        var panel = document.getElementById('detailPanel');
        if (!panel) return;
        var t = tierFor(scope.bits);
        var html = '<div class="dp-header"><span class="dp-name">' + scope.label + '</span><button class="dp-close" onclick="GALAXY.closeDetail()">\u00d7</button></div>';
        html += '<div class="dp-ring">' + ringHTML(scope.bits, 140) + '</div>';
        html += '<div class="dp-tier" style="color:' + t.color + '">' + t.badge + ' ' + t.name + '</div>';
        html += '<div class="dp-meta">';
        html += '<div class="dp-row"><span class="dp-label">Category</span><span class="dp-value" style="color:' + scope.color + '">' + scope.category + '</span></div>';
        html += '<div class="dp-row"><span class="dp-label">Repo</span><span class="dp-value">' + scope.repo + '</span></div>';
        html += '<div class="dp-row"><span class="dp-label">Bits</span><span class="dp-value">' + scope.bits + '/255</span></div>';
        if (scope.inherits) html += '<div class="dp-row"><span class="dp-label">Inherits</span><span class="dp-value">' + scope.inherits + '</span></div>';
        html += '</div>';

        var children = scopes.filter(function (s) { return s.inherits === scope.id; });
        if (children.length) {
            html += '<div class="dp-section"><div class="dp-section-title">Inheritors</div><div class="dp-inheritors">';
            children.forEach(function (c) {
                html += '<span class="dp-child" style="border-color:' + c.color + ';color:' + c.color + '" onclick="GALAXY.focusScope(\'' + c.id + '\')">' + c.label + '</span>';
            });
            html += '</div></div>';
        }

        panel.innerHTML = html;
        panel.classList.add('open');
    }

    function closeDetail() {
        var panel = document.getElementById('detailPanel');
        if (panel) panel.classList.remove('open');
        detail = null;
    }

    // ── SEARCH ──────────────────────────────────────────
    function handleSearch(query) {
        if (!network || !scopes.length) return;
        var q = query.toLowerCase().trim();
        if (!q) {
            network.setSelection({ nodes: [], edges: [] });
            return;
        }
        var matches = scopes.filter(function (s) {
            return s.label.toLowerCase().indexOf(q) >= 0 || s.category.toLowerCase().indexOf(q) >= 0;
        });
        network.setSelection({ nodes: matches.map(function (m) { return m.id; }), edges: [] });
        if (matches.length === 1) {
            network.focus(matches[0].id, { scale: 1.5, animation: { duration: 400, easingFunction: 'easeInOutQuad' } });
            showDetail(matches[0]);
        }
    }

    function focusScope(id) {
        var scope = scopes.find(function (s) { return s.id === id; });
        if (!scope) return;
        network.focus(id, { scale: 1.5, animation: { duration: 400, easingFunction: 'easeInOutQuad' } });
        showDetail(scope);
    }

    // ── GRAPH ───────────────────────────────────────────
    function buildGraph(container) {
        var nodes = scopes.map(function (s) {
            return {
                id: s.id, label: s.label, size: s.size,
                color: { background: s.color, border: s.color, highlight: { background: s.color, border: '#fff' } },
                font: { color: '#fff', size: Math.max(11, s.size * 0.28), face: '-apple-system,system-ui,sans-serif' },
                borderWidth: 2, borderWidthSelected: 3
            };
        });

        var edges = [];
        scopes.forEach(function (s) {
            if (s.inherits) {
                edges.push({
                    from: s.inherits, to: s.id,
                    color: { color: 'rgba(255,255,255,0.08)', highlight: 'rgba(255,255,255,0.3)' },
                    width: 1, smooth: { type: 'continuous' }
                });
            }
        });

        var data = { nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges) };
        var options = {
            physics: {
                barnesHut: { gravitationalConstant: -8000, centralGravity: 0.4, springLength: 280, damping: 0.85 },
                stabilization: { iterations: 300 }
            },
            nodes: { shape: 'dot' },
            edges: { arrows: { to: { enabled: false } } },
            interaction: { hover: true, tooltipDelay: 200, zoomView: true, dragView: true }
        };

        network = new vis.Network(container, data, options);

        network.on('click', function (params) {
            if (params.nodes.length === 1) {
                var scope = scopes.find(function (s) { return s.id === params.nodes[0]; });
                if (scope) showDetail(scope);
            } else { closeDetail(); }
        });

        network.on('doubleClick', function (params) {
            if (params.nodes.length === 1) {
                network.focus(params.nodes[0], { scale: 2, animation: { duration: 400, easingFunction: 'easeInOutQuad' } });
            }
        });
    }

    // ── HUD ─────────────────────────────────────────────
    function renderHUD() {
        var hud = document.getElementById('hud');
        if (!hud) return;
        var total = scopes.length;
        var avgBits = Math.round(scopes.reduce(function (sum, s) { return sum + s.bits; }, 0) / total);
        hud.innerHTML = ringHTML(avgBits, 90) + '<div class="hud-label">' + total + ' SCOPES</div>';
    }

    // ── INIT ────────────────────────────────────────────
    async function init(el) {
        var res = await fetch('./scopes.json');
        scopes = await res.json();

        var container = el || document.getElementById('galaxy');
        if (!container) return;

        buildGraph(container);
        renderHUD();

        var search = document.getElementById('galaxySearch');
        if (search) {
            search.addEventListener('input', function () { handleSearch(this.value); });
            search.addEventListener('keydown', function (e) {
                if (e.key === 'Escape') { this.value = ''; handleSearch(''); this.blur(); }
            });
        }

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                closeDetail();
                if (network) network.fit({ animation: { duration: 400, easingFunction: 'easeInOutQuad' } });
            }
        });
    }

    return { init: init, closeDetail: closeDetail, focusScope: focusScope, scopes: function () { return scopes; } };
})();
