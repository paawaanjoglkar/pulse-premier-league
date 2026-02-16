/**
 * PULSE PREMIER LEAGUE - Points Table Module
 * Handles points table calculation, NRR, and tiebreakers
 * Phase 3 implementation
 */

window.PPL = window.PPL || {};

PPL.points = {
    /**
     * Calculate complete points table for the tournament
     * Returns sorted standings with points, NRR, and stats
     */
    calculatePointsTable: async function() {
        const tournament = await PPL.storage.getTournament();
        const allTeams = await PPL.storage.getAll(PPL.STORES.TEAMS);
        const allMatches = await PPL.storage.getAll(PPL.STORES.MATCHES);

        // Filter only active teams
        const activeTeams = allTeams.filter(t => t.status === 'active');

        // Initialize standings
        const standings = {};
        for (const team of activeTeams) {
            standings[team.id] = {
                teamId: team.id,
                teamName: team.name,
                played: 0,
                won: 0,
                lost: 0,
                tied: 0,
                cancelled: 0,
                points: 0,
                totalRunsScored: 0,
                totalOversScored: 0,
                totalRunsConceded: 0,
                totalOversConceded: 0,
                nrr: 0.000
            };
        }

        // Process all completed matches
        for (const match of allMatches) {
            if (match.status !== 'completed') continue;

            const team1Id = match.team1;
            const team2Id = match.team2;

            // Skip if either team is not active
            if (!standings[team1Id] || !standings[team2Id]) continue;

            // Get all innings for this match
            const innings = await PPL.storage.getInningsByMatch(match.id);

            if (match.result === 'cancelled') {
                // Cancelled match: 1 point each
                standings[team1Id].played++;
                standings[team2Id].played++;
                standings[team1Id].cancelled++;
                standings[team2Id].cancelled++;
                standings[team1Id].points += 1;
                standings[team2Id].points += 1;
            } else if (match.result === 'tied') {
                // Tied match: 1 point each, update NRR stats
                standings[team1Id].played++;
                standings[team2Id].played++;
                standings[team1Id].tied++;
                standings[team2Id].tied++;
                standings[team1Id].points += 1;
                standings[team2Id].points += 1;

                this.updateNRRStats(standings, team1Id, team2Id, innings, tournament.overs);
            } else {
                // Completed match with winner
                const winnerId = match.winner;
                const loserId = winnerId === team1Id ? team2Id : team1Id;

                standings[team1Id].played++;
                standings[team2Id].played++;
                standings[winnerId].won++;
                standings[loserId].lost++;
                standings[winnerId].points += 2;

                this.updateNRRStats(standings, team1Id, team2Id, innings, tournament.overs);
            }
        }

        // Calculate NRR for each team
        for (const teamId in standings) {
            const team = standings[teamId];
            if (team.totalOversScored > 0 && team.totalOversConceded > 0) {
                const runRate = team.totalRunsScored / team.totalOversScored;
                const concededRate = team.totalRunsConceded / team.totalOversConceded;
                team.nrr = parseFloat((runRate - concededRate).toFixed(3));
            }
        }

        // Convert to array and sort
        const standingsArray = Object.values(standings);
        standingsArray.sort((a, b) => {
            // First: Points (descending)
            if (b.points !== a.points) return b.points - a.points;

            // Second: NRR (descending)
            if (b.nrr !== a.nrr) return b.nrr - a.nrr;

            // Third: Most wins (descending)
            if (b.won !== a.won) return b.won - a.won;

            // Fourth: Alphabetical
            return a.teamName.localeCompare(b.teamName);
        });

        return standingsArray;
    },

    /**
     * Update NRR statistics for both teams based on match innings
     */
    updateNRRStats: function(standings, team1Id, team2Id, innings, maxOvers) {
        // Innings can be 1 (abandoned), 2 (normal), or more (super overs)
        // Only count first 2 innings for NRR (ignore super overs)
        const normalInnings = innings.filter(i => i.inningsNumber <= 2);

        for (const inning of normalInnings) {
            const battingTeamId = inning.battingTeam;
            const bowlingTeamId = battingTeamId === team1Id ? team2Id : team1Id;

            const runsScored = inning.totalRuns;
            const wicketsFallen = inning.wickets;
            const completedOvers = inning.completedOvers;
            const currentBalls = inning.currentOverBalls || 0;

            // Calculate overs as decimal
            const oversDecimal = completedOvers + (currentBalls / 6);

            // For batting team: add runs and overs
            standings[battingTeamId].totalRunsScored += runsScored;

            // If all out, use full allotted overs for batting stats
            if (wicketsFallen >= 10) {
                standings[battingTeamId].totalOversScored += maxOvers;
            } else {
                // Use actual overs faced
                standings[battingTeamId].totalOversScored += oversDecimal;
            }

            // For bowling team: add runs conceded and overs bowled
            standings[bowlingTeamId].totalRunsConceded += runsScored;
            standings[bowlingTeamId].totalOversConceded += oversDecimal;
        }
    },

    /**
     * Display points table on screen
     */
    showPointsTable: async function() {
        const standings = await this.calculatePointsTable();

        let html = '';

        if (standings.length === 0) {
            html += '<p class="text-muted">No matches completed yet.</p>';
        } else {
            html += `
                <table class="points-table">
                    <thead>
                        <tr>
                            <th>Pos</th>
                            <th>Team</th>
                            <th>M</th>
                            <th>W</th>
                            <th>L</th>
                            <th>T</th>
                            <th>Pts</th>
                            <th>NRR</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            standings.forEach((team, index) => {
                const nrrClass = team.nrr > 0 ? 'nrr-positive' : (team.nrr < 0 ? 'nrr-negative' : '');
                const nrrDisplay = team.nrr > 0 ? `+${team.nrr.toFixed(3)}` : team.nrr.toFixed(3);

                html += `
                    <tr class="points-row ${index < 4 ? 'qualified-position' : ''}">
                        <td class="position">${index + 1}</td>
                        <td class="team-name">${team.teamName}</td>
                        <td>${team.played}</td>
                        <td>${team.won}</td>
                        <td>${team.lost}</td>
                        <td>${team.tied}</td>
                        <td class="points-value">${team.points}</td>
                        <td class="nrr-value ${nrrClass}">${nrrDisplay}</td>
                    </tr>
                `;
            });

            html += `
                    </tbody>
                </table>

                <div class="points-legend">
                    <h4>Legend</h4>
                    <p><strong>M</strong> = Matches Played | <strong>W</strong> = Won | <strong>L</strong> = Lost</p>
                    <p><strong>T</strong> = Tied/Cancelled | <strong>Pts</strong> = Points | <strong>NRR</strong> = Net Run Rate</p>
                    <p class="qualified-note">Top 4 teams qualify for playoffs</p>
                </div>
            `;
        }

        const pointsTableContainer = document.getElementById('points-table-container');
        pointsTableContainer.innerHTML = html;
    },

    /**
     * Get team's position in points table
     */
    getTeamPosition: async function(teamId) {
        const standings = await this.calculatePointsTable();
        const position = standings.findIndex(t => t.teamId === teamId);
        return position >= 0 ? position + 1 : null;
    },

    /**
     * Get head-to-head record between two teams
     */
    getHeadToHead: async function(team1Id, team2Id) {
        const allMatches = await PPL.storage.getAll(PPL.STORES.MATCHES);

        const h2hMatches = allMatches.filter(m =>
            m.status === 'completed' &&
            ((m.team1 === team1Id && m.team2 === team2Id) ||
             (m.team1 === team2Id && m.team2 === team1Id))
        );

        let team1Wins = 0;
        let team2Wins = 0;
        let ties = 0;

        for (const match of h2hMatches) {
            if (match.result === 'tied') {
                ties++;
            } else if (match.winner === team1Id) {
                team1Wins++;
            } else if (match.winner === team2Id) {
                team2Wins++;
            }
        }

        return {
            matchesPlayed: h2hMatches.length,
            team1Wins,
            team2Wins,
            ties
        };
    }
};

