/**
 * PULSE PREMIER LEAGUE - Scoring Engine
 * Handles ball-by-ball scoring, cricket rules, and match state
 */

window.PPL = window.PPL || {};

// Match state object
let currentMatch = null;
let currentInnings = null;
let currentPartnership = null;

// Scoring engine
PPL.scoring = {

    /**
     * Initialize match setup wizard
     */
    startMatchSetup: async function(fixtureId) {
        const fixture = await PPL.storage.get(PPL.STORES.FIXTURES, fixtureId);
        if (!fixture) {
            PPL.showToast('Fixture not found', 'error');
            return;
        }

        const team1 = await PPL.storage.get(PPL.STORES.TEAMS, fixture.team1Id);
        const team2 = await PPL.storage.get(PPL.STORES.TEAMS, fixture.team2Id);
        const tournament = await PPL.storage.getTournament();

        // Store setup state
        this.setupState = {
            fixture,
            team1,
            team2,
            tournament,
            currentStep: 1,
            data: {
                overs: tournament.defaultOvers,
                tossWinner: null,
                tossDecision: null,
                battingTeamId: null,
                bowlingTeamId: null,
                battingXI: [],
                bowlingXI: [],
                striker: null,
                nonStriker: null,
                openingBowler: null
            }
        };

        this.showSetupStep(1);
    },

    /**
     * Show setup wizard step
     */
    showSetupStep: function(step) {
        const wizard = document.getElementById('match-setup-wizard');
        let content = '';

        switch(step) {
            case 1:
                content = this.getStep1HTML();
                break;
            case 2:
                content = this.getStep2HTML();
                break;
            case 3:
                content = this.getStep3HTML();
                break;
            case 4:
                content = this.getStep4HTML();
                break;
            case 5:
                content = this.getStep5HTML();
                break;
            case 6:
                content = this.getStep6HTML();
                break;
            case 7:
                content = this.getStep7HTML();
                break;
        }

        wizard.innerHTML = content;
        this.attachSetupHandlers(step);
    },

    /**
     * Step 1: Overs configuration
     */
    getStep1HTML: function() {
        return `
            <div class="wizard-step">
                <h3>Step 1 of 7: Match Overs</h3>
                <p>Match: ${this.setupState.team1.name} vs ${this.setupState.team2.name}</p>
                <div class="form-group">
                    <label for="match-overs">Overs per Innings</label>
                    <input type="number" id="match-overs" value="${this.setupState.data.overs}" min="1" max="20">
                    <small>Default: ${this.setupState.tournament.defaultOvers} overs (can be changed)</small>
                </div>
                <div class="form-actions">
                    <button class="btn btn-primary" onclick="PPL.scoring.nextStep(1)">Next →</button>
                </div>
            </div>
        `;
    },

    /**
     * Step 2: Toss
     */
    getStep2HTML: function() {
        return `
            <div class="wizard-step">
                <h3>Step 2 of 7: Toss</h3>
                <div class="form-group">
                    <label>Toss Winner</label>
                    <select id="toss-winner">
                        <option value="">Select team</option>
                        <option value="${this.setupState.team1.id}">${this.setupState.team1.name}</option>
                        <option value="${this.setupState.team2.id}">${this.setupState.team2.name}</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Decision</label>
                    <select id="toss-decision">
                        <option value="">Select decision</option>
                        <option value="bat">Bat First</option>
                        <option value="bowl">Bowl First</option>
                    </select>
                </div>
                <div class="form-actions">
                    <button class="btn btn-secondary" onclick="PPL.scoring.prevStep(2)">← Back</button>
                    <button class="btn btn-primary" onclick="PPL.scoring.nextStep(2)">Next →</button>
                </div>
            </div>
        `;
    },

    /**
     * Step 3: Batting team Playing XI
     */
    getStep3HTML: function() {
        const battingTeam = this.setupState.data.battingTeamId ?
            (this.setupState.team1.id === this.setupState.data.battingTeamId ? this.setupState.team1 : this.setupState.team2) :
            this.setupState.team1;

        return `
            <div class="wizard-step">
                <h3>Step 3 of 7: ${battingTeam.name} Playing XI</h3>
                <p>Select 10 players who will bat (minimum 2 female players recommended)</p>
                <div id="batting-xi-list">
                    <p class="text-muted">Loading players...</p>
                </div>
                <p id="xi-count">Selected: <span id="xi-count-num">0</span>/10</p>
                <div class="form-actions">
                    <button class="btn btn-secondary" onclick="PPL.scoring.prevStep(3)">← Back</button>
                    <button class="btn btn-primary" onclick="PPL.scoring.nextStep(3)" id="step3-next">Next →</button>
                </div>
            </div>
        `;
    },

    /**
     * Step 4: Bowling team Playing XI
     */
    getStep4HTML: function() {
        const bowlingTeam = this.setupState.data.bowlingTeamId ?
            (this.setupState.team1.id === this.setupState.data.bowlingTeamId ? this.setupState.team1 : this.setupState.team2) :
            this.setupState.team2;

        return `
            <div class="wizard-step">
                <h3>Step 4 of 7: ${bowlingTeam.name} Playing XI</h3>
                <p>Select 10 players who will field</p>
                <div id="bowling-xi-list">
                    <p class="text-muted">Loading players...</p>
                </div>
                <p id="bowling-xi-count">Selected: <span id="bowling-xi-count-num">0</span>/10</p>
                <div class="form-actions">
                    <button class="btn btn-secondary" onclick="PPL.scoring.prevStep(4)">← Back</button>
                    <button class="btn btn-primary" onclick="PPL.scoring.nextStep(4)" id="step4-next">Next →</button>
                </div>
            </div>
        `;
    },

    /**
     * Step 5: Opening batters
     */
    getStep5HTML: function() {
        return `
            <div class="wizard-step">
                <h3>Step 5 of 7: Opening Batters</h3>
                <div class="form-group">
                    <label>Striker (on strike)</label>
                    <select id="opening-striker">
                        <option value="">Select batter</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Non-Striker</label>
                    <select id="opening-non-striker">
                        <option value="">Select batter</option>
                    </select>
                </div>
                <div class="form-actions">
                    <button class="btn btn-secondary" onclick="PPL.scoring.prevStep(5)">← Back</button>
                    <button class="btn btn-primary" onclick="PPL.scoring.nextStep(5)">Next →</button>
                </div>
            </div>
        `;
    },

    /**
     * Step 6: Opening bowler
     */
    getStep6HTML: function() {
        return `
            <div class="wizard-step">
                <h3>Step 6 of 7: Opening Bowler</h3>
                <div class="form-group">
                    <label>Select opening bowler</label>
                    <select id="opening-bowler">
                        <option value="">Select bowler</option>
                    </select>
                </div>
                <div class="form-actions">
                    <button class="btn btn-secondary" onclick="PPL.scoring.prevStep(6)">← Back</button>
                    <button class="btn btn-primary" onclick="PPL.scoring.nextStep(6)">Next →</button>
                </div>
            </div>
        `;
    },

    /**
     * Step 7: Review and confirm
     */
    getStep7HTML: function() {
        const battingTeam = this.setupState.team1.id === this.setupState.data.battingTeamId ?
            this.setupState.team1 : this.setupState.team2;
        const bowlingTeam = this.setupState.team1.id === this.setupState.data.bowlingTeamId ?
            this.setupState.team1 : this.setupState.team2;

        return `
            <div class="wizard-step">
                <h3>Step 7 of 7: Review & Start</h3>
                <div class="review-summary">
                    <p><strong>Overs:</strong> ${this.setupState.data.overs} per innings</p>
                    <p><strong>Toss:</strong> ${battingTeam.name} won and chose to bat</p>
                    <p><strong>Batting:</strong> ${battingTeam.name} (${this.setupState.data.battingXI.length} players)</p>
                    <p><strong>Bowling:</strong> ${bowlingTeam.name} (${this.setupState.data.bowlingXI.length} players)</p>
                    <p><strong>Opening Batters:</strong> Striker & Non-Striker selected</p>
                    <p><strong>Opening Bowler:</strong> Selected</p>
                </div>
                <div class="form-actions">
                    <button class="btn btn-secondary" onclick="PPL.scoring.prevStep(7)">← Back</button>
                    <button class="btn btn-primary" onclick="PPL.scoring.confirmAndStart()">Start Match 🏏</button>
                </div>
            </div>
        `;
    },

    /**
     * Attach event handlers for each step
     */
    attachSetupHandlers: async function(step) {
        if (step === 3) {
            await this.loadBattingXI();
        } else if (step === 4) {
            await this.loadBowlingXI();
        } else if (step === 5) {
            await this.loadOpeningBatters();
        } else if (step === 6) {
            await this.loadOpeningBowler();
        }
    },

    /**
     * Load batting XI checkboxes
     */
    loadBattingXI: async function() {
        const battingTeamId = this.setupState.data.battingTeamId || this.setupState.team1.id;
        const players = await PPL.storage.getActivePlayersByTeam(battingTeamId);

        const list = document.getElementById('batting-xi-list');
        list.innerHTML = players.map(p => `
            <label class="checkbox-label">
                <input type="checkbox" class="batting-xi-checkbox" value="${p.id}" data-gender="${p.gender}">
                <span>${p.name} (${PPL.getGenderLabel(p.gender)})</span>
            </label>
        `).join('');

        // Update count on change
        document.querySelectorAll('.batting-xi-checkbox').forEach(cb => {
            cb.addEventListener('change', () => {
                const selected = document.querySelectorAll('.batting-xi-checkbox:checked');
                document.getElementById('xi-count-num').textContent = selected.length;
                document.getElementById('step3-next').disabled = selected.length !== 10;
            });
        });
    },

    /**
     * Load bowling XI checkboxes
     */
    loadBowlingXI: async function() {
        const bowlingTeamId = this.setupState.data.bowlingTeamId || this.setupState.team2.id;
        const players = await PPL.storage.getActivePlayersByTeam(bowlingTeamId);

        const list = document.getElementById('bowling-xi-list');
        list.innerHTML = players.map(p => `
            <label class="checkbox-label">
                <input type="checkbox" class="bowling-xi-checkbox" value="${p.id}">
                <span>${p.name} (${PPL.getGenderLabel(p.gender)})</span>
            </label>
        `).join('');

        document.querySelectorAll('.bowling-xi-checkbox').forEach(cb => {
            cb.addEventListener('change', () => {
                const selected = document.querySelectorAll('.bowling-xi-checkbox:checked');
                document.getElementById('bowling-xi-count-num').textContent = selected.length;
                document.getElementById('step4-next').disabled = selected.length !== 10;
            });
        });
    },

    /**
     * Load opening batters dropdown
     */
    loadOpeningBatters: async function() {
        const strikerSelect = document.getElementById('opening-striker');
        const nonStrikerSelect = document.getElementById('opening-non-striker');

        for (const playerId of this.setupState.data.battingXI) {
            const player = await PPL.storage.get(PPL.STORES.PLAYERS, playerId);
            const option1 = document.createElement('option');
            option1.value = player.id;
            option1.textContent = player.name;
            strikerSelect.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = player.id;
            option2.textContent = player.name;
            nonStrikerSelect.appendChild(option2);
        }
    },

    /**
     * Load opening bowler dropdown
     */
    loadOpeningBowler: async function() {
        const bowlerSelect = document.getElementById('opening-bowler');

        for (const playerId of this.setupState.data.bowlingXI) {
            const player = await PPL.storage.get(PPL.STORES.PLAYERS, playerId);
            const option = document.createElement('option');
            option.value = player.id;
            option.textContent = player.name;
            bowlerSelect.appendChild(option);
        }
    },

    /**
     * Navigate to next step
     */
    nextStep: function(currentStep) {
        // Validate and save current step data
        if (!this.validateStep(currentStep)) {
            return;
        }

        this.saveStepData(currentStep);
        this.setupState.currentStep = currentStep + 1;
        this.showSetupStep(currentStep + 1);
    },

    /**
     * Navigate to previous step
     */
    prevStep: function(currentStep) {
        this.setupState.currentStep = currentStep - 1;
        this.showSetupStep(currentStep - 1);
    },

    /**
     * Validate step data
     */
    validateStep: function(step) {
        switch(step) {
            case 1:
                const overs = parseInt(document.getElementById('match-overs').value);
                if (!overs || overs < 1 || overs > 20) {
                    PPL.showToast('Please enter valid overs (1-20)', 'error');
                    return false;
                }
                return true;

            case 2:
                const tossWinner = document.getElementById('toss-winner').value;
                const tossDecision = document.getElementById('toss-decision').value;
                if (!tossWinner || !tossDecision) {
                    PPL.showToast('Please complete toss details', 'error');
                    return false;
                }
                return true;

            case 3:
                const selected = document.querySelectorAll('.batting-xi-checkbox:checked');
                if (selected.length !== 10) {
                    PPL.showToast('Please select exactly 10 players', 'error');
                    return false;
                }
                return true;

            case 4:
                const bowlingSelected = document.querySelectorAll('.bowling-xi-checkbox:checked');
                if (bowlingSelected.length !== 10) {
                    PPL.showToast('Please select exactly 10 players', 'error');
                    return false;
                }
                return true;

            case 5:
                const striker = document.getElementById('opening-striker').value;
                const nonStriker = document.getElementById('opening-non-striker').value;
                if (!striker || !nonStriker) {
                    PPL.showToast('Please select both batters', 'error');
                    return false;
                }
                if (striker === nonStriker) {
                    PPL.showToast('Batters must be different', 'error');
                    return false;
                }
                return true;

            case 6:
                const bowler = document.getElementById('opening-bowler').value;
                if (!bowler) {
                    PPL.showToast('Please select opening bowler', 'error');
                    return false;
                }
                return true;

            default:
                return true;
        }
    },

    /**
     * Save step data to setup state
     */
    saveStepData: function(step) {
        switch(step) {
            case 1:
                this.setupState.data.overs = parseInt(document.getElementById('match-overs').value);
                break;

            case 2:
                const tossWinner = parseInt(document.getElementById('toss-winner').value);
                const tossDecision = document.getElementById('toss-decision').value;
                this.setupState.data.tossWinner = tossWinner;
                this.setupState.data.tossDecision = tossDecision;

                if (tossDecision === 'bat') {
                    this.setupState.data.battingTeamId = tossWinner;
                    this.setupState.data.bowlingTeamId = tossWinner === this.setupState.team1.id ?
                        this.setupState.team2.id : this.setupState.team1.id;
                } else {
                    this.setupState.data.bowlingTeamId = tossWinner;
                    this.setupState.data.battingTeamId = tossWinner === this.setupState.team1.id ?
                        this.setupState.team2.id : this.setupState.team1.id;
                }
                break;

            case 3:
                const battingXI = Array.from(document.querySelectorAll('.batting-xi-checkbox:checked'))
                    .map(cb => parseInt(cb.value));
                this.setupState.data.battingXI = battingXI;
                break;

            case 4:
                const bowlingXI = Array.from(document.querySelectorAll('.bowling-xi-checkbox:checked'))
                    .map(cb => parseInt(cb.value));
                this.setupState.data.bowlingXI = bowlingXI;
                break;

            case 5:
                this.setupState.data.striker = parseInt(document.getElementById('opening-striker').value);
                this.setupState.data.nonStriker = parseInt(document.getElementById('opening-non-striker').value);
                break;

            case 6:
                this.setupState.data.openingBowler = parseInt(document.getElementById('opening-bowler').value);
                break;
        }
    },

    /**
     * Confirm and start match
     */
    confirmAndStart: async function() {
        try {
            // Create match record
            const match = {
                fixtureId: this.setupState.fixture.id,
                team1Id: this.setupState.team1.id,
                team2Id: this.setupState.team2.id,
                overs: this.setupState.data.overs,
                tossWinner: this.setupState.data.tossWinner,
                tossDecision: this.setupState.data.tossDecision,
                battingTeamId: this.setupState.data.battingTeamId,
                bowlingTeamId: this.setupState.data.bowlingTeamId,
                status: 'in_progress',
                currentInnings: 1,
                innings: []
            };

            const matchId = await PPL.storage.saveMatch(match);
            match.id = matchId;

            // Create first innings
            const innings1 = {
                matchId: matchId,
                inningsNumber: 1,
                battingTeamId: this.setupState.data.battingTeamId,
                bowlingTeamId: this.setupState.data.bowlingTeamId,
                battingXI: this.setupState.data.battingXI,
                bowlingXI: this.setupState.data.bowlingXI,
                currentStriker: this.setupState.data.striker,
                currentNonStriker: this.setupState.data.nonStriker,
                currentBowler: this.setupState.data.openingBowler,
                totalRuns: 0,
                totalWickets: 0,
                totalExtras: 0,
                wides: 0,
                noBalls: 0,
                byes: 0,
                legByes: 0,
                completedOvers: 0,
                currentOverBalls: 0,
                legalBalls: 0,
                ballsThisOver: [],
                status: 'in_progress',
                batterStats: {},
                bowlerStats: {},
                fallOfWickets: [],
                partnerships: []
            };

            // Initialize batter stats
            for (const batterId of innings1.battingXI) {
                innings1.batterStats[batterId] = {
                    runs: 0,
                    balls: 0,
                    fours: 0,
                    sixes: 0,
                    dotBalls: 0,
                    dismissal: null,
                    dismissalType: 'not_out',
                    bowlerId: null,
                    fielderId: null
                };
            }

            // Initialize bowler stats
            for (const bowlerId of innings1.bowlingXI) {
                innings1.bowlerStats[bowlerId] = {
                    overs: 0,
                    balls: 0,
                    maidens: 0,
                    runs: 0,
                    wickets: 0,
                    wides: 0,
                    noBalls: 0,
                    dotBalls: 0,
                    currentOverRuns: 0,
                    currentOverBalls: 0
                };
            }

            const inningsId = await PPL.storage.saveInnings(innings1);
            innings1.id = inningsId;

            // Initialize partnership
            currentPartnership = {
                runs: 0,
                balls: 0,
                batter1: this.setupState.data.striker,
                batter2: this.setupState.data.nonStriker,
                wicket: 0
            };

            // Store in memory
            currentMatch = match;
            currentInnings = innings1;

            // Update fixture status
            this.setupState.fixture.status = 'in_progress';
            await PPL.storage.saveFixture(this.setupState.fixture);

            // Show scoring screen
            this.showScoringScreen();

            PPL.showToast('Match started! 🏏', 'success');

        } catch (error) {
            console.error('Failed to start match:', error);
            PPL.showToast('Failed to start match', 'error');
        }
    },

    /**
     * Show and initialize scoring screen
     */
    showScoringScreen: function() {
        // Switch to scoring screen
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById('scoring-screen').classList.add('active');

        // Update all displays
        this.updateScoringDisplay();
    },

    /**
     * Update all scoring display elements
     */
    updateScoringDisplay: async function() {
        if (!currentMatch || !currentInnings) return;

        // Update match title
        const team1 = await PPL.storage.get(PPL.STORES.TEAMS, currentMatch.team1Id);
        const team2 = await PPL.storage.get(PPL.STORES.TEAMS, currentMatch.team2Id);
        document.getElementById('scoring-match-title').textContent =
            `${team1.shortName} vs ${team2.shortName}`;

        // Update innings info
        const battingTeam = await PPL.storage.get(PPL.STORES.TEAMS, currentInnings.battingTeamId);
        let inningsLabel = `${battingTeam.name}`;
        if (currentInnings.isSuperOver) {
            inningsLabel += ` Super Over ${currentMatch.currentInnings === 3 ? 1 : 2}`;
        } else {
            inningsLabel += ` Innings ${currentMatch.currentInnings}`;
        }
        document.getElementById('innings-info').textContent = inningsLabel;

        // Update score display
        const overs = PPL.formatOvers(currentInnings.completedOvers, currentInnings.currentOverBalls);
        const runRate = currentInnings.legalBalls > 0 ?
            (currentInnings.totalRuns / PPL.oversToDecimal(currentInnings.completedOvers, currentInnings.currentOverBalls)).toFixed(2) :
            '0.00';

        document.getElementById('score-display').innerHTML = `
            <div style="font-size: 32px; font-weight: bold;">
                ${currentInnings.totalRuns}/${currentInnings.totalWickets}
            </div>
            <div style="font-size: 16px;">
                (${overs} ov, RR: ${runRate})
            </div>
        `;

        // Update batter info
        await this.updateBatterDisplay();

        // Update bowler info
        await this.updateBowlerDisplay();

        // Update partnership
        document.getElementById('partnership-info').textContent =
            `Partnership: ${currentPartnership.runs} runs (${currentPartnership.balls} balls)`;

        // Update this over
        const thisOver = currentInnings.ballsThisOver.map(d => PPL.getBallSymbol(d)).join(' ');
        document.getElementById('this-over-display').textContent =
            `This Over: ${thisOver || '· · · · · ·'}`;

        // Update target info (2nd innings and Super Over 2)
        const targetInfo = document.getElementById('target-info');
        let showTarget = false;
        let targetHTML = '';

        if (currentMatch.currentInnings === 2 && currentMatch.target) {
            const runsNeeded = currentMatch.target - currentInnings.totalRuns;
            const ballsRemaining = (currentMatch.overs - currentInnings.completedOvers) * 6 - currentInnings.currentOverBalls;
            const requiredRate = ballsRemaining > 0 ? PPL.calculateRequiredRate(runsNeeded, ballsRemaining) : '0.00';

            showTarget = true;
            targetHTML = `
                <strong>Target: ${currentMatch.target}</strong> |
                Need: ${runsNeeded} runs from ${ballsRemaining} balls |
                Required RR: ${requiredRate}
            `;
        } else if (currentMatch.currentInnings === 4 && currentMatch.superOverTarget) {
            // Super Over 2 target
            const runsNeeded = currentMatch.superOverTarget - currentInnings.totalRuns;
            const ballsRemaining = 6 - currentInnings.currentOverBalls;

            showTarget = true;
            targetHTML = `
                <strong>Super Over Target: ${currentMatch.superOverTarget}</strong> |
                Need: ${runsNeeded} runs from ${ballsRemaining} balls
            `;
        }

        if (showTarget) {
            targetInfo.style.display = 'block';
            targetInfo.innerHTML = targetHTML;
        } else {
            targetInfo.style.display = 'none';
        }

        // Check for power ball mode
        this.checkPowerBallMode();

        // Update End Over button visibility
        this.updateEndOverButton();
    },

    /**
     * Update batter display
     */
    updateBatterDisplay: async function() {
        const striker = await PPL.storage.get(PPL.STORES.PLAYERS, currentInnings.currentStriker);
        const nonStriker = await PPL.storage.get(PPL.STORES.PLAYERS, currentInnings.currentNonStriker);

        const strikerStats = currentInnings.batterStats[currentInnings.currentStriker];
        const nonStrikerStats = currentInnings.batterStats[currentInnings.currentNonStriker];

        const strikerSR = PPL.calculateStrikeRate(strikerStats.runs, strikerStats.balls);
        const nonStrikerSR = PPL.calculateStrikeRate(nonStrikerStats.runs, nonStrikerStats.balls);

        document.getElementById('striker-name').textContent = striker.name + ' *';
        document.getElementById('striker-stats').textContent =
            `${strikerStats.runs}(${strikerStats.balls}) SR: ${strikerSR}`;

        document.getElementById('non-striker-name').textContent = nonStriker.name;
        document.getElementById('non-striker-stats').textContent =
            `${nonStrikerStats.runs}(${nonStrikerStats.balls}) SR: ${nonStrikerSR}`;
    },

    /**
     * Update bowler display
     */
    updateBowlerDisplay: async function() {
        const bowler = await PPL.storage.get(PPL.STORES.PLAYERS, currentInnings.currentBowler);
        const bowlerStats = currentInnings.bowlerStats[currentInnings.currentBowler];

        const overs = PPL.formatOvers(Math.floor(bowlerStats.balls / 6), bowlerStats.balls % 6);
        const economy = bowlerStats.balls > 0 ?
            PPL.calculateEconomy(bowlerStats.runs, PPL.oversToDecimal(Math.floor(bowlerStats.balls / 6), bowlerStats.balls % 6)) :
            '0.00';

        document.getElementById('bowler-name').textContent = bowler.name;
        document.getElementById('bowler-stats').textContent =
            `${overs} ov, ${bowlerStats.runs} runs, ${bowlerStats.wickets} wkts, Econ: ${economy}`;
    },

    /**
     * Check if power ball mode should be activated
     */
    checkPowerBallMode: function() {
        const scoringScreen = document.getElementById('scoring-screen');

        // Power ball = 6th legal ball (when currentOverBalls === 5 and next ball will be 6th)
        if (currentInnings.currentOverBalls === 5 && currentMatch.overs > 0) {
            const tournament = this.setupState?.tournament || { enablePowerBall: false };
            if (tournament.enablePowerBall) {
                scoringScreen.classList.add('powerball-mode');
                document.querySelector('.scoring-header h2').innerHTML = '🔥 POWER BALL 🔥';
                return;
            }
        }

        scoringScreen.classList.remove('powerball-mode');
        const team1 = currentMatch.team1Id;
        document.querySelector('.scoring-header h2').textContent = 'Match Scoring';
    },

    /**
     * Update End Over button visibility
     */
    updateEndOverButton: function() {
        const endOverBtn = document.getElementById('end-over-btn');

        // Show only when 6 legal balls bowled
        if (currentInnings.currentOverBalls === 6) {
            endOverBtn.style.display = 'block';
        } else {
            endOverBtn.style.display = 'none';
        }
    },

    /**
     * Show live scorecard view
     */
    showLiveScorecard: async function() {
        const content = `
            <div class="form-container" style="max-height: 80vh; overflow-y: auto;">
                <h3>Live Scorecard</h3>
                <div id="scorecard-content"></div>
            </div>
        `;

        PPL.showModal(content);

        // Build scorecard
        const team1 = await PPL.storage.get(PPL.STORES.TEAMS, currentMatch.team1Id);
        const team2 = await PPL.storage.get(PPL.STORES.TEAMS, currentMatch.team2Id);
        const battingTeam = await PPL.storage.get(PPL.STORES.TEAMS, currentInnings.battingTeamId);

        let scorecardHTML = `
            <div style="background: var(--surface); padding: var(--spacing-md); border-radius: 8px; margin-bottom: var(--spacing-md);">
                <h4>${battingTeam.name}</h4>
                <p style="font-size: 24px; font-weight: bold; margin: var(--spacing-sm) 0;">
                    ${currentInnings.totalRuns}/${currentInnings.totalWickets}
                    <span style="font-size: 16px; font-weight: normal;">
                        (${PPL.formatOvers(currentInnings.completedOvers, currentInnings.currentOverBalls)} overs)
                    </span>
                </p>

                <h5>Fall of Wickets:</h5>
                <p style="font-size: 12px;">
        `;

        if (currentInnings.fallOfWickets.length === 0) {
            scorecardHTML += 'None';
        } else {
            scorecardHTML += currentInnings.fallOfWickets
                .map(w => `${w.batterName} (${w.runs}/${w.wicketNumber}) in ${w.over} ov`)
                .join(' | ');
        }

        scorecardHTML += `
                </p>

                <h5 style="margin-top: var(--spacing-md);">Batting Order:</h5>
                <table style="width: 100%; font-size: 13px;">
                    <thead>
                        <tr style="background: rgba(0,0,0,0.05);">
                            <th style="text-align: left; padding: 4px;">Batter</th>
                            <th style="text-align: center; padding: 4px;">R</th>
                            <th style="text-align: center; padding: 4px;">B</th>
                            <th style="text-align: center; padding: 4px;">4s</th>
                            <th style="text-align: center; padding: 4px;">SR</th>
                            <th style="text-align: left; padding: 4px;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        for (const batterId of currentInnings.battingXI) {
            const stats = currentInnings.batterStats[batterId];
            const player = await PPL.storage.get(PPL.STORES.PLAYERS, batterId);
            const sr = PPL.calculateStrikeRate(stats.runs, stats.balls);
            const isCurrent = batterId === currentInnings.currentStriker ? ' *' : '';
            let status = stats.dismissal ? stats.dismissalType.toUpperCase() : 'not out';

            scorecardHTML += `
                        <tr>
                            <td style="text-align: left; padding: 4px;">${player.name}${isCurrent}</td>
                            <td style="text-align: center; padding: 4px;">${stats.runs}</td>
                            <td style="text-align: center; padding: 4px;">${stats.balls}</td>
                            <td style="text-align: center; padding: 4px;">${stats.fours}</td>
                            <td style="text-align: center; padding: 4px;">${sr}</td>
                            <td style="text-align: left; padding: 4px; font-size: 11px;">${status}</td>
                        </tr>
            `;
        }

        scorecardHTML += `
                    </tbody>
                </table>

                <h5 style="margin-top: var(--spacing-md);">Bowling:</h5>
                <table style="width: 100%; font-size: 13px;">
                    <thead>
                        <tr style="background: rgba(0,0,0,0.05);">
                            <th style="text-align: left; padding: 4px;">Bowler</th>
                            <th style="text-align: center; padding: 4px;">O</th>
                            <th style="text-align: center; padding: 4px;">R</th>
                            <th style="text-align: center; padding: 4px;">W</th>
                            <th style="text-align: center; padding: 4px;">Econ</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        for (const bowlerId of currentInnings.bowlingXI) {
            const stats = currentInnings.bowlerStats[bowlerId];
            if (stats.balls === 0) continue;

            const player = await PPL.storage.get(PPL.STORES.PLAYERS, bowlerId);
            const overs = PPL.formatOvers(Math.floor(stats.balls / 6), stats.balls % 6);
            const econ = stats.balls > 0 ? PPL.calculateEconomy(stats.runs, PPL.oversToDecimal(Math.floor(stats.balls / 6), stats.balls % 6)) : '0.00';
            const isCurrent = bowlerId === currentInnings.currentBowler ? ' *' : '';

            scorecardHTML += `
                        <tr>
                            <td style="text-align: left; padding: 4px;">${player.name}${isCurrent}</td>
                            <td style="text-align: center; padding: 4px;">${overs}</td>
                            <td style="text-align: center; padding: 4px;">${stats.runs}</td>
                            <td style="text-align: center; padding: 4px;">${stats.wickets}</td>
                            <td style="text-align: center; padding: 4px;">${econ}</td>
                        </tr>
            `;
        }

        scorecardHTML += `
                    </tbody>
                </table>
            </div>
        `;

        document.getElementById('scorecard-content').innerHTML = scorecardHTML;
    },

    /**
     * Show ball-by-ball commentary
     */
    showBallByBall: async function() {
        const content = `
            <div class="form-container" style="max-height: 80vh; overflow-y: auto;">
                <h3>Ball-by-Ball Commentary</h3>
                <div id="commentary-content"></div>
            </div>
        `;

        PPL.showModal(content);

        let commentaryHTML = '<div style="font-size: 13px;">';

        if (currentInnings.ballsThisOver.length === 0) {
            commentaryHTML += '<p>No balls bowled yet.</p>';
        } else {
            // Display balls from this over
            for (let i = 0; i < currentInnings.ballsThisOver.length; i++) {
                const delivery = currentInnings.ballsThisOver[i];
                const ballNumber = i + 1;
                const strikerName = (await PPL.storage.get(PPL.STORES.PLAYERS, delivery.strikerId)).name;
                const bowlerName = (await PPL.storage.get(PPL.STORES.PLAYERS, delivery.bowlerId)).name;

                let commentary = `<strong>Ball ${ballNumber}:</strong> ${bowlerName} to ${strikerName}`;

                if (delivery.isWicket) {
                    commentary += ` - WICKET! ${delivery.dismissalType.toUpperCase()}`;
                } else if (delivery.isWide) {
                    commentary += ` - WIDE (${delivery.runs} runs)`;
                } else if (delivery.isNoBall) {
                    commentary += ` - NO BALL (${delivery.runs} runs)`;
                } else if (delivery.runs > 0) {
                    if (delivery.runs === 4) {
                        commentary += ` - FOUR!`;
                    } else if (delivery.runs === 6) {
                        commentary += ` - SIX!`;
                    } else {
                        commentary += ` - ${delivery.runs} runs`;
                    }
                } else if (delivery.isBye) {
                    commentary += ` - BYE`;
                } else if (delivery.isLegBye) {
                    commentary += ` - LEG BYE`;
                } else {
                    commentary += ` - DOT BALL`;
                }

                commentaryHTML += `<p style="margin: var(--spacing-sm) 0; padding: var(--spacing-sm); background: rgba(0,0,0,0.03); border-radius: 4px;">${commentary}</p>`;
            }
        }

        commentaryHTML += '</div>';

        document.getElementById('commentary-content').innerHTML = commentaryHTML;
    },

    /**
     * BALL PROCESSING ENGINE
     * Core cricket rules and delivery processing
     */

    /**
     * Process a run (0-4)
     */
    processRun: async function(runs) {
        if (!currentMatch || !currentInnings) {
            PPL.showToast('No active match', 'error');
            return;
        }

        // Check if power ball
        const isPowerBall = currentInnings.currentOverBalls === 5 &&
                           this.setupState.tournament.enablePowerBall;

        let actualRuns = runs;
        if (isPowerBall && runs > 0) {
            actualRuns = runs * 2; // 2x multiplier
        }

        // Create delivery record
        const delivery = {
            matchId: currentMatch.id,
            inningsNumber: currentMatch.currentInnings,
            overNumber: currentInnings.completedOvers,
            ballNumber: currentInnings.currentOverBalls,
            bowlerId: currentInnings.currentBowler,
            strikerId: currentInnings.currentStriker,
            nonStrikerId: currentInnings.currentNonStriker,
            runs: actualRuns,
            batterRuns: actualRuns,
            extras: 0,
            isWide: false,
            isNoBall: false,
            isBye: false,
            isLegBye: false,
            isWicket: false,
            isPowerBall: isPowerBall,
            dismissalType: null,
            fielderId: null,
            timestamp: Date.now()
        };

        // Save delivery
        await PPL.storage.saveDelivery(delivery);

        // Update innings stats
        currentInnings.totalRuns += actualRuns;
        currentInnings.legalBalls++;
        currentInnings.currentOverBalls++;

        // Update batter stats
        const batterStats = currentInnings.batterStats[currentInnings.currentStriker];
        batterStats.runs += actualRuns;
        batterStats.balls++;

        if (runs === 4) batterStats.fours++;
        if (runs === 0) batterStats.dotBalls++;

        // Update bowler stats
        const bowlerStats = currentInnings.bowlerStats[currentInnings.currentBowler];
        bowlerStats.runs += actualRuns;
        bowlerStats.balls++;
        bowlerStats.currentOverRuns += actualRuns;
        bowlerStats.currentOverBalls++;

        if (runs === 0) bowlerStats.dotBalls++;

        // Update partnership
        currentPartnership.runs += actualRuns;
        currentPartnership.balls++;

        // Add to this over
        currentInnings.ballsThisOver.push(delivery);

        // Striker rotation (odd runs = swap)
        if (runs % 2 === 1) {
            this.swapBatters();
        }

        // Save innings
        await PPL.storage.saveInnings(currentInnings);

        // Update display
        await this.updateScoringDisplay();

        // Check innings end
        await this.checkInningsEnd();
    },

    /**
     * Process wide ball
     */
    processWide: async function() {
        // Show popup for additional runs
        const content = `
            <div class="form-container">
                <h3>Wide Ball</h3>
                <div class="form-group">
                    <label>Additional runs (off the wide)</label>
                    <input type="number" id="wide-additional" value="0" min="0" max="4">
                    <small>Total runs = 1 (wide) + additional runs</small>
                </div>
                <div class="form-actions">
                    <button class="btn btn-primary" onclick="PPL.scoring.confirmWide()">Confirm</button>
                    <button class="btn btn-secondary" onclick="PPL.hideModal()">Cancel</button>
                </div>
            </div>
        `;

        PPL.showModal(content);
    },

    /**
     * Confirm wide with additional runs
     */
    confirmWide: async function() {
        const additional = parseInt(document.getElementById('wide-additional').value) || 0;
        const totalRuns = 1 + additional; // Base wide + additional

        const delivery = {
            matchId: currentMatch.id,
            inningsNumber: currentMatch.currentInnings,
            overNumber: currentInnings.completedOvers,
            ballNumber: currentInnings.currentOverBalls,
            bowlerId: currentInnings.currentBowler,
            strikerId: currentInnings.currentStriker,
            nonStrikerId: currentInnings.currentNonStriker,
            runs: totalRuns,
            batterRuns: 0, // No runs to batter
            extras: totalRuns,
            isWide: true,
            isNoBall: false,
            isBye: false,
            isLegBye: false,
            isWicket: false,
            isPowerBall: false,
            dismissalType: null,
            fielderId: null,
            timestamp: Date.now()
        };

        await PPL.storage.saveDelivery(delivery);

        // Update innings (NOT a legal ball)
        currentInnings.totalRuns += totalRuns;
        currentInnings.totalExtras += totalRuns;
        currentInnings.wides += totalRuns;

        // Update bowler stats
        const bowlerStats = currentInnings.bowlerStats[currentInnings.currentBowler];
        bowlerStats.runs += totalRuns;
        bowlerStats.wides += totalRuns;

        // Update partnership
        currentPartnership.runs += totalRuns;
        currentPartnership.balls++; // Count for partnership

        // Add to this over
        currentInnings.ballsThisOver.push(delivery);

        // NO striker rotation on wide

        await PPL.storage.saveInnings(currentInnings);

        PPL.hideModal();
        await this.updateScoringDisplay();
        await this.checkInningsEnd();
    },

    /**
     * Process no-ball
     */
    processNoBall: async function() {
        // Show popup for runs off the no-ball
        const content = `
            <div class="form-container">
                <h3>No Ball</h3>
                <div class="form-group">
                    <label>Runs scored off the no-ball</label>
                    <input type="number" id="noball-runs" value="0" min="0" max="4">
                    <small>Runs are credited to batter. No free hit in box cricket.</small>
                </div>
                <div class="form-actions">
                    <button class="btn btn-primary" onclick="PPL.scoring.confirmNoBall()">Confirm</button>
                    <button class="btn btn-secondary" onclick="PPL.hideModal()">Cancel</button>
                </div>
            </div>
        `;

        PPL.showModal(content);
    },

    /**
     * Confirm no-ball
     */
    confirmNoBall: async function() {
        const batterRuns = parseInt(document.getElementById('noball-runs').value) || 0;
        const totalRuns = 1 + batterRuns; // Base no-ball + batter runs

        const delivery = {
            matchId: currentMatch.id,
            inningsNumber: currentMatch.currentInnings,
            overNumber: currentInnings.completedOvers,
            ballNumber: currentInnings.currentOverBalls,
            bowlerId: currentInnings.currentBowler,
            strikerId: currentInnings.currentStriker,
            nonStrikerId: currentInnings.currentNonStriker,
            runs: totalRuns,
            batterRuns: batterRuns,
            extras: 1, // Only the no-ball is extra
            isWide: false,
            isNoBall: true,
            isBye: false,
            isLegBye: false,
            isWicket: false,
            isPowerBall: false,
            dismissalType: null,
            fielderId: null,
            timestamp: Date.now()
        };

        await PPL.storage.saveDelivery(delivery);

        // Update innings (NOT a legal ball)
        currentInnings.totalRuns += totalRuns;
        currentInnings.totalExtras += 1;
        currentInnings.noBalls += 1;

        // Update batter stats (runs are credited)
        const batterStats = currentInnings.batterStats[currentInnings.currentStriker];
        batterStats.runs += batterRuns;
        // NO ball added to batter's balls faced

        // Update bowler stats
        const bowlerStats = currentInnings.bowlerStats[currentInnings.currentBowler];
        bowlerStats.runs += totalRuns;
        bowlerStats.noBalls += 1;

        // Update partnership
        currentPartnership.runs += totalRuns;
        currentPartnership.balls++;

        // Add to this over
        currentInnings.ballsThisOver.push(delivery);

        // Striker rotation based on batter runs
        if (batterRuns % 2 === 1) {
            this.swapBatters();
        }

        await PPL.storage.saveInnings(currentInnings);

        PPL.hideModal();
        await this.updateScoringDisplay();
        await this.checkInningsEnd();
    },

    /**
     * Process bye
     */
    processBye: async function() {
        const content = `
            <div class="form-container">
                <h3>Bye</h3>
                <div class="form-group">
                    <label>Bye runs</label>
                    <input type="number" id="bye-runs" value="1" min="0" max="4">
                    <small>Runs credited to extras, not batter</small>
                </div>
                <div class="form-actions">
                    <button class="btn btn-primary" onclick="PPL.scoring.confirmBye()">Confirm</button>
                    <button class="btn btn-secondary" onclick="PPL.hideModal()">Cancel</button>
                </div>
            </div>
        `;

        PPL.showModal(content);
    },

    /**
     * Confirm bye
     */
    confirmBye: async function() {
        const runs = parseInt(document.getElementById('bye-runs').value) || 0;

        const delivery = {
            matchId: currentMatch.id,
            inningsNumber: currentMatch.currentInnings,
            overNumber: currentInnings.completedOvers,
            ballNumber: currentInnings.currentOverBalls,
            bowlerId: currentInnings.currentBowler,
            strikerId: currentInnings.currentStriker,
            nonStrikerId: currentInnings.currentNonStriker,
            runs: runs,
            batterRuns: 0,
            extras: runs,
            isWide: false,
            isNoBall: false,
            isBye: true,
            isLegBye: false,
            isWicket: false,
            isPowerBall: false,
            dismissalType: null,
            fielderId: null,
            timestamp: Date.now()
        };

        await PPL.storage.saveDelivery(delivery);

        // Update innings (IS a legal ball)
        currentInnings.totalRuns += runs;
        currentInnings.totalExtras += runs;
        currentInnings.byes += runs;
        currentInnings.legalBalls++;
        currentInnings.currentOverBalls++;

        // Update batter stats (ball faced but no runs)
        const batterStats = currentInnings.batterStats[currentInnings.currentStriker];
        batterStats.balls++;
        if (runs === 0) batterStats.dotBalls++;

        // Update bowler stats (no runs conceded)
        const bowlerStats = currentInnings.bowlerStats[currentInnings.currentBowler];
        bowlerStats.balls++;
        bowlerStats.currentOverBalls++;
        if (runs === 0) bowlerStats.dotBalls++;

        // Update partnership
        currentPartnership.runs += runs;
        currentPartnership.balls++;

        // Add to this over
        currentInnings.ballsThisOver.push(delivery);

        // Striker rotation (odd runs = swap)
        if (runs % 2 === 1) {
            this.swapBatters();
        }

        await PPL.storage.saveInnings(currentInnings);

        PPL.hideModal();
        await this.updateScoringDisplay();
        await this.checkInningsEnd();
    },

    /**
     * Process leg bye
     */
    processLegBye: async function() {
        const content = `
            <div class="form-container">
                <h3>Leg Bye</h3>
                <div class="form-group">
                    <label>Leg bye runs</label>
                    <input type="number" id="legbye-runs" value="1" min="0" max="4">
                    <small>Runs credited to extras, not batter</small>
                </div>
                <div class="form-actions">
                    <button class="btn btn-primary" onclick="PPL.scoring.confirmLegBye()">Confirm</button>
                    <button class="btn btn-secondary" onclick="PPL.hideModal()">Cancel</button>
                </div>
            </div>
        `;

        PPL.showModal(content);
    },

    /**
     * Confirm leg bye
     */
    confirmLegBye: async function() {
        const runs = parseInt(document.getElementById('legbye-runs').value) || 0;

        const delivery = {
            matchId: currentMatch.id,
            inningsNumber: currentMatch.currentInnings,
            overNumber: currentInnings.completedOvers,
            ballNumber: currentInnings.currentOverBalls,
            bowlerId: currentInnings.currentBowler,
            strikerId: currentInnings.currentStriker,
            nonStrikerId: currentInnings.currentNonStriker,
            runs: runs,
            batterRuns: 0,
            extras: runs,
            isWide: false,
            isNoBall: false,
            isBye: false,
            isLegBye: true,
            isWicket: false,
            isPowerBall: false,
            dismissalType: null,
            fielderId: null,
            timestamp: Date.now()
        };

        await PPL.storage.saveDelivery(delivery);

        // Update innings (IS a legal ball)
        currentInnings.totalRuns += runs;
        currentInnings.totalExtras += runs;
        currentInnings.legByes += runs;
        currentInnings.legalBalls++;
        currentInnings.currentOverBalls++;

        // Update batter stats
        const batterStats = currentInnings.batterStats[currentInnings.currentStriker];
        batterStats.balls++;
        if (runs === 0) batterStats.dotBalls++;

        // Update bowler stats
        const bowlerStats = currentInnings.bowlerStats[currentInnings.currentBowler];
        bowlerStats.balls++;
        bowlerStats.currentOverBalls++;
        if (runs === 0) bowlerStats.dotBalls++;

        // Update partnership
        currentPartnership.runs += runs;
        currentPartnership.balls++;

        // Add to this over
        currentInnings.ballsThisOver.push(delivery);

        // Striker rotation
        if (runs % 2 === 1) {
            this.swapBatters();
        }

        await PPL.storage.saveInnings(currentInnings);

        PPL.hideModal();
        await this.updateScoringDisplay();
        await this.checkInningsEnd();
    },

    /**
     * Swap striker and non-striker
     */
    swapBatters: function() {
        const temp = currentInnings.currentStriker;
        currentInnings.currentStriker = currentInnings.currentNonStriker;
        currentInnings.currentNonStriker = temp;
    },

    /**
     * Check if innings should end
     */
    checkInningsEnd: async function() {
        let inningsEnded = false;
        let reason = '';

        // Super Over specific checks
        if (currentInnings.isSuperOver) {
            // All out in Super Over (only 2 batters available, but all 10 wickets rule still applies)
            if (currentInnings.totalWickets >= 10) {
                inningsEnded = true;
                reason = 'all_out';
            }

            // Super Over complete (1 over = 6 legal balls)
            if (currentInnings.completedOvers >= 1 && currentInnings.currentOverBalls === 6) {
                inningsEnded = true;
                reason = 'super_over_complete';
            }

            // Super Over 2: Target reached
            if (currentMatch.currentInnings === 4 && currentMatch.superOverTarget) {
                if (currentInnings.totalRuns >= currentMatch.superOverTarget) {
                    inningsEnded = true;
                    reason = 'target_reached';
                }
            }
        } else {
            // Normal match checks
            // All out (10 wickets)
            if (currentInnings.totalWickets >= 10) {
                inningsEnded = true;
                reason = 'all_out';
            }

            // Overs completed
            if (currentInnings.completedOvers >= currentMatch.overs && currentInnings.currentOverBalls === 6) {
                inningsEnded = true;
                reason = 'overs_complete';
            }

            // 2nd innings: Target reached
            if (currentMatch.currentInnings === 2 && currentMatch.target) {
                if (currentInnings.totalRuns >= currentMatch.target) {
                    inningsEnded = true;
                    reason = 'target_reached';
                }
            }
        }

        if (inningsEnded) {
            await this.endInnings(reason);
        }
    },

    /**
     * End current innings
     */
    endInnings: async function(reason) {
        currentInnings.status = 'completed';
        currentInnings.endReason = reason;
        await PPL.storage.saveInnings(currentInnings);

        if (currentMatch.currentInnings === 1) {
            // Setup 2nd innings
            await this.setup2ndInnings();
        } else if (currentMatch.currentInnings === 2) {
            // Check if match is tied
            const allInnings = await PPL.storage.getInningsByMatch(currentMatch.id);
            const innings1 = allInnings.find(i => i.inningsNumber === 1);
            const innings2 = allInnings.find(i => i.inningsNumber === 2);

            if (innings2.totalRuns === innings1.totalRuns) {
                // Match is tied - setup Super Over
                await this.setupSuperOver();
            } else {
                // Normal match completion
                await this.completeMatch();
            }
        } else if (currentMatch.currentInnings === 3) {
            // Super Over 1 complete - setup Super Over 2
            await this.setup2ndSuperOver();
        } else {
            // Super Over 2 complete - determine winner
            await this.completeMatch();
        }
    },

    /**
     * Setup 2nd innings
     */
    setup2ndInnings: async function() {
        // Get 1st innings total
        const innings1 = currentInnings;
        const target = innings1.totalRuns + 1;

        // Show innings break dialog
        const content = `
            <div class="form-container">
                <h3>Innings Break</h3>
                <p><strong>1st Innings Complete</strong></p>
                <p>Score: ${innings1.totalRuns}/${innings1.totalWickets} (${innings1.completedOvers}.${innings1.currentOverBalls === 6 ? 0 : innings1.currentOverBalls} ov)</p>
                <p><strong>Target: ${target} runs</strong></p>
                <div class="form-actions">
                    <button class="btn btn-primary" onclick="PPL.scoring.start2ndInnings()">Start 2nd Innings</button>
                </div>
            </div>
        `;

        PPL.showModal(content);

        // Store target in match
        currentMatch.target = target;
        currentMatch.innings1Total = innings1.totalRuns;
        currentMatch.innings1Wickets = innings1.totalWickets;
        currentMatch.innings1Overs = PPL.oversToDecimal(innings1.completedOvers, innings1.currentOverBalls === 6 ? 0 : innings1.currentOverBalls);
        await PPL.storage.saveMatch(currentMatch);
    },

    /**
     * Start 2nd innings
     */
    start2ndInnings: async function() {
        PPL.hideModal();

        // Swap batting and bowling teams
        const battingTeamId = this.setupState.data.bowlingTeamId;
        const bowlingTeamId = this.setupState.data.battingTeamId;
        const battingXI = this.setupState.data.bowlingXI;
        const bowlingXI = this.setupState.data.battingXI;

        // Show opening batters selection
        const content = `
            <div class="form-container">
                <h3>2nd Innings - Opening Batters</h3>
                <div class="form-group">
                    <label>Striker (on strike)</label>
                    <select id="innings2-striker">
                        <option value="">Select batter</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Non-Striker</label>
                    <select id="innings2-non-striker">
                        <option value="">Select batter</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Opening Bowler</label>
                    <select id="innings2-bowler">
                        <option value="">Select bowler</option>
                    </select>
                </div>
                <div class="form-actions">
                    <button class="btn btn-primary" onclick="PPL.scoring.confirmInnings2Start()">Start Innings</button>
                </div>
            </div>
        `;

        PPL.showModal(content);

        // Populate batters
        const strikerSelect = document.getElementById('innings2-striker');
        const nonStrikerSelect = document.getElementById('innings2-non-striker');
        for (const playerId of battingXI) {
            const player = await PPL.storage.get(PPL.STORES.PLAYERS, playerId);
            const option1 = document.createElement('option');
            option1.value = player.id;
            option1.textContent = player.name;
            strikerSelect.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = player.id;
            option2.textContent = player.name;
            nonStrikerSelect.appendChild(option2);
        }

        // Populate bowlers
        const bowlerSelect = document.getElementById('innings2-bowler');
        for (const playerId of bowlingXI) {
            const player = await PPL.storage.get(PPL.STORES.PLAYERS, playerId);
            const option = document.createElement('option');
            option.value = player.id;
            option.textContent = player.name;
            bowlerSelect.appendChild(option);
        }
    },

    /**
     * Confirm and start 2nd innings
     */
    confirmInnings2Start: async function() {
        const striker = parseInt(document.getElementById('innings2-striker').value);
        const nonStriker = parseInt(document.getElementById('innings2-non-striker').value);
        const bowler = parseInt(document.getElementById('innings2-bowler').value);

        if (!striker || !nonStriker || !bowler) {
            PPL.showToast('Please select all positions', 'error');
            return;
        }

        if (striker === nonStriker) {
            PPL.showToast('Batters must be different', 'error');
            return;
        }

        PPL.hideModal();

        // Create 2nd innings
        const innings2 = {
            matchId: currentMatch.id,
            inningsNumber: 2,
            battingTeamId: this.setupState.data.bowlingTeamId,
            bowlingTeamId: this.setupState.data.battingTeamId,
            battingXI: this.setupState.data.bowlingXI,
            bowlingXI: this.setupState.data.battingXI,
            currentStriker: striker,
            currentNonStriker: nonStriker,
            currentBowler: bowler,
            totalRuns: 0,
            totalWickets: 0,
            totalExtras: 0,
            wides: 0,
            noBalls: 0,
            byes: 0,
            legByes: 0,
            completedOvers: 0,
            currentOverBalls: 0,
            legalBalls: 0,
            ballsThisOver: [],
            status: 'in_progress',
            batterStats: {},
            bowlerStats: {},
            fallOfWickets: [],
            partnerships: []
        };

        // Initialize batter stats
        for (const batterId of innings2.battingXI) {
            innings2.batterStats[batterId] = {
                runs: 0,
                balls: 0,
                fours: 0,
                sixes: 0,
                dotBalls: 0,
                dismissal: null,
                dismissalType: 'not_out',
                bowlerId: null,
                fielderId: null
            };
        }

        // Initialize bowler stats
        for (const bowlerId of innings2.bowlingXI) {
            innings2.bowlerStats[bowlerId] = {
                overs: 0,
                balls: 0,
                maidens: 0,
                runs: 0,
                wickets: 0,
                wides: 0,
                noBalls: 0,
                dotBalls: 0,
                currentOverRuns: 0,
                currentOverBalls: 0
            };
        }

        const inningsId = await PPL.storage.saveInnings(innings2);
        innings2.id = inningsId;

        // Update match
        currentMatch.currentInnings = 2;
        await PPL.storage.saveMatch(currentMatch);

        // Initialize partnership
        currentPartnership = {
            runs: 0,
            balls: 0,
            batter1: striker,
            batter2: nonStriker,
            wicket: 0
        };

        // Update memory
        currentInnings = innings2;

        // Update display
        await this.updateScoringDisplay();

        PPL.showToast('2nd innings started! 🏏', 'success');
    },

    /**
     * Setup Super Over (Tiebreaker)
     */
    setupSuperOver: async function() {
        // Get tied scores
        const allInnings = await PPL.storage.getInningsByMatch(currentMatch.id);
        const innings1 = allInnings.find(i => i.inningsNumber === 1);
        const innings2 = allInnings.find(i => i.inningsNumber === 2);

        const team1 = await PPL.storage.get(PPL.STORES.TEAMS, currentMatch.team1Id);
        const team2 = await PPL.storage.get(PPL.STORES.TEAMS, currentMatch.team2Id);

        // Show Super Over announcement
        const content = `
            <div class="form-container">
                <h3 style="text-align: center; color: var(--accent-color);">🏏 SUPER OVER! 🏏</h3>
                <div style="background: var(--surface); padding: var(--spacing-lg); border-radius: 8px; margin: var(--spacing-md) 0;">
                    <p style="text-align: center; font-size: 18px; font-weight: bold; margin-bottom: var(--spacing-md);">
                        Match Tied at ${innings1.totalRuns} runs!
                    </p>
                    <p style="text-align: center; margin-bottom: var(--spacing-md);">
                        ${team1.name}: ${innings1.totalRuns}/${innings1.totalWickets}<br>
                        ${team2.name}: ${innings2.totalRuns}/${innings2.totalWickets}
                    </p>
                    <div style="background: rgba(255, 215, 0, 0.1); padding: var(--spacing-md); border-radius: 8px; border-left: 4px solid var(--accent-color);">
                        <h4>Super Over Rules:</h4>
                        <ul style="margin: var(--spacing-sm) 0; padding-left: var(--spacing-lg);">
                            <li>Each team gets 1 over (6 legal balls)</li>
                            <li>Select 2 batters + 1 bowler per team</li>
                            <li>${team2.name} bats first (chasing team)</li>
                            <li>Highest score wins</li>
                            <li>All dismissal rules apply</li>
                        </ul>
                    </div>
                </div>
                <div class="form-actions">
                    <button class="btn btn-primary" onclick="PPL.scoring.startSuperOver1()">Setup Super Over</button>
                </div>
            </div>
        `;

        PPL.showModal(content);
    },

    /**
     * Start Super Over 1 (team that batted 2nd goes first)
     */
    startSuperOver1: async function() {
        PPL.hideModal();

        // Team that batted 2nd in normal match bats first in Super Over
        const battingTeamId = this.setupState.data.bowlingTeamId; // Team 2
        const bowlingTeamId = this.setupState.data.battingTeamId; // Team 1
        const battingXI = this.setupState.data.bowlingXI;
        const bowlingXI = this.setupState.data.battingXI;

        const battingTeam = await PPL.storage.get(PPL.STORES.TEAMS, battingTeamId);
        const bowlingTeam = await PPL.storage.get(PPL.STORES.TEAMS, bowlingTeamId);

        // Show player selection for Super Over
        const content = `
            <div class="form-container">
                <h3>Super Over 1 - ${battingTeam.name}</h3>
                <p style="background: rgba(255, 215, 0, 0.1); padding: var(--spacing-sm); border-radius: 4px; margin-bottom: var(--spacing-md);">
                    Select 2 batters and 1 bowler (from ${bowlingTeam.name})
                </p>
                <div class="form-group">
                    <label>Striker (on strike)</label>
                    <select id="so1-striker">
                        <option value="">Select batter</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Non-Striker</label>
                    <select id="so1-non-striker">
                        <option value="">Select batter</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Bowler (${bowlingTeam.name})</label>
                    <select id="so1-bowler">
                        <option value="">Select bowler</option>
                    </select>
                </div>
                <div class="form-actions">
                    <button class="btn btn-primary" onclick="PPL.scoring.confirmSuperOver1Start()">Start Super Over 1</button>
                </div>
            </div>
        `;

        PPL.showModal(content);

        // Populate batters
        const strikerSelect = document.getElementById('so1-striker');
        const nonStrikerSelect = document.getElementById('so1-non-striker');
        for (const playerId of battingXI) {
            const player = await PPL.storage.get(PPL.STORES.PLAYERS, playerId);
            const option1 = document.createElement('option');
            option1.value = player.id;
            option1.textContent = player.name;
            strikerSelect.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = player.id;
            option2.textContent = player.name;
            nonStrikerSelect.appendChild(option2);
        }

        // Populate bowlers
        const bowlerSelect = document.getElementById('so1-bowler');
        for (const playerId of bowlingXI) {
            const player = await PPL.storage.get(PPL.STORES.PLAYERS, playerId);
            const option = document.createElement('option');
            option.value = player.id;
            option.textContent = player.name;
            bowlerSelect.appendChild(option);
        }
    },

    /**
     * Confirm and start Super Over 1
     */
    confirmSuperOver1Start: async function() {
        const striker = parseInt(document.getElementById('so1-striker').value);
        const nonStriker = parseInt(document.getElementById('so1-non-striker').value);
        const bowler = parseInt(document.getElementById('so1-bowler').value);

        if (!striker || !nonStriker || !bowler) {
            PPL.showToast('Please select all positions', 'error');
            return;
        }

        if (striker === nonStriker) {
            PPL.showToast('Batters must be different', 'error');
            return;
        }

        PPL.hideModal();

        // Create Super Over 1 innings (innings 3)
        const superOver1 = {
            matchId: currentMatch.id,
            inningsNumber: 3,
            battingTeamId: this.setupState.data.bowlingTeamId,
            bowlingTeamId: this.setupState.data.battingTeamId,
            battingXI: this.setupState.data.bowlingXI,
            bowlingXI: this.setupState.data.battingXI,
            currentStriker: striker,
            currentNonStriker: nonStriker,
            currentBowler: bowler,
            totalRuns: 0,
            totalWickets: 0,
            totalExtras: 0,
            wides: 0,
            noBalls: 0,
            byes: 0,
            legByes: 0,
            completedOvers: 0,
            currentOverBalls: 0,
            legalBalls: 0,
            ballsThisOver: [],
            status: 'in_progress',
            batterStats: {},
            bowlerStats: {},
            fallOfWickets: [],
            partnerships: [],
            isSuperOver: true
        };

        // Initialize batter stats (only for selected batters)
        for (const batterId of [striker, nonStriker]) {
            superOver1.batterStats[batterId] = {
                runs: 0,
                balls: 0,
                fours: 0,
                sixes: 0,
                dotBalls: 0,
                dismissal: null,
                dismissalType: 'not_out',
                bowlerId: null,
                fielderId: null
            };
        }

        // Initialize bowler stats (only for selected bowler)
        superOver1.bowlerStats[bowler] = {
            overs: 0,
            balls: 0,
            maidens: 0,
            runs: 0,
            wickets: 0,
            wides: 0,
            noBalls: 0,
            dotBalls: 0,
            currentOverRuns: 0,
            currentOverBalls: 0
        };

        const inningsId = await PPL.storage.saveInnings(superOver1);
        superOver1.id = inningsId;

        // Update match
        currentMatch.currentInnings = 3;
        currentMatch.isSuperOver = true;
        await PPL.storage.saveMatch(currentMatch);

        // Initialize partnership
        currentPartnership = {
            runs: 0,
            balls: 0,
            batter1: striker,
            batter2: nonStriker,
            wicket: 0
        };

        // Update memory
        currentInnings = superOver1;

        // Update display
        await this.updateScoringDisplay();

        PPL.showToast('Super Over 1 started! 🔥', 'success');
    },

    /**
     * Setup Super Over 2 (team that batted 1st goes second)
     */
    setup2ndSuperOver: async function() {
        // Get Super Over 1 total
        const superOver1 = currentInnings;
        const target = superOver1.totalRuns + 1;

        const battingTeam = await PPL.storage.get(PPL.STORES.TEAMS, this.setupState.data.battingTeamId);
        const bowlingTeam = await PPL.storage.get(PPL.STORES.TEAMS, this.setupState.data.bowlingTeamId);

        // Show Super Over break dialog
        const content = `
            <div class="form-container">
                <h3>Super Over Break</h3>
                <p><strong>Super Over 1 Complete</strong></p>
                <p>${bowlingTeam.name} scored: ${superOver1.totalRuns}/${superOver1.totalWickets}</p>
                <p style="background: rgba(255, 215, 0, 0.1); padding: var(--spacing-md); border-radius: 4px; margin: var(--spacing-md) 0;">
                    <strong>${battingTeam.name} needs ${target} runs to win</strong>
                </p>
                <div class="form-actions">
                    <button class="btn btn-primary" onclick="PPL.scoring.startSuperOver2()">Setup Super Over 2</button>
                </div>
            </div>
        `;

        PPL.showModal(content);

        // Store target
        currentMatch.superOverTarget = target;
        await PPL.storage.saveMatch(currentMatch);
    },

    /**
     * Start Super Over 2
     */
    startSuperOver2: async function() {
        PPL.hideModal();

        // Swap teams for Super Over 2
        const battingTeamId = this.setupState.data.battingTeamId; // Team 1
        const bowlingTeamId = this.setupState.data.bowlingTeamId; // Team 2
        const battingXI = this.setupState.data.battingXI;
        const bowlingXI = this.setupState.data.bowlingXI;

        const battingTeam = await PPL.storage.get(PPL.STORES.TEAMS, battingTeamId);
        const bowlingTeam = await PPL.storage.get(PPL.STORES.TEAMS, bowlingTeamId);

        // Show player selection for Super Over 2
        const content = `
            <div class="form-container">
                <h3>Super Over 2 - ${battingTeam.name}</h3>
                <p style="background: rgba(255, 215, 0, 0.1); padding: var(--spacing-sm); border-radius: 4px; margin-bottom: var(--spacing-md);">
                    Target: ${currentMatch.superOverTarget} runs<br>
                    Select 2 batters and 1 bowler (from ${bowlingTeam.name})
                </p>
                <div class="form-group">
                    <label>Striker (on strike)</label>
                    <select id="so2-striker">
                        <option value="">Select batter</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Non-Striker</label>
                    <select id="so2-non-striker">
                        <option value="">Select batter</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Bowler (${bowlingTeam.name})</label>
                    <select id="so2-bowler">
                        <option value="">Select bowler</option>
                    </select>
                </div>
                <div class="form-actions">
                    <button class="btn btn-primary" onclick="PPL.scoring.confirmSuperOver2Start()">Start Super Over 2</button>
                </div>
            </div>
        `;

        PPL.showModal(content);

        // Populate batters
        const strikerSelect = document.getElementById('so2-striker');
        const nonStrikerSelect = document.getElementById('so2-non-striker');
        for (const playerId of battingXI) {
            const player = await PPL.storage.get(PPL.STORES.PLAYERS, playerId);
            const option1 = document.createElement('option');
            option1.value = player.id;
            option1.textContent = player.name;
            strikerSelect.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = player.id;
            option2.textContent = player.name;
            nonStrikerSelect.appendChild(option2);
        }

        // Populate bowlers
        const bowlerSelect = document.getElementById('so2-bowler');
        for (const playerId of bowlingXI) {
            const player = await PPL.storage.get(PPL.STORES.PLAYERS, playerId);
            const option = document.createElement('option');
            option.value = player.id;
            option.textContent = player.name;
            bowlerSelect.appendChild(option);
        }
    },

    /**
     * Confirm and start Super Over 2
     */
    confirmSuperOver2Start: async function() {
        const striker = parseInt(document.getElementById('so2-striker').value);
        const nonStriker = parseInt(document.getElementById('so2-non-striker').value);
        const bowler = parseInt(document.getElementById('so2-bowler').value);

        if (!striker || !nonStriker || !bowler) {
            PPL.showToast('Please select all positions', 'error');
            return;
        }

        if (striker === nonStriker) {
            PPL.showToast('Batters must be different', 'error');
            return;
        }

        PPL.hideModal();

        // Create Super Over 2 innings (innings 4)
        const superOver2 = {
            matchId: currentMatch.id,
            inningsNumber: 4,
            battingTeamId: this.setupState.data.battingTeamId,
            bowlingTeamId: this.setupState.data.bowlingTeamId,
            battingXI: this.setupState.data.battingXI,
            bowlingXI: this.setupState.data.bowlingXI,
            currentStriker: striker,
            currentNonStriker: nonStriker,
            currentBowler: bowler,
            totalRuns: 0,
            totalWickets: 0,
            totalExtras: 0,
            wides: 0,
            noBalls: 0,
            byes: 0,
            legByes: 0,
            completedOvers: 0,
            currentOverBalls: 0,
            legalBalls: 0,
            ballsThisOver: [],
            status: 'in_progress',
            batterStats: {},
            bowlerStats: {},
            fallOfWickets: [],
            partnerships: [],
            isSuperOver: true
        };

        // Initialize batter stats (only for selected batters)
        for (const batterId of [striker, nonStriker]) {
            superOver2.batterStats[batterId] = {
                runs: 0,
                balls: 0,
                fours: 0,
                sixes: 0,
                dotBalls: 0,
                dismissal: null,
                dismissalType: 'not_out',
                bowlerId: null,
                fielderId: null
            };
        }

        // Initialize bowler stats (only for selected bowler)
        superOver2.bowlerStats[bowler] = {
            overs: 0,
            balls: 0,
            maidens: 0,
            runs: 0,
            wickets: 0,
            wides: 0,
            noBalls: 0,
            dotBalls: 0,
            currentOverRuns: 0,
            currentOverBalls: 0
        };

        const inningsId = await PPL.storage.saveInnings(superOver2);
        superOver2.id = inningsId;

        // Update match
        currentMatch.currentInnings = 4;
        await PPL.storage.saveMatch(currentMatch);

        // Initialize partnership
        currentPartnership = {
            runs: 0,
            balls: 0,
            batter1: striker,
            batter2: nonStriker,
            wicket: 0
        };

        // Update memory
        currentInnings = superOver2;

        // Update display
        await this.updateScoringDisplay();

        PPL.showToast('Super Over 2 started! 🔥', 'success');
    },

    /**
     * Complete match and determine result
     */
    completeMatch: async function() {
        // Get all innings
        const allInnings = await PPL.storage.getInningsByMatch(currentMatch.id);
        const innings1 = allInnings.find(i => i.inningsNumber === 1);
        const innings2 = allInnings.find(i => i.inningsNumber === 2);

        let result = {};

        const team1 = await PPL.storage.get(PPL.STORES.TEAMS, currentMatch.team1Id);
        const team2 = await PPL.storage.get(PPL.STORES.TEAMS, currentMatch.team2Id);

        // Check if Super Over was played
        const superOver1 = allInnings.find(i => i.inningsNumber === 3);
        const superOver2 = allInnings.find(i => i.inningsNumber === 4);

        if (superOver1 && superOver2) {
            // Super Over result
            const so1Team = await PPL.storage.get(PPL.STORES.TEAMS, superOver1.battingTeamId);
            const so2Team = await PPL.storage.get(PPL.STORES.TEAMS, superOver2.battingTeamId);

            if (superOver2.totalRuns > superOver1.totalRuns) {
                // Super Over 2 team won
                result = {
                    type: 'super_over_win',
                    winner: so2Team.name,
                    winnerId: so2Team.id,
                    loserId: so1Team.id,
                    margin: superOver2.totalRuns - superOver1.totalRuns,
                    marginText: `Super Over (${superOver2.totalRuns}-${superOver1.totalRuns})`,
                    superOverScore1: superOver1.totalRuns,
                    superOverScore2: superOver2.totalRuns
                };
            } else if (superOver1.totalRuns > superOver2.totalRuns) {
                // Super Over 1 team won
                result = {
                    type: 'super_over_win',
                    winner: so1Team.name,
                    winnerId: so1Team.id,
                    loserId: so2Team.id,
                    margin: superOver1.totalRuns - superOver2.totalRuns,
                    marginText: `Super Over (${superOver1.totalRuns}-${superOver2.totalRuns})`,
                    superOverScore1: superOver1.totalRuns,
                    superOverScore2: superOver2.totalRuns
                };
            } else {
                // Still tied after Super Over
                result = {
                    type: 'tied',
                    winner: null,
                    winnerId: null,
                    loserId: null,
                    margin: 0,
                    marginText: `Match Tied (Even after Super Over: ${superOver1.totalRuns}-${superOver2.totalRuns})`,
                    superOverScore1: superOver1.totalRuns,
                    superOverScore2: superOver2.totalRuns
                };
            }
        } else {
            // Normal match result (no Super Over)
            const battingTeam1 = innings1.battingTeamId === team1.id ? team1 : team2;
            const battingTeam2 = innings2.battingTeamId === team1.id ? team1 : team2;

            // Determine result
            if (innings2.totalRuns >= currentMatch.target) {
                // Team 2 won by wickets
                const wicketsRemaining = 10 - innings2.totalWickets;
                result = {
                    type: 'win_by_wickets',
                    winner: battingTeam2.name,
                    winnerId: battingTeam2.id,
                    loserId: battingTeam1.id,
                    margin: wicketsRemaining,
                    marginText: `${wicketsRemaining} wickets`
                };
            } else if (innings2.totalRuns === innings1.totalRuns) {
                // This shouldn't happen as Super Over should be triggered
                // But kept as fallback
                result = {
                    type: 'tied',
                    winner: null,
                    winnerId: null,
                    loserId: null,
                    margin: 0,
                    marginText: 'Match Tied'
                };
            } else {
                // Team 1 won by runs
                const runsMargin = innings1.totalRuns - innings2.totalRuns;
                result = {
                    type: 'win_by_runs',
                    winner: battingTeam1.name,
                    winnerId: battingTeam1.id,
                    loserId: battingTeam2.id,
                    margin: runsMargin,
                    marginText: `${runsMargin} runs`
                };
            }
        }

        // Save result
        currentMatch.result = result;
        currentMatch.status = 'completed';
        await PPL.storage.saveMatch(currentMatch);

        // Update fixture
        this.setupState.fixture.status = 'completed';
        await PPL.storage.saveFixture(this.setupState.fixture);

        // Calculate and show MVP
        const mvp = await PPL.mvp.calculateMatchMVP(currentMatch.id);
        if (mvp) {
            await PPL.mvp.showMVPDialog(currentMatch.id, mvp);
        }

        // Show match summary
        await this.showMatchSummary();
    },

    /**
     * Show match summary screen
     */
    showMatchSummary: async function() {
        // Switch to match summary screen
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById('match-summary-screen').classList.add('active');

        // Build summary content
        await this.buildMatchSummary();
    },

    /**
     * Build match summary content
     */
    buildMatchSummary: async function() {
        const container = document.getElementById('match-summary-content');

        const team1 = await PPL.storage.get(PPL.STORES.TEAMS, currentMatch.team1Id);
        const team2 = await PPL.storage.get(PPL.STORES.TEAMS, currentMatch.team2Id);

        const allInnings = await PPL.storage.getInningsByMatch(currentMatch.id);
        const innings1 = allInnings.find(i => i.inningsNumber === 1);
        const innings2 = allInnings.find(i => i.inningsNumber === 2);
        const superOver1 = allInnings.find(i => i.inningsNumber === 3);
        const superOver2 = allInnings.find(i => i.inningsNumber === 4);

        // Result headline
        let resultHTML = `<div class="result-headline">`;
        if (currentMatch.result.type === 'super_over_win') {
            resultHTML += `<h2 style="color: var(--accent-color);">🏏 ${currentMatch.result.winner} won in Super Over!</h2>`;
            resultHTML += `<p>Super Over Score: ${currentMatch.result.superOverScore2}-${currentMatch.result.superOverScore1}</p>`;
        } else if (currentMatch.result.type === 'tied') {
            resultHTML += `<h2>Match Tied!</h2>`;
        } else {
            resultHTML += `<h2>${currentMatch.result.winner} won by ${currentMatch.result.marginText}</h2>`;
        }
        resultHTML += `</div>`;

        // Innings summaries
        resultHTML += await this.formatInningsSummary(innings1, team1, team2);
        resultHTML += await this.formatInningsSummary(innings2, team1, team2);

        // Super Over summaries (if they exist)
        if (superOver1 && superOver2) {
            resultHTML += `<div style="margin-top: var(--spacing-lg); padding-top: var(--spacing-lg); border-top: 2px solid var(--accent-color);">`;
            resultHTML += `<h3 style="color: var(--accent-color); text-align: center;">Super Over</h3>`;
            resultHTML += await this.formatInningsSummary(superOver1, team1, team2, true);
            resultHTML += await this.formatInningsSummary(superOver2, team1, team2, true);
            resultHTML += `</div>`;
        }

        // Actions
        resultHTML += `
            <div class="match-summary-actions" style="flex-direction: column; gap: var(--spacing-sm);">
                <button class="btn btn-primary" onclick="location.reload()">Back to Dashboard</button>
                <button class="btn btn-secondary" onclick="PPL.scoring.editMVP()">✏️ Edit MVP</button>
                <button class="btn btn-danger" onclick="PPL.scoring.showEditMatchOptions()">🔧 Edit Match</button>
            </div>
        `;

        container.innerHTML = resultHTML;
    },

    /**
     * Format innings summary
     */
    formatInningsSummary: async function(innings, team1, team2, isSuperOver = false) {
        if (!innings) return '';

        const battingTeam = innings.battingTeamId === team1.id ? team1 : team2;
        const bowlingTeam = innings.battingTeamId === team1.id ? team2 : team1;

        const overs = PPL.formatOvers(innings.completedOvers, innings.currentOverBalls === 6 ? 0 : innings.currentOverBalls);
        const runRate = innings.legalBalls > 0 ?
            (innings.totalRuns / PPL.oversToDecimal(innings.completedOvers, innings.currentOverBalls === 6 ? 0 : innings.currentOverBalls)).toFixed(2) :
            '0.00';

        let inningsLabel = `${battingTeam.name}`;
        if (isSuperOver) {
            inningsLabel += ` Super Over ${innings.inningsNumber === 3 ? 1 : 2}`;
        } else {
            inningsLabel += ` Innings ${innings.inningsNumber}`;
        }

        let html = `
            <div class="innings-summary">
                <h3>${inningsLabel}</h3>
                <p class="score"><strong>${innings.totalRuns}/${innings.totalWickets}</strong> (${overs} ov, RR: ${runRate})</p>
                <p>Extras: ${innings.totalExtras} (w ${innings.wides}, nb ${innings.noBalls}, b ${innings.byes}, lb ${innings.legByes})</p>

                <h4>Batting</h4>
                <table>
                    <thead>
                        <tr>
                            <th>Batter</th>
                            <th>Dismissal</th>
                            <th>R</th>
                            <th>B</th>
                            <th>4s</th>
                            <th>SR</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        // Batting scorecard
        for (const batterId of innings.battingXI) {
            const stats = innings.batterStats[batterId];
            const player = await PPL.storage.get(PPL.STORES.PLAYERS, batterId);

            let dismissalText = 'not out';
            if (stats.dismissal) {
                const bowler = stats.bowlerId ? await PPL.storage.get(PPL.STORES.PLAYERS, stats.bowlerId) : null;
                const fielder = stats.fielderId ? await PPL.storage.get(PPL.STORES.PLAYERS, stats.fielderId) : null;
                dismissalText = PPL.formatDismissal(player, stats.dismissalType, bowler, fielder);
            }

            const sr = PPL.calculateStrikeRate(stats.runs, stats.balls);

            html += `
                <tr>
                    <td>${player.name}</td>
                    <td>${dismissalText}</td>
                    <td>${stats.runs}</td>
                    <td>${stats.balls}</td>
                    <td>${stats.fours}</td>
                    <td>${sr}</td>
                </tr>
            `;
        }

        html += `
                    </tbody>
                </table>

                <h4>Bowling</h4>
                <table>
                    <thead>
                        <tr>
                            <th>Bowler</th>
                            <th>O</th>
                            <th>M</th>
                            <th>R</th>
                            <th>W</th>
                            <th>Econ</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        // Bowling figures
        for (const bowlerId of innings.bowlingXI) {
            const stats = innings.bowlerStats[bowlerId];
            if (stats.balls === 0) continue; // Skip if didn't bowl

            const player = await PPL.storage.get(PPL.STORES.PLAYERS, bowlerId);
            const overs = PPL.formatOvers(Math.floor(stats.balls / 6), stats.balls % 6);
            const economy = stats.balls > 0 ?
                PPL.calculateEconomy(stats.runs, PPL.oversToDecimal(Math.floor(stats.balls / 6), stats.balls % 6)) :
                '0.00';

            html += `
                <tr>
                    <td>${player.name}</td>
                    <td>${overs}</td>
                    <td>${stats.maidens}</td>
                    <td>${stats.runs}</td>
                    <td>${stats.wickets}</td>
                    <td>${economy}</td>
                </tr>
            `;
        }

        html += `
                    </tbody>
                </table>
            </div>
        `;

        return html;
    },

    /**
     * Process wicket - all 11 types
     */
    processWicket: async function() {
        // Show wicket type selection dialog
        const content = `
            <div class="form-container">
                <h3>Wicket!</h3>
                <p>Batter: <strong id="dismissed-batter-name"></strong></p>
                <div class="form-group">
                    <label>Dismissal Type</label>
                    <select id="dismissal-type">
                        <option value="">Select dismissal type</option>
                        <option value="bowled">Bowled</option>
                        <option value="caught">Caught</option>
                        <option value="lbw">LBW</option>
                        <option value="stumped">Stumped</option>
                        <option value="run_out">Run Out</option>
                        <option value="hit_wicket">Hit Wicket</option>
                        <option value="hit_six">Hit Six (Box Cricket)</option>
                        <option value="hit_ball_twice">Hit Ball Twice</option>
                        <option value="obstructing_field">Obstructing Field</option>
                        <option value="handled_ball">Handled Ball</option>
                        <option value="timed_out">Timed Out</option>
                    </select>
                </div>
                <div class="form-group" id="fielder-group" style="display:none;">
                    <label>Fielder</label>
                    <select id="fielder-select">
                        <option value="">Select fielder</option>
                    </select>
                </div>
                <div class="form-group" id="runs-before-wicket-group">
                    <label>Runs scored before wicket</label>
                    <input type="number" id="runs-before-wicket" value="0" min="0" max="4">
                    <small>For run out scenarios</small>
                </div>
                <div class="form-actions">
                    <button class="btn btn-primary" onclick="PPL.scoring.confirmWicket()">Confirm Wicket</button>
                    <button class="btn btn-secondary" onclick="PPL.hideModal()">Cancel</button>
                </div>
            </div>
        `;

        PPL.showModal(content);

        // Populate current striker name
        const striker = await PPL.storage.get(PPL.STORES.PLAYERS, currentInnings.currentStriker);
        document.getElementById('dismissed-batter-name').textContent = striker.name;

        // Populate fielder dropdown
        const fielderSelect = document.getElementById('fielder-select');
        for (const fielderId of currentInnings.bowlingXI) {
            const player = await PPL.storage.get(PPL.STORES.PLAYERS, fielderId);
            const option = document.createElement('option');
            option.value = player.id;
            option.textContent = player.name;
            fielderSelect.appendChild(option);
        }

        // Show/hide fielder based on dismissal type
        document.getElementById('dismissal-type').addEventListener('change', (e) => {
            const type = e.target.value;
            const fielderGroup = document.getElementById('fielder-group');
            const needsFielder = ['caught', 'stumped', 'run_out'].includes(type);
            fielderGroup.style.display = needsFielder ? 'block' : 'none';

            // Hide runs for hit_six
            const runsGroup = document.getElementById('runs-before-wicket-group');
            if (type === 'hit_six') {
                runsGroup.style.display = 'none';
                document.getElementById('runs-before-wicket').value = 0;
            } else {
                runsGroup.style.display = 'block';
            }
        });
    },

    /**
     * Confirm wicket
     */
    confirmWicket: async function() {
        const dismissalType = document.getElementById('dismissal-type').value;
        const runs = parseInt(document.getElementById('runs-before-wicket').value) || 0;
        const fielderSelect = document.getElementById('fielder-select');
        const fielderId = fielderSelect.value ? parseInt(fielderSelect.value) : null;

        if (!dismissalType) {
            PPL.showToast('Please select dismissal type', 'error');
            return;
        }

        // Fielder required for certain types
        if (['caught', 'stumped'].includes(dismissalType) && !fielderId) {
            PPL.showToast('Please select fielder', 'error');
            return;
        }

        // Hit Six: 0 runs, bowler credited
        const actualRuns = dismissalType === 'hit_six' ? 0 : runs;

        // Bowler credited for most dismissals
        const bowlerCredited = !['run_out', 'obstructing_field', 'handled_ball', 'timed_out'].includes(dismissalType);

        // Create delivery record
        const delivery = {
            matchId: currentMatch.id,
            inningsNumber: currentMatch.currentInnings,
            overNumber: currentInnings.completedOvers,
            ballNumber: currentInnings.currentOverBalls,
            bowlerId: currentInnings.currentBowler,
            strikerId: currentInnings.currentStriker,
            nonStrikerId: currentInnings.currentNonStriker,
            runs: actualRuns,
            batterRuns: actualRuns,
            extras: 0,
            isWide: false,
            isNoBall: false,
            isBye: false,
            isLegBye: false,
            isWicket: true,
            isPowerBall: false,
            dismissalType: dismissalType,
            fielderId: fielderId,
            timestamp: Date.now()
        };

        await PPL.storage.saveDelivery(delivery);

        // Update innings
        currentInnings.totalRuns += actualRuns;
        currentInnings.totalWickets++;
        currentInnings.legalBalls++;
        currentInnings.currentOverBalls++;

        // Update dismissed batter stats
        const batterStats = currentInnings.batterStats[currentInnings.currentStriker];
        batterStats.runs += actualRuns;
        batterStats.balls++;
        batterStats.dismissal = true;
        batterStats.dismissalType = dismissalType;
        batterStats.bowlerId = bowlerCredited ? currentInnings.currentBowler : null;
        batterStats.fielderId = fielderId;

        // Update bowler stats
        const bowlerStats = currentInnings.bowlerStats[currentInnings.currentBowler];
        bowlerStats.runs += actualRuns;
        bowlerStats.balls++;
        bowlerStats.currentOverRuns += actualRuns;
        bowlerStats.currentOverBalls++;

        if (bowlerCredited) {
            bowlerStats.wickets++;
        }

        // Update fielding stats (if fielder involved)
        if (fielderId) {
            if (!currentInnings.bowlerStats[fielderId].fielding) {
                currentInnings.bowlerStats[fielderId].fielding = {
                    catches: 0,
                    runOuts: 0,
                    stumpings: 0
                };
            }

            if (dismissalType === 'caught') {
                currentInnings.bowlerStats[fielderId].fielding.catches++;
            } else if (dismissalType === 'run_out') {
                currentInnings.bowlerStats[fielderId].fielding.runOuts++;
            } else if (dismissalType === 'stumped') {
                currentInnings.bowlerStats[fielderId].fielding.stumpings++;
            }
        }

        // Fall of wickets
        const dismissedBatter = await PPL.storage.get(PPL.STORES.PLAYERS, currentInnings.currentStriker);
        const overBall = PPL.formatOvers(currentInnings.completedOvers, currentInnings.currentOverBalls);
        currentInnings.fallOfWickets.push({
            wicketNumber: currentInnings.totalWickets,
            runs: currentInnings.totalRuns,
            batterName: dismissedBatter.name,
            batterId: dismissedBatter.id,
            over: overBall
        });

        // Update partnership
        currentPartnership.runs += actualRuns;
        currentPartnership.balls++;

        // Save partnership
        currentInnings.partnerships.push({...currentPartnership});

        // Add to this over
        currentInnings.ballsThisOver.push(delivery);

        // Striker rotation only if runs were scored
        if (actualRuns % 2 === 1) {
            this.swapBatters();
        }

        // Save innings
        await PPL.storage.saveInnings(currentInnings);

        PPL.hideModal();

        // Check if all out
        if (currentInnings.totalWickets >= 10) {
            await this.endInnings('all_out');
            return;
        }

        // Select new batter
        await this.selectNewBatter();
    },

    /**
     * Select new batter after wicket
     */
    selectNewBatter: async function() {
        // Get batters who haven't batted yet
        const availableBatters = currentInnings.battingXI.filter(batterId => {
            const stats = currentInnings.batterStats[batterId];
            return stats.balls === 0 && !stats.dismissal &&
                   batterId !== currentInnings.currentStriker &&
                   batterId !== currentInnings.currentNonStriker;
        });

        if (availableBatters.length === 0) {
            PPL.showToast('No batters remaining', 'error');
            await this.endInnings('all_out');
            return;
        }

        const content = `
            <div class="form-container">
                <h3>New Batter</h3>
                <div class="form-group">
                    <label>Select next batter</label>
                    <select id="new-batter-select">
                        <option value="">Select batter</option>
                    </select>
                </div>
                <div class="form-actions">
                    <button class="btn btn-primary" onclick="PPL.scoring.confirmNewBatter()">Confirm</button>
                </div>
            </div>
        `;

        PPL.showModal(content);

        const select = document.getElementById('new-batter-select');
        for (const batterId of availableBatters) {
            const player = await PPL.storage.get(PPL.STORES.PLAYERS, batterId);
            const option = document.createElement('option');
            option.value = player.id;
            option.textContent = player.name;
            select.appendChild(option);
        }
    },

    /**
     * Confirm new batter
     */
    confirmNewBatter: async function() {
        const newBatterId = parseInt(document.getElementById('new-batter-select').value);

        if (!newBatterId) {
            PPL.showToast('Please select a batter', 'error');
            return;
        }

        // New batter comes at striker's end
        currentInnings.currentStriker = newBatterId;

        // Reset partnership
        currentPartnership = {
            runs: 0,
            balls: 0,
            batter1: currentInnings.currentStriker,
            batter2: currentInnings.currentNonStriker,
            wicket: currentInnings.totalWickets
        };

        await PPL.storage.saveInnings(currentInnings);

        PPL.hideModal();
        await this.updateScoringDisplay();
        PPL.showToast('New batter at crease', 'success');
    },

    /**
     * End over - bowler selection and striker swap
     */
    endOver: async function() {
        if (currentInnings.currentOverBalls !== 6) {
            PPL.showToast('Over not complete - need 6 legal balls', 'error');
            return;
        }

        // Check for maiden over
        const bowlerStats = currentInnings.bowlerStats[currentInnings.currentBowler];
        if (bowlerStats.currentOverRuns === 0) {
            bowlerStats.maidens++;
        }

        // Reset current over stats
        bowlerStats.currentOverRuns = 0;
        bowlerStats.currentOverBalls = 0;

        // Increment completed overs
        currentInnings.completedOvers++;
        currentInnings.currentOverBalls = 0;
        currentInnings.ballsThisOver = [];

        // Update bowler overs
        bowlerStats.overs = Math.floor(bowlerStats.balls / 6);

        // Swap batters at end of over
        this.swapBatters();

        await PPL.storage.saveInnings(currentInnings);

        // Check if innings should end
        if (currentInnings.completedOvers >= currentMatch.overs) {
            await this.endInnings('overs_complete');
            return;
        }

        // Select new bowler
        await this.selectNewBowler();
    },

    /**
     * Select new bowler
     */
    selectNewBowler: async function() {
        const tournament = this.setupState.tournament;
        const maxOversPerBowler = tournament.maxOversPerBowler || 1;

        // Get available bowlers (not completed quota)
        const availableBowlers = currentInnings.bowlingXI.filter(bowlerId => {
            const stats = currentInnings.bowlerStats[bowlerId];
            return stats.overs < maxOversPerBowler;
        });

        if (availableBowlers.length === 0) {
            PPL.showToast('No bowlers available - all completed quota', 'error');
            return;
        }

        const content = `
            <div class="form-container">
                <h3>Select Bowler</h3>
                <p>Over ${currentInnings.completedOvers + 1} of ${currentMatch.overs}</p>
                <div class="form-group">
                    <label>Select bowler for next over</label>
                    <select id="new-bowler-select">
                        <option value="">Select bowler</option>
                    </select>
                </div>
                <div class="form-actions">
                    <button class="btn btn-primary" onclick="PPL.scoring.confirmNewBowler()">Start Over</button>
                </div>
            </div>
        `;

        PPL.showModal(content);

        const select = document.getElementById('new-bowler-select');
        for (const bowlerId of availableBowlers) {
            const player = await PPL.storage.get(PPL.STORES.PLAYERS, bowlerId);
            const stats = currentInnings.bowlerStats[bowlerId];
            const overs = PPL.formatOvers(Math.floor(stats.balls / 6), stats.balls % 6);

            const option = document.createElement('option');
            option.value = player.id;
            option.textContent = `${player.name} (${overs} ov, ${stats.runs} runs, ${stats.wickets} wkts)`;
            select.appendChild(option);
        }
    },

    /**
     * Confirm new bowler
     */
    confirmNewBowler: async function() {
        const newBowlerId = parseInt(document.getElementById('new-bowler-select').value);

        if (!newBowlerId) {
            PPL.showToast('Please select a bowler', 'error');
            return;
        }

        currentInnings.currentBowler = newBowlerId;

        await PPL.storage.saveInnings(currentInnings);

        PPL.hideModal();
        await this.updateScoringDisplay();
        PPL.showToast('New bowler selected', 'success');
    },

    /**
     * Undo last ball - reverses the most recent delivery
     */
    undoLastBall: async function() {
        if (!currentMatch || !currentInnings) {
            PPL.showToast('No active match', 'error');
            return;
        }

        // Get the last delivery
        const lastDelivery = await PPL.storage.getLastDelivery(currentMatch.id);

        if (!lastDelivery) {
            PPL.showToast('No deliveries to undo', 'error');
            return;
        }

        // Confirm undo
        const confirmed = confirm(`Undo last ball?\n\nDelivery: ${PPL.getBallSymbol(lastDelivery)}\nRuns: ${lastDelivery.runs}\nType: ${this.getDeliveryTypeName(lastDelivery)}`);

        if (!confirmed) return;

        try {
            // Store current state for potential restoration
            const previousStriker = currentInnings.currentStriker;
            const previousNonStriker = currentInnings.currentNonStriker;

            // REVERSE INNINGS STATS
            currentInnings.totalRuns -= lastDelivery.runs;

            // Handle legal/illegal balls
            if (lastDelivery.isWide) {
                // Wide is not a legal ball
                currentInnings.totalExtras -= lastDelivery.runs;
                currentInnings.wides -= lastDelivery.runs;
            } else if (lastDelivery.isNoBall) {
                // No ball is not a legal ball
                currentInnings.totalExtras -= 1;
                currentInnings.noBalls -= 1;
                // Batter runs are separate from the no-ball itself
            } else if (lastDelivery.isBye) {
                // Bye is a legal ball
                currentInnings.totalExtras -= lastDelivery.runs;
                currentInnings.byes -= lastDelivery.runs;
                currentInnings.legalBalls--;
                currentInnings.currentOverBalls--;
            } else if (lastDelivery.isLegBye) {
                // Leg bye is a legal ball
                currentInnings.totalExtras -= lastDelivery.runs;
                currentInnings.legByes -= lastDelivery.runs;
                currentInnings.legalBalls--;
                currentInnings.currentOverBalls--;
            } else {
                // Normal run or wicket (legal ball)
                currentInnings.legalBalls--;
                currentInnings.currentOverBalls--;
            }

            // Handle wicket reversal
            if (lastDelivery.isWicket) {
                currentInnings.totalWickets--;

                // Reverse the dismissal
                const dismissedBatterId = lastDelivery.batterId;
                const batterStats = currentInnings.batterStats[dismissedBatterId];

                if (batterStats) {
                    batterStats.dismissalType = null;
                    batterStats.bowlerId = null;
                    batterStats.fielderId = null;
                    batterStats.isOut = false;
                }

                // The dismissed batter is back (was at striker position)
                currentInnings.currentStriker = dismissedBatterId;
            }

            // REVERSE BATTER STATS
            const batterStats = currentInnings.batterStats[lastDelivery.batterId];
            if (batterStats) {
                // Reverse runs
                if (!lastDelivery.isBye && !lastDelivery.isLegBye && !lastDelivery.isWide) {
                    // Only subtract runs if they were credited to batter
                    const batterRuns = lastDelivery.isNoBall ? (lastDelivery.runs - 1) : lastDelivery.runs;
                    batterStats.runs -= batterRuns;
                }

                // Reverse balls faced (legal balls only, but no-balls count)
                if (!lastDelivery.isWide) {
                    if (lastDelivery.isNoBall || lastDelivery.isBye || lastDelivery.isLegBye || (!lastDelivery.isWide && !lastDelivery.isNoBall)) {
                        batterStats.balls--;
                    }
                }

                // Reverse boundaries
                if (lastDelivery.runs === 4 && !lastDelivery.isWide && !lastDelivery.isBye && !lastDelivery.isLegBye) {
                    batterStats.fours = Math.max(0, batterStats.fours - 1);
                }
            }

            // REVERSE BOWLER STATS
            const bowlerStats = currentInnings.bowlerStats[lastDelivery.bowlerId];
            if (bowlerStats) {
                bowlerStats.runs -= lastDelivery.runs;

                // Reverse balls bowled (legal balls only)
                if (!lastDelivery.isWide && !lastDelivery.isNoBall) {
                    bowlerStats.balls--;
                }

                // Reverse wickets (but only for certain dismissal types)
                if (lastDelivery.isWicket) {
                    const creditBowler = !['run_out', 'obstructing_field', 'retired_hurt', 'timed_out'].includes(lastDelivery.dismissalType);
                    if (creditBowler) {
                        bowlerStats.wickets--;
                    }
                }

                // Reverse extras
                if (lastDelivery.isWide) {
                    bowlerStats.wides -= lastDelivery.runs;
                } else if (lastDelivery.isNoBall) {
                    bowlerStats.noBalls--;
                }

                // Check for maiden over reversal
                // If we're back to 0 balls in this over and it was marked as maiden, unmark it
                if (bowlerStats.balls % 6 === 0 && currentInnings.currentOverBalls === 0) {
                    // Can't easily reverse maiden status, will be recalculated on next over completion
                }
            }

            // REVERSE PARTNERSHIP STATS
            if (currentPartnership) {
                currentPartnership.runs -= lastDelivery.runs;
                if (!lastDelivery.isWide && !lastDelivery.isNoBall) {
                    currentPartnership.balls = Math.max(0, currentPartnership.balls - 1);
                }

                // If this was a wicket, we'd need to restore the previous partnership
                // For simplicity, just adjust current partnership
                if (lastDelivery.isWicket) {
                    currentPartnership.wicket--;
                }
            }

            // REVERSE STRIKER ROTATION
            // If odd runs were scored (excluding wides), batters would have swapped
            const shouldSwap = !lastDelivery.isWide && (lastDelivery.runs % 2 === 1);
            if (shouldSwap && !lastDelivery.isWicket) {
                // Swap back
                const temp = currentInnings.currentStriker;
                currentInnings.currentStriker = currentInnings.currentNonStriker;
                currentInnings.currentNonStriker = temp;
            }

            // If we're back to start of over (ball 0), we need to handle over completion reversal
            if (currentInnings.currentOverBalls === -1) {
                currentInnings.completedOvers--;
                currentInnings.currentOverBalls = 5; // Back to 6th ball (0-indexed becomes 5)
                // Note: Bowler won't be automatically changed back, user must manually select if needed
            }

            // Delete the delivery from database
            await PPL.storage.deleteLastDelivery(currentMatch.id);

            // Save updated innings
            await PPL.storage.saveInnings(currentInnings);

            // Save updated match
            await PPL.storage.saveMatch(currentMatch);

            // Log the edit
            await PPL.storage.logEdit(
                currentMatch.id,
                'UNDO_BALL',
                `Undid ball: ${PPL.getBallSymbol(lastDelivery)} (${this.getDeliveryTypeName(lastDelivery)})`,
                { totalRuns: currentInnings.totalRuns + lastDelivery.runs, totalWickets: currentInnings.totalWickets + (lastDelivery.isWicket ? 1 : 0) },
                { totalRuns: currentInnings.totalRuns, totalWickets: currentInnings.totalWickets }
            );

            // Update display
            await this.updateScoringDisplay();

            PPL.showToast('Last ball undone', 'success');

        } catch (error) {
            console.error('Undo failed:', error);
            PPL.showToast('Failed to undo last ball', 'error');
        }
    },

    /**
     * Show all balls in current over for editing
     */
    editAllBalls: async function() {
        if (!currentMatch || !currentInnings) {
            PPL.showToast('No active match', 'error');
            return;
        }

        if (currentInnings.ballsThisOver.length === 0) {
            PPL.showToast('No balls to edit', 'info');
            return;
        }

        let content = `
            <div class="form-container" style="max-height: 80vh; overflow-y: auto;">
                <h3>Edit Balls - Over ${currentInnings.completedOvers}.${currentInnings.currentOverBalls}</h3>
                <p style="font-size: 13px; color: var(--text-secondary);">Click on a ball to edit or delete it</p>
                <div style="margin-top: var(--spacing-md);">
        `;

        for (let i = 0; i < currentInnings.ballsThisOver.length; i++) {
            const delivery = currentInnings.ballsThisOver[i];
            const strikerName = (await PPL.storage.get(PPL.STORES.PLAYERS, delivery.strikerId)).name;
            const bowlerName = (await PPL.storage.get(PPL.STORES.PLAYERS, delivery.bowlerId)).name;
            const symbol = PPL.getBallSymbol(delivery);

            content += `
                <div style="background: var(--surface); padding: var(--spacing-md); margin-bottom: var(--spacing-sm); border-radius: 8px; border-left: 4px solid var(--accent-color);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <p style="margin: 0; font-size: 14px; font-weight: bold;">Ball ${i + 1}: ${symbol}</p>
                            <p style="margin: var(--spacing-xs) 0 0 0; font-size: 13px; color: var(--text-secondary);">
                                ${bowlerName} to ${strikerName} - ${this.getDeliveryTypeName(delivery)}
                            </p>
                        </div>
                        <div style="display: flex; gap: var(--spacing-sm);">
                            <button class="btn btn-sm btn-secondary" onclick="PPL.scoring.editBall(${i})">✏️ Edit</button>
                            <button class="btn btn-sm btn-danger" onclick="PPL.scoring.deleteBall(${i})">🗑️ Delete</button>
                        </div>
                    </div>
                </div>
            `;
        }

        content += `
                </div>
                <div class="form-actions">
                    <button class="btn btn-secondary" onclick="PPL.hideModal()">Close</button>
                </div>
            </div>
        `;

        PPL.showModal(content);
    },

    /**
     * Edit a specific ball
     */
    editBall: async function(ballIndex) {
        if (ballIndex < 0 || ballIndex >= currentInnings.ballsThisOver.length) {
            PPL.showToast('Invalid ball index', 'error');
            return;
        }

        const delivery = currentInnings.ballsThisOver[ballIndex];

        // Delete the ball first, then let user re-add it
        // This is simpler than trying to manually recalculate all stats
        const confirmed = confirm(`Edit this ball?\n\nThis will delete it and let you re-add it.\n${PPL.getBallSymbol(delivery)}`);

        if (!confirmed) return;

        // Delete this ball
        await this.deleteBall(ballIndex);
    },

    /**
     * Delete a specific ball
     */
    deleteBall: async function(ballIndex) {
        if (ballIndex < 0 || ballIndex >= currentInnings.ballsThisOver.length) {
            PPL.showToast('Invalid ball index', 'error');
            return;
        }

        try {
            const delivery = currentInnings.ballsThisOver[ballIndex];

            // REVERSE INNINGS STATS
            currentInnings.totalRuns -= delivery.runs;

            // Handle legal/illegal balls
            if (delivery.isWide) {
                currentInnings.totalExtras -= delivery.runs;
                currentInnings.wides -= delivery.runs;
            } else if (delivery.isNoBall) {
                currentInnings.totalExtras -= 1;
                currentInnings.noBalls -= 1;
            } else if (delivery.isBye) {
                currentInnings.totalExtras -= delivery.runs;
                currentInnings.byes -= delivery.runs;
                currentInnings.legalBalls--;
                currentInnings.currentOverBalls--;
            } else if (delivery.isLegBye) {
                currentInnings.totalExtras -= delivery.runs;
                currentInnings.legByes -= delivery.runs;
                currentInnings.legalBalls--;
                currentInnings.currentOverBalls--;
            } else {
                currentInnings.legalBalls--;
                currentInnings.currentOverBalls--;
            }

            // Handle wicket reversal
            if (delivery.isWicket) {
                currentInnings.totalWickets--;
                const batterStats = currentInnings.batterStats[delivery.strikerId];
                if (batterStats) {
                    batterStats.dismissalType = null;
                    batterStats.bowlerId = null;
                    batterStats.fielderId = null;
                }
            }

            // REVERSE BATTER STATS
            const batterStats = currentInnings.batterStats[delivery.strikerId];
            if (batterStats) {
                if (!delivery.isBye && !delivery.isLegBye && !delivery.isWide) {
                    const batterRuns = delivery.isNoBall ? (delivery.runs - 1) : delivery.runs;
                    batterStats.runs -= batterRuns;
                }

                if (!delivery.isWide) {
                    if (delivery.isNoBall || delivery.isBye || delivery.isLegBye || (!delivery.isWide && !delivery.isNoBall)) {
                        batterStats.balls--;
                    }
                }

                if (delivery.runs === 4 && !delivery.isWide && !delivery.isBye && !delivery.isLegBye) {
                    batterStats.fours = Math.max(0, batterStats.fours - 1);
                }
            }

            // REVERSE BOWLER STATS
            const bowlerStats = currentInnings.bowlerStats[delivery.bowlerId];
            if (bowlerStats) {
                bowlerStats.runs -= delivery.runs;
                if (!delivery.isWide) {
                    bowlerStats.balls--;
                }
                if (delivery.isWicket) {
                    bowlerStats.wickets--;
                }
            }

            // Remove from this over
            currentInnings.ballsThisOver.splice(ballIndex, 1);

            // Save updated innings
            await PPL.storage.saveInnings(currentInnings);
            await PPL.storage.saveMatch(currentMatch);

            // Log the edit
            await PPL.storage.logEdit(
                currentMatch.id,
                'DELETE_BALL',
                `Deleted ball ${ballIndex + 1}: ${PPL.getBallSymbol(delivery)} (${this.getDeliveryTypeName(delivery)})`,
                { totalRuns: currentInnings.totalRuns + delivery.runs, totalWickets: currentInnings.totalWickets + (delivery.isWicket ? 1 : 0) },
                { totalRuns: currentInnings.totalRuns, totalWickets: currentInnings.totalWickets }
            );

            // Update display
            await this.updateScoringDisplay();
            await this.editAllBalls(); // Refresh the edit dialog

            PPL.showToast('Ball deleted successfully', 'success');

        } catch (error) {
            console.error('Delete failed:', error);
            PPL.showToast('Failed to delete ball', 'error');
        }
    },

    /**
     * Get delivery type name for display
     */
    getDeliveryTypeName: function(delivery) {
        if (delivery.isWicket) return '🔴 ' + delivery.dismissalType.toUpperCase();
        if (delivery.isWide) return '⚪ WIDE';
        if (delivery.isNoBall) return '⚪ NO BALL';
        if (delivery.isBye) return '🔵 BYE';
        if (delivery.isLegBye) return '🔵 LEG BYE';
        if (delivery.runs === 0) return '⚫ DOT';
        if (delivery.runs === 4) return '📊 FOUR';
        if (delivery.runs === 6) return '🎯 SIX';
        return `Run ${delivery.runs}`;
    },

    /**
     * Handle back button on scoring screen
     */
    handleScoringBack: async function() {
        const team1 = await PPL.storage.get(PPL.STORES.TEAMS, currentMatch.team1Id);
        const team2 = await PPL.storage.get(PPL.STORES.TEAMS, currentMatch.team2Id);

        const content = `
            <div class="form-container">
                <h3>Exit Match</h3>
                <div style="background: var(--surface); padding: var(--spacing-md); border-radius: 8px; margin-bottom: var(--spacing-md);">
                    <p><strong>Match:</strong> ${team1.name} vs ${team2.name}</p>
                    <p><strong>Status:</strong> ${currentMatch.status}</p>
                </div>
                <p>What would you like to do?</p>
                <div class="form-actions" style="flex-direction: column; gap: var(--spacing-sm);">
                    <button class="btn btn-primary" onclick="showScreen('fixture-management')">Continue Match Later</button>
                    <button class="btn btn-danger" onclick="PPL.scoring.cancelMatch()">Cancel This Match</button>
                    <button class="btn btn-secondary" onclick="PPL.hideModal()">Keep Scoring</button>
                </div>
            </div>
        `;

        PPL.showModal(content);
    },

    /**
     * Cancel the current match
     */
    cancelMatch: async function() {
        const confirmed = confirm('Are you sure you want to cancel this match? This action cannot be undone.\n\nAll match data will be deleted.');

        if (!confirmed) return;

        try {
            // Delete all deliveries for this match
            const deliveries = await PPL.storage.getAllDeliveries(currentMatch.id);
            for (const delivery of deliveries) {
                await PPL.storage.deleteDelivery(delivery.id);
            }

            // Delete all innings for this match
            const innings = await PPL.storage.getInningsByMatch(currentMatch.id);
            for (const inn of innings) {
                await PPL.storage.deleteInnings(inn.id);
            }

            // Reset match status
            currentMatch.status = 'cancelled';
            currentMatch.currentInnings = 0;
            await PPL.storage.saveMatch(currentMatch);

            // Reset fixture status
            this.setupState.fixture.status = 'pending';
            await PPL.storage.saveFixture(this.setupState.fixture);

            // Log the edit before clearing
            const matchId = currentMatch.id;
            await PPL.storage.logEdit(
                matchId,
                'CANCEL_MATCH',
                'Match cancelled - all data deleted',
                { status: 'in_progress', currentInnings: currentMatch.currentInnings },
                { status: 'cancelled', currentInnings: 0 }
            );

            // Clear current match/innings
            currentMatch = null;
            currentInnings = null;
            currentPartnership = null;

            PPL.hideModal();
            showScreen('fixture-management');
            PPL.showToast('Match cancelled successfully', 'success');

        } catch (error) {
            console.error('Cancel failed:', error);
            PPL.showToast('Failed to cancel match', 'error');
        }
    },

    /**
     * Edit MVP of completed match
     */
    editMVP: async function() {
        if (!currentMatch || currentMatch.status !== 'completed') {
            PPL.showToast('Match must be completed to edit MVP', 'error');
            return;
        }

        // Show MVP selection dialog
        await PPL.mvp.showMVPDialog(currentMatch.id, null, true);
    },

    /**
     * Show edit match options
     */
    showEditMatchOptions: async function() {
        if (!currentMatch || currentMatch.status !== 'completed') {
            PPL.showToast('Match must be completed to edit', 'error');
            return;
        }

        const team1 = await PPL.storage.get(PPL.STORES.TEAMS, currentMatch.team1Id);
        const team2 = await PPL.storage.get(PPL.STORES.TEAMS, currentMatch.team2Id);

        const content = `
            <div class="form-container">
                <h3>Edit Completed Match</h3>
                <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: var(--spacing-md);">
                    ${team1.name} vs ${team2.name}
                </p>
                <div style="background: var(--surface); padding: var(--spacing-md); border-radius: 8px; margin-bottom: var(--spacing-md);">
                    <p><strong>Current Result:</strong> ${currentMatch.result.marginText}</p>
                </div>
                <div class="form-actions" style="flex-direction: column; gap: var(--spacing-sm);">
                    <button class="btn btn-secondary" onclick="PPL.scoring.reopenMatch()">🔄 Reopen Match for Editing</button>
                    <button class="btn btn-danger" onclick="PPL.scoring.deleteCompletedMatch()">🗑️ Delete Match</button>
                    <button class="btn btn-secondary" onclick="PPL.hideModal()">Cancel</button>
                </div>
            </div>
        `;

        PPL.showModal(content);
    },

    /**
     * Reopen a completed match for editing
     */
    reopenMatch: async function() {
        const confirmed = confirm('Reopen this match for editing?\n\nYou will be able to edit any ball.');

        if (!confirmed) return;

        try {
            // Change match status back to in_progress
            currentMatch.status = 'in_progress';
            await PPL.storage.saveMatch(currentMatch);

            PPL.hideModal();

            // Return to the fixture that's already initialized
            // This will allow the user to navigate back and re-edit if needed
            PPL.showToast('Match reopened. You can go back to scoring.', 'info');

        } catch (error) {
            console.error('Reopen failed:', error);
            PPL.showToast('Failed to reopen match', 'error');
        }
    },

    /**
     * Delete a completed match
     */
    deleteCompletedMatch: async function() {
        const confirmed = confirm('Are you sure you want to delete this completed match?\n\nThis action cannot be undone. All match data will be permanently deleted.');

        if (!confirmed) return;

        try {
            // Delete all deliveries for this match
            const deliveries = await PPL.storage.getAllDeliveries(currentMatch.id);
            for (const delivery of deliveries) {
                await PPL.storage.deleteDelivery(delivery.id);
            }

            // Delete all innings for this match
            const innings = await PPL.storage.getInningsByMatch(currentMatch.id);
            for (const inn of innings) {
                await PPL.storage.deleteInnings(inn.id);
            }

            // Delete points if any
            const points = await PPL.storage.getPointsByMatch(currentMatch.id);
            if (points) {
                await PPL.storage.deletePoints(points.id);
            }

            // Reset match status
            currentMatch.status = 'deleted';
            const matchId = currentMatch.id;
            await PPL.storage.saveMatch(currentMatch);

            // Reset fixture status
            this.setupState.fixture.status = 'pending';
            await PPL.storage.saveFixture(this.setupState.fixture);

            // Log the deletion
            await PPL.storage.logEdit(
                matchId,
                'DELETE_MATCH',
                'Completed match deleted - all data removed',
                { status: 'completed', result: currentMatch.result },
                { status: 'deleted' }
            );

            PPL.hideModal();
            showScreen('fixture-management');
            PPL.showToast('Match deleted successfully', 'success');

        } catch (error) {
            console.error('Delete failed:', error);
            PPL.showToast('Failed to delete match', 'error');
        }
    },

    /**
     * Show match edit history/audit log
     */
    showEditHistory: async function() {
        if (!currentMatch) {
            PPL.showToast('No active match', 'error');
            return;
        }

        const logs = await PPL.storage.getEditLogByMatch(currentMatch.id);

        let content = `
            <div class="form-container" style="max-height: 80vh; overflow-y: auto;">
                <h3>Edit History</h3>
                <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: var(--spacing-md);">
                    All edits made to this match in chronological order (newest first)
                </p>
                <div>
        `;

        if (logs.length === 0) {
            content += '<p style="color: var(--text-secondary); text-align: center; padding: var(--spacing-lg);">No edits recorded yet</p>';
        } else {
            for (const log of logs) {
                const timestamp = new Date(log.timestamp).toLocaleString();
                const actionLabel = log.action.replace(/_/g, ' ');

                content += `
                    <div style="background: var(--surface); padding: var(--spacing-md); margin-bottom: var(--spacing-sm); border-radius: 8px; border-left: 4px solid var(--accent-color);">
                        <div style="display: flex; justify-content: space-between; margin-bottom: var(--spacing-sm);">
                            <strong style="color: var(--accent-color);">${actionLabel}</strong>
                            <span style="font-size: 12px; color: var(--text-secondary);">${timestamp}</span>
                        </div>
                        <p style="margin: var(--spacing-xs) 0; font-size: 13px;">${log.description}</p>
                        ${log.before && log.after ? `
                            <div style="font-size: 12px; color: var(--text-secondary); margin-top: var(--spacing-xs);">
                                <details style="cursor: pointer;">
                                    <summary>View details</summary>
                                    <pre style="background: rgba(0,0,0,0.1); padding: var(--spacing-sm); border-radius: 4px; margin-top: var(--spacing-xs); overflow-x: auto; font-size: 11px;">Before: ${JSON.stringify(log.before, null, 2)}

After: ${JSON.stringify(log.after, null, 2)}</pre>
                                </details>
                            </div>
                        ` : ''}
                    </div>
                `;
            }
        }

        content += `
                </div>
                <div class="form-actions">
                    <button class="btn btn-secondary" onclick="PPL.hideModal()">Close</button>
                </div>
            </div>
        `;

        PPL.showModal(content);
    },

    /**
     * Get human-readable delivery type name
     */
    getDeliveryTypeName: function(delivery) {
        if (delivery.isWicket) return 'Wicket';
        if (delivery.isWide) return 'Wide';
        if (delivery.isNoBall) return 'No Ball';
        if (delivery.isBye) return 'Bye';
        if (delivery.isLegBye) return 'Leg Bye';
        if (delivery.isPowerBall) return 'Power Ball';
        return 'Normal';
    }

};

// Global function for onclick handlers
window.startMatch = function(fixtureId) {
    PPL.scoring.startMatchSetup(fixtureId);
    // Switch to match setup screen
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('match-setup-screen').classList.add('active');
};

