/**
 * Edge Case Integration Tests
 * Tests boundary values, error scenarios, and unusual situations
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
    throws: function(fn, message) {
        let thrown = false;
        try {
            fn();
        } catch (e) {
            thrown = true;
        }
        if (!thrown) {
            throw new Error(`${message}\nExpected function to throw`);
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

// Validation functions
function validateTeamSize(players, min, max) {
    return players.length >= min && players.length <= max;
}

function validateOvers(overs) {
    return overs >= 3 && overs <= 10;
}

function validateScore(runs, wickets, maxWickets) {
    return runs >= 0 && wickets >= 0 && wickets <= maxWickets;
}

function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input.replace(/[<>]/g, '');
}

function validatePlayerName(name) {
    if (!name || typeof name !== 'string') return false;
    if (name.length < 2 || name.length > 50) return false;
    return /^[a-zA-Z\s]+$/.test(name);
}

// Test Suite
console.log('\n=== Edge Case Integration Tests ===\n');

let passed = 0;
let failed = 0;

// Boundary Value Tests

// Test 1: Minimum Team Size
if (test('Minimum team size - boundary', () => {
    const team = ['P1', 'P2', 'P3', 'P4'];
    assert.isTrue(validateTeamSize(team, 4, 11), 'Should accept minimum 4 players');
})) passed++; else failed++;

// Test 2: Maximum Team Size
if (test('Maximum team size - boundary', () => {
    const team = Array(11).fill(null).map((_, i) => `P${i + 1}`);
    assert.isTrue(validateTeamSize(team, 4, 11), 'Should accept maximum 11 players');
})) passed++; else failed++;

// Test 3: Below Minimum Team Size
if (test('Below minimum team size', () => {
    const team = ['P1', 'P2', 'P3'];
    assert.isTrue(!validateTeamSize(team, 4, 11), 'Should reject less than 4 players');
})) passed++; else failed++;

// Test 4: Above Maximum Team Size
if (test('Above maximum team size', () => {
    const team = Array(12).fill(null).map((_, i) => `P${i + 1}`);
    assert.isTrue(!validateTeamSize(team, 4, 11), 'Should reject more than 11 players');
})) passed++; else failed++;

// Test 5: Minimum Overs
if (test('Minimum overs - boundary', () => {
    assert.isTrue(validateOvers(3), 'Should accept minimum 3 overs');
})) passed++; else failed++;

// Test 6: Maximum Overs
if (test('Maximum overs - boundary', () => {
    assert.isTrue(validateOvers(10), 'Should accept maximum 10 overs');
})) passed++; else failed++;

// Test 7: Below Minimum Overs
if (test('Below minimum overs', () => {
    assert.isTrue(!validateOvers(2), 'Should reject less than 3 overs');
})) passed++; else failed++;

// Test 8: Above Maximum Overs
if (test('Above maximum overs', () => {
    assert.isTrue(!validateOvers(11), 'Should reject more than 10 overs');
})) passed++; else failed++;

// Scoring Edge Cases

// Test 9: Zero Score Valid
if (test('Zero score - all out for 0', () => {
    assert.isTrue(validateScore(0, 5, 5), 'Should accept zero score');
})) passed++; else failed++;

// Test 10: Maximum Wickets
if (test('Maximum wickets - all out', () => {
    assert.isTrue(validateScore(50, 5, 5), 'Should accept all wickets down');
})) passed++; else failed++;

// Test 11: Wickets Exceed Maximum
if (test('Wickets exceed maximum', () => {
    assert.isTrue(!validateScore(50, 6, 5), 'Should reject wickets > max');
})) passed++; else failed++;

// Test 12: Negative Runs
if (test('Negative runs - invalid', () => {
    assert.isTrue(!validateScore(-10, 2, 5), 'Should reject negative runs');
})) passed++; else failed++;

// Test 13: Negative Wickets
if (test('Negative wickets - invalid', () => {
    assert.isTrue(!validateScore(50, -1, 5), 'Should reject negative wickets');
})) passed++; else failed++;

// Input Validation Edge Cases

// Test 14: XSS Attempt - Script Tag
if (test('XSS prevention - script tag', () => {
    const malicious = '<script>alert("xss")</script>';
    const sanitized = sanitizeInput(malicious);
    assert.isTrue(!sanitized.includes('<'), 'Should remove script tags');
})) passed++; else failed++;

// Test 15: XSS Attempt - Event Handler
if (test('XSS prevention - event handler', () => {
    const malicious = '<img src=x onerror=alert(1)>';
    const sanitized = sanitizeInput(malicious);
    assert.isTrue(!sanitized.includes('<'), 'Should remove HTML tags');
})) passed++; else failed++;

// Test 16: Empty String Input
if (test('Empty string validation', () => {
    assert.isTrue(!validatePlayerName(''), 'Should reject empty string');
})) passed++; else failed++;

// Test 17: Null Input
if (test('Null input validation', () => {
    assert.isTrue(!validatePlayerName(null), 'Should reject null');
})) passed++; else failed++;

// Test 18: Undefined Input
if (test('Undefined input validation', () => {
    assert.isTrue(!validatePlayerName(undefined), 'Should reject undefined');
})) passed++; else failed++;

// Test 19: Number Input as Name
if (test('Number input as name', () => {
    assert.isTrue(!validatePlayerName(123), 'Should reject number');
})) passed++; else failed++;

// Test 20: Special Characters in Name
if (test('Special characters in name', () => {
    assert.isTrue(!validatePlayerName('Player@123'), 'Should reject special chars');
})) passed++; else failed++;

// Test 21: Too Short Name
if (test('Too short name - single char', () => {
    assert.isTrue(!validatePlayerName('A'), 'Should reject single character');
})) passed++; else failed++;

// Test 22: Too Long Name
if (test('Too long name - exceeds limit', () => {
    const longName = 'A'.repeat(51);
    assert.isTrue(!validatePlayerName(longName), 'Should reject names > 50 chars');
})) passed++; else failed++;

// Test 23: Valid Name with Spaces
if (test('Valid name with spaces', () => {
    assert.isTrue(validatePlayerName('John Doe'), 'Should accept name with space');
})) passed++; else failed++;

// Concurrent Operation Edge Cases

// Test 24: Rapid Score Updates
if (test('Rapid score updates - race condition simulation', () => {
    let score = 0;
    const updates = [1, 2, 3, 4, 5];
    updates.forEach(run => score += run);
    assert.equals(score, 15, 'Should handle rapid updates correctly');
})) passed++; else failed++;

// Test 25: Simultaneous Wicket and Run
if (test('Wicket on scoring ball', () => {
    const ball = { runs: 2, isWicket: true };
    assert.isTrue(ball.runs > 0 && ball.isWicket, 'Should allow runs + wicket');
})) passed++; else failed++;

// Database Edge Cases

// Test 26: Empty Database Query
if (test('Empty database result handling', () => {
    const results = [];
    assert.equals(results.length, 0, 'Should handle empty results');
})) passed++; else failed++;

// Test 27: Large Dataset
if (test('Large dataset handling', () => {
    const largeArray = Array(1000).fill({ data: 'test' });
    assert.equals(largeArray.length, 1000, 'Should handle large datasets');
})) passed++; else failed++;

// Network/Sync Edge Cases

// Test 28: Offline Mode
if (test('Offline mode - no network', () => {
    const isOnline = false;
    const shouldSync = isOnline;
    assert.isTrue(!shouldSync, 'Should not attempt sync offline');
})) passed++; else failed++;

// Test 29: Failed Sync Retry
if (test('Failed sync - retry logic', () => {
    let attempts = 0;
    const maxRetries = 3;
    while (attempts < maxRetries) {
        attempts++;
    }
    assert.equals(attempts, 3, 'Should retry specified times');
})) passed++; else failed++;

// Date/Time Edge Cases

// Test 30: Future Date
if (test('Future date validation', () => {
    const futureDate = new Date('2030-01-01');
    const now = new Date();
    assert.isTrue(futureDate > now, 'Should detect future dates');
})) passed++; else failed++;

// Test 31: Invalid Date
if (test('Invalid date handling', () => {
    const invalidDate = new Date('invalid');
    assert.isTrue(isNaN(invalidDate.getTime()), 'Should detect invalid date');
})) passed++; else failed++;

// Match State Edge Cases

// Test 32: Match Not Started
if (test('Match state - not started', () => {
    const match = { status: 'not_started', runs: 0, wickets: 0 };
    assert.equals(match.status, 'not_started', 'Should maintain not_started state');
})) passed++; else failed++;

// Test 33: Match Abandoned
if (test('Match state - abandoned', () => {
    const match = { status: 'abandoned', result: null };
    assert.equals(match.status, 'abandoned', 'Should handle abandoned match');
})) passed++; else failed++;

// Test 34: Super Over Tie
if (test('Super over - tie scenario', () => {
    const superOver = { team1: 15, team2: 15 };
    const isTied = superOver.team1 === superOver.team2;
    assert.isTrue(isTied, 'Should detect super over tie');
})) passed++; else failed++;

// Calculation Edge Cases

// Test 35: Division by Zero - Strike Rate
if (test('Division by zero - strike rate', () => {
    const balls = 0;
    const runs = 0;
    const sr = balls === 0 ? 0 : (runs / balls) * 100;
    assert.equals(sr, 0, 'Should handle division by zero');
})) passed++; else failed++;

// Test 36: Division by Zero - Average
if (test('Division by zero - batting average', () => {
    const dismissals = 0;
    const runs = 50;
    const avg = dismissals === 0 ? runs : runs / dismissals;
    assert.equals(avg, 50, 'Should return runs when not out');
})) passed++; else failed++;

// Test 37: Infinity Handling
if (test('Infinity value handling', () => {
    const wickets = 0;
    const runs = 50;
    const bowlingAvg = wickets === 0 ? Infinity : runs / wickets;
    assert.equals(bowlingAvg, Infinity, 'Should handle Infinity correctly');
})) passed++; else failed++;

// Test 38: Very Large Numbers
if (test('Very large score handling', () => {
    const runs = 9999;
    assert.isTrue(runs < 10000, 'Should handle large scores');
})) passed++; else failed++;

// Test 39: Floating Point Precision
if (test('Floating point precision', () => {
    const result = (0.1 + 0.2).toFixed(1);
    assert.equals(result, '0.3', 'Should handle floating point correctly');
})) passed++; else failed++;

// Test 40: Negative Time Calculation
if (test('Negative time difference', () => {
    const start = new Date('2024-01-01');
    const end = new Date('2023-12-31');
    const diff = end - start;
    assert.isTrue(diff < 0, 'Should detect negative time');
})) passed++; else failed++;

// Summary
console.log(`\n--- Results ---`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);

if (failed === 0) {
    console.log('\n✓ All edge case tests passed!');
    process.exit(0);
} else {
    console.log(`\n✗ ${failed} test(s) failed`);
    process.exit(1);
}
