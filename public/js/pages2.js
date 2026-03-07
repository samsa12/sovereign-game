/* ═══════════════════════════════════════════════════════════════
   SOVEREIGN — Page Renderers Part 2 (Multiplayer)
   Wars, Trade, Diplomacy, Alliance, Intelligence, Rankings,
   News, Messages, Settings, Admin
   Font Awesome only — no emojis
   ═══════════════════════════════════════════════════════════════ */

Object.assign(Pages, {

    // ═══ WARS ═══
    wars() {
        const s = App.state;
        if (!s || !s.nation) return;
        const wars = s.wars || [];

        document.getElementById('content').innerHTML = `
        <div class="page-header">
            <h1 class="page-title"><i class="fa-solid fa-crosshairs"></i> Wars</h1>
        </div>

        ${wars.length === 0 ? `
        <div class="card" style="text-align:center;padding:var(--space-xl)">
            <i class="fa-solid fa-dove" style="font-size:2rem;color:var(--text-muted);display:block;margin-bottom:var(--space-md)"></i>
            <p style="color:var(--text-muted);font-family:var(--font-condensed);text-transform:uppercase;letter-spacing:1px">No active conflicts — nation at peace</p>
        </div>` : wars.map(w => `
        <div class="battle-card" style="margin-bottom:var(--space-lg)">
            <div class="battle-versus">
                <div class="battle-side">
                    <div class="battle-side-name">${w.attacker_name}</div>
                    <span class="tag tag-red">ATTACKER</span>
                </div>
                <div class="battle-vs">VS</div>
                <div class="battle-side">
                    <div class="battle-side-name">${w.defender_name}</div>
                    <span class="tag tag-amber">DEFENDER</span>
                </div>
            </div>
            <div style="display:flex;gap:var(--space-sm);justify-content:center">
                <button class="btn btn-danger btn-sm" onclick="Pages._battle(${w.id})"><i class="fa-solid fa-crosshairs"></i> ATTACK</button>
                <button class="btn btn-secondary btn-sm" onclick="Pages._peace(${w.id})"><i class="fa-solid fa-dove"></i> PEACE</button>
            </div>
        </div>`).join('')}

        <div class="card" style="margin-top:var(--space-lg)">
            <div class="card-header"><span class="card-title"><i class="fa-solid fa-fire"></i> Declare War</span></div>
            <div class="form-group">
                <label>Target Nation ID</label>
                <input type="number" id="war-target" placeholder="Nation ID">
            </div>
            <button class="btn btn-danger" onclick="Pages._declareWar()"><i class="fa-solid fa-skull-crossbones"></i> DECLARE WAR</button>
        </div>`;
    },

    async _battle(warId) {
        try { const r = await API.executeBattle(warId, 'ground', 50); await App.loadGameState(); UI.updateAll(); UI.toast('warning', 'BATTLE', r.message || 'Attack launched.'); }
        catch (err) { UI.toast('error', 'ERROR', err.message); }
    },

    async _peace(warId) {
        try { await API.offerPeace(warId, {}); await App.loadGameState(); UI.updateAll(); UI.toast('success', 'PEACE', 'Terms sent.'); }
        catch (err) { UI.toast('error', 'ERROR', err.message); }
    },

    async _declareWar() {
        const t = document.getElementById('war-target')?.value;
        if (!t) return UI.toast('error', 'ERROR', 'Enter target nation ID.');
        try { await API.declareWar(parseInt(t)); await App.loadGameState(); UI.updateAll(); UI.toast('warning', 'WAR', 'War declared!'); }
        catch (err) { UI.toast('error', 'ERROR', err.message); }
    },

    // ═══ TRADE ═══
    async trade() {
        const content = document.getElementById('content');
        const s = App.state;
        const n = s?.nation || {};

        let market;
        try { market = await API.getMarket(); }
        catch (err) {
            content.innerHTML = `<div class="page-header"><h1 class="page-title"><i class="fa-solid fa-boxes-stacked"></i> Trade</h1></div><p style="color:var(--text-muted)">Market unavailable.</p>`;
            return;
        }

        const resources = market.resources || {};

        content.innerHTML = `
        <div class="page-header">
            <h1 class="page-title"><i class="fa-solid fa-boxes-stacked"></i> Global Market</h1>
        </div>

        <div class="card" style="margin-bottom:var(--space-lg)">
            <div class="card-header"><span class="card-title"><i class="fa-solid fa-chart-bar"></i> Market Supply Distribution</span></div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(80px, 1fr));gap:var(--space-md);padding:var(--space-sm) 0">
                ${Object.keys(resources).map(res => {
            const history = (market.history || []).filter(h => h.resource === res);
            if (history.length < 2) return `<div><div style="font-family:var(--font-condensed);font-size:0.6rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px">${res}</div><div style="height:40px;background:var(--bg-tertiary)"></div></div>`;

            const maxP = Math.max(...history.map(h => h.pool));
            const minP = Math.min(...history.map(h => h.pool));
            const range = Math.max(1, maxP - minP);
            const width = 100;
            const height = 40;

            const points = history.map((h, i) => {
                const x = (1 - (i / Math.max(1, history.length - 1))) * width;
                const y = height - (((h.pool - minP) / range) * height);
                return `${x},${y}`;
            }).join(' ');

            const areaPoints = `${width},${height} ` + points + ` 0,${height}`;

            return `
                    <div style="display:flex;flex-direction:column;gap:4px;">
                        <span style="font-family:var(--font-condensed);font-size:0.6rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px">${res.slice(0, 4)}</span>
                        <svg width="100%" height="40" viewBox="0 -5 100 50" preserveAspectRatio="none" style="border-bottom:1px solid var(--border-color); overflow:visible;">
                            <polygon fill="var(--accent)" fill-opacity="0.15" points="${areaPoints}" />
                            <polyline fill="none" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke" points="${points}" />
                        </svg>
                    </div>`;
        }).join('')}
        </div>

        <div class="card">
            <div class="card-header"><span class="card-title"><i class="fa-solid fa-exchange-alt"></i> Buy / Sell</span></div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th></th>
                        <th>Resource</th>
                        <th>Price</th>
                        <th>Market Pool</th>
                        <th>Your Stock</th>
                        <th>Your Value</th>
                        <th>Amount</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(resources).map(([res, info]) => {
            const icon = RES_ICONS[res] || 'fa-cube';
            const stock = n[res] || 0;
            const value = stock * (info.price || 0);
            return `<tr>
                            <td><i class="fa-solid ${icon}" style="color:var(--accent)"></i></td>
                            <td><strong>${res.charAt(0).toUpperCase() + res.slice(1)}</strong></td>
                            <td style="font-family:var(--font-condensed);color:var(--accent)">$${UI.fmt(info.price)}</td>
                            <td>${UI.fmt(info.pool)}</td>
                            <td>${UI.fmtFull(stock)}</td>
                            <td style="color:var(--success)">$${UI.fmt(value)}</td>
                            <td><input type="number" id="trade-amt-${res}" min="1" value="100" style="width:70px;padding:4px;background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:var(--radius);color:var(--text-primary);font-family:var(--font-condensed)"></td>
                            <td>
                                <button class="btn btn-primary btn-sm" onclick="Pages._buyResource('${res}')">BUY</button>
                                <button class="btn btn-danger btn-sm" onclick="Pages._sellResource('${res}')">SELL</button>
                            </td>
                        </tr>`;
        }).join('')}
                </tbody>
            </table>
        </div>`;
    },

    async _buyResource(res) {
        const amt = parseInt(document.getElementById('trade-amt-' + res)?.value) || 100;
        try { await API.buyResource(res, amt); await App.loadGameState(); UI.updateResourceBar(); Pages.trade(); UI.toast('success', 'PURCHASED', `${amt} ${res} acquired.`); }
        catch (err) { UI.toast('error', 'ERROR', err.message); }
    },

    async _sellResource(res) {
        const amt = parseInt(document.getElementById('trade-amt-' + res)?.value) || 100;
        try { await API.sellResource(res, amt); await App.loadGameState(); UI.updateResourceBar(); Pages.trade(); UI.toast('success', 'SOLD', `${amt} ${res} sold.`); }
        catch (err) { UI.toast('error', 'ERROR', err.message); }
    },

    // ═══ ALLIANCE ═══
    async alliance() {
        const s = App.state;
        if (!s) return;
        const alliance = s.alliance;
        const content = document.getElementById('content');

        if (!alliance) {
            let alliances = [];
            try { alliances = (await API.getAlliances()).alliances || []; } catch (e) { }

            content.innerHTML = `
            <div class="page-header"><h1 class="page-title"><i class="fa-solid fa-handshake"></i> Alliance</h1></div>
            <div class="card">
                <div class="card-header"><span class="card-title"><i class="fa-solid fa-plus"></i> Create Alliance</span></div>
                <div class="form-group"><label>Alliance Name</label><input type="text" id="alliance-name" placeholder="Name" maxlength="40"></div>
                <button class="btn btn-primary" style="margin-top:var(--space-md)" onclick="Pages._createAlliance()">CREATE</button>
            </div>
            ${alliances.length > 0 ? `
            <div class="card" style="margin-top:var(--space-lg)">
                <div class="card-header"><span class="card-title"><i class="fa-solid fa-list"></i> Available</span></div>
                ${alliances.map(a => `
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-color)">
                        <div><strong>${a.name}</strong> <span style="color:var(--text-muted);font-family:var(--font-condensed)">(${a.member_count} MEMBERS)</span></div>
                        <button class="btn btn-primary btn-sm" onclick="Pages._joinAlliance(${a.id})">JOIN</button>
                    </div>`).join('')}
            </div>` : ''}`;
        } else {
            content.innerHTML = `
            <div class="page-header"><h1 class="page-title"><i class="fa-solid fa-handshake"></i> ${alliance.name}</h1></div>
            
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-md); margin-bottom:var(--space-lg)">
                <div class="card" style="display:flex;flex-direction:column;justify-content:center;align-items:center;background:var(--bg-tertiary); min-height:300px;">
                    <i class="fa-solid fa-shield-halved" style="font-size:5rem; color:var(--accent); margin-bottom:var(--space-md); filter:drop-shadow(0 0 10px rgba(var(--accent-rgb), 0.4))"></i>
                    <h2 style="font-family:var(--font-heading); letter-spacing:2px; margin:0">${alliance.name}</h2>
                    <p style="color:var(--text-muted); font-family:var(--font-condensed); margin-bottom:var(--space-lg)">ESTABLISHED T-${alliance.created_turn || 'UNKNOWN'}</p>
                    <button class="btn btn-danger" style="width:70%" onclick="Pages._leaveAlliance()"><i class="fa-solid fa-right-from-bracket" style="margin-right:8px"></i> LEAVE ALLIANCE</button>
                </div>
                
                <div class="card" style="padding:0; overflow:hidden;">
                    <div class="card-header" style="border-bottom:1px solid var(--border-color); padding:var(--space-md)"><span class="card-title"><i class="fa-solid fa-users"></i> Member Register (${(alliance.members || []).length})</span></div>
                    <div style="max-height:300px; overflow-y:auto;">
                        <table class="data-table" style="margin:0;">
                            <thead style="position:sticky; top:0; background:var(--bg-secondary); box-shadow:0 1px 3px rgba(0,0,0,0.5);">
                                <tr><th>Nation</th><th>Rank</th></tr>
                            </thead>
                            <tbody>
                                ${(alliance.members || []).map(m => `
                                    <tr>
                                        <td><strong>${m.name}</strong></td>
                                        <td><span class="tag tag-${m.role === 'founder' ? 'red' : 'amber'}">${m.role.toUpperCase()}</span></td>
                                    </tr>`).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>`;
        }
    },

    async _createAlliance() { const n = document.getElementById('alliance-name')?.value?.trim(); if (!n) return UI.toast('error', 'ERROR', 'Name required.'); try { await API.createAlliance(n); await App.loadGameState(); Pages.alliance(); UI.toast('success', 'CREATED', `"${n}" established.`); } catch (e) { UI.toast('error', 'ERROR', e.message); } },
    async _joinAlliance(id) { try { await API.joinAlliance(id); await App.loadGameState(); Pages.alliance(); UI.toast('success', 'JOINED', 'Alliance joined.'); } catch (e) { UI.toast('error', 'ERROR', e.message); } },
    async _leaveAlliance() { if (!confirm('Leave alliance?')) return; try { await API.leaveAlliance(); await App.loadGameState(); Pages.alliance(); UI.toast('info', 'LEFT', 'Alliance left.'); } catch (e) { UI.toast('error', 'ERROR', e.message); } },

    // ═══ DIPLOMACY ═══
    diplomacy() {
        const s = App.state;
        if (!s) return;
        const treaties = s.treaties || [];

        document.getElementById('content').innerHTML = `
        <div class="page-header"><h1 class="page-title"><i class="fa-solid fa-landmark"></i> Diplomacy</h1></div>

        <div class="card">
            <div class="card-header"><span class="card-title"><i class="fa-solid fa-file-contract"></i> Active Treaties</span></div>
            ${treaties.length === 0 ? '<p style="color:var(--text-muted)">No active treaties.</p>' :
                treaties.map(t => `
                <div class="treaty-card">
                    <span class="treaty-type">${(t.type || '').toUpperCase()}</span>
                    <div style="flex:1"><strong>${t.nation_a_name}</strong> — <strong>${t.nation_b_name}</strong></div>
                    <button class="btn btn-danger btn-sm" onclick="Pages._cancelTreaty(${t.id})"><i class="fa-solid fa-xmark"></i> CANCEL</button>
                </div>`).join('')}
        </div>

        <div class="card" style="margin-top:var(--space-lg)">
            <div class="card-header"><span class="card-title"><i class="fa-solid fa-file-signature"></i> Propose Treaty</span></div>
            <div class="form-group"><label>Target Nation ID</label><input type="number" id="treaty-target" placeholder="Nation ID"></div>
            <div class="form-group" style="margin-top:var(--space-sm)"><label>Treaty Type</label>
                <select id="treaty-type">
                    <option value="nap">NON-AGGRESSION PACT</option>
                    <option value="odp">OPTIONAL DEFENSE PACT</option>
                    <option value="mdp">MUTUAL DEFENSE PACT</option>
                    <option value="trade">TRADE AGREEMENT</option>
                </select>
            </div>
            <button class="btn btn-primary" style="margin-top:var(--space-md)" onclick="Pages._proposeTreaty()"><i class="fa-solid fa-handshake"></i> PROPOSE</button>
        </div>`;
    },

    async _cancelTreaty(id) { if (!confirm('Cancel treaty?')) return; try { await API.cancelTreaty(id); await App.loadGameState(); Pages.diplomacy(); UI.toast('info', 'CANCELLED', 'Treaty dissolved.'); } catch (e) { UI.toast('error', 'ERROR', e.message); } },
    async _proposeTreaty() { const t = document.getElementById('treaty-target')?.value, tp = document.getElementById('treaty-type')?.value; if (!t) return UI.toast('error', 'ERROR', 'Enter nation ID.'); try { await API.proposeTreaty(parseInt(t), tp); await App.loadGameState(); Pages.diplomacy(); UI.toast('success', 'PROPOSED', 'Treaty offer sent.'); } catch (e) { UI.toast('error', 'ERROR', e.message); } },

    // ═══ INTELLIGENCE ═══
    intelligence() {
        const s = App.state;
        if (!s || !s.nation) return;

        document.getElementById('content').innerHTML = `
        <div class="page-header"><h1 class="page-title"><i class="fa-solid fa-eye"></i> Intelligence</h1></div>

        <div class="card">
            <div class="card-header"><span class="card-title"><i class="fa-solid fa-user-secret"></i> Espionage Operations</span></div>
            <div class="form-group"><label>Target Nation ID</label><input type="number" id="spy-target" placeholder="Nation ID"></div>
            <div class="form-group" style="margin-top:var(--space-sm)"><label>Mission Type</label>
                <select id="spy-mission">
                    <option value="gather_intel">GATHER INTELLIGENCE</option>
                    <option value="sabotage">SABOTAGE</option>
                    <option value="assassinate">ASSASSINATION</option>
                    <option value="steal_tech">STEAL TECHNOLOGY</option>
                </select>
            </div>
            <button class="btn btn-primary" style="margin-top:var(--space-md)" onclick="Pages._spyMission()"><i class="fa-solid fa-binoculars"></i> LAUNCH MISSION</button>
        </div>

        <div class="card" style="margin-top:var(--space-lg)">
            <div class="card-header"><span class="card-title"><i class="fa-solid fa-shield-halved"></i> Counter-Intelligence</span></div>
            <p style="color:var(--text-secondary);font-family:var(--font-condensed)">ACTIVE SPIES: <strong style="color:var(--accent)">${(s.nation).spies || 0}</strong></p>
        </div>`;
    },

    async _spyMission() { const t = document.getElementById('spy-target')?.value, m = document.getElementById('spy-mission')?.value; if (!t) return UI.toast('error', 'ERROR', 'Enter target ID.'); try { const r = await API.spyMission(parseInt(t), m); UI.toast(r.success ? 'success' : 'warning', 'MISSION REPORT', r.message || 'Op complete.'); await App.loadGameState(); } catch (e) { UI.toast('error', 'ERROR', e.message); } },

    // ═══ RANKINGS ═══
    async rankings() {
        const content = document.getElementById('content');
        let data;
        try { data = await API.getRankings(); }
        catch (e) { content.innerHTML = `<div class="page-header"><h1 class="page-title"><i class="fa-solid fa-ranking-star"></i> Nations</h1></div><p style="color:var(--text-muted)">Unavailable.</p>`; return; }

        const nations = data.rankings || data.nations || [];

        content.innerHTML = `
        <div class="page-header" style="flex-direction:column; align-items:flex-start; gap:var(--space-xs)">
            <h1 class="page-title"><i class="fa-solid fa-ranking-star"></i> World Rankings</h1>
            <p class="page-subtitle">Ranked by score // Global influence metrics</p>
        </div>

        <div class="card" style="padding:0; overflow-x:auto">
            <table class="data-table">
                <thead>
                    <tr style="background:var(--bg-tertiary)">
                        <th style="width:40px">#</th>
                        <th>NATION</th>
                        <th>ALLIANCE</th>
                        <th>POPULATION</th>
                        <th>TOTAL GDP</th>
                        <th>MIL PWR</th>
                        <th>STAB (%)</th>
                        <th>IMP. RELIANCE (%)</th>
                        <th style="width:100px; text-align:right"></th>
                    </tr>
                </thead>
                <tbody>
                    ${nations.map((nat, i) => `
                    <tr>
                        <td class="rank">${i + 1}</td>
                        <td style="min-width:180px">
                            <div style="font-family:var(--font-heading); font-size:1.1rem; color:var(--text-heading); letter-spacing:1px">${nat.name}</div>
                            <div style="font-family:var(--font-condensed); font-size:0.7rem; color:var(--text-muted); letter-spacing:1px; margin-top:2px">
                                ID: #${nat.id} | ${nat.leader_name}
                            </div>
                        </td>
                        <td style="color:var(--accent); font-weight:600; letter-spacing:0.5px">${nat.alliance_name || '—'}</td>
                        <td style="font-family:var(--font-condensed); letter-spacing:0.5px">${UI.fmtFull(nat.population || 0).replace(/,/g, '.')}</td>
                        <td style="font-family:var(--font-condensed); color:var(--success); font-weight:bold">$${UI.fmt(nat.gdp || 0).toLowerCase()}</td>
                        <td style="font-family:var(--font-condensed); letter-spacing:0.5px">${UI.fmtFull(nat.military_strength || 0).replace(/,/g, '.')}</td>
                        <td style="font-family:var(--font-condensed); color:var(--success)">${nat.stability || 100}%</td>
                        <td style="font-family:var(--font-condensed); color:var(--success)">${nat.import_reliance || 0}%</td>
                        <td style="text-align:right; white-space:nowrap">
                            <button class="btn btn-ghost btn-sm" onclick="Pages._viewNation(${nat.id})" title="View Nation">
                                <i class="fa-solid fa-eye" style="opacity:0.6"></i>
                            </button>
                            <button class="btn btn-ghost btn-sm" onclick="Pages._openChat(${nat.id})" title="Message">
                                <i class="fa-solid fa-comment" style="opacity:0.6"></i>
                            </button>
                        </td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>`;
    },

    async _viewNation(id) {
        try {
            const data = await API.viewNation(id);
            const n = data.nation || data;
            UI.showModal(n.name || 'NATION', `
            <div style="border-left:3px solid var(--accent);padding-left:var(--space-md)">
                ${UI.renderFlagSVG(n, 80, 54)}
            </div>
            <div class="ledger-list" style="margin-top:var(--space-md)">
                <div class="ledger-row"><span class="ledger-label">Leader</span><span class="ledger-value">${n.leader_name || '—'}</span></div>
                <div class="ledger-row"><span class="ledger-label">Motto</span><span class="ledger-value">${n.motto || '—'}</span></div>
                <div class="ledger-row"><span class="ledger-label">Government</span><span class="ledger-value">${DATA.governments[n.government]?.name || n.government}</span></div>
                <div class="ledger-row"><span class="ledger-label">Score</span><span class="ledger-value">${UI.fmt(n.score || 0)}</span></div>
                <div class="ledger-row"><span class="ledger-label">Cities</span><span class="ledger-value">${n.city_count || data.cities?.length || '?'}</span></div>
            </div>
        `, `<button class="btn btn-primary btn-sm" onclick="UI.closeModal();Pages._openChat(${id})"><i class="fa-solid fa-comment"></i> MESSAGE</button>`);
        } catch (e) { UI.toast('error', 'ERROR', e.message); }
    },

    // ═══ NEWS ═══
    async news() {
        const content = document.getElementById('content');
        let data;
        try { data = await API.getNews(); }
        catch (e) { content.innerHTML = `<div class="page-header"><h1 class="page-title"><i class="fa-solid fa-newspaper"></i> World News</h1></div><p style="color:var(--text-muted)">Unavailable.</p>`; return; }

        const items = data.news || [];
        content.innerHTML = `
        <div class="page-header"><h1 class="page-title"><i class="fa-solid fa-newspaper"></i> World News</h1></div>
        <div class="news-feed">
            ${items.length === 0 ? '<p style="color:var(--text-muted);text-align:center;font-family:var(--font-condensed);text-transform:uppercase;letter-spacing:1px">No intelligence reports available.</p>' :
                items.map(item => `
                <div class="news-item">
                    <span class="news-icon"><i class="fa-solid fa-circle-info"></i></span>
                    <div class="news-content">
                        <div class="news-headline">${item.headline}</div>
                        <div class="news-body">${item.body || ''}</div>
                        <div class="news-time">TURN ${item.turn || '?'}</div>
                    </div>
                </div>`).join('')}
        </div>`;
    },

    // ═══ MESSAGES ═══
    async messages() {
        const content = document.getElementById('content');
        let data;
        try { data = await API.getMessages(); }
        catch (e) { content.innerHTML = `<div class="page-header"><h1 class="page-title"><i class="fa-solid fa-envelope"></i> Messages</h1></div><p style="color:var(--text-muted)">Unavailable.</p>`; return; }

        const msgs = data.messages || data.conversations || [];
        content.innerHTML = `
        <div class="page-header" style="margin-bottom:var(--space-sm)">
            <h1 class="page-title"><i class="fa-solid fa-envelope"></i> COMMS LINK</h1>
        </div>
        
        <div style="display:flex; height:70vh; min-height:500px; border:1px solid var(--border-color); border-radius:var(--radius); overflow:hidden; background:var(--bg-secondary)">
            <!-- Sidebar -->
            <div style="width:300px; border-right:1px solid var(--border-color); display:flex; flex-direction:column; background:var(--bg-tertiary)">
                <div style="padding:var(--space-md); border-bottom:1px solid var(--border-color);">
                    <button class="btn btn-primary" style="width:100%" onclick="Pages._composeMessage()"><i class="fa-solid fa-pen"></i> NEW TRANSMISSION</button>
                </div>
                <div style="flex:1; overflow-y:auto; padding:var(--space-sm);">
                    ${msgs.length === 0 ? '<p style="color:var(--text-muted);text-align:center;font-size:0.8rem;margin-top:var(--space-md)">No comms.</p>' :
                msgs.map(m => `
                        <div style="padding:var(--space-sm); margin-bottom:4px; background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:4px; cursor:pointer; transition:border-color 0.2s"
                             onclick="Pages._viewConversation(${m.other_nation_id}, '${(m.other_name ? m.other_name.replace(/'/g, "\\'") : 'Unknown')}')" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border-color)'">
                            <div style="display:flex;justify-content:space-between;">
                                <strong style="${m.other_nation_id === 0 ? 'text-transform:lowercase; font-weight:normal; letter-spacing:0;' : 'color:var(--text-heading);'}">${m.other_name || 'Unknown'}</strong>
                                ${m.unread ? '<span class="tag tag-red">NEW</span>' : ''}
                            </div>
                            <div style="font-size:0.75rem;color:var(--text-muted);font-family:var(--font-condensed);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.subject || m.last_message || ''}</div>
                        </div>`).join('')}
                </div>
            </div>

            <!-- Main Chat View -->
            <div id="chat-view-container" style="flex:1; display:flex; flex-direction:column; background:var(--bg-primary);">
                <div style="flex:1; display:flex; align-items:center; justify-content:center; color:var(--text-muted); font-family:var(--font-condensed); text-transform:uppercase; letter-spacing:2px;">
                    <i class="fa-solid fa-satellite-dish" style="margin-right:8px"></i> AWAITING CONNECTION
                </div>
            </div>
        </div>`;
    },

    // Open chat with a nation (from rankings / nation view)
    _openChat(nationId) {
        UI.navigate('messages');
        setTimeout(() => Pages._composeMessageTo(nationId), 200);
    },

    _composeMessage() { Pages._composeMessageTo(''); },

    _composeMessageTo(toId) {
        UI.showModal('NEW MESSAGE', `
        <div class="form-group"><label>To (Nation ID)</label>
            <input type="number" id="msg-to" placeholder="Recipient ID" value="${toId || ''}">
        </div>
        <div class="form-group"><label>Subject</label>
            <input type="text" id="msg-subject" placeholder="Subject" maxlength="100">
        </div>
        <div class="form-group"><label>Message</label>
            <textarea id="msg-body" rows="4" maxlength="2000" placeholder="Write message..." style="resize:vertical"></textarea>
        </div>
    `, `<button class="btn btn-primary" onclick="Pages._sendMessage()"><i class="fa-solid fa-paper-plane"></i> SEND</button>`);
    },

    async _sendMessage() {
        const to = document.getElementById('msg-to')?.value, subj = document.getElementById('msg-subject')?.value, body = document.getElementById('msg-body')?.value;
        if (!to || !subj || !body) return UI.toast('error', 'ERROR', 'All fields required.');
        try { await API.sendMessage(parseInt(to), subj, body); UI.closeModal(); Pages.messages(); UI.toast('success', 'SENT', 'Message delivered.'); }
        catch (e) { UI.toast('error', 'ERROR', e.message); }
    },

    async _viewConversation(otherId, otherName = 'CONVERSATION') {
        const container = document.getElementById('chat-view-container');
        if (!container) return; // Must be on messages page

        container.innerHTML = `<div style="flex:1; display:flex; align-items:center; justify-content:center"><i class="fa-solid fa-circle-notch fa-spin"></i></div>`;

        try {
            const data = await API.get('/api/messages/conversation/' + otherId);
            const msgs = data.messages || [];

            container.innerHTML = `
            <div style="padding:var(--space-md); border-bottom:1px solid var(--border-strong); background:var(--bg-tertiary); min-height:55px;">
                <strong style="font-family:var(--font-heading); font-size:1.2rem; ${otherId === 0 ? 'text-transform:lowercase; font-weight:normal; letter-spacing:0;' : ''}"><i class="fa-solid ${otherId === 0 ? 'fa-globe' : 'fa-user-lock'}"></i> ${otherName}</strong>
            </div>

            <div id="chat-messages" style="flex:1; overflow-y:auto; padding:var(--space-md); display:flex; flex-direction:column; gap:var(--space-sm);">
                ${msgs.length === 0 ? '<p style="color:var(--text-muted);text-align:center;margin-top:var(--space-md)">No messages in this thread.</p>' :
                    msgs.map(m => `
                    <div style="align-self:${m.is_sender ? 'flex-end' : 'flex-start'}; max-width:70%; background:${m.is_sender ? 'var(--bg-tertiary)' : 'var(--bg-secondary)'}; border:1px solid ${m.is_sender ? 'var(--accent)' : 'var(--border-strong)'}; padding:var(--space-sm) var(--space-md); border-radius:4px; position:relative;">
                        <div style="font-size:0.7rem; color:var(--text-muted); font-family:var(--font-condensed); margin-bottom:4px;">
                            <strong style="color:${m.is_sender ? 'var(--accent)' : 'var(--success)'}">${m.is_sender ? 'YOU' : m.from_name}</strong> - TURN ${m.turn || '?'}
                        </div>
                        <p style="margin:0; font-size:0.9rem; line-height:1.4;">${m.body}</p>
                    </div>
                `).join('')}
            </div>

            <div style="padding:var(--space-md); border-top:1px solid var(--border-strong); background:var(--bg-tertiary); display:flex; gap:12px;">
                <input type="text" id="reply-body" class="form-control" style="flex:1" placeholder="Transmit message..." onkeyup="if(event.key === 'Enter') Pages._replyMessage(${otherId}, '${otherName.replace(/'/g, "\\'")}')">
                <button class="btn btn-primary" onclick="Pages._replyMessage(${otherId}, '${otherName.replace(/'/g, "\\'")}')"><i class="fa-solid fa-paper-plane"></i></button>
            </div>`;

            // Scroll to bottom
            const msgPane = document.getElementById('chat-messages');
            if (msgPane) msgPane.scrollTop = msgPane.scrollHeight;

            if (otherId !== 0) {
                try { await API.post('/api/messages/read', { otherNationId: otherId }); } catch (e) { }
            }
        } catch (e) { UI.toast('error', 'ERROR', e.message); }
    },

    async _replyMessage(otherId, otherName) {
        const body = document.getElementById('reply-body')?.value;
        if (!body || !body.trim()) return;
        try {
            await API.sendMessage(otherId, 'RE:', body.trim());
            // Refresh conversation in place
            Pages._viewConversation(otherId, otherName);
            // No UI.toast needed for every single chat message
        }
        catch (e) { UI.toast('error', 'ERROR', e.message); }
    },

    // ═══ SETTINGS ═══
    settings() {
        const s = App.state;
        const n = s?.nation || {};
        const user = App.user || {};

        document.getElementById('content').innerHTML = `
        <div class="page-header"><h1 class="page-title"><i class="fa-solid fa-gear"></i> Settings</h1></div>

        <!-- Account Info -->
        <div class="card">
            <div class="card-header"><span class="card-title"><i class="fa-solid fa-user"></i> Account</span></div>
            <div class="ledger-list">
                <div class="ledger-row"><span class="ledger-label">Username</span><span class="ledger-value">${user.username || '—'}</span></div>
                <div class="ledger-row"><span class="ledger-label">Email</span><span class="ledger-value">${user.email || '—'}</span></div>
                <div class="ledger-row"><span class="ledger-label">Role</span><span class="ledger-value">${user.isAdmin ? 'ADMIN' : 'PLAYER'}</span></div>
            </div>
        </div>

        <!-- Nation Customization -->
        <div class="card" style="margin-top:var(--space-lg)">
            <div class="card-header"><span class="card-title"><i class="fa-solid fa-palette"></i> Nation Customization</span></div>
            <div class="form-group"><label>Nation Name</label><input type="text" id="set-nation-name" value="${n.name || ''}" maxlength="40"></div>
            <div class="form-group"><label>Leader Name</label><input type="text" id="set-leader-name" value="${n.leader_name || ''}" maxlength="40"></div>
            <div class="form-group"><label>Leader Title</label><input type="text" id="set-leader-title" value="${n.leader_title || ''}" placeholder="e.g. Supreme Chancellor" maxlength="40"></div>
            <div class="form-group"><label>National Motto</label><input type="text" id="set-motto" value="${n.motto || ''}" maxlength="60"></div>
            <div class="form-group"><label>Bio / Description</label><textarea id="set-bio" rows="3" maxlength="500" style="resize:vertical">${n.bio || ''}</textarea></div>
            <div class="form-group"><label>Accent Color</label><input type="color" id="set-accent-color" value="${n.accent_color || '#c8922a'}"></div>

            <div style="margin-top:var(--space-md)">
                <div class="form-group"><label>Flag Pattern</label>
                    <select id="set-flag-pattern">
                        <option value="horizontal_3" ${n.flag_pattern === 'horizontal_3' ? 'selected' : ''}>Horizontal Tricolor</option>
                        <option value="vertical_3" ${n.flag_pattern === 'vertical_3' ? 'selected' : ''}>Vertical Tricolor</option>
                        <option value="horizontal_2" ${n.flag_pattern === 'horizontal_2' ? 'selected' : ''}>Horizontal Bicolor</option>
                        <option value="vertical_2" ${n.flag_pattern === 'vertical_2' ? 'selected' : ''}>Vertical Bicolor</option>
                        <option value="diagonal" ${n.flag_pattern === 'diagonal' ? 'selected' : ''}>Diagonal Bicolor</option>
                        <option value="cross" ${n.flag_pattern === 'cross' ? 'selected' : ''}>Nordic Cross</option>
                        <option value="saltire" ${n.flag_pattern === 'saltire' ? 'selected' : ''}>Saltire (X Cross)</option>
                        <option value="quarters" ${n.flag_pattern === 'quarters' ? 'selected' : ''}>Quartered</option>
                        <option value="solid" ${n.flag_pattern === 'solid' ? 'selected' : ''}>Solid Color</option>
                    </select>
                </div>
                <label style="font-family:var(--font-condensed);font-size:0.8rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:1px;margin-bottom:var(--space-sm);margin-top:var(--space-md);display:block">Flag Colors</label>
                <div style="display:flex;gap:var(--space-md)">
                    <div class="form-group"><label>Primary</label><input type="color" id="set-flag-c1" value="${n.flag_color1 || '#1a5276'}"></div>
                    <div class="form-group"><label>Secondary</label><input type="color" id="set-flag-c2" value="${n.flag_color2 || '#c0392b'}"></div>
                    <div class="form-group"><label>Accent</label><input type="color" id="set-flag-c3" value="${n.flag_color3 || '#f1c40f'}"></div>
                </div>
            </div>

            <button class="btn btn-primary" style="margin-top:var(--space-md)" onclick="Pages._saveCustomization()"><i class="fa-solid fa-save"></i> SAVE CUSTOMIZATION</button>
        </div>

        <!-- Change Password -->
        <div class="card" style="margin-top:var(--space-lg)">
            <div class="card-header"><span class="card-title"><i class="fa-solid fa-key"></i> Change Password</span></div>
            <div class="form-group"><label>Current Password</label><input type="password" id="current-password" placeholder="Current password" autocomplete="current-password"></div>
            <div class="form-group"><label>New Password</label><input type="password" id="new-password" placeholder="New password (min 6 chars)" autocomplete="new-password"></div>
            <button class="btn btn-primary" style="margin-top:var(--space-md)" onclick="Pages._changePassword()"><i class="fa-solid fa-check"></i> CHANGE PASSWORD</button>
        </div>

        <!-- Logout -->
        <div class="card" style="margin-top:var(--space-lg)">
            <div class="card-header"><span class="card-title"><i class="fa-solid fa-right-from-bracket"></i> Session</span></div>
            <button class="btn btn-danger" onclick="App.logout()"><i class="fa-solid fa-right-from-bracket"></i> LOGOUT</button>
        </div>`;
    },

    async _changePassword() {
        const cur = document.getElementById('current-password')?.value, nw = document.getElementById('new-password')?.value;
        if (!cur || !nw) return UI.toast('error', 'ERROR', 'Both fields required.');
        if (nw.length < 6) return UI.toast('error', 'ERROR', 'Min 6 characters.');
        try { await API.post('/auth/change-password', { currentPassword: cur, newPassword: nw }); UI.toast('success', 'UPDATED', 'Password changed.'); document.getElementById('current-password').value = ''; document.getElementById('new-password').value = ''; }
        catch (e) { UI.toast('error', 'ERROR', e.message); }
    },

    async _saveCustomization() {
        try {
            await API.post('/api/nation/customize', {
                name: document.getElementById('set-nation-name')?.value,
                leaderName: document.getElementById('set-leader-name')?.value,
                leaderTitle: document.getElementById('set-leader-title')?.value,
                motto: document.getElementById('set-motto')?.value,
                bio: document.getElementById('set-bio')?.value,
                accentColor: document.getElementById('set-accent-color')?.value,
                flagColor1: document.getElementById('set-flag-c1')?.value,
                flagColor2: document.getElementById('set-flag-c2')?.value,
                flagColor3: document.getElementById('set-flag-c3')?.value,
                flagPattern: document.getElementById('set-flag-pattern')?.value,
            });
            await App.loadGameState();
            UI.updateAll();
            UI.toast('success', 'SAVED', 'Customization updated.');
        } catch (e) { UI.toast('error', 'ERROR', e.message); }
    },

    // ═══ ADMIN ═══
    async admin() {
        const user = App.user || {};
        if (!user.isAdmin) {
            document.getElementById('content').innerHTML = `
            <div class="page-header"><h1 class="page-title"><i class="fa-solid fa-lock"></i> Admin</h1></div>
            <div class="card"><p style="color:var(--danger)">ACCESS DENIED — Admin privileges required.</p></div>`;
            return;
        }

        document.getElementById('content').innerHTML = `
        <div class="page-header"><h1 class="page-title"><i class="fa-solid fa-screwdriver-wrench"></i> Admin Panel</h1></div>

        <div class="card">
            <div class="card-header"><span class="card-title"><i class="fa-solid fa-forward"></i> Turn Control</span></div>
            <button class="btn btn-primary" onclick="Pages._advanceTurn()"><i class="fa-solid fa-forward-step"></i> FORCE ADVANCE TURN</button>
        </div>

        <div class="card" style="margin-top:var(--space-lg)">
            <div class="card-header"><span class="card-title"><i class="fa-solid fa-bullhorn"></i> Broadcast News</span></div>
            <div class="form-group"><label>Headline</label><input type="text" id="admin-headline" placeholder="Breaking news..." maxlength="200"></div>
            <div class="form-group"><label>Body</label><textarea id="admin-body" rows="3" placeholder="Details..." style="resize:vertical"></textarea></div>
            <button class="btn btn-primary" style="margin-top:var(--space-md)" onclick="Pages._broadcastNews()"><i class="fa-solid fa-paper-plane"></i> BROADCAST</button>
        </div>

        <div class="card" style="margin-top:var(--space-lg)">
            <div class="card-header"><span class="card-title"><i class="fa-solid fa-coins"></i> Give Resources</span></div>
            <div class="form-group"><label>Nation ID</label><input type="number" id="admin-nation-id" placeholder="Nation ID"></div>
            <div class="form-group"><label>Resource</label>
                <select id="admin-resource">
                    <option value="money">Money</option>
                    <option value="food">Food</option>
                    <option value="steel">Steel</option>
                    <option value="oil">Oil</option>
                    <option value="aluminum">Aluminum</option>
                    <option value="munitions">Munitions</option>
                    <option value="uranium">Uranium</option>
                    <option value="rare">Rare Minerals</option>
                </select>
            </div>
            <div class="form-group"><label>Amount</label><input type="number" id="admin-amount" placeholder="Amount" value="10000"></div>
            <button class="btn btn-primary" style="margin-top:var(--space-md)" onclick="Pages._giveResources()"><i class="fa-solid fa-gift"></i> GIVE</button>
        </div>

        <div class="card" style="margin-top:var(--space-lg)">
            <div class="card-header"><span class="card-title"><i class="fa-solid fa-database"></i> Database</span></div>
            <div style="display:flex;gap:var(--space-md)">
                <button class="btn btn-primary" onclick="window.location.href='/admin/backup'"><i class="fa-solid fa-download"></i> DOWNLOAD SQLITE BACKUP</button>
                <button class="btn btn-secondary" onclick="API.post('/api/admin/backup').then(r=>UI.toast('success','BACKUP','Backup created.')).catch(e=>UI.toast('error','ERROR',e.message))"><i class="fa-solid fa-save"></i> SERVER BACKUP</button>
            </div>
        </div>

        <div class="card" style="margin-top:var(--space-lg)">
            <div class="card-header"><span class="card-title"><i class="fa-solid fa-envelope"></i> SMTP Configuration</span></div>
            <div class="grid-2">
                <div class="form-group"><label>SMTP Host</label><input type="text" id="smtp-host" placeholder="smtp.mailgun.org"></div>
                <div class="form-group"><label>SMTP Port</label><input type="number" id="smtp-port" placeholder="465"></div>
            </div>
            <div class="grid-2">
                <div class="form-group"><label>SMTP Username</label><input type="text" id="smtp-user" placeholder="postmaster@yourdomain.com"></div>
                <div class="form-group"><label>SMTP Password</label><input type="password" id="smtp-pass" placeholder="Password"></div>
            </div>
            <div class="grid-2">
                <div class="form-group"><label>From Address</label><input type="text" id="smtp-from" placeholder="&quot;Game Name&quot; &lt;noreply@domain.com&gt;"></div>
                <div class="form-group"><label>Use SSL/TLS</label>
                    <select id="smtp-secure"><option value="1">Yes (Port 465)</option><option value="0">No / STARTTLS (Port 587)</option></select>
                </div>
            </div>
            <div style="display:flex;gap:var(--space-md);margin-top:var(--space-md)">
                <button class="btn btn-primary" onclick="Pages._saveSMTP()"><i class="fa-solid fa-save"></i> SAVE CONFIG</button>
                <button class="btn btn-secondary" onclick="Pages._testSMTP()"><i class="fa-solid fa-paper-plane"></i> TEST EMAIL</button>
            </div>
        </div>

        <div class="card" style="margin-top:var(--space-lg)">
            <div class="card-header"><span class="card-title"><i class="fa-solid fa-server"></i> Server Info</span></div>
            <div class="ledger-list" id="admin-server-info"><p style="color:var(--text-muted)">Loading...</p></div>
        </div>`;

        // Load data
        try {
            const info = await API.get('/admin/overview');
            document.getElementById('admin-server-info').innerHTML = `
            <div class="ledger-row"><span class="ledger-label">Current Turn</span><span class="ledger-value">${info.currentTurn || '?'}</span></div>
            <div class="ledger-row"><span class="ledger-label">Total Nations</span><span class="ledger-value">${info.nations || '?'}</span></div>
            <div class="ledger-row"><span class="ledger-label">Total Users</span><span class="ledger-value">${info.players || '?'}</span></div>`;

            const settingsReq = await API.get('/admin/settings');
            const sec = settingsReq.settings || {};
            if (document.getElementById('smtp-host')) document.getElementById('smtp-host').value = sec.smtp_host || '';
            if (document.getElementById('smtp-port')) document.getElementById('smtp-port').value = sec.smtp_port || '';
            if (document.getElementById('smtp-user')) document.getElementById('smtp-user').value = sec.smtp_user || '';
            if (document.getElementById('smtp-pass')) document.getElementById('smtp-pass').value = sec.smtp_pass || '';
            if (document.getElementById('smtp-from')) document.getElementById('smtp-from').value = sec.smtp_from || '';
            if (document.getElementById('smtp-secure')) document.getElementById('smtp-secure').value = sec.smtp_secure || '1';
        } catch (e) { }
    },

    async _advanceTurn() {
        if (!confirm('Force advance turn?')) return;
        try { await API.post('/admin/tick'); await App.loadGameState(); UI.updateAll(); UI.toast('success', 'ADVANCED', 'Turn advanced.'); }
        catch (e) { UI.toast('error', 'ERROR', e.message); }
    },

    async _broadcastNews() {
        const h = document.getElementById('admin-headline')?.value, b = document.getElementById('admin-body')?.value;
        if (!h) return UI.toast('error', 'ERROR', 'Headline required.');
        try { await API.post('/admin/broadcast', { headline: h, body: b }); UI.toast('success', 'BROADCAST', 'News sent.'); document.getElementById('admin-headline').value = ''; document.getElementById('admin-body').value = ''; }
        catch (e) { UI.toast('error', 'ERROR', e.message); }
    },

    async _giveResources() {
        const id = document.getElementById('admin-nation-id')?.value, res = document.getElementById('admin-resource')?.value, amt = document.getElementById('admin-amount')?.value;
        if (!id || !amt) return UI.toast('error', 'ERROR', 'Nation ID and amount required.');
        try { await API.post('/admin/grant-resources', { nationId: parseInt(id), resource: res, amount: parseInt(amt) }); UI.toast('success', 'GIVEN', `${amt} ${res} given to nation ${id}.`); }
        catch (e) { UI.toast('error', 'ERROR', e.message); }
    },

    async _saveSMTP() {
        try {
            const settings = {
                smtp_host: document.getElementById('smtp-host')?.value || '',
                smtp_port: document.getElementById('smtp-port')?.value || '',
                smtp_user: document.getElementById('smtp-user')?.value || '',
                smtp_pass: document.getElementById('smtp-pass')?.value || '',
                smtp_secure: document.getElementById('smtp-secure')?.value || '1',
                smtp_from: document.getElementById('smtp-from')?.value || ''
            };
            await API.post('/admin/settings', { settings });
            UI.toast('success', 'SAVED', 'SMTP configuration updated.');
        } catch (e) { UI.toast('error', 'ERROR', e.message); }
    },

    async _testSMTP() {
        const to = prompt('Enter an email address to send the test email to:');
        if (!to) return;
        try {
            await API.post('/admin/test-email', { to });
            UI.toast('success', 'SENT', `Test email dispatched to ${to}.`);
        } catch (e) { UI.toast('error', 'ERROR', e.message); }
    }

});
