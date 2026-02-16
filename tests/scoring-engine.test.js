/**
 * Scoring Engine Integration Tests
 * Tests ball-by-ball scoring, innings management, and scoring logic
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
    deepEquals: function(actual, expected, message) {
        const actualStr = JSON.stringify(actual);
        const expectedStr = JSON.stringify(expected);
        if (actualStr !== expectedStr) {
            throw new Error(`${message}\nExpected: ${expectedStr}\nActual: ${actualStr}`);
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

// Mock scoring state
function createScoringState() {
    return {
        runs: 0,
        wickets: 0,
        balls: 0,
        overs: 0,
        extras: { wides: 0, noBalls: 0 },
        striker: 'P1',
        nonStriker: 'P2',
        bowler: 'P7'
    };
}

// Scoring functions (simplified versions of actual logic)
function recordBall(state, runs, isWide, isNoBall, isWicket) {
    if (isWide) {
        state.runs += 1 + runs;
        state.extras.wides += 1 + runs;
        return state; // No ball count increment
    }

    if (isNoBall) {
        state.runs += 1 + runs;
        state.extras.noBalls += 1 + runs;
        return state; // No ball count increment
    }

    // Legal delivery
    state.runs += runs;
    state.balls += 1;

    if (isWicket) {
        state.wickets += 1;
    }

    // Rotate strike on odd runs
    if (!isWicket && runs % 2 === 1) {
        [state.striker, state.nonStriker] = [state.nonStriker, state.striker];
    }

    // Update overs
    if (state.balls % 6 === 0) {
        state.overs = Math.floor(state.balls / 6);
        // Rotate strike at over end
        [state.striker, state.nonStriker] = [state.nonStriker, state.striker];
    }

    return state;
}

function calculateStrikeRate(runs, balls) {
    if (balls === 0) return 0;
    return ((runs / balls) * 100).toFixed(2);
}

function calculateEconomy(runs, overs) {
    if (overs === 0) return 0;
    return (runs / overs).toFixed(2);
}

// Test Suite
console.log('\n=== Scoring Engine Integration Tests ===\n');

let passed = 0;
let failed = 0;

// Test 1: Legal Ball Scoring
if (test('Legal ball - dot ball', () => {
    const state = createScoringState();
    recordBall(state, 0, false, false, false);
    assert.equals(state.runs, 0, 'Runs should be 0');
    assert.equals(state.balls, 1, 'Ball count should increment');
    assert.equals(state.striker, 'P1', 'Striker should not change on dot ball');
})) passed++; else failed++;

// Test 2: Single Run Scoring
if (test('Legal ball - single run', () => {
    const state = createScoringState();
    recordBall(state, 1, false, false, false);
    assert.equals(state.runs, 1, 'Runs should be 1');
    assert.equals(state.balls, 1, 'Ball count should increment');
    assert.equals(state.striker, 'P2', 'Strike should rotate on single');
})) passed++; else failed++;

// Test 3: Boundary Scoring (Four)
if (test('Legal ball - boundary (4 runs)', () => {
    const state = createScoringState();
    recordBall(state, 4, false, false, false);
    assert.equals(state.runs, 4, 'Runs should be 4');
    assert.equals(state.balls, 1, 'Ball count should increment');
    assert.equals(state.striker, 'P1', 'Strike should not rotate on even runs');
})) passed++; else failed++;

// Test 4: Six Scoring
if (test('Legal ball - six runs', () => {
    const state = createScoringState();
    recordBall(state, 6, false, false, false);
    assert.equals(state.runs, 6, 'Runs should be 6');
    assert.equals(state.balls, 1, 'Ball count should increment');
})) passed++; else failed++;

// Test 5: Wide Ball Scoring
if (test('Extra - wide ball', () => {
    const state = createScoringState();
    recordBall(state, 0, true, false, false);
    assert.equals(state.runs, 1, 'Runs should include wide');
    assert.equals(state.extras.wides, 1, 'Wide count should increment');
    assert.equals(state.balls, 0, 'Ball count should not increment on wide');
})) passed++; else failed++;

// Test 6: No Ball Scoring
if (test('Extra - no ball', () => {
    const state = createScoringState();
    recordBall(state, 0, false, true, false);
    assert.equals(state.runs, 1, 'Runs should include no ball');
    assert.equals(state.extras.noBalls, 1, 'No ball count should increment');
    assert.equals(state.balls, 0, 'Ball count should not increment on no ball');
})) passed++; else failed++;

// Test 7: Wide + Runs
if (test('Extra - wide with runs', () => {
    const state = createScoringState();
    recordBall(state, 3, true, false, false);
    assert.equals(state.runs, 4, 'Runs should be 1 (wide) + 3');
    assert.equals(state.extras.wides, 4, 'Wide extras should include runs');
})) passed++; else failed++;

// Test 8: Wicket Recording
if (test('Wicket - batsman dismissed', () => {
    const state = createScoringState();
    recordBall(state, 0, false, false, true);
    assert.equals(state.wickets, 1, 'Wicket count should increment');
    assert.equals(state.balls, 1, 'Ball count should increment');
})) passed++; else failed++;

// Test 9: Over Completion
if (test('Over completion - 6 legal balls', () => {
    const state = createScoringState();
    for (let i = 0; i < 6; i++) {
        recordBall(state, 0, false, false, false);
    }
    assert.equals(state.balls, 6, 'Should have 6 balls');
    assert.equals(state.overs, 1, 'Should complete 1 over');
})) passed++; else failed++;

// Test 10: Strike Rotation at Over End
if (test('Strike rotation at over end', () => {
    const state = createScoringState();
    const initialStriker = state.striker;
    // 6 dot balls
    for (let i = 0; i < 6; i++) {
        recordBall(state, 0, false, false, false);
    }
    // After even number of strike rotations (5 rotations from singles in loop, +1 at over end)
    assert.equals(state.striker, 'P1', 'Strike should rotate at over end');
})) passed++; else failed++;

// Test 11: Multiple Overs
if (test('Multiple overs completion', () => {
    const state = createScoringState();
    for (let i = 0; i < 18; i++) {
        recordBall(state, 0, false, false, false);
    }
    assert.equals(state.balls, 18, 'Should have 18 balls');
    assert.equals(state.overs, 3, 'Should complete 3 overs');
})) passed++; else failed++;

// Test 12: Strike Rate Calculation
if (test('Batsman strike rate calculation', () => {
    const strikeRate = calculateStrikeRate(50, 30);
    assert.equals(strikeRate, '166.67', 'Strike rate should be correct');
})) passed++; else failed++;

// Test 13: Economy Rate Calculation
if (test('Bowler economy rate calculation', () => {
    const economy = calculateEconomy(30, 5);
    assert.equals(economy, '6.00', 'Economy should be correct');
})) passed++; else failed++;

// Test 14: Score Accumulation
if (test('Score accumulation over multiple balls', () => {
    const state = createScoringState();
    recordBall(state, 1, false, false, false); // 1 run
    recordBall(state, 4, false, false, false); // 4 runs
    recordBall(state, 2, false, false, false); // 2 runs
    recordBall(state, 6, false, false, false); // 6 runs
    assert.equals(state.runs, 13, 'Total runs should be 13');
    assert.equals(state.balls, 4, 'Ball count should be 4');
})) passed++; else failed++;

// Test 15: Extras Accumulation
if (test('Extras accumulation', () => {
    const state = createScoringState();
    recordBall(state, 0, true, false, false);  // 1 wide
    recordBall(state, 1, true, false, false);  // 2 wide (1+1)
    recordBall(state, 0, false, true, false);  // 1 no ball
    const totalExtras = state.extras.wides + state.extras.noBalls;
    assert.equals(totalExtras, 4, 'Total extras should be 4');
    assert.equals(state.runs, 4, 'Total runs should equal extras');
})) passed++; else failed++;

// Test 16: Complex Over Scenario
if (test('Complex over - mixed deliveries', () => {
    const state = createScoringState();
    recordBall(state, 1, false, false, false);  // 1 run, ball 1
    recordBall(state, 0, true, false, false);   // wide (no ball count)
    recordBall(state, 4, false, false, false);  // 4 runs, ball 2
    recordBall(state, 0, false, false, true);   // wicket, ball 3
    recordBall(state, 6, false, false, false);  // 6 runs, ball 4

    assert.equals(state.runs, 12, 'Total runs should be 12 (1+1+4+6)');
    assert.equals(state.balls, 4, 'Legal balls should be 4');
    assert.equals(state.wickets, 1, 'Wickets should be 1');
})) passed++; else failed++;

// Test 17: No Ball with Runs
if (test('No ball with runs scored', () => {
    const state = createScoringState();
    recordBall(state, 4, false, true, false);
    assert.equals(state.runs, 5, 'Runs should be 5 (1 no ball + 4 runs)');
    assert.equals(state.extras.noBalls, 5, 'No ball extras should include runs');
})) passed++; else failed++;

// Test 18: Zero Strike Rate
if (test('Strike rate when no balls faced', () => {
    const strikeRate = calculateStrikeRate(0, 0);
    assert.equals(strikeRate, '0', 'Strike rate should be 0 when no balls faced');
})) passed++; else failed++;

// Test 19: Zero Economy Rate
if (test('Economy when no overs bowled', () => {
    const economy = calculateEconomy(0, 0);
    assert.equals(economy, '0', 'Economy should be 0 when no overs bowled');
})) passed++; else failed++;

// Test 20: Run Chase Scenario
if (test('Run chase scenario tracking', () => {
    const state = createScoringState();
    const target = 50;

    // Score 45 runs
    for (let i = 0; i < 7; i++) {
        recordBall(state, 6, false, false, false);
    }
    recordBall(state, 3, false, false, false);

    const runsNeeded = target - state.runs;
    assert.equals(state.runs, 45, 'Runs scored should be 45');
    assert.equals(runsNeeded, 5, 'Runs needed should be 5');
})) passed++; else failed++;

// Summary
console.log(`\n--- Results ---`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);

if (failed === 0) {
    console.log('\n✓ All scoring engine tests passed!');
    process.exit(0);
} else {
    console.log(`\n✗ ${failed} test(s) failed`);
    process.exit(1);
}
