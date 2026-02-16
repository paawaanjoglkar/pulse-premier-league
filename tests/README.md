# Pulse Premier League - Test Suite

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### Edge Case Tests Only
```bash
npm run test:edge
```

### Individual Test Files
```bash
node tests/utils.test.js
node tests/cricket-logic.test.js
node tests/match-management.test.js
node tests/scoring-engine.test.js
node tests/statistics.test.js
node tests/awards.test.js
node tests/edge-cases.test.js
```

## Test Coverage

### Current Coverage
- ✅ Utility functions (11 tests)
- ✅ Cricket logic (11 tests)
- ✅ Match management (15 tests)
- ✅ Scoring engine (20 tests)
- ✅ Statistics calculations (27 tests)
- ✅ Awards system (23 tests)
- ✅ Edge cases (40 tests)

**Total: 147 tests**

### Coverage Breakdown

#### Unit Tests (22 tests)
- `utils.test.js`: 11 tests
  - formatOvers, oversToDecimal, calculateStrikeRate
  - escapeHtml, sanitize, validateInput
- `cricket-logic.test.js`: 11 tests
  - Striker rotation, legal ball detection
  - Runs and extras calculation

#### Integration Tests (85 tests)
- `match-management.test.js`: 15 tests
  - Match creation and validation
  - Status transitions, innings management
  - Winner determination, tie/super over scenarios
- `scoring-engine.test.js`: 20 tests
  - Ball-by-ball scoring (dot, single, boundary, six)
  - Extras (wide, no ball)
  - Wickets, overs completion, strike rotation
  - Score accumulation
- `statistics.test.js`: 27 tests
  - Batting stats (average, strike rate, centuries)
  - Bowling stats (average, economy, five-wicket hauls)
  - Net run rate calculation
  - MVP scoring, team points
  - Performance metrics
- `awards.test.js`: 23 tests
  - Top scorer, most wickets
  - Best strike rate, best economy
  - MVP, best fielder
  - Team selection, special achievements

#### Edge Case Tests (40 tests)
- `edge-cases.test.js`: 40 tests
  - Boundary values (team size, overs, scores)
  - Input validation (XSS, empty, null, special chars)
  - Scoring edge cases (zero score, max wickets, negative values)
  - Concurrent operations
  - Database edge cases
  - Network/sync scenarios
  - Date/time validation
  - Division by zero, infinity handling
  - Floating point precision

### Target Coverage
- ✅ 60%+ code coverage achieved
- ✅ All critical paths tested
- ✅ Edge cases validated
- ✅ Boundary values covered
- ✅ Error scenarios handled

## Test Framework

Simple custom test framework with:
- `assert.equals()` - equality check
- `assert.isTrue()` - boolean check
- `assert.isFalse()` - negative boolean check
- `assert.isNull()` - null check
- `assert.isNotNull()` - not null check
- `assert.arrayLength()` - array size check
- `assert.closeTo()` - floating point comparison
- `assert.throws()` - exception check
- `test()` - test runner with automatic pass/fail reporting

## Adding New Tests

1. Create new test file in `/tests/`
2. Follow the test pattern:
   ```javascript
   const assert = { /* assertion methods */ };
   function test(name, fn) { /* test runner */ }

   if (test('Test description', () => {
       assert.equals(actual, expected, 'Failure message');
   })) passed++; else failed++;
   ```
3. Add to package.json test script
4. Update this README

## Test Categories

### Unit Tests
- Individual function testing
- No dependencies
- Fast execution
- Pure logic validation

### Integration Tests
- Full workflow testing
- Multi-module interactions
- Database operations (simulated)
- End-to-end scenarios

### Edge Case Tests
- Boundary values
- Error scenarios
- Recovery testing
- Input validation
- Concurrent operations

## Test Results Format

Each test file outputs:
```
=== Test Suite Name ===

✓ Test 1 passed
✓ Test 2 passed
✗ Test 3 failed
  Error: Expected X, got Y

--- Results ---
Passed: 2
Failed: 1
Total: 3
```

Exit codes:
- `0` - all tests passed
- `1` - one or more tests failed

## Continuous Integration

Tests run automatically on:
- Push to any branch
- Pull request creation
- Manual workflow dispatch

See `.github/workflows/ci.yml` for CI configuration.
