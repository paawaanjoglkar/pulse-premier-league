/**
 * PULSE PREMIER LEAGUE - Tournament Awards Module
 * Calculates 13 tournament awards with auto-ranking and override support
 * Phase 4 Implementation
 */

window.PPL = window.PPL || {};

PPL.awards = {
    /**
     * Award definitions - 13 tournament awards
     */
    AWARDS: [
        { id: 'most_runs', name: 'Most Runs', icon: '🏏', category: 'batting', metric: 'runs' },
        { id: 'most_wickets', name: 'Most Wickets', icon: '🔴', category: 'bowling', metric: 'wickets' },
        { id: 'best_economy', name: 'Best Economy Rate', icon: '📊', category: 'bowling', metric: 'economy' },
        { id: 'best_sr', name: 'Best Strike Rate', icon: '⚡', category: 'batting', metric: 'strike_rate' },
        { id: 'most_fours', name: 'Most Boundaries', icon: '4️⃣', category: 'batting', metric: 'boundaries' },
        { id: 'most_catches', name: 'Most Catches', icon: '🧤', category: 'fielding', metric: 'catches' },
        { id: 'most_runouts', name: 'Most Run Outs', icon: '🏃', category: 'fielding', metric: 'runouts' },
        { id: 'highest_score', name: 'Highest Individual Score', icon: '💯', category: 'batting', metric: 'highest_score' },
        { id: 'best_bowling', name: 'Best Bowling Figures', icon: '🎯', category: 'bowling', metric: 'best_bowling' },
        { id: 'most_sixes', name: 'Most Sixes', icon: '6️⃣', category: 'batting', metric: 'sixes' },
        { id: 'all_rounder', name: 'Best All-Rounder', icon: '🌟', category: 'all_rounder', metric: 'all_rounder_score' },
        { id: 'consistency', name: 'Most Consistent', icon: '📈', category: 'batting', metric: 'consistency' },
        { id: 'impact_player', name: 'Impact Player', icon: '💥', category: 'all', metric: 'impact_score' }
    ],

    /**
     * Calculate all tournament awards
     */
    calculateAllAwards: async function() {
        const tournament = await PPL.storage.get(PPL.STORES.TOURNAMENT, 1);
        if (!tournament) {
            PPL.showToast('No tournament configured', 'error');
            return null;
        }

        const allMatches = await PPL.storage.getAll(PPL.STORES.MATCHES);
        const completedMatches = allMatches.filter(m => m.status === 'completed');

        if (completedMatches.length === 0) {
            return { awards: [], matchCount: 0 };
        }

        // Aggregate player statistics
        const playerStats = await this.aggregatePlayerStats(completedMatches);

        // Calculate awards
        const awards = {};
        for (const award of this.AWARDS) {
            awards[award.id] = await this.calculateAward(award, playerStats, completedMatches);
        }

        return { awards, matchCount: completedMatches.length, playerStats };
    },

    /**
     * Aggregate all statistics from all matches
     */
    aggregatePlayerStats: async function(matches) {
        const stats = {};

        for (const match of matches) {
            const allInnings = await PPL.storage.getInningsByMatch(match.id);

            for (const innings of allInnings) {
                // Batting stats
                for (const [batterId, bStats] of Object.entries(innings.batterStats)) {
                    if (!stats[batterId]) {
                        stats[batterId] = {
                            playerId: parseInt(batterId),
                            playerName: '',
                            matches: new Set(),
                            runs: 0,
                            balls: 0,
                            fours: 0,
                            sixes: 0,
                            highest: 0,
                            dismissals: [],
                            innings: 0,
                            notOuts: 0,
                            wickets: 0,
                            ballsBowled: 0,
                            runsConc: 0,
                            maidens: 0,
                            bestBowling: { w: 0, r: 0 },
                            catches: 0,
                            runouts: 0,
                            stumpings: 0
                        };
                    }

                    stats[batterId].matches.add(match.id);
                    stats[batterId].runs += bStats.runs;
                    stats[batterId].balls += bStats.balls;
                    stats[batterId].fours += bStats.fours;
                    stats[batterId].sixes += bStats.sixes;
                    stats[batterId].highest = Math.max(stats[batterId].highest, bStats.runs);
                    stats[batterId].innings++;

                    if (!bStats.dismissal) {
                        stats[batterId].notOuts++;
                    } else {
                        stats[batterId].dismissals.push(bStats.dismissalType);
                    }
                }

                // Bowling stats
                for (const [bowlerId, bStats] of Object.entries(innings.bowlerStats)) {
                    if (!stats[bowlerId]) {
                        stats[bowlerId] = {
                            playerId: parseInt(bowlerId),
                            playerName: '',
                            matches: new Set(),
                            runs: 0,
                            balls: 0,
                            fours: 0,
                            sixes: 0,
                            highest: 0,
                            dismissals: [],
                            innings: 0,
                            notOuts: 0,
                            wickets: 0,
                            ballsBowled: 0,
                            runsConc: 0,
                            maidens: 0,
                            bestBowling: { w: 0, r: 0 },
                            catches: 0,
                            runouts: 0,
                            stumpings: 0
                        };
                    }

                    stats[bowlerId].matches.add(match.id);
                    stats[bowlerId].wickets += bStats.wickets;
                    stats[bowlerId].ballsBowled += bStats.balls;
                    stats[bowlerId].runsConc += bStats.runs;
                    stats[bowlerId].maidens += bStats.maidens;

                    // Update best bowling
                    if (bStats.wickets > stats[bowlerId].bestBowling.w) {
                        stats[bowlerId].bestBowling = { w: bStats.wickets, r: bStats.runs };
                    } else if (bStats.wickets === stats[bowlerId].bestBowling.w && bStats.runs < stats[bowlerId].bestBowling.r) {
                        stats[bowlerId].bestBowling = { w: bStats.wickets, r: bStats.runs };
                    }

                    // Fielding stats
                    if (bStats.fielding) {
                        stats[bowlerId].catches += bStats.fielding.catches || 0;
                        stats[bowlerId].runouts += bStats.fielding.runOuts || 0;
                        stats[bowlerId].stumpings += bStats.fielding.stumpings || 0;
                    }
                }
            }
        }

        // Get player names
        for (const [playerId, pStats] of Object.entries(stats)) {
            try {
                const player = await PPL.storage.get(PPL.STORES.PLAYERS, parseInt(playerId));
                if (player) {
                    pStats.playerName = player.name;
                }
            } catch (e) {
                // Player not found
            }
        }

        return stats;
    },

    /**
     * Calculate individual award
     */
    calculateAward: async function(award, playerStats, matches) {
        let topPlayers = [];

        switch (award.id) {
            case 'most_runs':
                topPlayers = Object.values(playerStats)
                    .filter(p => p.runs > 0)
                    .sort((a, b) => b.runs - a.runs)
                    .slice(0, 3);
                break;

            case 'most_wickets':
                topPlayers = Object.values(playerStats)
                    .filter(p => p.wickets > 0)
                    .sort((a, b) => b.wickets - a.wickets)
                    .slice(0, 3);
                break;

            case 'best_economy':
                topPlayers = Object.values(playerStats)
                    .filter(p => p.ballsBowled >= 6) // Min 1 over
                    .map(p => ({
                        ...p,
                        economy: p.runsConc / PPL.oversToDecimal(Math.floor(p.ballsBowled / 6), p.ballsBowled % 6)
                    }))
                    .sort((a, b) => a.economy - b.economy)
                    .slice(0, 3);
                break;

            case 'best_sr':
                topPlayers = Object.values(playerStats)
                    .filter(p => p.balls >= 10)
                    .map(p => ({
                        ...p,
                        strikeRate: PPL.calculateStrikeRate(p.runs, p.balls)
                    }))
                    .sort((a, b) => parseFloat(b.strikeRate) - parseFloat(a.strikeRate))
                    .slice(0, 3);
                break;

            case 'most_fours':
                topPlayers = Object.values(playerStats)
                    .filter(p => p.fours > 0)
                    .sort((a, b) => b.fours - a.fours)
                    .slice(0, 3);
                break;

            case 'most_catches':
                topPlayers = Object.values(playerStats)
                    .filter(p => p.catches > 0)
                    .sort((a, b) => b.catches - a.catches)
                    .slice(0, 3);
                break;

            case 'most_runouts':
                topPlayers = Object.values(playerStats)
                    .filter(p => p.runouts > 0)
                    .sort((a, b) => b.runouts - a.runouts)
                    .slice(0, 3);
                break;

            case 'highest_score':
                topPlayers = Object.values(playerStats)
                    .filter(p => p.highest > 0)
                    .sort((a, b) => b.highest - a.highest)
                    .slice(0, 3);
                break;

            case 'best_bowling':
                topPlayers = Object.values(playerStats)
                    .filter(p => p.bestBowling.w > 0)
                    .sort((a, b) => {
                        if (b.bestBowling.w !== a.bestBowling.w) {
                            return b.bestBowling.w - a.bestBowling.w;
                        }
                        return a.bestBowling.r - b.bestBowling.r;
                    })
                    .slice(0, 3);
                break;

            case 'most_sixes':
                topPlayers = Object.values(playerStats)
                    .filter(p => p.sixes > 0)
                    .sort((a, b) => b.sixes - a.sixes)
                    .slice(0, 3);
                break;

            case 'all_rounder':
                topPlayers = Object.values(playerStats)
                    .filter(p => p.runs >= 100 && p.wickets >= 3)
                    .map(p => ({
                        ...p,
                        allRounderScore: (p.runs / 100) * 50 + (p.wickets / 10) * 50
                    }))
                    .sort((a, b) => b.allRounderScore - a.allRounderScore)
                    .slice(0, 3);
                break;

            case 'consistency':
                topPlayers = Object.values(playerStats)
                    .filter(p => p.innings >= 3)
                    .map(p => ({
                        ...p,
                        average: p.runs / (p.innings - p.notOuts),
                        consistency: (p.runs / (p.innings - p.notOuts)) / Math.max(1, (p.runs - p.highest) / p.innings)
                    }))
                    .sort((a, b) => b.average - a.average)
                    .slice(0, 3);
                break;

            case 'impact_player':
                topPlayers = Object.values(playerStats)
                    .map(p => ({
                        ...p,
                        matches: p.matches.size,
                        impactScore: (p.runs * 0.3) + (p.wickets * 5) + ((p.catches + p.runouts + p.stumpings) * 3)
                    }))
                    .sort((a, b) => b.impactScore - a.impactScore)
                    .slice(0, 3);
                break;
        }

        return {
            awardId: award.id,
            awardName: award.name,
            icon: award.icon,
            winners: topPlayers.map((p, idx) => ({
                rank: idx + 1,
                playerId: p.playerId,
                playerName: p.playerName,
                value: award.id === 'best_economy' ? p.economy?.toFixed(2) :
                       award.id === 'best_sr' ? p.strikeRate :
                       award.id === 'best_bowling' ? `${p.bestBowling.w}-${p.bestBowling.r}` :
                       award.id === 'consistency' ? p.average?.toFixed(2) :
                       award.id === 'all_rounder' ? p.allRounderScore?.toFixed(2) :
                       award.id === 'impact_player' ? p.impactScore?.toFixed(2) :
                       p[award.metric]
            })),
            overridden: false,
            overrideReason: null
        };
    },

    /**
     * Get all awards with overrides
     */
    getAllAwards: async function() {
        const awards = await PPL.storage.get(PPL.STORES.TOURNAMENT, 1);
        if (!awards || !awards.awards) {
            // Calculate if not cached
            return await this.calculateAllAwards();
        }
        return awards.awards;
    },

    /**
     * Show award details
     */
    showAwardDetail: async function(awardId) {
        const result = await this.calculateAllAwards();
        const award = result.awards[awardId];

        if (!award) {
            PPL.showToast('Award not found', 'error');
            return;
        }

        const awardDef = this.AWARDS.find(a => a.id === awardId);
        let content = `
            <div class="form-container" style="max-height: 80vh; overflow-y: auto;">
                <h3>${awardDef.icon} ${award.awardName}</h3>
                <table style="width: 100%; border-collapse: collapse; margin: var(--spacing-md) 0;">
                    <thead>
                        <tr style="background: var(--accent-color); color: white;">
                            <th style="padding: var(--spacing-sm); text-align: left;">Rank</th>
                            <th style="padding: var(--spacing-sm); text-align: left;">Player</th>
                            <th style="padding: var(--spacing-sm); text-align: right;">Value</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        for (const winner of award.winners) {
            const medal = winner.rank === 1 ? '🥇' : winner.rank === 2 ? '🥈' : '🥉';
            content += `
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: var(--spacing-sm);">${medal} #${winner.rank}</td>
                            <td style="padding: var(--spacing-sm);">${winner.playerName}</td>
                            <td style="padding: var(--spacing-sm); text-align: right; font-weight: bold;">${winner.value}</td>
                        </tr>
            `;
        }

        content += `
                    </tbody>
                </table>
                <div class="form-actions">
                    <button class="btn btn-secondary" onclick="PPL.hideModal()">Close</button>
                </div>
            </div>
        `;

        PPL.showModal(content);
    },

    /**
     * Show award override dialog
     */
    showAwardOverride: async function(awardId) {
        const result = await this.calculateAllAwards();
        const award = result.awards[awardId];
        const awardDef = this.AWARDS.find(a => a.id === awardId);

        if (!award) {
            PPL.showToast('Award not found', 'error');
            return;
        }

        let content = `
            <div class="form-container">
                <h3>Override Award: ${awardDef.icon} ${award.awardName}</h3>
                <div style="background: var(--surface); padding: var(--spacing-md); border-radius: 8px; margin-bottom: var(--spacing-md);">
                    <p><strong>Current Winner:</strong> ${award.winners[0].playerName}</p>
                    <p><strong>Value:</strong> ${award.winners[0].value}</p>
                </div>
                <div class="form-group">
                    <label>New Winner</label>
                    <select id="override-award-player">
                        <option value="">Select player</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Reason (optional)</label>
                    <input type="text" id="override-award-reason" placeholder="e.g., Committee decision">
                </div>
                <div class="form-actions">
                    <button class="btn btn-primary" onclick="PPL.awards.confirmAwardOverride('${awardId}')">Confirm Override</button>
                    <button class="btn btn-secondary" onclick="PPL.hideModal()">Cancel</button>
                </div>
            </div>
        `;

        PPL.showModal(content);

        // Populate players from all matches
        const allMatches = await PPL.storage.getAll(PPL.STORES.MATCHES);
        const completedMatches = allMatches.filter(m => m.status === 'completed');
        const allPlayers = new Set();

        for (const match of completedMatches) {
            const innings = await PPL.storage.getInningsByMatch(match.id);
            for (const inn of innings) {
                inn.battingXI.forEach(p => allPlayers.add(p));
                inn.bowlingXI.forEach(p => allPlayers.add(p));
            }
        }

        const select = document.getElementById('override-award-player');
        const playerArray = Array.from(allPlayers).sort();

        for (const playerId of playerArray) {
            const player = await PPL.storage.get(PPL.STORES.PLAYERS, playerId);
            if (player) {
                const option = document.createElement('option');
                option.value = player.id;
                option.textContent = player.name;
                select.appendChild(option);
            }
        }
    },

    /**
     * Confirm award override
     */
    confirmAwardOverride: async function(awardId) {
        const playerId = parseInt(document.getElementById('override-award-player').value);
        const reason = document.getElementById('override-award-reason').value;

        if (!playerId) {
            PPL.showToast('Please select a player', 'error');
            return;
        }

        await this.overrideAward(awardId, playerId, reason);
        PPL.hideModal();

        // Refresh awards display
        if (window.refreshAwards) {
            await window.refreshAwards();
        }
    },

    /**
     * Override an award winner
     */
    overrideAward: async function(awardId, playerId, reason) {
        const tournament = await PPL.storage.get(PPL.STORES.TOURNAMENT, 1);
        if (!tournament.awards) {
            tournament.awards = {};
        }

        tournament.awards[awardId] = {
            playerId: playerId,
            overridden: true,
            reason: reason || null,
            overriddenAt: new Date().toISOString()
        };

        await PPL.storage.save(PPL.STORES.TOURNAMENT, tournament);
        PPL.showToast('Award overridden', 'success');
    }
};

