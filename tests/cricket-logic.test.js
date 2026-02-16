/**
 * Unit Tests for Cricket Logic
 */

const assert = (condition, message) => {
    if (!condition) throw new Error(message);
};

const test = (name, fn) => {
    try {
        fn();
        console.log(`✓ ${name}`);
        return true;
    } catch (error) {
        console.error(`✗ ${name}: ${error.message}`);
        return false;
    }
};

// Mock cricket logic
const CricketLogic = {
    isStrikerRotated: (runs) => runs % 2 === 1,
    isLegalBall: (delivery) => !delivery.isWide && !delivery.isNoBall,
    calculateRunsForBatter: (delivery) => {
        if (delivery.isBye || delivery.isLegBye) return 0;
        return delivery.runs + (delivery.isNoBall ? 1 : 0);
    },
    calculateExtras: (delivery) => {
        let extras = 0;
        if (delivery.isWide) extras += 1 + delivery.runs;
        if (delivery.isNoBall) extras += 1 + delivery.runs;
        if (delivery.isBye) extras += delivery.runs;
        if (delivery.isLegBye) extras += delivery.runs;
        return extras;
    }
};

let passed = 0, failed = 0;

console.log('\n=== Cricket Logic Tests ===\n');

// Striker rotation tests
if (test('Striker rotates on 1 run', () => {
    assert(CricketLogic.isStrikerRotated(1), 'Should rotate on odd runs');
})) passed++; else failed++;

if (test('Striker stays on 2 runs', () => {
    assert(!CricketLogic.isStrikerRotated(2), 'Should not rotate on even runs');
})) passed++; else failed++;

if (test('Striker rotates on 3 runs', () => {
    assert(CricketLogic.isStrikerRotated(3), 'Should rotate on odd runs');
})) passed++; else failed++;

// Legal ball tests
if (test('Normal delivery is legal', () => {
    assert(CricketLogic.isLegalBall({ isWide: false, isNoBall: false }), 'Normal ball is legal');
})) passed++; else failed++;

if (test('Wide is not legal', () => {
    assert(!CricketLogic.isLegalBall({ isWide: true, isNoBall: false }), 'Wide is illegal');
})) passed++; else failed++;

if (test('No-ball is not legal', () => {
    assert(!CricketLogic.isLegalBall({ isWide: false, isNoBall: true }), 'No-ball is illegal');
})) passed++; else failed++;

// Batter runs calculation
if (test('Batter gets 4 runs on boundary', () => {
    const runs = CricketLogic.calculateRunsForBatter({ runs: 4, isNoBall: false, isBye: false, isLegBye: false });
    assert(runs === 4, 'Batter should get 4 runs');
})) passed++; else failed++;

if (test('Batter gets 0 on bye', () => {
    const runs = CricketLogic.calculateRunsForBatter({ runs: 2, isNoBall: false, isBye: true, isLegBye: false });
    assert(runs === 0, 'Batter gets 0 on bye');
})) passed++; else failed++;

if (test('Batter gets runs + 1 on no-ball', () => {
    const runs = CricketLogic.calculateRunsForBatter({ runs: 2, isNoBall: true, isBye: false, isLegBye: false });
    assert(runs === 3, 'Batter gets runs + 1 on no-ball');
})) passed++; else failed++;

// Extras calculation
if (test('Wide gives 1 extra', () => {
    const extras = CricketLogic.calculateExtras({ isWide: true, runs: 0, isNoBall: false, isBye: false, isLegBye: false });
    assert(extras === 1, 'Wide should give 1 extra');
})) passed++; else failed++;

if (test('Wide + runs gives extras', () => {
    const extras = CricketLogic.calculateExtras({ isWide: true, runs: 2, isNoBall: false, isBye: false, isLegBye: false });
    assert(extras === 3, 'Wide + 2 runs = 3 extras');
})) passed++; else failed++;

console.log(`\n=== Test Summary ===`);
console.log(`Passed: ${passed}, Failed: ${failed}, Total: ${passed + failed}`);
console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%\n`);

process.exit(failed > 0 ? 1 : 0);
