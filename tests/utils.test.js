/**
 * Unit Tests for PPL Utility Functions
 * Run with: node tests/utils.test.js (or use test framework)
 */

// Simple test framework
const assert = (condition, message) => {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
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

// Mock PPL object for testing
const PPL = {
    formatOvers: (completed, balls) => `${completed}.${balls}`,
    oversToDecimal: (completed, balls) => completed + (balls / 6),
    calculateStrikeRate: (runs, balls) => balls === 0 ? 0 : ((runs / balls) * 100).toFixed(2),
    calculateAverage: (runs, dismissals) => dismissals === 0 ? runs : (runs / dismissals).toFixed(2),
    escapeHtml: (text) => {
        if (!text) return '';
        return text.replace(/[<>&"']/g, char => ({
            '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;'
        })[char]);
    },
    validateInput: (input, type = 'text') => {
        if (!input) return false;
        const str = String(input).trim();
        if (type === 'name') return /^[a-zA-Z0-9\s\-']{1,100}$/.test(str);
        if (type === 'number') return /^\d+$/.test(str);
        return str.length > 0 && !/<script/i.test(str);
    }
};

// Run tests
let passed = 0;
let failed = 0;

console.log('\n=== PPL Utility Function Tests ===\n');

// Test formatOvers
if (test('formatOvers: 4 overs 2 balls', () => {
    assert(PPL.formatOvers(4, 2) === '4.2', 'Expected 4.2');
})) passed++; else failed++;

// Test oversToDecimal
if (test('oversToDecimal: 4.2 = 4.333...', () => {
    const result = PPL.oversToDecimal(4, 2);
    assert(Math.abs(result - 4.333) < 0.01, `Expected ~4.333, got ${result}`);
})) passed++; else failed++;

// Test calculateStrikeRate
if (test('Strike rate: 50 runs off 25 balls = 200', () => {
    assert(PPL.calculateStrikeRate(50, 25) === '200.00', 'Expected 200.00');
})) passed++; else failed++;

if (test('Strike rate: 0 balls = 0', () => {
    assert(PPL.calculateStrikeRate(50, 0) === 0, 'Expected 0');
})) passed++; else failed++;

// Test calculateAverage
if (test('Average: 100 runs, 2 dismissals = 50', () => {
    assert(PPL.calculateAverage(100, 2) === '50.00', 'Expected 50.00');
})) passed++; else failed++;

if (test('Average: Not out = runs scored', () => {
    assert(PPL.calculateAverage(75, 0) === 75, 'Expected 75');
})) passed++; else failed++;

// Test escapeHtml
if (test('escapeHtml: Escapes <script> tags', () => {
    const result = PPL.escapeHtml('<script>alert("xss")</script>');
    assert(!result.includes('<script>'), 'Should not contain <script>');
})) passed++; else failed++;

// Test validateInput
if (test('validateInput: Valid name', () => {
    assert(PPL.validateInput('John Doe', 'name') === true, 'Valid name');
})) passed++; else failed++;

if (test('validateInput: Invalid name with special chars', () => {
    assert(PPL.validateInput('<script>', 'name') === false, 'Invalid name');
})) passed++; else failed++;

if (test('validateInput: Valid number', () => {
    assert(PPL.validateInput('123', 'number') === true, 'Valid number');
})) passed++; else failed++;

if (test('validateInput: Invalid number', () => {
    assert(PPL.validateInput('12a3', 'number') === false, 'Invalid number');
})) passed++; else failed++;

console.log(`\n=== Test Summary ===`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);
console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%\n`);

process.exit(failed > 0 ? 1 : 0);
