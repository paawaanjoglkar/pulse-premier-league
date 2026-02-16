/**
 * PULSE PREMIER LEAGUE - MVP & Awards Module
 * Handles MVP calculation and 13 tournament awards
 */

window.PPL = window.PPL || {};

PPL.mvp = {
    /**
     * Calculate MVP for a match
     * Formula:
     * - Each run: 1 point
     * - 25+ runs bonus: +10 points
     * - 50+ runs bonus: +20 points (cumulative with 25+, so total +30)
     * - Each wicket: 20 points
     * - 2+ wickets bonus: +10 points
     * - Each catch/stumping/run-out: 10 points
     */
    calculateMatchMVP: async function(matchId) {
        const allInnings = await PPL.storage.getInningsByMatch(matchId);
        const players = {};

        // Calculate points for all players across all innings
        for (const innings of allInnings) {
            // Batting points
            for (const [batterId, stats] of Object.entries(innings.batterStats)) {
                if (!players[batterId]) {
                    players[batterId] = {
                        playerId: parseInt(batterId),
                        runs: 0,
                        wickets: 0,
                        fielding: 0,
                        total: 0
                    };
                }

                const runPoints = stats.runs; // 1 point per run
                let bonus = 0;

                if (stats.runs >= 50) {
                    bonus = 30; // +10 for 25+ and +20 for 50+
                } else if (stats.runs >= 25) {
                    bonus = 10;
                }

                players[batterId].runs = stats.runs;
                players[batterId].total += runPoints + bonus;
            }

            // Bowling points
            for (const [bowlerId, stats] of Object.entries(innings.bowlerStats)) {
                if (!players[bowlerId]) {
                    players[bowlerId] = {
                        playerId: parseInt(bowlerId),
                        runs: 0,
                        wickets: 0,
                        fielding: 0,
                        total: 0
                    };
                }

                const wicketPoints = stats.wickets * 20; // 20 points per wicket
                const bonus = stats.wickets >= 2 ? 10 : 0;

                players[bowlerId].wickets = stats.wickets;
                players[bowlerId].total += wicketPoints + bonus;

                // Fielding points
                if (stats.fielding) {
                    const fieldingPoints = (stats.fielding.catches + stats.fielding.runOuts + stats.fielding.stumpings) * 10;
                    players[bowlerId].fielding = stats.fielding.catches + stats.fielding.runOuts + stats.fielding.stumpings;
                    players[bowlerId].total += fieldingPoints;
                }
            }
        }

        // Find MVP (highest points)
        let mvpId = null;
        let maxPoints = 0;
        const tiedPlayers = [];

        for (const [playerId, data] of Object.entries(players)) {
            if (data.total > maxPoints) {
                maxPoints = data.total;
                mvpId = parseInt(playerId);
                tiedPlayers.length = 0;
                tiedPlayers.push(parseInt(playerId));
            } else if (data.total === maxPoints && data.total > 0) {
                tiedPlayers.push(parseInt(playerId));
            }
        }

        // Get MVP player details
        if (mvpId) {
            const mvpPlayer = await PPL.storage.get(PPL.STORES.PLAYERS, mvpId);
            return {
                playerId: mvpId,
                playerName: mvpPlayer.name,
                points: maxPoints,
                runs: players[mvpId].runs,
                wickets: players[mvpId].wickets,
                fielding: players[mvpId].fielding,
                tied: tiedPlayers.length > 1,
                tiedPlayers: tiedPlayers
            };
        }

        return null;
    },

    /**
     * Show MVP selection/confirmation dialog
     */
    showMVPDialog: async function(matchId, autoMVP) {
        const content = `
            <div class="form-container">
                <h3>Match MVP</h3>
                <div class="mvp-auto">
                    <p><strong>Auto-calculated MVP:</strong></p>
                    <p class="mvp-name">${autoMVP.playerName}</p>
                    <p class="mvp-details">
                        ${autoMVP.runs} runs, ${autoMVP.wickets} wickets, ${autoMVP.fielding} fielding
                    </p>
                    <p class="mvp-points">Total: ${autoMVP.points} MVP points</p>
                    ${autoMVP.tied ? '<p class="text-muted">Note: Multiple players tied with same points</p>' : ''}
                </div>
                <div class="form-actions">
                    <button class="btn btn-primary" onclick="PPL.mvp.confirmMVP(${matchId}, ${autoMVP.playerId})">Confirm MVP</button>
                    <button class="btn btn-secondary" onclick="PPL.mvp.showOverrideDialog(${matchId})">Override</button>
                </div>
            </div>
        `;

        PPL.showModal(content);
    },

    /**
     * Confirm MVP
     */
    confirmMVP: async function(matchId, playerId) {
        const match = await PPL.storage.get(PPL.STORES.MATCHES, matchId);
        match.mvp = {
            playerId: playerId,
            overridden: false,
            reason: null
        };
        await PPL.storage.saveMatch(match);

        PPL.hideModal();
        PPL.showToast('MVP confirmed!', 'success');

        // Continue to match complete flow
        // Show back to dashboard
    },

    /**
     * Show override dialog
     */
    showOverrideDialog: async function(matchId) {
        const match = await PPL.storage.get(PPL.STORES.MATCHES, matchId);
        const allInnings = await PPL.storage.getInningsByMatch(matchId);

        // Get all players who played
        const allPlayers = new Set();
        for (const innings of allInnings) {
            innings.battingXI.forEach(p => allPlayers.add(p));
            innings.bowlingXI.forEach(p => allPlayers.add(p));
        }

        const content = `
            <div class="form-container">
                <h3>Override MVP</h3>
                <div class="form-group">
                    <label>Select Player</label>
                    <select id="override-player">
                        <option value="">Select player</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Reason (optional)</label>
                    <input type="text" id="override-reason" placeholder="e.g., Match-winning catch">
                </div>
                <div class="form-actions">
                    <button class="btn btn-primary" onclick="PPL.mvp.confirmOverride(${matchId})">Confirm Override</button>
                    <button class="btn btn-secondary" onclick="PPL.hideModal()">Cancel</button>
                </div>
            </div>
        `;

        PPL.showModal(content);

        // Populate players
        const select = document.getElementById('override-player');
        for (const playerId of allPlayers) {
            const player = await PPL.storage.get(PPL.STORES.PLAYERS, playerId);
            const option = document.createElement('option');
            option.value = player.id;
            option.textContent = player.name;
            select.appendChild(option);
        }
    },

    /**
     * Confirm override
     */
    confirmOverride: async function(matchId) {
        const playerId = parseInt(document.getElementById('override-player').value);
        const reason = document.getElementById('override-reason').value;

        if (!playerId) {
            PPL.showToast('Please select a player', 'error');
            return;
        }

        const match = await PPL.storage.get(PPL.STORES.MATCHES, matchId);
        match.mvp = {
            playerId: playerId,
            overridden: true,
            reason: reason || null
        };
        await PPL.storage.saveMatch(match);

        // Log the override
        await PPL.storage.logEdit(matchId, 'mvp_override', `MVP overridden${reason ? ': ' + reason : ''}`, null, playerId);

        PPL.hideModal();
        PPL.showToast('MVP overridden', 'success');
    }
};

