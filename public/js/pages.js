/* ═══════════════════════════════════════════════════════════════
   SOVEREIGN — Page Renderers Part 1 (Multiplayer)
   Dashboard, Cities (tabbed, categorized), Economy, Policies, Military
   Font Awesome only — no emojis — brutalist military style
   ═══════════════════════════════════════════════════════════════ */

// FA icon maps
const RES_ICONS = {
    money: 'fa-dollar-sign', food: 'fa-wheat-awn', steel: 'fa-cube',
    oil: 'fa-droplet', aluminum: 'fa-diamond', munitions: 'fa-bomb',
    uranium: 'fa-radiation', rare: 'fa-gem', iron: 'fa-cubes', bauxite: 'fa-mountain'
};

const IMP_ICONS = {
    coal_plant: 'fa-industry', oil_plant: 'fa-bolt', nuclear_plant: 'fa-atom',
    wind_farm: 'fa-wind', farm: 'fa-tractor', iron_mine: 'fa-helmet-safety',
    oil_well: 'fa-oil-well', bauxite_mine: 'fa-mountain', lead_mine: 'fa-skull',
    uranium_mine: 'fa-radiation', rare_mine: 'fa-gem',
    steel_mill: 'fa-gears', munitions_fac: 'fa-bomb', aluminum_ref: 'fa-cogs',
    bank: 'fa-building-columns', supermarket: 'fa-store', mall: 'fa-shop',
    stadium: 'fa-futbol', barracks: 'fa-person-rifle', tank_factory: 'fa-truck-monster',
    hangar: 'fa-plane', drydock: 'fa-anchor', missile_pad: 'fa-rocket',
    nuke_facility: 'fa-atom', hospital: 'fa-hospital', university: 'fa-graduation-cap',
    police_station: 'fa-shield', subway: 'fa-train-subway'
};

const UNIT_ICONS = {
    infantry: 'fa-person-rifle', mech_infantry: 'fa-truck-field',
    tanks: 'fa-shield-halved', artillery: 'fa-crosshairs',
    special_forces: 'fa-user-secret', anti_air: 'fa-bullseye',
    fighters: 'fa-jet-fighter', bombers: 'fa-plane-up',
    helicopters: 'fa-helicopter', drones: 'fa-satellite',
    destroyers: 'fa-ship', frigates: 'fa-sailboat',
    submarines: 'fa-water', carriers: 'fa-anchor',
    cruisers: 'fa-dharmachakra', ballistic_missile: 'fa-rocket',
    nuclear_warhead: 'fa-radiation'
};

const GOV_ICONS = {
    democracy: 'fa-landmark-flag', monarchy: 'fa-crown',
    communist: 'fa-star', dictatorship: 'fa-khanda',
    theocracy: 'fa-place-of-worship', anarchy: 'fa-circle-nodes'
};

const RES_IMAGES = {
    money: 'https://cdn-icons-png.flaticon.com/128/2489/2489756.png',
    food: 'https://cdn-icons-png.flaticon.com/128/1752/1752767.png',
    steel: 'https://cdn-icons-png.flaticon.com/128/4191/4191742.png',
    oil: 'https://cdn-icons-png.flaticon.com/128/3240/3240912.png',
    aluminum: 'https://cdn-icons-png.flaticon.com/128/2271/2271068.png',
    munitions: 'https://cdn-icons-png.flaticon.com/128/2395/2395105.png',
    uranium: 'https://cdn-icons-png.flaticon.com/128/3655/3655557.png',
    rare: 'https://cdn-icons-png.flaticon.com/128/3063/3063175.png'
};

// Improvement category definitions
const IMP_CATEGORIES = {
    power: { name: 'Power Generation', icon: 'fa-bolt', types: ['coal_plant', 'oil_plant', 'nuclear_plant', 'wind_farm'] },
    resource: { name: 'Resource Extraction', icon: 'fa-tractor', types: ['farm', 'iron_mine', 'oil_well', 'bauxite_mine', 'lead_mine', 'uranium_mine', 'rare_mine'] },
    manufacture: { name: 'Manufacturing', icon: 'fa-gears', types: ['steel_mill', 'munitions_fac', 'aluminum_ref'] },
    commerce: { name: 'Commerce', icon: 'fa-store', types: ['bank', 'supermarket', 'mall', 'stadium'] },
    military: { name: 'Military Facilities', icon: 'fa-person-rifle', types: ['barracks', 'tank_factory', 'hangar', 'drydock', 'missile_pad', 'nuke_facility'] },
    civil: { name: 'Civil Infrastructure', icon: 'fa-hospital', types: ['hospital', 'university', 'police_station', 'subway'] }
};

// Military branch definitions
const MIL_BRANCHES = {
    'Army': { icon: 'fa-person-rifle', types: ['infantry', 'mech_infantry', 'tanks', 'artillery', 'special_forces', 'anti_air'] },
    'Air Force': { icon: 'fa-jet-fighter', types: ['fighters', 'bombers', 'helicopters', 'drones'] },
    'Navy': { icon: 'fa-ship', types: ['destroyers', 'frigates', 'submarines', 'carriers', 'cruisers'] },
    'Strategic': { icon: 'fa-rocket', types: ['ballistic_missile', 'nuclear_warhead'] }
};

// Track currently selected city
let _selectedCityId = null;

const Pages = {

    // ═══ DASHBOARD ═══
    dashboard() {
        const s = App.state;
        if (!s || !s.nation) {
            document.getElementById('content').innerHTML = '<p style="color:var(--text-muted);padding:var(--space-xl)">Loading nation data...</p>';
            return;
        }
        const n = s.nation;
        const cities = s.cities || [];
        const military = s.military || {};
        const income = s.incomeBreakdown || {};
        const totalPop = cities.reduce((sum, c) => sum + (c.population || 0), 0);
        const totalMil = Object.values(military).reduce((sum, qty) => sum + qty, 0);
        const totalLand = cities.reduce((sum, c) => sum + (c.land || 0), 0);
        const totalInfra = cities.reduce((sum, c) => sum + (c.infrastructure || 0), 0);
        const totalStr = Object.entries(military).reduce((sum, [t, q]) => {
            const def = DATA.units?.[t];
            return sum + (def ? q * def.strength : 0);
        }, 0);

        document.getElementById('content').innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title"><i class="fa-solid fa-terminal"></i> ${n.name || 'COMMAND CENTER'}</h1>
                <p class="page-subtitle">${n.motto || 'NATION OVERVIEW'} // ${n.leader_title || 'RULER'} ${n.leader_name || 'COMMANDER'}</p>
            </div>
            <div>${UI.renderFlagSVG(n, 64, 42)}</div>
        </div>

        <div class="stat-grid">
            <div class="stat-card" style="grid-column: span 2;">
                <div class="stat-label"><i class="fa-solid fa-dollar-sign"></i> Treasury</div>
                <div class="stat-value">$${UI.fmtFull(n.money)}</div>
                ${income.netIncome !== undefined ? `<div class="stat-change ${income.netIncome >= 0 ? 'up' : 'down'}">${income.netIncome >= 0 ? '+' : ''}$${UI.fmt(income.netIncome)}/turn</div>` : ''}
            </div>
            <div class="stat-card">
                <div class="stat-label"><i class="fa-solid fa-users"></i> Population</div>
                <div class="stat-value">${UI.fmtFull(totalPop)}</div>
                <div class="stat-change">${cities.length} ${cities.length === 1 ? 'city' : 'cities'}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label"><i class="fa-solid fa-star"></i> Score</div>
                <div class="stat-value">${UI.fmt(n.score || 0)}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label"><i class="fa-solid fa-shield-halved"></i> Military</div>
                <div class="stat-value">${UI.fmt(totalMil)}</div>
                <div class="stat-change">${Object.keys(military).length} unit types</div>
            </div>
        </div>

        <div class="grid-2" style="margin-top:var(--space-lg)">
            <!-- Left: Health -->
            <div class="card">
                <div class="card-header"><span class="card-title"><i class="fa-solid fa-heart-pulse"></i> Nation Health</span></div>
                <div style="display:grid;gap:var(--space-md)">
                    ${this._statBar('Approval', n.approval || 0, '#27ae60')}
                    ${this._statBar('Stability', n.stability || 0, '#c8922a')}
                    ${this._natAvg(cities, 'happiness', 'Avg Happiness', '#27ae60')}
                    ${this._natAvg(cities, 'crime', 'Avg Crime', '#c0392b')}
                    ${this._natAvg(cities, 'disease', 'Avg Disease', '#c8922a')}
                    ${this._natAvg(cities, 'pollution', 'Avg Pollution', '#5a6a7e')}
                </div>
            </div>

            <!-- Right: Cities -->
            <div class="card">
                <div class="card-header"><span class="card-title"><i class="fa-solid fa-city"></i> Cities</span></div>
                ${cities.length === 0 ? '<p style="color:var(--text-muted)">No cities established.</p>' :
                cities.map(c => `
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-color);cursor:pointer" onclick="Pages._goToCity(${c.id})">
                        <div>
                            <strong style="color:var(--text-heading)">${c.name}</strong>
                            ${c.is_capital ? '<span class="tag tag-amber" style="margin-left:6px">CAPITAL</span>' : ''}
                        </div>
                        <div style="color:var(--text-muted);font-size:0.8rem;font-family:var(--font-condensed)">
                            POP ${UI.fmt(c.population)} // INFRA ${c.infrastructure} // <i class="fa-solid fa-face-smile" style="color:${(c.happiness || 0) > 50 ? '#27ae60' : '#c0392b'}"></i> ${Math.round(c.happiness || 0)}%
                        </div>
                    </div>`).join('')}
            </div>
        </div>

        <div class="grid-2" style="margin-top:var(--space-lg)">
            <!-- Left: Nation Info -->
            <div class="card">
                <div class="card-header"><span class="card-title"><i class="fa-solid fa-info-circle"></i> Nation Information</span></div>
                <div class="ledger-list">
                    <div class="ledger-row"><span class="ledger-label">Government</span><span class="ledger-value">${DATA.governments[n.government]?.name || n.government}</span></div>
                    <div class="ledger-row"><span class="ledger-label">Alliance</span><span class="ledger-value" style="color:var(--accent); font-weight:600">${s.alliance?.name || 'Independent'}</span></div>
                    <div class="ledger-row"><span class="ledger-label">Continent</span><span class="ledger-value" style="text-transform:capitalize">${(n.continent || '').replace('_', ' ')}</span></div>
                    <div class="ledger-row"><span class="ledger-label">Founded</span><span class="ledger-value">${new Date(n.created_at).toLocaleDateString()}</span></div>
                </div>
                <div style="margin-top:var(--space-md); padding-top:var(--space-md); border-top:1px solid var(--border-color)">
                    <div class="card-header" style="padding:0; margin-bottom:var(--space-sm)"><span class="card-title" style="font-size:0.8rem"><i class="fa-solid fa-scroll"></i> Bio</span></div>
                    <p style="color:var(--text-secondary); line-height:1.4; font-size:0.8rem; margin:0">${n.bio || 'No biography set.'}</p>
                </div>
            </div>

            <!-- Right: Geography & Military -->
            <div class="card">
                <div class="card-header"><span class="card-title"><i class="fa-solid fa-earth-americas"></i> Geography & Defense</span></div>
                <div class="ledger-list">
                    <div class="ledger-row"><span class="ledger-label">Total Land</span><span class="ledger-value">${UI.fmtFull(totalLand)} sq. mi</span></div>
                    <div class="ledger-row"><span class="ledger-label">Infrastructure</span><span class="ledger-value">${UI.fmtFull(totalInfra)} Units</span></div>
                    <div class="ledger-row"><span class="ledger-label">Power Score</span><span class="ledger-value" style="color:var(--accent)">${UI.fmtFull(totalStr)}</span></div>
                    <div class="ledger-row"><span class="ledger-label">War Policy</span><span class="ledger-value" style="text-transform:capitalize">${n.war_policy || 'Normal'}</span></div>
                </div>

                <div style="margin-top:var(--space-lg); padding:var(--space-md); background:var(--bg-tertiary); border:1px solid var(--border-color)">
                    <div style="font-family:var(--font-condensed); font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:var(--space-sm)">Regional Influence</div>
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width:${Math.min(100, (n.score / 100000) * 100)}%; background:var(--accent)"></div>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-top:4px; font-family:var(--font-condensed); font-size:0.7rem; color:var(--accent)">
                        <span>GLOBAL SCORE</span>
                        <span>${UI.fmt(n.score || 0)}</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="grid-2" style="margin-top:var(--space-lg)">
            <div class="card">
                <div class="card-header"><span class="card-title"><i class="fa-solid fa-crosshairs"></i> Active Wars</span></div>
                ${(s.wars || []).length === 0 ? '<p style="color:var(--text-muted)">No active conflicts.</p>' :
                (s.wars || []).map(w => `
                    <div style="padding:8px 0;border-bottom:1px solid var(--border-color)">
                        <strong>${w.attacker_name}</strong> VS <strong>${w.defender_name}</strong>
                        <span class="tag tag-red" style="margin-left:8px">ACTIVE</span>
                    </div>`).join('')}
            </div>
            <div class="card">
                <div class="card-header"><span class="card-title"><i class="fa-solid fa-file-contract"></i> Treaties</span></div>
                ${(s.treaties || []).length === 0 ? '<p style="color:var(--text-muted)">No active treaties.</p>' :
                (s.treaties || []).map(t => `
                    <div style="padding:8px 0;border-bottom:1px solid var(--border-color)">
                        <span class="tag tag-amber">${(t.type || '').toUpperCase()}</span>
                        ${t.nation_a_name} -- ${t.nation_b_name}
                    </div>`).join('')}
            </div>
        </div>`;
    },

    _statBar(label, value, color) {
        const v = Math.max(0, Math.min(100, value || 0));
        return `<div>
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="font-size:0.75rem;font-family:var(--font-condensed);text-transform:uppercase;letter-spacing:1px;color:var(--text-secondary)">${label}</span>
            <span style="font-size:0.8rem;font-family:var(--font-heading);color:var(--text-heading)">${Math.round(v)}%</span>
        </div>
        <div class="progress-bar-container"><div class="progress-bar-fill" style="width:${v}%;background:${color}"></div></div>
    </div>`;
    },

    _natAvg(cities, stat, label, color) {
        if (!cities.length) return this._statBar(label, 0, color);
        const avg = cities.reduce((s, c) => s + (c[stat] || 0), 0) / cities.length;
        return this._statBar(label, avg, color);
    },

    _goToCity(cityId) {
        _selectedCityId = cityId;
        UI.navigate('cities');
    },

    // ═══ CITIES (TABBED) ═══
    cities() {
        const s = App.state;
        if (!s || !s.nation) return;
        const n = s.nation;
        const cities = s.cities || [];
        const cityCost = (cities.length + 1) * DATA.balance.newCityCost;

        // Select first city if none selected
        if (!_selectedCityId && cities.length > 0) _selectedCityId = cities[0].id;
        const activeCity = cities.find(c => c.id === _selectedCityId);

        document.getElementById('content').innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title"><i class="fa-solid fa-city"></i> Cities</h1>
                <p class="page-subtitle">${cities.length} CITIES ESTABLISHED</p>
            </div>
            <button class="btn btn-primary" onclick="Pages._buildCity()">
                <i class="fa-solid fa-plus"></i> BUILD CITY ($${UI.fmt(cityCost)})
            </button>
        </div>

        <!-- City Tabs -->
        <div style="display:flex;gap:0;border-bottom:1px solid var(--border-color);margin-bottom:var(--space-lg);overflow-x:auto">
            ${cities.map(c => `
                <button class="btn ${c.id === _selectedCityId ? 'btn-accent' : 'btn-ghost'}" style="border-radius:0;border-bottom:${c.id === _selectedCityId ? '2px solid var(--accent)' : '2px solid transparent'}" onclick="Pages._switchCity(${c.id})">
                    ${c.is_capital ? '<i class="fa-solid fa-star" style="font-size:0.6rem"></i> ' : ''}${c.name}
                </button>`).join('')}
        </div>

        <div id="city-detail">
            ${activeCity ? this._renderCity(activeCity) : '<p style="color:var(--text-muted)">No city selected. Build your first city above.</p>'}
        </div>`;
    },

    _switchCity(cityId) {
        _selectedCityId = cityId;
        const s = App.state;
        const city = (s.cities || []).find(c => c.id === cityId);
        if (city) {
            document.getElementById('city-detail').innerHTML = this._renderCity(city);
        }
    },

    _renderCity(city) {
        const imps = city.improvements || {};
        const currentImps = Object.values(imps).reduce((a, b) => a + b, 0);

        // Smart City Mechanics: Population cap is based on BOTH infrastructure and land
        const b = DATA.balance;
        const maxImps = Math.min(city.land || 100, city.infrastructure || 1, 40);
        const maxPop = Math.max(100, (city.infrastructure * b.popCapPerInfra) + (city.land * b.popCapPerLand) - (currentImps * b.popCapImpPenalty));

        // Power calculation
        let totalPowerProduced = 0;
        let totalPowerUsed = (city.infrastructure || 0) * (b.powerUsagePerInfra || 15);

        Object.entries(imps).forEach(([type, qty]) => {
            const impDef = DATA.improvements[type];
            if (impDef) {
                if (impDef.power) totalPowerProduced += (impDef.power * qty);
                if (impDef.powerUsage) totalPowerUsed += (impDef.powerUsage * qty * 1.5); // 50% more hungry buildings
            }
        });

        return `
    <div class="stat-grid" style="margin-bottom:var(--space-lg)">
        <div class="stat-card" style="position:relative">
            <div class="stat-label"><i class="fa-solid fa-users"></i> Population</div>
            <div class="stat-value"><span style="color:${city.population > maxPop ? 'var(--danger)' : 'inherit'}">${UI.fmtFull(city.population)}</span><span style="color:var(--text-muted);font-size:0.8rem"> / ${UI.fmtFull(maxPop)}</span></div>
        </div>
        <div class="stat-card">
            <div class="stat-label"><i class="fa-solid fa-road"></i> Infrastructure</div>
            <div class="stat-value">${city.infrastructure || 1}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label"><i class="fa-solid fa-earth-americas"></i> Land Area</div>
            <div class="stat-value">${city.land || 100}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label"><i class="fa-solid fa-hammer"></i> Improvements</div>
            <div class="stat-value"><span style="color:${currentImps >= maxImps ? 'var(--danger)' : 'inherit'}">${currentImps}</span><span style="color:var(--text-muted)"> / ${maxImps}</span></div>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">Bottleneck: ${maxImps === 40 && city.land > 40 && city.infrastructure > 40 ? 'MAX' : (city.land <= (city.infrastructure || 1) ? 'LAND' : 'INFRA')}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label"><i class="fa-solid fa-map"></i> Terrain</div>
            <div class="stat-value" style="font-size:1rem;text-transform:uppercase">${city.terrain || '?'}</div>
        </div>
    </div>

    <div class="stat-grid" style="margin-bottom:var(--space-lg)">
        <div class="stat-card" style="border-left-color:${(city.happiness || 0) > 50 ? '#27ae60' : '#c0392b'}">
            <div class="stat-label"><i class="fa-solid fa-face-smile"></i> Happiness</div>
            <div class="stat-value">${Math.round(city.happiness || 0)}%</div>
        </div>
        <div class="stat-card">
            <div class="stat-label"><i class="fa-solid fa-bolt"></i> Power Grid</div>
            <div class="stat-value"><span style="color:${totalPowerUsed > totalPowerProduced ? 'var(--danger)' : 'var(--accent)'}">${UI.fmtFull(totalPowerUsed)} MW</span></div>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">GEN: ${UI.fmtFull(totalPowerProduced)} MW</div>
        </div>
        <div class="stat-card" style="border-left-color:#c0392b">
            <div class="stat-label"><i class="fa-solid fa-mask"></i> Crime</div>
            <div class="stat-value">${Math.round(city.crime || 0)}%</div>
        </div>
        <div class="stat-card" style="border-left-color:#c8922a">
            <div class="stat-label"><i class="fa-solid fa-virus"></i> Disease</div>
            <div class="stat-value">${Math.round(city.disease || 0)}%</div>
        </div>
        <div class="stat-card" style="border-left-color:#5a6a7e">
            <div class="stat-label"><i class="fa-solid fa-smog"></i> Pollution</div>
            <div class="stat-value">${Math.round(city.pollution || 0)}%</div>
        </div>
    </div>

    <!-- Current improvements -->
    <div class="card" style="margin-bottom:var(--space-lg)">
        <div class="card-header"><span class="card-title"><i class="fa-solid fa-building"></i> Active Improvements</span></div>
        ${Object.entries(imps).length > 0 ?
                `<div style="display:flex;flex-wrap:wrap;gap:6px">
            ${Object.entries(imps).map(([type, qty]) => {
                    const impDef = DATA.improvements?.[type] || {};
                    const icon = IMP_ICONS[type] || 'fa-building';
                    return `<div class="badge-group">
                    <i class="fa-solid ${icon}" style="color:var(--accent);margin-right:4px"></i>
                    ${impDef.name || type} x${qty}
                    <button class="remove-imp-btn" onclick="Pages._removeImprovement(${city.id},'${type}')" title="Sell">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>`;
                }).join('')}
        </div>` : '<p style="color:var(--text-muted);font-family:var(--font-condensed);text-transform:uppercase;letter-spacing:1px;font-size:0.8rem">No improvements built</p>'}
    </div>

    <!-- Build improvements by category -->
    ${Object.entries(IMP_CATEGORIES).map(([catKey, cat]) => {
                    // Only show categories that have data
                    const validTypes = cat.types.filter(t => DATA.improvements?.[t]);
                    if (validTypes.length === 0) return '';
                    return `
        <div class="card" style="margin-bottom:var(--space-md)">
            <div class="card-header"><span class="card-title"><i class="fa-solid ${cat.icon}"></i> ${cat.name}</span></div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:var(--space-sm)">
                ${validTypes.map(type => {
                        const imp = DATA.improvements[type];
                        const icon = IMP_ICONS[type] || 'fa-building';
                        const owned = imps[type] || 0;
                        let maxQty = imp.maxPerCity || 999;
                        if (type === 'wind_farm') maxQty = 50;
                        return `<div class="building-card">
                        <div class="building-card-header">
                            <div class="building-icon"><i class="fa-solid ${icon}"></i></div>
                            <div class="building-info">
                                <div class="building-name">${imp.name}</div>
                                <div class="building-price">$${UI.fmt(imp.cost)} ${owned > 0 ? `<span style="color:var(--text-muted)">(${owned}/${maxQty})</span>` : ''}</div>
                            </div>
                        </div>
                        <div style="font-size:0.7rem;color:var(--text-muted);margin:4px 0;font-family:var(--font-condensed)">${imp.desc || ''}</div>
                        ${imp.produces ? `<div style="font-size:0.7rem;color:var(--success);font-family:var(--font-condensed)"><i class="fa-solid fa-arrow-up"></i> +${imp.rate} ${imp.produces}/turn</div>` : ''}
                        ${imp.consumes ? Object.entries(imp.consumes).map(([res, qty]) => `<div style="font-size:0.7rem;color:var(--danger);font-family:var(--font-condensed)"><i class="fa-solid fa-arrow-down"></i> -${qty} ${res}/turn</div>`).join('') : ''}
                        ${imp.commerce ? `<div style="font-size:0.7rem;color:var(--success);font-family:var(--font-condensed)"><i class="fa-solid fa-dollar-sign"></i> +$${imp.commerce}/turn</div>` : ''}
                        ${imp.power ? `<div style="font-size:0.7rem;color:var(--accent);font-family:var(--font-condensed)"><i class="fa-solid fa-bolt"></i> +${imp.power} MW</div>` : ''}
                        ${imp.powerUsage ? `<div style="font-size:0.7rem;color:var(--danger);font-family:var(--font-condensed)"><i class="fa-solid fa-plug"></i> -${Math.round(imp.powerUsage * 1.5)} MW</div>` : ''}
                        ${imp.pollution ? `<div style="font-size:0.7rem;color:${imp.pollution > 0 ? 'var(--danger)' : 'var(--success)'};font-family:var(--font-condensed)"><i class="fa-solid fa-smog"></i> ${imp.pollution > 0 ? '+' : ''}${imp.pollution} pollution</div>` : ''}
                        ${imp.approval ? `<div style="font-size:0.7rem;color:var(--success);font-family:var(--font-condensed)"><i class="fa-solid fa-face-smile"></i> +${imp.approval} approval</div>` : ''}
                        <button class="btn btn-primary btn-sm building-action" onclick="Pages._buildImprovement(${city.id},'${type}')">BUILD</button>
                    </div>`;
                    }).join('')}
            </div>
        </div>`;
                }).join('')}

    <!-- Buy infra / land -->
    <div class="grid-2" style="margin-top:var(--space-md)">
        <button class="btn btn-secondary" style="width:100%" onclick="Pages._buyInfra(${city.id})">
            <i class="fa-solid fa-arrow-up"></i> BUY INFRASTRUCTURE ($${UI.fmt((city.infrastructure + 1) * 400)})
        </button>
        <button class="btn btn-secondary" style="width:100%" onclick="Pages._buyLand(${city.id})">
            <i class="fa-solid fa-expand"></i> BUY LAND ($${UI.fmt((city.land + 1) * 250)})
        </button>
    </div>`;
    },

    async _buildCity() {
        const name = prompt('Enter city name:');
        if (!name || !name.trim()) return;
        try {
            await API.buildCity(name.trim());
            await App.loadGameState();
            // Switch to the new city (last in list)
            const cities = App.state.cities || [];
            if (cities.length > 0) _selectedCityId = cities[cities.length - 1].id;
            UI.updateAll();
            UI.toast('success', 'CITY BUILT', `${name.trim()} established.`);
        } catch (err) { UI.toast('error', 'ERROR', err.message); }
    },

    async _buildImprovement(cityId, type) {
        try { await API.buildImprovement(cityId, type); await App.loadGameState(); Pages.cities(); UI.updateResourceBar(); UI.toast('success', 'BUILT', 'Improvement constructed.'); }
        catch (err) { UI.toast('error', 'ERROR', err.message); }
    },

    async _removeImprovement(cityId, type) {
        if (!confirm(`Sell one ${type}?`)) return;
        try { await API.removeImprovement(cityId, type); await App.loadGameState(); Pages.cities(); UI.updateResourceBar(); UI.toast('info', 'SOLD', 'Improvement sold.'); }
        catch (err) { UI.toast('error', 'ERROR', err.message); }
    },

    async _buyInfra(cityId) {
        try { await API.buyInfrastructure(cityId, 1); await App.loadGameState(); Pages.cities(); UI.updateResourceBar(); UI.toast('success', 'UPGRADED', 'Infrastructure increased.'); }
        catch (err) { UI.toast('error', 'ERROR', err.message); }
    },

    async _buyLand(cityId) {
        try { await API.buyLand(cityId, 1); await App.loadGameState(); Pages.cities(); UI.updateResourceBar(); UI.toast('success', 'ACQUIRED', 'Land purchased.'); }
        catch (err) { UI.toast('error', 'ERROR', err.message); }
    },

    // ═══ ECONOMY ═══
    economy() {
        const s = App.state;
        if (!s || !s.nation) return;
        const n = s.nation;
        const income = s.incomeBreakdown || {};
        const production = income.production || {};
        const consumption = income.consumption || {};

        const resList = ['food', 'steel', 'oil', 'aluminum', 'munitions', 'uranium', 'rare', 'iron', 'bauxite'];

        document.getElementById('content').innerHTML = `
        <div class="page-header">
            <h1 class="page-title"><i class="fa-solid fa-coins"></i> Economy</h1>
        </div>

        <div class="stat-grid">
            <div class="stat-card">
                <div class="stat-label"><i class="fa-solid fa-dollar-sign"></i> Treasury</div>
                <div class="stat-value">$${UI.fmtFull(n.money)}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label"><i class="fa-solid fa-chart-line"></i> Net Income</div>
                <div class="stat-value" style="color:${(income.netIncome || 0) >= 0 ? 'var(--success)' : 'var(--danger)'}">
                    ${(income.netIncome || 0) >= 0 ? '+' : ''}$${UI.fmtFull(income.netIncome || 0)}
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-label"><i class="fa-solid fa-percentage"></i> Tax Rate</div>
                <div class="stat-value">${Math.round((n.tax_rate || 0.2) * 100)}%</div>
            </div>
            <div class="stat-card">
                <div class="stat-label"><i class="fa-solid fa-landmark"></i> GDP</div>
                <div class="stat-value">$${UI.fmtFull(n.gdp || 0)}</div>
            </div>
        </div>

        <div class="grid-2" style="margin-top:var(--space-lg)">
            <div class="card">
                <div class="card-header"><span class="card-title"><i class="fa-solid fa-arrow-trend-up"></i> Revenue Breakdown</span></div>
                <div class="ledger-list">
                    <div class="ledger-row"><span class="ledger-label">Tax Revenue</span><span class="ledger-value" style="color:var(--success)">+$${UI.fmt(income.taxIncome || 0)}</span></div>
                    <div class="ledger-row"><span class="ledger-label">Commerce</span><span class="ledger-value" style="color:var(--success)">+$${UI.fmt(income.commerce || 0)}</span></div>
                    <div class="ledger-row"><span class="ledger-label">Continent Bonus</span><span class="ledger-value" style="color:var(--success)">+$${UI.fmt(income.continentBonus || 0)}</span></div>
                    <div class="ledger-row" style="border-top:1px solid var(--border-strong)"><span class="ledger-label"><strong>Total Income</strong></span><span class="ledger-value" style="color:var(--success)"><strong>+$${UI.fmt(income.totalIncome || 0)}</strong></span></div>
                </div>
            </div>
            <div class="card">
                <div class="card-header"><span class="card-title"><i class="fa-solid fa-arrow-trend-down"></i> Expense Breakdown</span></div>
                <div class="ledger-list">
                    <div class="ledger-row"><span class="ledger-label">Military Upkeep</span><span class="ledger-value" style="color:var(--danger)">-$${UI.fmt(income.milExpenses || 0)}</span></div>
                    <div class="ledger-row"><span class="ledger-label">Social Spending</span><span class="ledger-value" style="color:var(--danger)">-$${UI.fmt(income.socialExpenses || 0)}</span></div>
                    <div class="ledger-row"><span class="ledger-label">Infrastructure</span><span class="ledger-value" style="color:var(--danger)">-$${UI.fmt(income.infraExpenses || 0)}</span></div>
                    <div class="ledger-row"><span class="ledger-label">Improvement Upkeep</span><span class="ledger-value" style="color:var(--danger)">-$${UI.fmt(income.improvementUpkeep || 0)}</span></div>
                    <div class="ledger-row" style="border-top:1px solid var(--border-strong)"><span class="ledger-label"><strong>Total Expenses</strong></span><span class="ledger-value" style="color:var(--danger)"><strong>-$${UI.fmt(income.totalExpenses || 0)}</strong></span></div>
                </div>
            </div>
        </div>

        <!-- Resource Production & Consumption -->
        <div class="card" style="margin-top:var(--space-lg)">
            <div class="card-header"><span class="card-title"><i class="fa-solid fa-industry"></i> Resource Flow (Per Turn)</span></div>
            <table class="data-table">
                <thead><tr><th></th><th>Resource</th><th>Stockpile</th><th>Production</th><th>Consumption</th><th>Net</th></tr></thead>
                <tbody>
                    ${resList.map(r => {
            const icon = RES_ICONS[r] || 'fa-cube';
            const stock = n[r] || 0;
            const prod = production[r] || 0;
            const cons = consumption[r] || 0;
            const net = prod - cons;
            return `<tr>
                            <td><i class="fa-solid ${icon}" style="color:var(--accent)"></i></td>
                            <td><strong>${r.charAt(0).toUpperCase() + r.slice(1)}</strong></td>
                            <td>${UI.fmtFull(stock)}</td>
                            <td style="color:var(--success)">${prod > 0 ? '+' : ''}${UI.fmt(prod)}</td>
                            <td style="color:var(--danger)">${cons > 0 ? '-' : ''}${UI.fmt(cons)}</td>
                            <td style="color:${net >= 0 ? 'var(--success)' : 'var(--danger)'}"><strong>${net >= 0 ? '+' : ''}${UI.fmt(net)}</strong></td>
                        </tr>`;
        }).join('')}
                </tbody>
            </table>
        </div>

        <!-- Resource Stockpile with images -->
        <div class="card" style="margin-top:var(--space-lg)">
            <div class="card-header"><span class="card-title"><i class="fa-solid fa-warehouse"></i> Stockpile</span></div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:var(--space-md)">
                ${resList.map(r => {
            const icon = RES_ICONS[r] || 'fa-cube';
            const img = RES_IMAGES[r] || '';
            const val = n[r] || 0;
            return `<div class="stat-card" style="padding:var(--space-md);display:flex;gap:var(--space-sm);align-items:center">
                        ${img ? `<img src="${img}" class="resource-img" alt="${r}" onerror="this.style.display='none'">` :
                    `<i class="fa-solid ${icon}" style="font-size:1.5rem;color:var(--accent)"></i>`}
                        <div>
                            <div class="stat-label">${r.charAt(0).toUpperCase() + r.slice(1)}</div>
                            <div class="stat-value" style="font-size:1.1rem">${UI.fmtFull(val)}</div>
                        </div>
                    </div>`;
        }).join('')}
            </div>
        </div>`;
    },

    // ═══ POLICIES ═══
    policies() {
        const s = App.state;
        if (!s || !s.nation) return;
        const n = s.nation;

        const taxPct = Math.round((n.tax_rate || 0.15) * 100);
        const milSpend = Math.round((n.military_spending || 0.05) * 100);
        const socSpend = Math.round((n.social_spending || 0.05) * 100);

        document.getElementById('content').innerHTML = `
        <div class="page-header"><h1 class="page-title"><i class="fa-solid fa-scroll"></i> Policies</h1></div>

        <div class="card">
            <div class="card-header"><span class="card-title"><i class="fa-solid fa-sliders"></i> Fiscal Policy</span></div>

            <div class="form-group" style="margin-bottom:var(--space-lg)">
                <label><i class="fa-solid fa-percentage"></i> Tax Rate: <strong id="tax-display">${taxPct}%</strong></label>
                <input type="range" id="tax-slider" min="0" max="40" value="${taxPct}" style="width:100%;accent-color:var(--accent)"
                    oninput="document.getElementById('tax-display').textContent=this.value+'%';Pages._updateTaxEffect(this.value)">
                <div id="tax-effect" class="form-hint" style="color:var(--accent);margin-top:4px"></div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-md);margin-top:var(--space-sm)">
                    <div style="font-size:0.75rem;color:var(--text-secondary)">
                        <div><i class="fa-solid fa-arrow-up" style="color:var(--success)"></i> Higher = more tax revenue</div>
                        <div><i class="fa-solid fa-arrow-down" style="color:var(--danger)"></i> Higher = less happiness</div>
                        <div><i class="fa-solid fa-arrow-down" style="color:var(--danger)"></i> Higher = slower pop growth</div>
                    </div>
                    <div style="font-size:0.75rem;color:var(--text-secondary)">
                        <div><i class="fa-solid fa-arrow-up" style="color:var(--success)"></i> Lower = more happiness</div>
                        <div><i class="fa-solid fa-arrow-up" style="color:var(--success)"></i> Lower = faster pop growth</div>
                        <div><i class="fa-solid fa-arrow-down" style="color:var(--danger)"></i> Lower = less revenue</div>
                    </div>
                </div>
            </div>

            <div class="form-group" style="margin-bottom:var(--space-lg)">
                <label><i class="fa-solid fa-hands-holding-child"></i> Social Spending: <strong id="soc-display">${socSpend}%</strong></label>
                <input type="range" id="soc-slider" min="0" max="50" value="${socSpend}" style="width:100%;accent-color:var(--accent)"
                    oninput="document.getElementById('soc-display').textContent=this.value+'%'">
                <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:4px">
                    <i class="fa-solid fa-arrow-up" style="color:var(--success)"></i> More = higher approval, costs income
                </div>
            </div>

            <button class="btn btn-primary" onclick="Pages._savePolicies()"><i class="fa-solid fa-check"></i> ENACT POLICIES</button>
        </div>

        <div class="card" style="margin-top:var(--space-lg)">
            <div class="card-header"><span class="card-title"><i class="fa-solid fa-landmark"></i> Government Info</span></div>
            <div class="ledger-list">
                <div class="ledger-row"><span class="ledger-label">Government</span><span class="ledger-value">${DATA.governments[n.government]?.name || n.government}</span></div>
                <div class="ledger-row"><span class="ledger-label">Continent</span><span class="ledger-value">${DATA.continents?.[n.continent]?.name || n.continent}</span></div>
                <div class="ledger-row"><span class="ledger-label">Approval</span><span class="ledger-value">${n.approval || 0}%</span></div>
                <div class="ledger-row"><span class="ledger-label">Stability</span><span class="ledger-value">${n.stability || 0}%</span></div>
            </div>
        </div>`;

        Pages._updateTaxEffect(taxPct);
    },

    _updateTaxEffect(val) {
        const el = document.getElementById('tax-effect');
        if (!el) return;
        const v = parseInt(val);
        el.textContent = v > 30 ? 'WARNING: HEAVY TAXATION -- SEVERE HAPPINESS + GROWTH PENALTY' :
            v > 20 ? 'HIGH TAXES: REDUCED HAPPINESS, SLOWED GROWTH' :
                v > 10 ? 'MODERATE: BALANCED REVENUE AND GROWTH' :
                    v > 5 ? 'LOW TAXES: BOOSTED HAPPINESS, REDUCED REVENUE' :
                        'MINIMAL TAXES: MAXIMUM HAPPINESS, MINIMAL REVENUE';
    },

    async _savePolicies() {
        const taxRate = parseInt(document.getElementById('tax-slider').value) / 100;
        const socialSpending = parseInt(document.getElementById('soc-slider').value) / 100;
        try {
            await API.updatePolicies({ taxRate, socialSpending });
            await App.loadGameState();
            UI.toast('success', 'ENACTED', 'Policies updated.');
        } catch (err) { UI.toast('error', 'ERROR', err.message); }
    },

    // ═══ MILITARY (GROUPED BY BRANCH) ═══
    military() {
        const s = App.state;
        if (!s || !s.nation) return;
        const military = s.military || {};
        const totalStr = Object.entries(military).reduce((sum, [t, q]) => {
            const def = DATA.units?.[t];
            return sum + (def ? q * def.strength : 0);
        }, 0);

        document.getElementById('content').innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title"><i class="fa-solid fa-shield-halved"></i> Military</h1>
                <p class="page-subtitle">MILITARY STRENGTH: ${UI.fmt(totalStr)}</p>
            </div>
        </div>

        ${Object.entries(MIL_BRANCHES).map(([branchName, branch]) => {
            const branchUnits = branch.types.filter(t => DATA.units?.[t]);
            if (branchUnits.length === 0) return '';

            return `
            <div class="card" style="margin-bottom:var(--space-lg)">
                <div class="card-header"><span class="card-title"><i class="fa-solid ${branch.icon}"></i> ${branchName}</span></div>
                <div class="unit-grid">
                    ${branchUnits.map(type => {
                const unit = DATA.units[type];
                const icon = UNIT_ICONS[type] || 'fa-person-rifle';
                const owned = military[type] || 0;
                const costStr = unit.cost ? Object.entries(unit.cost).map(([r, v]) => `${v} ${r}`).join(', ') : '?';
                const maintStr = unit.maintenance ? Object.entries(unit.maintenance).map(([r, v]) => `${v} ${r}`).join(', ') : '?';
                return `<div class="unit-card">
                            <div class="unit-header">
                                <span class="unit-icon"><i class="fa-solid ${icon}"></i></span>
                                <div>
                                    <div class="unit-name">${unit.name}</div>
                                    <div class="unit-branch">STR ${unit.strength} // DEF ${unit.defense} // SPD ${unit.speed}</div>
                                </div>
                            </div>
                            <div class="unit-count">${UI.fmtFull(owned)}</div>
                            <div style="font-size:0.7rem;color:var(--text-muted);font-family:var(--font-condensed);margin:4px 0">
                                COST: ${costStr} | MAINT: ${maintStr}
                            </div>
                            <div class="unit-actions">
                                <input type="number" id="recruit-${type}" min="1" value="100" style="width:80px;padding:6px;background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:var(--radius);color:var(--text-primary);font-family:var(--font-condensed)">
                                <button class="btn btn-primary btn-sm" onclick="Pages._recruit('${type}')">RECRUIT</button>
                            </div>
                        </div>`;
            }).join('')}
                </div>
            </div>`;
        }).join('')}`;
    },

    // ═══ NATION TAB (Detailed Overview) ═══
    nation() {
        const s = App.state;
        if (!s || !s.nation) return;
        const n = s.nation;
        const cities = s.cities || [];
        const military = s.military || {};

        const totalPop = cities.reduce((sum, c) => sum + (c.population || 0), 0);
        const totalLand = cities.reduce((sum, c) => sum + (c.land || 0), 0);
        const totalInfra = cities.reduce((sum, c) => sum + (c.infrastructure || 0), 0);

        document.getElementById('content').innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title"><i class="fa-solid fa-flag"></i> ${n.name || 'NATION'}</h1>
                <p class="page-subtitle">${n.motto || 'NO MOTTO SET'}</p>
            </div>
            <div>${UI.renderFlagSVG(n, 120, 80)}</div>
        </div>

        <div class="grid-2">
            <!-- Left Column: Nation Info -->
            <div class="card">
                <div class="card-header"><span class="card-title"><i class="fa-solid fa-info-circle"></i> Nation Information</span></div>
                <div class="ledger-list">
                    <div class="ledger-row"><span class="ledger-label">Leader</span><span class="ledger-value">${n.leader_title || 'Leader'} ${n.leader_name}</span></div>
                    <div class="ledger-row"><span class="ledger-label">Government</span><span class="ledger-value">${DATA.governments[n.government]?.name || n.government}</span></div>
                    <div class="ledger-row"><span class="ledger-label">Alliance</span><span class="ledger-value" style="color:var(--accent); font-weight:600">${s.alliance?.name || 'Independent'}</span></div>
                    <div class="ledger-row"><span class="ledger-label">Continent</span><span class="ledger-value" style="text-transform:capitalize">${n.continent.replace('_', ' ')}</span></div>
                    <div class="ledger-row"><span class="ledger-label">Capital</span><span class="ledger-value">${cities.find(c => c.is_capital)?.name || 'None'}</span></div>
                    <div class="ledger-row"><span class="ledger-label">Founded</span><span class="ledger-value">${new Date(n.created_at).toLocaleDateString()}</span></div>
                </div>

                <div class="card-header" style="margin-top:var(--space-lg)"><span class="card-title"><i class="fa-solid fa-chart-line"></i> National Stats</span></div>
                <div class="stat-grid">
                    <div class="stat-card">
                        <div class="stat-label">Population</div>
                        <div class="stat-value">${UI.fmt(totalPop)}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">GDP</div>
                        <div class="stat-value">$${UI.fmt(n.gdp || 0)}</div>
                    </div>
                </div>
                <div class="stat-grid" style="margin-top:var(--space-md)">
                    <div class="stat-card">
                        <div class="stat-label">Stability</div>
                        <div class="stat-value" style="color:${n.stability > 70 ? 'var(--success)' : 'var(--danger)'}">${n.stability || 0}%</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Approval</div>
                        <div class="stat-value" style="color:${n.approval > 70 ? 'var(--success)' : 'var(--danger)'}">${n.approval || 0}%</div>
                    </div>
                </div>
            </div>

            <!-- Right Column: Geography & Military -->
            <div class="card">
                <div class="card-header"><span class="card-title"><i class="fa-solid fa-earth-americas"></i> Geography</span></div>
                <div class="ledger-list">
                    <div class="ledger-row"><span class="ledger-label">Total Land</span><span class="ledger-value">${UI.fmtFull(totalLand)} sq. mi</span></div>
                    <div class="ledger-row"><span class="ledger-label">Infrastructure</span><span class="ledger-value">${UI.fmtFull(totalInfra)} Units</span></div>
                    <div class="ledger-row"><span class="ledger-label">Cities</span><span class="ledger-value">${cities.length} / ${DATA.balance.maxCities}</span></div>
                </div>

                <div class="card-header" style="margin-top:var(--space-lg)"><span class="card-title"><i class="fa-solid fa-shield-halved"></i> Military Strength</span></div>
                <div class="ledger-list">
                    <div class="ledger-row"><span class="ledger-label">Power Score</span><span class="ledger-value" style="color:var(--accent)">${UI.fmtFull(n.military_strength || 0)}</span></div>
                    <div class="ledger-row"><span class="ledger-label">Active Units</span><span class="ledger-value">${UI.fmtFull(Object.values(military).reduce((a, b) => a + b, 0))}</span></div>
                    <div class="ledger-row"><span class="ledger-label">War Policy</span><span class="ledger-value" style="text-transform:capitalize">${n.war_policy || 'Normal'}</span></div>
                </div>

                <div style="margin-top:var(--space-lg); padding:var(--space-md); background:var(--bg-tertiary); border:1px solid var(--border-color)">
                    <div style="font-family:var(--font-condensed); font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:var(--space-sm)">Regional Influence</div>
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width:${Math.min(100, (n.score / 100000) * 100)}%; background:var(--accent)"></div>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-top:4px; font-family:var(--font-condensed); font-size:0.7rem; color:var(--accent)">
                        <span>GLOBAL SCORE</span>
                        <span>${UI.fmt(n.score || 0)}</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="card" style="margin-top:var(--space-lg)">
            <div class="card-header"><span class="card-title"><i class="fa-solid fa-scroll"></i> National Biography</span></div>
            <p style="color:var(--text-secondary); line-height:1.6; font-size:0.9rem">${n.bio || 'This nation has not set a biography yet. Edit your nation settings to add one.'}</p>
        </div>`;
    },

    async _recruit(unitType) {
        const input = document.getElementById('recruit-' + unitType);
        const amount = parseInt(input?.value) || 100;
        try { await API.recruit(unitType, amount); await App.loadGameState(); Pages.military(); UI.updateResourceBar(); UI.toast('success', 'RECRUITED', `${amount} units enlisted.`); }
        catch (err) { UI.toast('error', 'ERROR', err.message); }
    },

};
