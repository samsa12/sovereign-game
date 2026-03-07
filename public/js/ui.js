/* ═══════════════════════════════════════════════════════════════
   SOVEREIGN — UI Module (Multiplayer)
   Brutalist military style — Font Awesome only, bronze #c8922a
   ═══════════════════════════════════════════════════════════════ */

const UI = {
    currentPage: 'dashboard',

    navigate(page) {
        this.currentPage = page;
        document.querySelectorAll('.sidebar-link').forEach(l => {
            l.classList.toggle('active', l.dataset.page === page);
        });
        this.renderPage(page);
        this.closeSidebar(); // Close on navigation (mobile)
    },

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;
        if (window.innerWidth > 900) {
            sidebar.classList.toggle('closed');
        } else {
            sidebar.classList.toggle('open');
        }
    },

    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;
        // Only trigger auto-close on mobile
        if (window.innerWidth <= 900) {
            sidebar.classList.remove('open');
        }
    },

    renderPage(page) {
        const content = document.getElementById('content');
        if (!content) return;
        content.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-muted)"><i class="fa-solid fa-spinner fa-spin fa-2x"></i></div>';
        content.className = 'content page-enter';

        if (Pages[page]) {
            Pages[page]();
        } else {
            content.innerHTML = `<div class="page-header"><h1 class="page-title">${page.toUpperCase()}</h1></div><p style="color:var(--text-muted)">Under construction.</p>`;
        }
    },

    updateResourceBar() {
        const s = App.state;
        if (!s) return;
        const n = s.nation || s;
        const bar = document.getElementById('resource-bar');
        if (!bar) return;

        const resources = [
            { key: 'money', icon: 'fa-dollar-sign', label: 'MON' },
            { key: 'food', icon: 'fa-wheat-awn', label: 'FOOD' },
            { key: 'steel', icon: 'fa-cube', label: 'STL' },
            { key: 'oil', icon: 'fa-droplet', label: 'OIL' },
            { key: 'aluminum', icon: 'fa-diamond', label: 'ALU' },
            { key: 'munitions', icon: 'fa-bomb', label: 'MUN' },
            { key: 'uranium', icon: 'fa-radiation', label: 'URA' },
            { key: 'rare', icon: 'fa-gem', label: 'RARE' },
        ];

        bar.innerHTML = resources.map(r => {
            const val = n[r.key] ?? 0;
            return `<div class="resource-item">
                <i class="fa-solid ${r.icon}" style="color:var(--accent)"></i>
                <span class="resource-value">${this.fmt(val)}</span>
            </div>`;
        }).join('');
    },

    updateTopBar() {
        const s = App.state;
        if (!s) return;
        const n = s.nation || s;

        const turnEl = document.getElementById('turn-number');
        if (turnEl) turnEl.textContent = s.currentTurn || '?';

        const nameEl = document.getElementById('user-nation-name');
        if (nameEl) nameEl.textContent = n.name || 'UNKNOWN';

        const flagEl = document.getElementById('user-flag-mini');
        if (flagEl && n.flag_pattern) {
            flagEl.style.background = App.getPatternCSS(n.flag_pattern, [n.flag_color1 || '#333', n.flag_color2 || '#666', n.flag_color3 || '#999']);
        }

        const badge = document.getElementById('notif-badge');
        if (badge) {
            if (s.unreadMessages > 0) {
                badge.textContent = s.unreadMessages;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
        const msgNotif = document.getElementById('msg-notif');
        if (msgNotif) msgNotif.classList.toggle('hidden', !s.unreadMessages);
    },

    updateAll() {
        this.updateResourceBar();
        this.updateTopBar();
        if (this.currentPage && Pages[this.currentPage]) {
            this.renderPage(this.currentPage);
        }
    },

    renderFlagSVG(nation, w, h) {
        if (!nation) return '';
        const bg = App.getPatternCSS(nation.flag_pattern || 'horizontal_3', [
            nation.flag_color1 || '#333', nation.flag_color2 || '#666', nation.flag_color3 || '#999'
        ]);
        return `<div style="width:${w}px;height:${h}px;border-radius:var(--radius);border:1px solid var(--border-color);background:${bg}"></div>`;
    },

    toast(type, title, message) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const icons = { success: 'fa-check', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon"><i class="fa-solid ${icons[type] || icons.info}"></i></span>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
    },

    showModal(title, bodyHtml, footerHtml) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = bodyHtml;
        document.getElementById('modal-footer').innerHTML = footerHtml || '';
        document.getElementById('modal-overlay').classList.remove('hidden');
    },

    closeModal() {
        document.getElementById('modal-overlay').classList.add('hidden');
    },

    fmt(n) {
        if (n === null || n === undefined) return '0';
        n = Number(n);
        if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'B';
        if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
        if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
        return Math.floor(n).toLocaleString();
    },

    fmtFull(n) {
        if (n === null || n === undefined) return '0';
        return Math.floor(Number(n)).toLocaleString();
    }
};
