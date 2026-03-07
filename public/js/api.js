/* ═══════════════════════════════════════════════════════════════
   SOVEREIGN — API Client
   Replaces localStorage with server API calls
   ═══════════════════════════════════════════════════════════════ */

const API = window.API = {
    token: localStorage.getItem('sovereign_token') || null,
    baseUrl: '',

    // ─── Headers ───
    headers() {
        const h = { 'Content-Type': 'application/json' };
        if (this.token) h['Authorization'] = 'Bearer ' + this.token;
        h['ngrok-skip-browser-warning'] = '69420'; // Skip ngrok browser warning page
        return h;
    },

    // ─── Generic request ───
    async request(method, path, body) {
        const showLoader = method !== 'GET' && window.showSpinner;
        try {
            if (showLoader) window.showSpinner();
            const opts = { method, headers: this.headers() };
            if (body && method !== 'GET') opts.body = JSON.stringify(body);

            const res = await fetch(this.baseUrl + path, opts);
            let data;

            // Try to parse JSON, if it fails (like an ngrok HTML error), catch it
            try {
                const text = await res.text();
                data = JSON.parse(text);
            } catch (parseErr) {
                if (res.status === 502 || res.status === 503) {
                    throw new Error("Server is offline or unreachable via tunneling (Bad Gateway).");
                }
                throw new Error("Received an invalid response from the server (unexpected HTML).");
            }

            if (!res.ok) {
                throw new Error(data.error || 'Request failed');
            }
            return data;
        } catch (err) {
            console.error(`[API] ${method} ${path}:`, err.message);
            throw err;
        } finally {
            if (showLoader) window.hideSpinner();
        }
    },

    async get(path) { return this.request('GET', path); },
    async post(path, body) { return this.request('POST', path, body); },
    async del(path) { return this.request('DELETE', path); },

    // ─── Auth ───
    async register(username, email, password) {
        const data = await this.post('/auth/register', { username, email, password });
        this.token = data.token;
        localStorage.setItem('sovereign_token', data.token);
        return data;
    },

    async login(username, password) {
        const data = await this.post('/auth/login', { username, password });
        this.token = data.token;
        localStorage.setItem('sovereign_token', data.token);
        return data;
    },

    logout() {
        this.token = null;
        localStorage.removeItem('sovereign_token');
    },

    async verifyEmail(pin) {
        return this.post('/auth/verify-email', { pin });
    },

    async forgotPassword(email) {
        return this.post('/auth/forgot-password', { email });
    },

    async resetPassword(token, newPassword) {
        return this.post('/auth/reset-password', { token, newPassword });
    },

    async getMe() {
        return this.get('/auth/me');
    },

    // ─── Nation ───
    async createNation(data) { return this.post('/api/nation', data); },
    async getNation() { return this.get('/api/nation'); },
    async viewNation(id) { return this.get('/api/nation/' + id); },

    // ─── Cities ───
    async buildCity(cityName) { return this.post('/api/city/build', { cityName }); },
    async buildImprovement(cityId, improvementType) { return this.post(`/api/city/${cityId}/improve`, { improvementType }); },
    async removeImprovement(cityId, improvementType) { return this.post(`/api/city/${cityId}/improve/remove`, { improvementType }); },
    async buyInfrastructure(cityId, amount) { return this.post(`/api/city/${cityId}/infrastructure`, { amount }); },
    async buyLand(cityId, amount) { return this.post(`/api/city/${cityId}/land`, { amount }); },
    async makeCapital(cityId) { return this.post(`/api/city/${cityId}/make-capital`); },
    async renameCity(cityId, newName) { return this.post(`/api/city/${cityId}/rename`, { newName }); },

    // ─── Military ───
    async recruit(unitType, amount) { return this.post('/api/military/recruit', { unitType, amount }); },
    async upgradeUnit(fromUnit, toUnit, amount) { return this.post('/api/military/upgrade', { fromUnit, toUnit, amount }); },

    // ─── War ───
    async declareWar(targetId, casusBelli) { return this.post('/api/war/declare', { targetId, casusBelli }); },
    async executeBattle(warId, attackType, commitment, defensePosture) {
        return this.post(`/api/war/${warId}/battle`, { attackType, commitment, defensePosture });
    },
    async offerPeace(warId, demands) { return this.post(`/api/war/${warId}/peace`, { demands }); },

    // ─── Diplomacy ───
    async proposeTreaty(targetId, type) { return this.post('/api/treaty', { targetId, type }); },
    async cancelTreaty(id) { return this.del('/api/treaty/' + id); },

    // ─── Alliance ───
    async createAlliance(name) { return this.post('/api/alliance', { name }); },
    async joinAlliance(id) { return this.post(`/api/alliance/${id}/join`); },
    async leaveAlliance() { return this.post('/api/alliance/leave'); },
    async updateAlliance(description) { return this.post('/api/alliance/update', { description }); },
    async kickMember(nationId) { return this.post(`/api/alliance/member/${nationId}/kick`); },
    async updateMemberRole(nationId, role) { return this.post(`/api/alliance/member/${nationId}/role`, { role }); },

    // ─── Trade ───
    async getMarket() { return this.get('/api/market'); },
    async getMarketHistory() { return this.get('/api/market/history'); },
    async buyResource(resource, amount) { return this.post('/api/market/buy', { resource, amount }); },
    async sellResource(resource, amount) { return this.post('/api/market/sell', { resource, amount }); },

    // ─── Messages ───
    async getMessages() { return this.get('/api/messages'); },
    async sendMessage(toNationId, subject, body, messageType) {
        return this.post('/api/messages', { toNationId, subject, body, messageType });
    },

    // ─── Research ───
    async getResearch() { return this.get('/api/research'); },
    async startResearch(techId) { return this.post('/api/research/start', { techId }); },

    // ─── Espionage ───
    async spyMission(targetId, missionType) { return this.post('/api/spy', { targetId, missionType }); },

    // ─── Policies ───
    async updatePolicies(policies) { return this.post('/api/policies', policies); },

    // ─── World ───
    async getRankings() { return this.get('/api/rankings'); },
    async getNations(page) { return this.get('/api/nations?page=' + (page || 1)); },
    async getNews() { return this.get('/api/news'); },
    async getAlliances() { return this.get('/api/alliances'); },

    // ─── WebSocket ───
    ws: null,
    connectWebSocket() {
        if (!this.token) return;
        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${location.host}?token=${this.token}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => console.log('[WS] Connected');
        this.ws.onclose = () => {
            console.log('[WS] Disconnected, reconnecting in 5s...');
            setTimeout(() => this.connectWebSocket(), 5000);
        };
        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleWSMessage(data);
            } catch (e) { /* ignore */ }
        };
    },

    handleWSMessage(data) {
        switch (data.type) {
            case 'tick':
                UI.toast('info', 'TURN PROCESSED', 'Resources collected. Nation updated.');
                App.loadGameState().then(() => {
                    UI.updateAll();
                    const topElements = [document.getElementById('resource-bar'), document.getElementById('turn-info')];
                    topElements.forEach(el => {
                        if (el) {
                            el.classList.remove('flash-update');
                            void el.offsetWidth;
                            el.classList.add('flash-update');
                        }
                    });
                });
                break;
            case 'war_declared':
                UI.toast('error', 'WAR DECLARED', `${data.attackerName} has declared war on your nation!`);
                App.loadGameState();
                break;
            case 'battle_result':
                UI.toast('warning', 'BATTLE REPORT', 'A battle has taken place. Check the Wars page.');
                App.loadGameState();
                break;
            case 'new_message':
                UI.toast('info', 'INCOMING MESSAGE', `Message from ${data.fromName}.`);
                const badge = document.getElementById('notif-badge');
                if (badge) {
                    const current = parseInt(badge.textContent) || 0;
                    badge.textContent = current + 1;
                    badge.classList.remove('hidden');
                }
                const msgNotif = document.getElementById('msg-notif');
                if (msgNotif) msgNotif.classList.remove('hidden');
                break;
            case 'peace':
                UI.toast('success', 'PEACE ACHIEVED', 'A war has ended.');
                App.loadGameState();
                break;
            case 'treaty_signed':
                UI.toast('success', 'TREATY SIGNED', `${data.fromName} signed a ${data.treatyType} pact.`);
                break;
            case 'system_broadcast':
                UI.toast('warning', data.headline || 'BROADCAST', data.body || '');
                break;
        }
    }
};
