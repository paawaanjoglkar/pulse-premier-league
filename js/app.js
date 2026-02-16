/**
 * PULSE PREMIER LEAGUE - Main Application Controller
 * Handles initialization, routing, and UI management
 */

(function() {
    'use strict';

    // App state
    const AppState = {
        currentScreen: 'dashboard',
        currentMatch: null,
        tournament: null,
        darkMode: false,
        initialized: false
    };

    /**
     * Initialize the application
     */
    async function init() {
        try {
            // Initialize IndexedDB with fallback to memory storage
            try {
                await PPL.storage.init();
            } catch (dbError) {
                // IndexedDB failed - fall back to memory storage
                PPL.errorHandler.logError('warning', 'IndexedDB failed, using memory storage', dbError);
                PPL.memoryStorage.activate();

                // Replace storage with memory storage fallback
                PPL.storage = {
                    init: async () => Promise.resolve(),
                    save: (store, data) => PPL.memoryStorage.save(store, data),
                    get: (store, id) => Promise.resolve(PPL.memoryStorage.get(store, id)),
                    getAll: (store) => Promise.resolve(PPL.memoryStorage.getAll(store)),
                    delete: (store, id) => {
                        const arr = PPL.memoryStorage.data[store];
                        if (Array.isArray(arr)) {
                            const idx = arr.findIndex(item => item.id === id);
                            if (idx > -1) arr.splice(idx, 1);
                        }
                        return Promise.resolve();
                    },
                    clear: (store) => Promise.resolve(PPL.memoryStorage.clear(store)),
                    getTournament: () => Promise.resolve(PPL.memoryStorage.data.tournament),
                    saveTournament: (t) => Promise.resolve(PPL.memoryStorage.save('tournament', t)),
                    exportAll: () => Promise.resolve(PPL.memoryStorage.data)
                };

                PPL.showToast('⚠️ Using temporary storage - data will be lost on refresh', 'warning');
            }

            // SECURITY: Initialize CSRF protection for sync operations
            PPL.sync.initCSRFProtection();

            // Load saved preferences
            loadPreferences();

            // Load tournament data
            await loadTournament();

            // Set up event listeners
            setupEventListeners();

            // Initialize screens
            await initializeScreens();

            // Show dashboard
            showScreen('dashboard');

            AppState.initialized = true;

        } catch (error) {
            // CRITICAL ERROR: Show error and prevent further execution
            PPL.errorHandler.handleCriticalError(
                'Critical error: Application failed to initialize. Please refresh the page.',
                error
            );

            // Display error details to user
            const main = document.getElementById('app-main');
            if (main) {
                main.innerHTML = `
                    <div style="padding: 20px; text-align: center;">
                        <h2>⚠️ Initialization Error</h2>
                        <p>The application failed to initialize properly.</p>
                        <p style="font-size: 12px; color: #666; margin-top: 20px;">
                            Error: ${error.message}
                        </p>
                        <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px;">
                            Reload Page
                        </button>
                    </div>
                `;
            }
        }
    }

    /**
     * Load user preferences from localStorage
     */
    function loadPreferences() {
        const darkMode = PPL.localStorage.get('darkMode');
        if (darkMode) {
            AppState.darkMode = true;
            document.body.classList.add('dark-mode');
            const toggle = document.getElementById('dark-mode-toggle');
            if (toggle) toggle.checked = true;
        }
    }

    /**
     * Load tournament data
     */
    async function loadTournament() {
        try {
            AppState.tournament = await PPL.storage.getTournament();

            if (AppState.tournament) {
                updateTournamentInfo();
            } else {
            }
        } catch (error) {
            console.error('Failed to load tournament:', error);
        }
    }

    /**
     * Update tournament info on dashboard
     */
    function updateTournamentInfo() {
        const tournamentInfo = document.getElementById('tournament-info');

        if (!AppState.tournament) {
            // SECURITY: Use textContent for static text
            tournamentInfo.textContent = 'No tournament configured';
            tournamentInfo.className = 'no-data';
            return;
        }

        const t = AppState.tournament;
        // SECURITY: Escape user-provided tournament name
        let html = `<p><strong>${PPL.escapeHtml(t.name)}</strong></p>`;
        html += `<p>Format: ${t.defaultOvers} overs per innings</p>`;
        html += `<p>Max overs per bowler: ${t.maxOversPerBowler}</p>`;
        html += `<p>Power Ball: ${t.enablePowerBall ? 'Enabled' : 'Disabled'}</p>`;
        if (t.startDate) {
            html += `<p>Start: ${PPL.formatDate(t.startDate)}</p>`;
        }
        tournamentInfo.innerHTML = html;
    }

    /**
     * Set up all event listeners
     */
    function setupEventListeners() {
        // Menu toggle
        document.getElementById('menu-btn').addEventListener('click', openMenu);
        document.getElementById('menu-close').addEventListener('click', closeMenu);
        document.getElementById('menu-overlay').addEventListener('click', closeMenu);

        // Menu navigation
        document.querySelectorAll('.menu-list a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const screen = e.target.dataset.screen;
                if (screen) {
                    showScreen(screen);
                    closeMenu();
                }
            });
        });

        // Back buttons
        document.querySelectorAll('.btn-back').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Special handler for scoring back button
                if (e.target.id === 'scoring-back-btn') {
                    PPL.scoring.handleScoringBack();
                    return;
                }

                const screen = e.target.dataset.screen;
                if (screen) {
                    showScreen(screen);
                }
            });
        });

        // Quick action cards
        document.querySelectorAll('.action-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const screen = e.currentTarget.dataset.screen;
                if (screen) {
                    showScreen(screen);
                } else {
                    // Handle special actions
                    const id = e.currentTarget.id;
                    if (id === 'export-excel-btn') {
                        exportToExcel();
                    } else if (id === 'sync-to-cloud-btn') {
                        syncToCloud();
                    }
                }
            });
        });

        // Dashboard setup button
        document.getElementById('setup-tournament-btn').addEventListener('click', () => {
            showScreen('tournament-setup');
        });

        // Tournament form
        document.getElementById('tournament-form').addEventListener('submit', handleTournamentSubmit);

        // Team management
        document.getElementById('add-team-btn').addEventListener('click', showAddTeamDialog);

        // Player management
        document.getElementById('add-player-btn').addEventListener('click', showAddPlayerDialog);

        // Fixture management
        document.getElementById('add-fixture-btn').addEventListener('click', showAddFixtureDialog);

        // Dark mode toggle
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        if (darkModeToggle) {
            darkModeToggle.addEventListener('change', toggleDarkMode);
        }

        // GitHub config form
        const githubForm = document.getElementById('github-config-form');
        if (githubForm) {
            githubForm.addEventListener('submit', handleGitHubConfig);
        }

        // Clear data button
        document.getElementById('clear-data-btn').addEventListener('click', clearAllData);

        // Export Excel button
        document.getElementById('export-excel-btn').addEventListener('click', exportToExcel);

        // Sync button
        document.getElementById('sync-to-cloud-btn').addEventListener('click', syncToCloud);

        // Points table recalculate
        document.getElementById('recalculate-points-btn').addEventListener('click', recalculatePoints);

        // Scoring buttons
        setupScoringListeners();

    }

    /**
     * Setup scoring button listeners
     */
    function setupScoringListeners() {
        // Run buttons (0-4)
        document.querySelectorAll('.run-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const runs = parseInt(e.target.dataset.runs);
                PPL.scoring.processRun(runs);
            });
        });

        // Extra buttons
        document.querySelectorAll('.extra-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const extra = e.target.dataset.extra;
                switch(extra) {
                    case 'wide':
                        PPL.scoring.processWide();
                        break;
                    case 'noball':
                        PPL.scoring.processNoBall();
                        break;
                    case 'bye':
                        PPL.scoring.processBye();
                        break;
                    case 'legbye':
                        PPL.scoring.processLegBye();
                        break;
                }
            });
        });

        // Wicket button
        const wicketBtn = document.getElementById('wicket-btn');
        if (wicketBtn) {
            wicketBtn.addEventListener('click', () => {
                PPL.scoring.processWicket();
            });
        }

        // Undo button
        const undoBtn = document.getElementById('undo-btn');
        if (undoBtn) {
            undoBtn.addEventListener('click', () => {
                PPL.scoring.undoLastBall();
            });
        }

        // Edit balls button
        const editBallsBtn = document.getElementById('edit-balls-btn');
        if (editBallsBtn) {
            editBallsBtn.addEventListener('click', () => {
                PPL.scoring.editAllBalls();
            });
        }

        // Scorecard button
        const scorecardBtn = document.getElementById('scorecard-btn');
        if (scorecardBtn) {
            scorecardBtn.addEventListener('click', () => {
                PPL.scoring.showLiveScorecard();
            });
        }

        // Commentary button
        const commentaryBtn = document.getElementById('commentary-btn');
        if (commentaryBtn) {
            commentaryBtn.addEventListener('click', () => {
                PPL.scoring.showBallByBall();
            });
        }

        // History button
        const historyBtn = document.getElementById('history-btn');
        if (historyBtn) {
            historyBtn.addEventListener('click', () => {
                PPL.scoring.showEditHistory();
            });
        }

        // End over button
        const endOverBtn = document.getElementById('end-over-btn');
        if (endOverBtn) {
            endOverBtn.addEventListener('click', () => {
                PPL.scoring.endOver();
            });
        }
    }

    /**
     * Initialize all screens
     */
    async function initializeScreens() {
        await refreshTeamsList();
        await refreshPlayersList();
        await refreshFixturesList();
        await refreshUpcomingMatches();
    }

    /**
     * Screen navigation
     */
    function showScreen(screenId) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Show selected screen
        const screen = document.getElementById(`${screenId}-screen`);
        if (screen) {
            screen.classList.add('active');
            AppState.currentScreen = screenId;

            // Refresh screen data
            refreshScreen(screenId);
        }
    }

    /**
     * Refresh screen data when shown
     */
    async function refreshScreen(screenId) {
        switch (screenId) {
            case 'dashboard':
                updateTournamentInfo();
                await refreshUpcomingMatches();
                break;
            case 'team-management':
                await refreshTeamsList();
                break;
            case 'player-management':
                await refreshPlayersList();
                await populateTeamFilter();
                break;
            case 'fixture-management':
                await refreshFixturesList();
                break;
            case 'points-table':
                await refreshPointsTable();
                break;
            case 'player-stats':
                await refreshPlayerStats();
                break;
            case 'awards':
                await refreshAwards();
                break;
        }
    }

    /**
     * Menu functions
     */
    function openMenu() {
        document.getElementById('side-menu').classList.add('open');
        document.getElementById('menu-overlay').classList.add('open');
    }

    function closeMenu() {
        document.getElementById('side-menu').classList.remove('open');
        document.getElementById('menu-overlay').classList.remove('open');
    }

    /**
     * Dark mode toggle
     */
    function toggleDarkMode(e) {
        AppState.darkMode = e.target.checked;
        document.body.classList.toggle('dark-mode', AppState.darkMode);
        PPL.localStorage.set('darkMode', AppState.darkMode);
    }

    /**
     * Tournament setup form handler
     */
    async function handleTournamentSubmit(e) {
        e.preventDefault();

        const formData = {
            name: document.getElementById('tournament-name').value,
            defaultOvers: parseInt(document.getElementById('default-overs').value),
            maxOversPerBowler: parseInt(document.getElementById('max-overs-per-bowler').value),
            enablePowerBall: document.getElementById('enable-power-ball').checked,
            startDate: document.getElementById('tournament-start-date').value,
            endDate: document.getElementById('tournament-end-date').value
        };

        try {
            await PPL.storage.saveTournament(formData);
            AppState.tournament = formData;

            PPL.showToast('Tournament saved successfully', 'success');
            updateTournamentInfo();
            showScreen('dashboard');

        } catch (error) {
            console.error('Failed to save tournament:', error);
            PPL.showToast('Failed to save tournament', 'error');
        }
    }

    /**
     * Team management
     */
    function showAddTeamDialog() {
        const content = `
            <div class="form-container">
                <h3>Add Team</h3>
                <form id="add-team-form">
                    <div class="form-group">
                        <label for="team-name">Team Name *</label>
                        <input type="text" id="team-name" required>
                    </div>
                    <div class="form-group">
                        <label for="team-short-name">Short Name *</label>
                        <input type="text" id="team-short-name" maxlength="3" required>
                        <small>3 character abbreviation (e.g., MI, CSK)</small>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Add Team</button>
                        <button type="button" class="btn btn-secondary" onclick="PPL.hideModal()">Cancel</button>
                    </div>
                </form>
            </div>
        `;

        PPL.showModal(content);

        document.getElementById('add-team-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const team = {
                name: document.getElementById('team-name').value,
                shortName: document.getElementById('team-short-name').value.toUpperCase(),
                active: true
            };

            try {
                await PPL.storage.saveTeam(team);
                PPL.showToast('Team added successfully', 'success');
                PPL.hideModal();
                await refreshTeamsList();
            } catch (error) {
                console.error('Failed to add team:', error);
                PPL.showToast('Failed to add team', 'error');
            }
        });
    }

    async function refreshTeamsList() {
        const teamsList = document.getElementById('teams-list');
        const teams = await PPL.storage.getAll(PPL.STORES.TEAMS);

        if (teams.length === 0) {
            teamsList.innerHTML = '<p class="no-data">No teams added yet</p>';
            return;
        }

        teamsList.innerHTML = teams.map(team => `
            <div class="list-item">
                <div>
                    <strong>${team.name}</strong> (${team.shortName})
                    ${!team.active ? '<span class="text-muted"> - Inactive</span>' : ''}
                </div>
                <div>
                    <button class="btn btn-secondary" onclick="editTeam(${team.id})">Edit</button>
                    <button class="btn btn-${team.active ? 'secondary' : 'primary'}"
                            onclick="toggleTeamActive(${team.id})">
                        ${team.active ? 'Deactivate' : 'Activate'}
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Player management
     */
    function showAddPlayerDialog() {
        if (!AppState.tournament) {
            PPL.showToast('Please setup tournament first', 'error');
            return;
        }

        const content = `
            <div class="form-container">
                <h3>Add Player</h3>
                <form id="add-player-form">
                    <div class="form-group">
                        <label for="player-name">Player Name *</label>
                        <input type="text" id="player-name" required>
                    </div>
                    <div class="form-group">
                        <label for="player-team">Team *</label>
                        <select id="player-team" required>
                            <option value="">Select Team</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="player-gender">Gender *</label>
                        <select id="player-gender" required>
                            <option value="">Select Gender</option>
                            <option value="M">Male</option>
                            <option value="F">Female</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="player-role">Role</label>
                        <select id="player-role">
                            <option value="batsman">Batter</option>
                            <option value="bowler">Bowler</option>
                            <option value="all_rounder">All-Rounder</option>
                            <option value="wicket_keeper">Wicket-Keeper</option>
                        </select>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Add Player</button>
                        <button type="button" class="btn btn-secondary" onclick="PPL.hideModal()">Cancel</button>
                    </div>
                </form>
            </div>
        `;

        PPL.showModal(content);

        // Populate team dropdown
        populateTeamDropdown('player-team');

        document.getElementById('add-player-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const player = {
                name: document.getElementById('player-name').value,
                teamId: parseInt(document.getElementById('player-team').value),
                gender: document.getElementById('player-gender').value,
                role: document.getElementById('player-role').value,
                active: true
            };

            try {
                await PPL.storage.savePlayer(player);
                PPL.showToast('Player added successfully', 'success');
                PPL.hideModal();
                await refreshPlayersList();
            } catch (error) {
                console.error('Failed to add player:', error);
                PPL.showToast('Failed to add player', 'error');
            }
        });
    }

    async function populateTeamDropdown(selectId) {
        const select = document.getElementById(selectId);
        const teams = await PPL.storage.getActiveTeams();

        teams.forEach(team => {
            const option = document.createElement('option');
            option.value = team.id;
            option.textContent = team.name;
            select.appendChild(option);
        });
    }

    async function populateTeamFilter() {
        const filter = document.getElementById('player-team-filter');
        const teams = await PPL.storage.getActiveTeams();

        filter.innerHTML = '<option value="">All Teams</option>';

        teams.forEach(team => {
            const option = document.createElement('option');
            option.value = team.id;
            option.textContent = team.name;
            filter.appendChild(option);
        });

        filter.addEventListener('change', refreshPlayersList);
    }

    async function refreshPlayersList() {
        const playersList = document.getElementById('players-list');
        const teamFilter = document.getElementById('player-team-filter');
        const selectedTeamId = teamFilter ? parseInt(teamFilter.value) : null;

        let players;
        if (selectedTeamId) {
            players = await PPL.storage.getPlayersByTeam(selectedTeamId);
        } else {
            players = await PPL.storage.getAll(PPL.STORES.PLAYERS);
        }

        if (players.length === 0) {
            playersList.innerHTML = '<p class="no-data">No players added yet</p>';
            return;
        }

        // Get team names
        const teams = await PPL.storage.getAll(PPL.STORES.TEAMS);
        const teamMap = {};
        teams.forEach(t => teamMap[t.id] = t);

        playersList.innerHTML = players.map(player => `
            <div class="list-item">
                <div>
                    <strong>${player.name}</strong>
                    <span class="text-muted">
                        (${teamMap[player.teamId]?.shortName || 'N/A'}) -
                        ${PPL.getGenderLabel(player.gender)} -
                        ${PPL.getRoleLabel(player.role)}
                    </span>
                    ${!player.active ? '<span class="text-muted"> - Inactive</span>' : ''}
                </div>
                <div>
                    <button class="btn btn-secondary" onclick="editPlayer(${player.id})">Edit</button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Fixture management
     */
    function showAddFixtureDialog() {
        const content = `
            <div class="form-container">
                <h3>Add Fixture</h3>
                <form id="add-fixture-form">
                    <div class="form-group">
                        <label for="fixture-number">Match Number *</label>
                        <input type="number" id="fixture-number" required min="1">
                    </div>
                    <div class="form-group">
                        <label for="fixture-team1">Team 1 *</label>
                        <select id="fixture-team1" required>
                            <option value="">Select Team</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="fixture-team2">Team 2 *</label>
                        <select id="fixture-team2" required>
                            <option value="">Select Team</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="fixture-type">Match Type *</label>
                        <select id="fixture-type" required>
                            <option value="league">League</option>
                            <option value="qualifier1">Qualifier 1</option>
                            <option value="eliminator">Eliminator</option>
                            <option value="qualifier2">Qualifier 2</option>
                            <option value="final">Final</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="fixture-date">Date</label>
                        <input type="date" id="fixture-date">
                    </div>
                    <div class="form-group">
                        <label for="fixture-time">Time</label>
                        <input type="time" id="fixture-time">
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Add Fixture</button>
                        <button type="button" class="btn btn-secondary" onclick="PPL.hideModal()">Cancel</button>
                    </div>
                </form>
            </div>
        `;

        PPL.showModal(content);

        // Populate team dropdowns
        populateTeamDropdown('fixture-team1');
        populateTeamDropdown('fixture-team2');

        document.getElementById('add-fixture-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const team1 = parseInt(document.getElementById('fixture-team1').value);
            const team2 = parseInt(document.getElementById('fixture-team2').value);

            if (team1 === team2) {
                PPL.showToast('Teams must be different', 'error');
                return;
            }

            const fixture = {
                matchNumber: parseInt(document.getElementById('fixture-number').value),
                team1Id: team1,
                team2Id: team2,
                type: document.getElementById('fixture-type').value,
                date: document.getElementById('fixture-date').value,
                time: document.getElementById('fixture-time').value,
                status: 'upcoming'
            };

            try {
                await PPL.storage.saveFixture(fixture);
                PPL.showToast('Fixture added successfully', 'success');
                PPL.hideModal();
                await refreshFixturesList();
                await refreshUpcomingMatches();
            } catch (error) {
                console.error('Failed to add fixture:', error);
                PPL.showToast('Failed to add fixture', 'error');
            }
        });
    }

    async function refreshFixturesList() {
        const fixturesList = document.getElementById('fixtures-list');
        const fixtures = await PPL.storage.getAll(PPL.STORES.FIXTURES);

        if (fixtures.length === 0) {
            fixturesList.innerHTML = '<p class="no-data">No fixtures scheduled yet</p>';
            return;
        }

        // Get team names
        const teams = await PPL.storage.getAll(PPL.STORES.TEAMS);
        const teamMap = {};
        teams.forEach(t => teamMap[t.id] = t);

        // Sort by match number
        fixtures.sort((a, b) => a.matchNumber - b.matchNumber);

        fixturesList.innerHTML = fixtures.map(fixture => {
            const team1 = teamMap[fixture.team1Id];
            const team2 = teamMap[fixture.team2Id];
            const statusClass = fixture.status === 'completed' ? 'success' :
                               fixture.status === 'in_progress' ? 'info' : '';

            return `
                <div class="list-item">
                    <div>
                        <strong>Match ${fixture.matchNumber}</strong>:
                        ${team1?.name || 'TBD'} vs ${team2?.name || 'TBD'}
                        <span class="text-muted"> - ${fixture.type}</span>
                        <br>
                        ${fixture.date ? PPL.formatDate(fixture.date) : ''}
                        ${fixture.time ? ' ' + fixture.time : ''}
                        <br>
                        <span class="badge ${statusClass}">${fixture.status}</span>
                    </div>
                    <div>
                        ${fixture.status === 'upcoming' ?
                            `<button class="btn btn-primary" onclick="startMatch(${fixture.id})">Start</button>` :
                            fixture.status === 'in_progress' ?
                            `<button class="btn btn-primary" onclick="resumeMatch(${fixture.id})">Resume</button>` :
                            `<button class="btn btn-secondary" onclick="viewMatch(${fixture.id})">View</button>`
                        }
                    </div>
                </div>
            `;
        }).join('');
    }

    async function refreshUpcomingMatches() {
        const container = document.getElementById('upcoming-matches-list');
        const fixtures = await PPL.storage.getFixturesByStatus('upcoming');

        if (fixtures.length === 0) {
            container.innerHTML = '<p class="no-data">No upcoming matches</p>';
            return;
        }

        // Get team names
        const teams = await PPL.storage.getAll(PPL.STORES.TEAMS);
        const teamMap = {};
        teams.forEach(t => teamMap[t.id] = t);

        // Show first 3
        const upcomingFixtures = fixtures.slice(0, 3);

        container.innerHTML = upcomingFixtures.map(fixture => {
            const team1 = teamMap[fixture.team1Id];
            const team2 = teamMap[fixture.team2Id];

            return `
                <div class="list-item">
                    <div>
                        <strong>Match ${fixture.matchNumber}</strong>:
                        ${team1?.shortName || 'TBD'} vs ${team2?.shortName || 'TBD'}
                        <br>
                        <span class="text-muted text-small">
                            ${fixture.date ? PPL.formatDate(fixture.date) : 'TBD'}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Placeholder functions for features to be implemented
     */
    async function refreshPointsTable() {
        // Implemented in points.js
        if (PPL.points && PPL.points.showPointsTable) {
            await PPL.points.showPointsTable();
        } else {
            const container = document.getElementById('points-table-container');
            container.innerHTML = '<p class="no-data">Points table will be calculated after matches are completed</p>';
        }
    }

    async function refreshPlayerStats() {
        // Will be implemented in stats.js
        const container = document.getElementById('stats-content');
        container.innerHTML = '<p class="no-data">Player statistics will be available after matches are completed</p>';
    }

    async function refreshAwards() {
        // Implemented in awards.js
        const container = document.getElementById('awards-list');

        try {
            const result = await PPL.awards.calculateAllAwards();

            if (!result || result.matchCount === 0) {
                container.innerHTML = '<p class="no-data">Awards will be calculated after matches are completed</p>';
                return;
            }

            let html = `
                <div class="awards-header">
                    <h3>Tournament Awards (${result.matchCount} matches)</h3>
                    <button class="btn btn-secondary" onclick="refreshAwards()">🔄 Recalculate</button>
                </div>
                <div class="awards-grid">
            `;

            for (const [awardId, award] of Object.entries(result.awards)) {
                if (!award.winners || award.winners.length === 0) continue;

                const winner = award.winners[0];
                html += `
                    <div class="award-card">
                        <div class="award-icon">${award.icon}</div>
                        <h4>${award.awardName}</h4>
                        <p class="award-winner">${winner.playerName}</p>
                        <p class="award-value">${winner.value}</p>
                        <div class="runners-up">
                `;

                for (let i = 1; i < award.winners.length && i < 3; i++) {
                    const runner = award.winners[i];
                    html += `<span class="runner-up">• ${runner.playerName} (${runner.value})</span><br>`;
                }

                html += `
                        </div>
                        <button class="btn btn-sm btn-secondary" onclick="PPL.awards.showAwardDetail('${awardId}')">📋 Details</button>
                        <button class="btn btn-sm btn-secondary" onclick="PPL.awards.showAwardOverride('${awardId}')">✏️ Override</button>
                    </div>
                `;
            }

            html += '</div>';
            container.innerHTML = html;

        } catch (error) {
            console.error('Error refreshing awards:', error);
            container.innerHTML = '<p class="error">Error calculating awards</p>';
        }
    }

    async function recalculatePoints() {
        try {
            await refreshPointsTable();
            PPL.showToast('Points table refreshed', 'success');
        } catch (error) {
            console.error('Failed to recalculate points:', error);
            PPL.showToast('Failed to refresh points table', 'error');
        }
    }

    async function exportToExcel() {
        if (PPL.export && PPL.export.exportToExcel) {
            await PPL.export.exportToExcel();
        } else {
            PPL.showToast('Excel export module not loaded', 'error');
        }
    }

    async function syncToCloud() {
        if (!PPL.sync) {
            PPL.showToast('Sync module not loaded', 'error');
            return;
        }

        const config = PPL.sync.getConfig();
        if (!config.repoUrl || !config.token) {
            PPL.showToast('GitHub configuration not set. Go to Settings first.', 'error');
            return;
        }

        const content = `
            <div class="form-container">
                <h3>GitHub Sync</h3>
                <p>What would you like to do?</p>
                <div class="form-actions" style="flex-direction: column; gap: var(--spacing-sm);">
                    <button class="btn btn-primary" onclick="PPL.sync.pushToGitHub()">📤 Push (Upload)</button>
                    <button class="btn btn-secondary" onclick="PPL.sync.pullFromGitHub()">📥 Pull (Download)</button>
                    <button class="btn btn-secondary" onclick="PPL.hideModal()">Cancel</button>
                </div>
            </div>
        `;

        PPL.showModal(content);
    }

    async function handleGitHubConfig(e) {
        e.preventDefault();

        const repoUrl = document.getElementById('github-repo').value.trim();
        const token = document.getElementById('github-token').value.trim();

        if (!repoUrl || !token) {
            PPL.showToast('Please enter both repository URL and token', 'error');
            return;
        }

        // Validate URL format
        const parsed = PPL.sync.parseGitHubUrl(repoUrl);
        if (!parsed) {
            PPL.showToast('Invalid GitHub URL format. Expected: https://github.com/username/repository', 'error');
            return;
        }

        // Save configuration
        PPL.sync.saveConfig(repoUrl, token);
        PPL.showToast('GitHub configuration saved!', 'success');

        // Clear sensitive fields
        document.getElementById('github-repo').value = '';
        document.getElementById('github-token').value = '';
    }

    function clearAllData() {
        PPL.confirm(
            'Are you sure you want to clear all data? This cannot be undone!',
            async () => {
                await PPL.storage.clearAll();
                PPL.showToast('All data cleared', 'success');
                location.reload();
            }
        );
    }

    // Global functions for onclick handlers
    window.editTeam = function(teamId) {
        PPL.showToast('Edit team feature coming soon', 'info');
    };

    window.toggleTeamActive = async function(teamId) {
        const team = await PPL.storage.get(PPL.STORES.TEAMS, teamId);
        team.active = !team.active;
        await PPL.storage.saveTeam(team);
        await refreshTeamsList();
        PPL.showToast(`Team ${team.active ? 'activated' : 'deactivated'}`, 'success');
    };

    window.editPlayer = function(playerId) {
        PPL.showToast('Edit player feature coming soon', 'info');
    };

    window.startMatch = function(fixtureId) {
        PPL.showToast('Match setup wizard coming in next phase', 'info');
    };

    window.resumeMatch = function(fixtureId) {
        PPL.showToast('Resume match feature coming in next phase', 'info');
    };

    window.viewMatch = function(fixtureId) {
        PPL.showToast('View match feature coming in next phase', 'info');
    };

    // Initialize app when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
