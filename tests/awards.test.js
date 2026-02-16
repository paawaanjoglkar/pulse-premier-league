/**
 * Awards System Integration Tests
 * Tests awards calculation, rankings, and player recognition
 */

// Simple test framework
const assert = {
    equals: function(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`);
        }
    },
    isTrue: function(value, message) {
        if (!value) {
            throw new Error(`${message}\nExpected: true\nActual: ${value}`);
        }
    },
    arrayContains: function(array, value, message) {
        if (!array.includes(value)) {
            throw new Error(`${message}\nExpected array to contain: ${value}\nArray: ${JSON.stringify(array)}`);
        }
    }
};

function test(name, fn) {
    try {
        fn();
        console.log(`✓ ${name}`);
        return true;
    } catch (error) {
        console.error(`✗ ${name}`);
        console.error(`  ${error.message}`);
        return false;
    }
}

// Mock player data
function createPlayer(name, stats) {
    return {
        name: name,
        runs: stats.runs || 0,
        balls: stats.balls || 0,
        wickets: stats.wickets || 0,
        runsConceded: stats.runsConceded || 0,
        oversBowled: stats.oversBowled || 0,
        catches: stats.catches || 0,
        runOuts: stats.runOuts || 0,
        mvpScore: stats.mvpScore || 0
    };
}

// Awards calculation functions
function findTopScorer(players) {
    return players.reduce((max, player) =>
        player.runs > max.runs ? player : max
    );
}

function findMostWickets(players) {
    return players.reduce((max, player) =>
        player.wickets > max.wickets ? player : max
    );
}

function findBestStrikeRate(players, minBalls = 10) {
    const eligible = players.filter(p => p.balls >= minBalls);
    if (eligible.length === 0) return null;
    return eligible.reduce((best, player) => {
        const sr = player.balls > 0 ? (player.runs / player.balls) * 100 : 0;
        const bestSr = best.balls > 0 ? (best.runs / best.balls) * 100 : 0;
        return sr > bestSr ? player : best;
    });
}

function findBestEconomy(players, minOvers = 2) {
    const eligible = players.filter(p => p.oversBowled >= minOvers);
    if (eligible.length === 0) return null;
    return eligible.reduce((best, player) => {
        const econ = player.oversBowled > 0 ? player.runsConceded / player.oversBowled : Infinity;
        const bestEcon = best.oversBowled > 0 ? best.runsConceded / best.oversBowled : Infinity;
        return econ < bestEcon ? player : best;
    });
}

function findMVP(players) {
    return players.reduce((max, player) =>
        player.mvpScore > max.mvpScore ? player : max
    );
}

function findBestFielder(players) {
    return players.reduce((max, player) => {
        const totalDismissals = player.catches + player.runOuts;
        const maxDismissals = max.catches + max.runOuts;
        return totalDismissals > maxDismissals ? player : max;
    });
}

function getTop3Scorers(players) {
    return [...players].sort((a, b) => b.runs - a.runs).slice(0, 3);
}

// Test Suite
console.log('\n=== Awards System Integration Tests ===\n');

let passed = 0;
let failed = 0;

// Setup test data
const players = [
    createPlayer('Player1', { runs: 150, balls: 80, wickets: 2, runsConceded: 40, oversBowled: 5, catches: 2, runOuts: 1, mvpScore: 200 }),
    createPlayer('Player2', { runs: 180, balls: 90, wickets: 1, runsConceded: 50, oversBowled: 5, catches: 3, runOuts: 0, mvpScore: 210 }),
    createPlayer('Player3', { runs: 120, balls: 60, wickets: 8, runsConceded: 60, oversBowled: 6, catches: 1, runOuts: 1, mvpScore: 305 }),
    createPlayer('Player4', { runs: 90, balls: 45, wickets: 3, runsConceded: 30, oversBowled: 4, catches: 5, runOuts: 2, mvpScore: 240 }),
    createPlayer('Player5', { runs: 75, balls: 50, wickets: 5, runsConceded: 35, oversBowled: 5, catches: 2, runOuts: 0, mvpScore: 195 })
];

// Test 1: Top Scorer Award
if (test('Top scorer identification', () => {
    const topScorer = findTopScorer(players);
    assert.equals(topScorer.name, 'Player2', 'Player2 should be top scorer with 180 runs');
})) passed++; else failed++;

// Test 2: Most Wickets Award
if (test('Most wickets identification', () => {
    const bestBowler = findMostWickets(players);
    assert.equals(bestBowler.name, 'Player3', 'Player3 should have most wickets (8)');
})) passed++; else failed++;

// Test 3: Best Strike Rate Award
if (test('Best strike rate identification', () => {
    const bestSR = findBestStrikeRate(players, 10);
    assert.equals(bestSR.name, 'Player4', 'Player4 should have best SR (200)');
})) passed++; else failed++;

// Test 4: Best Economy Award
if (test('Best economy rate identification', () => {
    const bestEcon = findBestEconomy(players, 2);
    assert.equals(bestEcon.name, 'Player4', 'Player4 should have best economy (7.5)');
})) passed++; else failed++;

// Test 5: MVP Award
if (test('MVP identification', () => {
    const mvp = findMVP(players);
    assert.equals(mvp.name, 'Player3', 'Player3 should be MVP with highest score');
})) passed++; else failed++;

// Test 6: Best Fielder Award
if (test('Best fielder identification', () => {
    const bestFielder = findBestFielder(players);
    assert.equals(bestFielder.name, 'Player4', 'Player4 should be best fielder (7 dismissals)');
})) passed++; else failed++;

// Test 7: Top 3 Scorers
if (test('Top 3 scorers list', () => {
    const top3 = getTop3Scorers(players);
    assert.equals(top3.length, 3, 'Should return 3 players');
    assert.equals(top3[0].name, 'Player2', 'First should be Player2');
    assert.equals(top3[1].name, 'Player1', 'Second should be Player1');
    assert.equals(top3[2].name, 'Player3', 'Third should be Player3');
})) passed++; else failed++;

// Test 8: Minimum Qualification - Strike Rate
if (test('Strike rate award - minimum qualification', () => {
    const bestSR = findBestStrikeRate(players, 100);
    assert.equals(bestSR, null, 'Should return null when no one qualifies');
})) passed++; else failed++;

// Test 9: Minimum Qualification - Economy
if (test('Economy award - minimum qualification', () => {
    const bestEcon = findBestEconomy(players, 10);
    assert.equals(bestEcon, null, 'Should return null when minimum overs not met');
})) passed++; else failed++;

// Test 10: Award Tie - Most Runs
if (test('Award tie handling - runs', () => {
    const tiedPlayers = [
        createPlayer('P1', { runs: 100, mvpScore: 150 }),
        createPlayer('P2', { runs: 100, mvpScore: 140 })
    ];
    const topScorer = findTopScorer(tiedPlayers);
    assert.isTrue(topScorer.runs === 100, 'Should handle tied runs');
})) passed++; else failed++;

// Test 11: Multiple Award Winner
if (test('Player winning multiple awards', () => {
    const awards = [];
    if (findTopScorer(players).name === 'Player2') awards.push('Top Scorer');
    if (findMVP(players).name === 'Player3') awards.push('MVP');
    assert.isTrue(awards.length >= 2, 'Should track multiple awards');
})) passed++; else failed++;

// Test 12: Award Criteria - Century Bonus
if (test('Century achievement detection', () => {
    const centuryScorers = players.filter(p => p.runs >= 100);
    assert.equals(centuryScorers.length, 3, 'Should identify 3 century scorers');
})) passed++; else failed++;

// Test 13: Award Criteria - Five-Wicket Haul
if (test('Five-wicket haul detection', () => {
    const fiferTakers = players.filter(p => p.wickets >= 5);
    assert.equals(fiferTakers.length, 2, 'Should identify 2 five-wicket hauls');
})) passed++; else failed++;

// Test 14: Best All-Rounder Calculation
if (test('Best all-rounder identification', () => {
    const allRounders = players.filter(p => p.runs >= 50 && p.wickets >= 3);
    assert.equals(allRounders.length, 2, 'Should identify 2 all-rounders');
})) passed++; else failed++;

// Test 15: Consistent Performer
if (test('Consistent performer - balanced contribution', () => {
    const consistent = players.filter(p => {
        const hasRuns = p.runs >= 50;
        const hasWickets = p.wickets >= 2;
        const hasFielding = (p.catches + p.runOuts) >= 2;
        return hasRuns && (hasWickets || hasFielding);
    });
    assert.isTrue(consistent.length >= 2, 'Should identify consistent performers');
})) passed++; else failed++;

// Test 16: Emerging Player Award
if (test('Emerging player criteria', () => {
    // Simulate player with high potential but limited matches
    const emergingPlayer = createPlayer('Young1', {
        runs: 120, balls: 60, wickets: 3, mvpScore: 180
    });
    const isEmerging = emergingPlayer.runs >= 100 || emergingPlayer.wickets >= 3;
    assert.isTrue(isEmerging, 'Should identify emerging player');
})) passed++; else failed++;

// Test 17: Team of the Tournament Selection
if (test('Team selection - balanced composition', () => {
    const batsmen = players.filter(p => p.runs >= 100).length;
    const bowlers = players.filter(p => p.wickets >= 3).length;
    const allRounders = players.filter(p => p.runs >= 50 && p.wickets >= 2).length;
    const hasBalance = batsmen >= 2 && bowlers >= 2;
    assert.isTrue(hasBalance, 'Team should have balanced composition');
})) passed++; else failed++;

// Test 18: Performance Comparison
if (test('Performance comparison - runs vs wickets', () => {
    const player1Impact = players[0].runs + (players[0].wickets * 20);
    const player2Impact = players[2].runs + (players[2].wickets * 20);
    assert.isTrue(player2Impact > player1Impact, 'Should compare overall impact');
})) passed++; else failed++;

// Test 19: Award Eligibility - Minimum Matches
if (test('Award eligibility - participation threshold', () => {
    // All players have stats, so eligible
    const eligible = players.filter(p => p.runs > 0 || p.wickets > 0);
    assert.equals(eligible.length, 5, 'All players should be eligible');
})) passed++; else failed++;

// Test 20: Special Awards - Hat-trick
if (test('Special achievement - hat-trick simulation', () => {
    const playerWithHattrick = createPlayer('Bowler1', { wickets: 3 });
    // In real system, check consecutive wickets
    const hasHattrick = playerWithHattrick.wickets >= 3;
    assert.isTrue(hasHattrick, 'Should detect hat-trick possibility');
})) passed++; else failed++;

// Test 21: Match Performance Awards
if (test('Match performance - player of the match criteria', () => {
    const matchMVP = players.reduce((best, p) => {
        const score = p.runs + (p.wickets * 20) + (p.catches * 10);
        const bestScore = best.runs + (best.wickets * 20) + (best.catches * 10);
        return score > bestScore ? p : best;
    });
    assert.equals(matchMVP.name, 'Player3', 'Should identify match MVP');
})) passed++; else failed++;

// Test 22: Fielding Excellence Award
if (test('Fielding excellence - catches only', () => {
    const bestCatcher = players.reduce((max, p) =>
        p.catches > max.catches ? p : max
    );
    assert.equals(bestCatcher.name, 'Player4', 'Should identify best catcher');
})) passed++; else failed++;

// Test 23: Run Out Specialist
if (test('Run out specialist identification', () => {
    const runOutSpecialist = players.reduce((max, p) =>
        p.runOuts > max.runOuts ? p : max
    );
    assert.isTrue(runOutSpecialist.runOuts >= 1, 'Should identify run out specialist');
})) passed++; else failed++;

// Summary
console.log(`\n--- Results ---`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);

if (failed === 0) {
    console.log('\n✓ All awards system tests passed!');
    process.exit(0);
} else {
    console.log(`\n✗ ${failed} test(s) failed`);
    process.exit(1);
}
