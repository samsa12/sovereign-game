/* ═══════════════════════════════════════════════════════════════
   SOVEREIGN — App (Multiplayer)
   Handles auth flow, game state loading, navigation, creation wizard
   ═══════════════════════════════════════════════════════════════ */

const App = {
    state: null,   // Server-fetched nation data
    user: null,    // Current user info

    // ─── Boot ───
    async init() {
        // If we have a token, try to load game
        if (API.token) {
            document.getElementById('landing-page').classList.add('hidden');
            document.getElementById('loading-screen').classList.remove('hidden');
            await this.tryLoadGame();
        }
        // Otherwise landing page with login/register is already visible
    },

    async tryLoadGame() {
        try {
            // Check if user is authenticated
            const res = await API.getMe();
            this.user = res.user;

            // Try to load nation
            try {
                await this.loadGameState();
                this.enterGame();
            } catch (err) {
                // No nation yet — show creation wizard
                document.getElementById('loading-screen').classList.add('hidden');
                document.getElementById('creation-screen').classList.remove('hidden');
                this.initCreationWizard();
            }
        } catch (err) {
            // Invalid token
            API.logout();
            document.getElementById('loading-screen').classList.add('hidden');
            document.getElementById('landing-page').classList.remove('hidden');
        }
    },

    async loadGameState() {
        const data = await API.getNation();
        this.state = data;
        return data;
    },

    enterGame() {
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('creation-screen').classList.add('hidden');
        document.getElementById('landing-page').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');

        UI.updateAll();
        UI.navigate('dashboard');

        // Connect WebSocket for real-time updates
        API.connectWebSocket();
    },

    logout() {
        API.logout();
        this.state = null;
        this.user = null;
        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('landing-page').classList.remove('hidden');
        location.reload();
    },

    // ═══════════════════════════════════════
    // CREATION WIZARD
    // ═══════════════════════════════════════
    wizard: {
        step: 1,
        maxSteps: 5,
        data: {
            name: '', leaderName: '', motto: '', currencyName: '',
            government: 'democracy', continent: 'north_america',
            flag: { pattern: 'horizontal_3', colors: ['#1a5276', '#c0392b', '#f1c40f'] }
        }
    },

    initCreationWizard() {
        const w = this.wizard;
        w.step = 1;

        // Populate government grid
        const govGrid = document.getElementById('gov-grid');
        govGrid.innerHTML = '';
        for (const [id, gov] of Object.entries(DATA.governments)) {
            const card = document.createElement('div');
            card.className = 'gov-card' + (id === w.data.government ? ' selected' : '');
            card.innerHTML = `
                <div class="gov-icon">${gov.icon}</div>
                <div class="gov-name">${gov.name}</div>
                <div class="gov-desc">${gov.desc}</div>
                <div class="gov-bonuses">
                    ${gov.bonuses.map(b => `<span class="gov-bonus-pos">${b.label}</span>`).join('<br>')}
                    ${gov.penalties.map(p => `<span class="gov-bonus-neg">${p.label}</span>`).join('<br>')}
                </div>`;
            card.onclick = () => {
                w.data.government = id;
                govGrid.querySelectorAll('.gov-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
            };
            govGrid.appendChild(card);
        }

        // Populate continent grid
        const contGrid = document.getElementById('continent-grid');
        contGrid.innerHTML = '';
        for (const [id, cont] of Object.entries(DATA.continents)) {
            const card = document.createElement('div');
            card.className = 'continent-card' + (id === w.data.continent ? ' selected' : '');
            card.innerHTML = `
                <div class="cont-icon">${cont.icon}</div>
                <div class="cont-name">${cont.name}</div>
                <div class="cont-bonus">${cont.bonus}</div>`;
            card.onclick = () => {
                w.data.continent = id;
                contGrid.querySelectorAll('.continent-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
            };
            contGrid.appendChild(card);
        }

        // Flag pattern grid
        this.initFlagDesigner();

        // Nav buttons
        document.getElementById('btn-next').onclick = () => this.wizardNext();
        document.getElementById('btn-prev').onclick = () => this.wizardPrev();

        this.updateWizardUI();
    },

    initFlagDesigner() {
        const w = this.wizard;
        const patternGrid = document.getElementById('pattern-grid');
        patternGrid.innerHTML = '';

        const patterns = ['horizontal_3', 'vertical_3', 'horizontal_2', 'vertical_2', 'diagonal', 'cross', 'saltire', 'quarters'];
        patterns.forEach(p => {
            const opt = document.createElement('div');
            opt.className = 'pattern-option' + (p === w.data.flag.pattern ? ' selected' : '');
            opt.innerHTML = `<div style="width:100%;height:100%;background:${this.getPatternCSS(p, w.data.flag.colors)}"></div>`;
            opt.onclick = () => {
                w.data.flag.pattern = p;
                patternGrid.querySelectorAll('.pattern-option').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                this.updateFlagPreview();
            };
            patternGrid.appendChild(opt);
        });

        // Color inputs
        ['flag-color-1', 'flag-color-2', 'flag-color-3'].forEach((id, i) => {
            const el = document.getElementById(id);
            el.value = w.data.flag.colors[i];
            el.oninput = () => {
                w.data.flag.colors[i] = el.value;
                this.updateFlagPreview();
                this.initFlagDesigner(); // refresh pattern previews
            };
        });

        this.updateFlagPreview();
    },

    getPatternCSS(pattern, colors) {
        const [c1, c2, c3] = colors;
        switch (pattern) {
            case 'horizontal_3': return `linear-gradient(${c1} 33%, ${c2} 33% 66%, ${c3} 66%)`;
            case 'vertical_3': return `linear-gradient(90deg, ${c1} 33%, ${c2} 33% 66%, ${c3} 66%)`;
            case 'horizontal_2': return `linear-gradient(${c1} 50%, ${c2} 50%)`;
            case 'vertical_2': return `linear-gradient(90deg, ${c1} 50%, ${c2} 50%)`;
            case 'diagonal': return `linear-gradient(135deg, ${c1} 50%, ${c2} 50%)`;
            case 'cross': return `linear-gradient(${c1} 40%, ${c3} 40% 60%, ${c1} 60%), linear-gradient(90deg, transparent 40%, ${c3} 40% 60%, transparent 60%), linear-gradient(${c2}, ${c2})`;
            case 'saltire': return `linear-gradient(45deg, ${c1} 30%, transparent 30% 70%, ${c1} 70%), linear-gradient(-45deg, ${c1} 30%, transparent 30% 70%, ${c1} 70%), ${c2}`;
            case 'quarters': return `linear-gradient(${c1} 50%, ${c3} 50%) top left / 50% 100% no-repeat, linear-gradient(${c2} 50%, ${c1} 50%) top right / 50% 100% no-repeat`;
            default: return c1;
        }
    },

    updateFlagPreview() {
        const w = this.wizard;
        const canvas = document.getElementById('flag-canvas');
        canvas.style.background = this.getPatternCSS(w.data.flag.pattern, w.data.flag.colors);
    },

    async wizardNext() {
        const w = this.wizard;

        // Validate current step
        if (w.step === 1) {
            w.data.name = document.getElementById('nation-name').value.trim();
            w.data.leaderName = document.getElementById('leader-name').value.trim();
            w.data.motto = document.getElementById('nation-motto').value.trim();
            w.data.currencyName = document.getElementById('currency-name').value.trim();
            if (!w.data.name || !w.data.leaderName) {
                UI.toast('error', 'Missing Info', 'Nation name and leader name are required.');
                return;
            }
        }

        if (w.step === 5) {
            // Submit to server
            try {
                await API.createNation({
                    name: w.data.name,
                    leaderName: w.data.leaderName,
                    motto: w.data.motto,
                    currencyName: w.data.currencyName,
                    government: w.data.government,
                    continent: w.data.continent,
                    flag: { pattern: w.data.flag.pattern, colors: w.data.flag.colors }
                });
                await this.loadGameState();
                this.enterGame();
                UI.toast('success', 'Nation Created!', `Welcome to the world stage, ${w.data.name}!`);
            } catch (err) {
                UI.toast('error', 'Error', err.message);
            }
            return;
        }

        w.step = Math.min(w.step + 1, w.maxSteps);
        if (w.step === 5) this.buildReview();
        this.updateWizardUI();
    },

    wizardPrev() {
        this.wizard.step = Math.max(this.wizard.step - 1, 1);
        this.updateWizardUI();
    },

    updateWizardUI() {
        const w = this.wizard;
        // Update step indicators
        document.querySelectorAll('.creation-steps .step').forEach(el => {
            const s = parseInt(el.dataset.step);
            el.classList.toggle('active', s === w.step);
            el.classList.toggle('completed', s < w.step);
        });
        // Show/hide step content
        document.querySelectorAll('.creation-step-content').forEach(el => {
            el.classList.toggle('active', el.id === 'step-' + w.step);
        });
        // Nav buttons
        document.getElementById('btn-prev').disabled = (w.step === 1);
        document.getElementById('btn-next').textContent = (w.step === 5) ? 'Create Nation ✦' : 'Next →';
    },

    buildReview() {
        const w = this.wizard.data;
        const gov = DATA.governments[w.government];
        const cont = DATA.continents[w.continent];
        document.getElementById('review-card').innerHTML = `
            <div class="review-section"><span class="review-label">Nation</span><span class="review-value">${w.name}</span></div>
            <div class="review-section"><span class="review-label">Leader</span><span class="review-value">${w.leaderName}</span></div>
            <div class="review-section"><span class="review-label">Motto</span><span class="review-value">${w.motto || '—'}</span></div>
            <div class="review-section"><span class="review-label">Currency</span><span class="review-value">${w.currencyName || 'Dollar'}</span></div>
            <div class="review-section"><span class="review-label">Government</span><span class="review-value">${gov?.icon || ''} ${gov?.name || w.government}</span></div>
            <div class="review-section"><span class="review-label">Continent</span><span class="review-value">${cont?.icon || ''} ${cont?.name || w.continent}</span></div>
            <div class="review-section"><span class="review-label">Flag</span>
                <div class="review-flag-preview" style="background:${this.getPatternCSS(w.flag.pattern, w.flag.colors)}"></div>
            </div>`;
    }
};

// ═══════════════════════════════════════
// AUTH HANDLERS (called from HTML forms)
// ═══════════════════════════════════════

function showAuthTab(tab) {
    document.getElementById('tab-login').classList.toggle('active', tab === 'login');
    document.getElementById('tab-register').classList.toggle('active', tab === 'register');
    document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
    document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    errorEl.textContent = '';

    try {
        await API.login(username, password);
        document.getElementById('landing-page').classList.add('hidden');
        document.getElementById('loading-screen').classList.remove('hidden');
        await App.tryLoadGame();
    } catch (err) {
        errorEl.textContent = err.message || 'Login failed';
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const errorEl = document.getElementById('register-error');
    errorEl.textContent = '';

    try {
        await API.register(username, email, password);
        document.getElementById('landing-page').classList.add('hidden');
        document.getElementById('loading-screen').classList.remove('hidden');
        await App.tryLoadGame();
    } catch (err) {
        errorEl.textContent = err.message || 'Registration failed';
    }
}

// ─── Boot ───
document.addEventListener('DOMContentLoaded', () => {
    // Sidebar navigation
    document.querySelectorAll('.sidebar-link[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            UI.navigate(link.dataset.page);
        });
    });

    // Mobile menu toggle
    document.getElementById('menu-toggle')?.addEventListener('click', () => UI.toggleSidebar());
    document.getElementById('sidebar-close')?.addEventListener('click', () => UI.closeSidebar());
    document.getElementById('sidebar-overlay')?.addEventListener('click', () => UI.closeSidebar());

    // Modal close
    document.getElementById('modal-close')?.addEventListener('click', () => UI.closeModal());
    document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) UI.closeModal();
    });

    App.init();
});
