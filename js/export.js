/**
 * PULSE PREMIER LEAGUE - Excel Export Module
 * Exports 7-sheet Excel workbook with complete tournament data
 * Phase 4 Implementation
 */

window.PPL = window.PPL || {};

PPL.export = {
    /**
     * Export complete tournament data to Excel (7 sheets)
     * 1. Tournament Summary
     * 2. Matches Summary
     * 3. Batting Statistics
     * 4. Bowling Statistics
     * 5. Team Statistics
     * 6. Player Career Stats
     * 7. Awards
     */
    exportToExcel: async function() {
        try {
            PPL.showToast('Preparing Excel export...', 'info');

            // Check if SheetJS is loaded
            if (typeof XLSX === 'undefined') {
                PPL.showToast('SheetJS library not loaded. Check lib/README.md for setup instructions.', 'error');
                return;
            }

            const tournament = await PPL.storage.get(PPL.STORES.TOURNAMENT, 1);
            const workbook = XLSX.utils.book_new();

            // Sheet 1: Tournament Summary
            await this.addTournamentSummary(workbook, tournament);

            // Sheet 2: Matches Summary
            await this.addMatchesSummary(workbook, tournament);

            // Sheet 3: Batting Statistics
            await this.addBattingStats(workbook);

            // Sheet 4: Bowling Statistics
            await this.addBowlingStats(workbook);

            // Sheet 5: Team Statistics
            await this.addTeamStats(workbook);

            // Sheet 6: Player Career Stats
            await this.addPlayerStats(workbook);

            // Sheet 7: Awards
            await this.addAwards(workbook);

            // Generate filename with timestamp
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `${tournament.name.replace(/\s+/g, '_')}_${timestamp}.xlsx`;

            // Save workbook
            XLSX.writeFile(workbook, filename);

            PPL.showToast(`Excel exported: ${filename}`, 'success');

        } catch (error) {
            console.error('Export failed:', error);
            PPL.showToast('Failed to export Excel: ' + error.message, 'error');
        }
    },

    /**
     * Add Tournament Summary sheet
     */
    addTournamentSummary: async function(workbook, tournament) {
        const data = [
            ['PULSE PREMIER LEAGUE - TOURNAMENT SUMMARY', ''],
            ['', ''],
            ['Tournament Name', tournament.name || 'N/A'],
            ['Format', `${tournament.overs} overs`],
            ['Total Matches', 0],
            ['Completed Matches', 0],
            ['Total Teams', 0],
            ['Total Players', 0],
            ['Export Date', new Date().toLocaleString()],
            ['', '']
        ];

        // Count data
        const matches = await PPL.storage.getAll(PPL.STORES.MATCHES);
        const completedMatches = matches.filter(m => m.status === 'completed').length;
        const teams = await PPL.storage.getAll(PPL.STORES.TEAMS);
        const players = await PPL.storage.getAll(PPL.STORES.PLAYERS);

        data[4][1] = matches.length;
        data[5][1] = completedMatches;
        data[6][1] = teams.length;
        data[7][1] = players.length;

        const worksheet = XLSX.utils.aoa_to_sheet(data);
        worksheet['!cols'] = [{ wch: 30 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Tournament Summary');
    },

    /**
     * Add Matches Summary sheet
     */
    addMatchesSummary: async function(workbook, tournament) {
        const matches = await PPL.storage.getAll(PPL.STORES.MATCHES);
        const completedMatches = matches.filter(m => m.status === 'completed');

        const data = [['Match ID', 'Team 1', 'Team 2', 'Status', 'Winner', 'Margin', 'MVP', 'Date']];

        for (const match of completedMatches) {
            const team1 = await PPL.storage.get(PPL.STORES.TEAMS, match.team1Id);
            const team2 = await PPL.storage.get(PPL.STORES.TEAMS, match.team2Id);
            const mvpPlayer = match.mvp ? await PPL.storage.get(PPL.STORES.PLAYERS, match.mvp.playerId) : null;

            data.push([
                match.id,
                team1.name,
                team2.name,
                match.status,
                match.result?.winner || 'N/A',
                match.result?.marginText || 'N/A',
                mvpPlayer?.name || 'N/A',
                new Date(match.createdAt).toLocaleDateString()
            ]);
        }

        const worksheet = XLSX.utils.aoa_to_sheet(data);
        worksheet['!cols'] = Array(8).fill().map(() => ({ wch: 20 }));
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Matches Summary');
    },

    /**
     * Add Batting Statistics sheet
     */
    addBattingStats: async function(workbook) {
        const matches = await PPL.storage.getAll(PPL.STORES.MATCHES);
        const completedMatches = matches.filter(m => m.status === 'completed');

        const playerBattingStats = {};

        for (const match of completedMatches) {
            const innings = await PPL.storage.getInningsByMatch(match.id);
            for (const inn of innings) {
                for (const [batterId, stats] of Object.entries(inn.batterStats)) {
                    if (!playerBattingStats[batterId]) {
                        playerBattingStats[batterId] = {
                            playerId: parseInt(batterId),
                            playerName: '',
                            matches: 0,
                            innings: 0,
                            runs: 0,
                            balls: 0,
                            avg: 0,
                            sr: 0,
                            fours: 0,
                            sixes: 0,
                            highest: 0,
                            notOuts: 0
                        };
                    }

                    playerBattingStats[batterId].runs += stats.runs;
                    playerBattingStats[batterId].balls += stats.balls;
                    playerBattingStats[batterId].fours += stats.fours;
                    playerBattingStats[batterId].sixes += stats.sixes;
                    playerBattingStats[batterId].highest = Math.max(playerBattingStats[batterId].highest, stats.runs);
                    playerBattingStats[batterId].innings++;
                    if (!stats.dismissal) playerBattingStats[batterId].notOuts++;
                }
            }
        }

        // Calculate averages
        for (const stats of Object.values(playerBattingStats)) {
            const player = await PPL.storage.get(PPL.STORES.PLAYERS, stats.playerId);
            if (player) stats.playerName = player.name;
            stats.avg = stats.innings > stats.notOuts ? (stats.runs / (stats.innings - stats.notOuts)).toFixed(2) : 'N/A';
            stats.sr = stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(2) : '0.00';
            stats.matches = new Set([...completedMatches.map(m => m.id)]).size;
        }

        const data = [['Player', 'Matches', 'Innings', 'Runs', 'Balls', 'Avg', 'SR', '4s', '6s', 'Highest']];

        for (const stats of Object.values(playerBattingStats).sort((a, b) => b.runs - a.runs)) {
            data.push([
                stats.playerName,
                stats.matches,
                stats.innings,
                stats.runs,
                stats.balls,
                stats.avg,
                stats.sr,
                stats.fours,
                stats.sixes,
                stats.highest
            ]);
        }

        const worksheet = XLSX.utils.aoa_to_sheet(data);
        worksheet['!cols'] = Array(10).fill().map(() => ({ wch: 15 }));
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Batting Stats');
    },

    /**
     * Add Bowling Statistics sheet
     */
    addBowlingStats: async function(workbook) {
        const matches = await PPL.storage.getAll(PPL.STORES.MATCHES);
        const completedMatches = matches.filter(m => m.status === 'completed');

        const playerBowlingStats = {};

        for (const match of completedMatches) {
            const innings = await PPL.storage.getInningsByMatch(match.id);
            for (const inn of innings) {
                for (const [bowlerId, stats] of Object.entries(inn.bowlerStats)) {
                    if (stats.balls === 0) continue; // Skip if didn't bowl

                    if (!playerBowlingStats[bowlerId]) {
                        playerBowlingStats[bowlerId] = {
                            playerId: parseInt(bowlerId),
                            playerName: '',
                            overs: '0.0',
                            runs: 0,
                            wickets: 0,
                            economy: 0,
                            strikeRate: 0,
                            maidens: 0
                        };
                    }

                    playerBowlingStats[bowlerId].runs += stats.runs;
                    playerBowlingStats[bowlerId].wickets += stats.wickets;
                    playerBowlingStats[bowlerId].maidens += stats.maidens;
                    const balls = playerBowlingStats[bowlerId].overs.split('.').join('');
                    const totalBalls = parseInt(balls.substring(0, balls.length - 1)) * 6 + parseInt(balls.substring(balls.length - 1)) + stats.balls;
                    const overCount = Math.floor(totalBalls / 6);
                    const ballCount = totalBalls % 6;
                    playerBowlingStats[bowlerId].overs = `${overCount}.${ballCount}`;
                }
            }
        }

        // Calculate averages
        for (const stats of Object.values(playerBowlingStats)) {
            const player = await PPL.storage.get(PPL.STORES.PLAYERS, stats.playerId);
            if (player) stats.playerName = player.name;

            const overs = parseFloat(stats.overs);
            const balls = Math.floor(overs) * 6 + Math.round((overs % 1) * 10);
            stats.economy = balls > 0 ? (stats.runs / (balls / 6)).toFixed(2) : '0.00';
            stats.strikeRate = stats.wickets > 0 ? (balls / stats.wickets).toFixed(2) : 'N/A';
        }

        const data = [['Player', 'Overs', 'Runs', 'Wickets', 'Economy', 'Strike Rate', 'Maidens']];

        for (const stats of Object.values(playerBowlingStats).sort((a, b) => b.wickets - a.wickets)) {
            data.push([
                stats.playerName,
                stats.overs,
                stats.runs,
                stats.wickets,
                stats.economy,
                stats.strikeRate,
                stats.maidens
            ]);
        }

        const worksheet = XLSX.utils.aoa_to_sheet(data);
        worksheet['!cols'] = Array(7).fill().map(() => ({ wch: 15 }));
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Bowling Stats');
    },

    /**
     * Add Team Statistics sheet
     */
    addTeamStats: async function(workbook) {
        const points = await PPL.storage.getAll(PPL.STORES.POINTS);

        const data = [['Team', 'Matches', 'Won', 'Lost', 'Points', 'NRR', 'Runs For', 'Runs Against']];

        for (const point of points.sort((a, b) => b.points - a.points)) {
            const team = await PPL.storage.get(PPL.STORES.TEAMS, point.teamId);
            data.push([
                team.name,
                point.matches,
                point.wins,
                point.losses,
                point.points,
                point.nrr.toFixed(3),
                point.runsFor,
                point.runsAgainst
            ]);
        }

        const worksheet = XLSX.utils.aoa_to_sheet(data);
        worksheet['!cols'] = Array(8).fill().map(() => ({ wch: 18 }));
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Team Stats');
    },

    /**
     * Add Player Career Stats sheet
     */
    addPlayerStats: async function(workbook) {
        const players = await PPL.storage.getAll(PPL.STORES.PLAYERS);
        const data = [['Player', 'Team', 'Role', 'Jersey Number', 'Gender']];

        for (const player of players.sort((a, b) => a.name.localeCompare(b.name))) {
            const team = await PPL.storage.get(PPL.STORES.TEAMS, player.teamId);
            data.push([
                player.name,
                team.name,
                player.role || 'All-Rounder',
                player.jerseyNumber || 'N/A',
                player.gender || 'N/A'
            ]);
        }

        const worksheet = XLSX.utils.aoa_to_sheet(data);
        worksheet['!cols'] = Array(5).fill().map(() => ({ wch: 20 }));
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Players');
    },

    /**
     * Add Awards sheet
     */
    addAwards: async function(workbook) {
        const result = await PPL.awards.calculateAllAwards();
        const data = [['Award', 'Winner', 'Value', 'Runner Up 2', 'Runner Up 3']];

        if (result.awards) {
            for (const [awardId, award] of Object.entries(result.awards)) {
                if (!award.winners || award.winners.length === 0) continue;

                const winner = award.winners[0];
                const runner2 = award.winners[1];
                const runner3 = award.winners[2];

                data.push([
                    award.awardName,
                    winner.playerName,
                    winner.value,
                    runner2 ? runner2.playerName : 'N/A',
                    runner3 ? runner3.playerName : 'N/A'
                ]);
            }
        }

        const worksheet = XLSX.utils.aoa_to_sheet(data);
        worksheet['!cols'] = Array(5).fill().map(() => ({ wch: 25 }));
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Awards');
    }
};

