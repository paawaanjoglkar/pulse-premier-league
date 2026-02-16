/**
 * Statistics Calculation Integration Tests
 * Tests player statistics, team statistics, and tournament standings
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
    closeTo: function(actual, expected, delta, message) {
        if (Math.abs(actual - expected) > delta) {
            throw new Error(`${message}\nExpected: ${expected} ± ${delta}\nActual: ${actual}`);
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

// Statistics calculation functions
function calculateBattingAverage(runs, dismissals) {
    if (dismissals === 0) return runs;
    return (runs / dismissals).toFixed(2);
}

function calculateStrikeRate(runs, balls) {
    if (balls === 0) return 0;
    return ((runs / balls) * 100).toFixed(2);
}

function calculateBowlingAverage(runsConceded, wickets) {
    if (wickets === 0) return Infinity;
    return (runsConceded / wickets).toFixed(2);
}

function calculateEconomy(runsConceded, overs) {
    if (overs === 0) return 0;
    return (runsConceded / overs).toFixed(2);
}

function calculateNRR(runsScored, oversPlayed, runsConceded, oversBowled) {
    if (oversPlayed === 0 || oversBowled === 0) return 0;
    const runRate = runsScored / oversPlayed;
    const runsConcededRate = runsConceded / oversBowled;
    return (runRate - runsConcededRate).toFixed(3);
}

function calculateMVPScore(runs, wickets, catches, runOuts) {
    return (runs * 1) + (wickets * 20) + (catches * 10) + (runOuts * 15);
}

function calculateTeamPoints(wins, losses, ties, nrs) {
    return (wins * 2) + (ties * 1) + (nrs * 1);
}

// Test Suite
console.log('\n=== Statistics Calculation Integration Tests ===\n');

let passed = 0;
let failed = 0;

// Batting Statistics Tests

// Test 1: Batting Average - Normal Case
if (test('Batting average - normal case', () => {
    const average = calculateBattingAverage(300, 10);
    assert.equals(average, '30.00', 'Average should be 30.00');
})) passed++; else failed++;

// Test 2: Batting Average - Not Out
if (test('Batting average - not out', () => {
    const average = calculateBattingAverage(100, 0);
    assert.equals(average, 100, 'Average should be total runs when not out');
})) passed++; else failed++;

// Test 3: Strike Rate - Fast Scoring
if (test('Strike rate - aggressive batting', () => {
    const sr = calculateStrikeRate(50, 25);
    assert.equals(sr, '200.00', 'Strike rate should be 200');
})) passed++; else failed++;

// Test 4: Strike Rate - Defensive
if (test('Strike rate - defensive batting', () => {
    const sr = calculateStrikeRate(20, 40);
    assert.equals(sr, '50.00', 'Strike rate should be 50');
})) passed++; else failed++;

// Test 5: Strike Rate - Zero Balls
if (test('Strike rate - no balls faced', () => {
    const sr = calculateStrikeRate(0, 0);
    assert.equals(sr, '0', 'Strike rate should be 0 when no balls faced');
})) passed++; else failed++;

// Bowling Statistics Tests

// Test 6: Bowling Average - Normal Case
if (test('Bowling average - normal case', () => {
    const average = calculateBowlingAverage(100, 10);
    assert.equals(average, '10.00', 'Bowling average should be 10.00');
})) passed++; else failed++;

// Test 7: Bowling Average - No Wickets
if (test('Bowling average - no wickets taken', () => {
    const average = calculateBowlingAverage(50, 0);
    assert.equals(average, Infinity, 'Bowling average should be Infinity when no wickets');
})) passed++; else failed++;

// Test 8: Economy Rate - Economical
if (test('Economy rate - economical bowling', () => {
    const economy = calculateEconomy(20, 5);
    assert.equals(economy, '4.00', 'Economy should be 4.00');
})) passed++; else failed++;

// Test 9: Economy Rate - Expensive
if (test('Economy rate - expensive bowling', () => {
    const economy = calculateEconomy(50, 4);
    assert.equals(economy, '12.50', 'Economy should be 12.50');
})) passed++; else failed++;

// Test 10: Economy Rate - No Overs
if (test('Economy rate - no overs bowled', () => {
    const economy = calculateEconomy(0, 0);
    assert.equals(economy, '0', 'Economy should be 0 when no overs bowled');
})) passed++; else failed++;

// Net Run Rate Tests

// Test 11: NRR - Positive
if (test('Net run rate - positive', () => {
    const nrr = calculateNRR(150, 20, 120, 20);
    assert.equals(nrr, '1.500', 'NRR should be positive');
})) passed++; else failed++;

// Test 12: NRR - Negative
if (test('Net run rate - negative', () => {
    const nrr = calculateNRR(100, 20, 140, 20);
    assert.equals(nrr, '-2.000', 'NRR should be negative');
})) passed++; else failed++;

// Test 13: NRR - Zero
if (test('Net run rate - equal rates', () => {
    const nrr = calculateNRR(100, 20, 100, 20);
    assert.equals(nrr, '0.000', 'NRR should be zero');
})) passed++; else failed++;

// Test 14: NRR - Different Overs
if (test('Net run rate - different overs played', () => {
    const nrr = calculateNRR(150, 18, 150, 20);
    // 150/18 - 150/20 = 8.333 - 7.5 = 0.833
    assert.closeTo(parseFloat(nrr), 0.833, 0.01, 'NRR should account for different overs');
})) passed++; else failed++;

// MVP Scoring Tests

// Test 15: MVP Score - Batting Performance
if (test('MVP score - batting focused', () => {
    const score = calculateMVPScore(75, 0, 1, 0);
    assert.equals(score, 85, 'MVP score should be 85 (75 + 10)');
})) passed++; else failed++;

// Test 16: MVP Score - Bowling Performance
if (test('MVP score - bowling focused', () => {
    const score = calculateMVPScore(10, 4, 0, 0);
    assert.equals(score, 90, 'MVP score should be 90 (10 + 80)');
})) passed++; else failed++;

// Test 17: MVP Score - All-Rounder
if (test('MVP score - all-rounder performance', () => {
    const score = calculateMVPScore(50, 2, 2, 1);
    assert.equals(score, 125, 'MVP score should be 125 (50 + 40 + 20 + 15)');
})) passed++; else failed++;

// Test 18: MVP Score - Fielding Focus
if (test('MVP score - fielding focused', () => {
    const score = calculateMVPScore(5, 0, 3, 2);
    assert.equals(score, 65, 'MVP score should be 65 (5 + 30 + 30)');
})) passed++; else failed++;

// Team Statistics Tests

// Test 19: Team Points - All Wins
if (test('Team points - all wins', () => {
    const points = calculateTeamPoints(5, 0, 0, 0);
    assert.equals(points, 10, 'Points should be 10 for 5 wins');
})) passed++; else failed++;

// Test 20: Team Points - Mixed Results
if (test('Team points - mixed results', () => {
    const points = calculateTeamPoints(3, 1, 1, 0);
    assert.equals(points, 7, 'Points should be 7 (6 + 1)');
})) passed++; else failed++;

// Test 21: Team Points - With No Results
if (test('Team points - with no results', () => {
    const points = calculateTeamPoints(2, 1, 0, 1);
    assert.equals(points, 5, 'Points should be 5 (4 + 1)');
})) passed++; else failed++;

// Player Performance Metrics

// Test 22: Century Detection
if (test('Century detection', () => {
    const runs = 101;
    const isCentury = runs >= 100;
    assert.isTrue(isCentury, 'Should detect century');
})) passed++; else failed++;

// Test 23: Half-Century Detection
if (test('Half-century detection', () => {
    const runs = 67;
    const isHalfCentury = runs >= 50 && runs < 100;
    assert.isTrue(isHalfCentury, 'Should detect half-century');
})) passed++; else failed++;

// Test 24: Five-Wicket Haul Detection
if (test('Five-wicket haul detection', () => {
    const wickets = 5;
    const isFifer = wickets >= 5;
    assert.isTrue(isFifer, 'Should detect five-wicket haul');
})) passed++; else failed++;

// Test 25: Boundary Percentage
if (test('Boundary percentage calculation', () => {
    const boundaryRuns = 40; // 10 fours
    const totalRuns = 80;
    const percentage = (boundaryRuns / totalRuns) * 100;
    assert.equals(percentage, 50, 'Boundary percentage should be 50%');
})) passed++; else failed++;

// Test 26: Dot Ball Percentage
if (test('Dot ball percentage - bowler', () => {
    const dotBalls = 18;
    const totalBalls = 24; // 4 overs
    const percentage = ((dotBalls / totalBalls) * 100).toFixed(1);
    assert.equals(percentage, '75.0', 'Dot ball percentage should be 75%');
})) passed++; else failed++;

// Test 27: Partnership Contribution
if (test('Partnership contribution calculation', () => {
    const playerRuns = 45;
    const partnershipRuns = 75;
    const contribution = ((playerRuns / partnershipRuns) * 100).toFixed(1);
    assert.equals(contribution, '60.0', 'Contribution should be 60%');
})) passed++; else failed++;

// Summary
console.log(`\n--- Results ---`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);

if (failed === 0) {
    console.log('\n✓ All statistics tests passed!');
    process.exit(0);
} else {
    console.log(`\n✗ ${failed} test(s) failed`);
    process.exit(1);
}
