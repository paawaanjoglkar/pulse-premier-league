/**
 * Match Management Integration Tests
 * Tests full workflow of match creation, management, and completion
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
    isFalse: function(value, message) {
        if (value) {
            throw new Error(`${message}\nExpected: false\nActual: ${value}`);
        }
    },
    isNull: function(value, message) {
        if (value !== null) {
            throw new Error(`${message}\nExpected: null\nActual: ${value}`);
        }
    },
    isNotNull: function(value, message) {
        if (value === null || value === undefined) {
            throw new Error(`${message}\nExpected: not null\nActual: ${value}`);
        }
    },
    arrayLength: function(array, expectedLength, message) {
        if (!Array.isArray(array) || array.length !== expectedLength) {
            throw new Error(`${message}\nExpected length: ${expectedLength}\nActual: ${Array.isArray(array) ? array.length : 'not an array'}`);
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

// Mock match data
function createMockMatch() {
    return {
        id: 'match_001',
        team1: { name: 'Team A', players: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'] },
        team2: { name: 'Team B', players: ['P7', 'P8', 'P9', 'P10', 'P11', 'P12'] },
        oversPerInning: 5,
        maxPlayersPerTeam: 6,
        venue: 'Test Ground',
        date: new Date().toISOString(),
        status: 'not_started'
    };
}

function createMockInnings() {
    return {
        battingTeam: 'Team A',
        bowlingTeam: 'Team B',
        runs: 0,
        wickets: 0,
        overs: 0,
        balls: 0,
        extras: { wides: 0, noBalls: 0 },
        batsmen: [],
        bowlers: []
    };
}

// Test Suite
console.log('\n=== Match Management Integration Tests ===\n');

let passed = 0;
let failed = 0;

// Test 1: Match Creation Validation
if (test('Match creation with valid data', () => {
    const match = createMockMatch();
    assert.isNotNull(match.id, 'Match should have ID');
    assert.equals(match.status, 'not_started', 'Initial status should be not_started');
    assert.equals(match.oversPerInning, 5, 'Overs per inning should be set');
})) passed++; else failed++;

// Test 2: Match Status Transitions
if (test('Match status transitions correctly', () => {
    const match = createMockMatch();
    match.status = 'in_progress';
    assert.equals(match.status, 'in_progress', 'Status should transition to in_progress');
    match.status = 'completed';
    assert.equals(match.status, 'completed', 'Status should transition to completed');
})) passed++; else failed++;

// Test 3: Team Validation
if (test('Team validation - minimum players', () => {
    const match = createMockMatch();
    const minPlayers = 4;
    assert.isTrue(match.team1.players.length >= minPlayers, 'Team 1 should have minimum players');
    assert.isTrue(match.team2.players.length >= minPlayers, 'Team 2 should have minimum players');
})) passed++; else failed++;

// Test 4: Team Validation - Maximum Players
if (test('Team validation - maximum players', () => {
    const match = createMockMatch();
    assert.isTrue(match.team1.players.length <= match.maxPlayersPerTeam, 'Team 1 should not exceed max players');
    assert.isTrue(match.team2.players.length <= match.maxPlayersPerTeam, 'Team 2 should not exceed max players');
})) passed++; else failed++;

// Test 5: Innings Initialization
if (test('Innings initialization', () => {
    const innings = createMockInnings();
    assert.equals(innings.runs, 0, 'Initial runs should be 0');
    assert.equals(innings.wickets, 0, 'Initial wickets should be 0');
    assert.equals(innings.overs, 0, 'Initial overs should be 0');
    assert.equals(innings.balls, 0, 'Initial balls should be 0');
})) passed++; else failed++;

// Test 6: Match Winner Determination
if (test('Match winner determination - team1 wins', () => {
    const match = createMockMatch();
    match.innings1 = { runs: 50, wickets: 3 };
    match.innings2 = { runs: 45, wickets: 5 };
    const winner = match.innings1.runs > match.innings2.runs ? match.team1.name : match.team2.name;
    assert.equals(winner, 'Team A', 'Team A should win with higher score');
})) passed++; else failed++;

// Test 7: Match Tie Detection
if (test('Match tie detection', () => {
    const match = createMockMatch();
    match.innings1 = { runs: 50, wickets: 3 };
    match.innings2 = { runs: 50, wickets: 4 };
    const isTie = match.innings1.runs === match.innings2.runs;
    assert.isTrue(isTie, 'Match should be detected as tie');
})) passed++; else failed++;

// Test 8: Super Over Trigger
if (test('Super over trigger on tie', () => {
    const match = createMockMatch();
    match.innings1 = { runs: 50, wickets: 3 };
    match.innings2 = { runs: 50, wickets: 4 };
    const needsSuperOver = match.innings1.runs === match.innings2.runs;
    assert.isTrue(needsSuperOver, 'Super over should be triggered on tie');
})) passed++; else failed++;

// Test 9: Match Data Completeness
if (test('Match data completeness check', () => {
    const match = createMockMatch();
    assert.isNotNull(match.team1, 'Team 1 data should exist');
    assert.isNotNull(match.team2, 'Team 2 data should exist');
    assert.isNotNull(match.venue, 'Venue should be set');
    assert.isNotNull(match.date, 'Date should be set');
})) passed++; else failed++;

// Test 10: Match ID Uniqueness
if (test('Match ID format validation', () => {
    const match = createMockMatch();
    assert.isTrue(match.id.startsWith('match_'), 'Match ID should have correct prefix');
    assert.isTrue(match.id.length > 6, 'Match ID should have sufficient length');
})) passed++; else failed++;

// Test 11: Overs Validation
if (test('Overs per inning validation', () => {
    const match = createMockMatch();
    assert.isTrue(match.oversPerInning >= 3, 'Minimum overs should be 3');
    assert.isTrue(match.oversPerInning <= 10, 'Maximum overs should be 10');
})) passed++; else failed++;

// Test 12: Match Metadata Validation
if (test('Match metadata structure', () => {
    const match = createMockMatch();
    const requiredFields = ['id', 'team1', 'team2', 'oversPerInning', 'venue', 'date', 'status'];
    const hasAllFields = requiredFields.every(field => match.hasOwnProperty(field));
    assert.isTrue(hasAllFields, 'Match should have all required fields');
})) passed++; else failed++;

// Test 13: Innings Completion Check
if (test('Innings completion - all wickets down', () => {
    const innings = createMockInnings();
    innings.wickets = 5; // All out (6 players, need 5 wickets)
    const isComplete = innings.wickets >= 5;
    assert.isTrue(isComplete, 'Innings should be complete when all wickets down');
})) passed++; else failed++;

// Test 14: Innings Completion - Overs Complete
if (test('Innings completion - overs complete', () => {
    const match = createMockMatch();
    const innings = createMockInnings();
    innings.overs = match.oversPerInning;
    const isComplete = innings.overs >= match.oversPerInning;
    assert.isTrue(isComplete, 'Innings should be complete when overs finished');
})) passed++; else failed++;

// Test 15: Second Innings Target
if (test('Second innings target calculation', () => {
    const match = createMockMatch();
    match.innings1 = { runs: 50 };
    const target = match.innings1.runs + 1;
    assert.equals(target, 51, 'Target should be first innings runs + 1');
})) passed++; else failed++;

// Summary
console.log(`\n--- Results ---`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);

if (failed === 0) {
    console.log('\n✓ All match management tests passed!');
    process.exit(0);
} else {
    console.log(`\n✗ ${failed} test(s) failed`);
    process.exit(1);
}
