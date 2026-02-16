/**
 * PULSE PREMIER LEAGUE - Retry Logic & Circuit Breaker
 * Handles retry logic with exponential backoff for async operations
 */

window.PPL = window.PPL || {};

PPL.retry = {
    // Circuit breaker state
    circuits: {},

    /**
     * Retry async operation with exponential backoff
     */
    async withRetry(operation, options = {}) {
        const {
            maxRetries = 3,
            initialDelay = 1000,
            maxDelay = 10000,
            backoffMultiplier = 2,
            onRetry = null,
            shouldRetry = (error) => true
        } = options;

        let lastError;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;

                if (attempt === maxRetries || !shouldRetry(error)) {
                    throw error;
                }

                const delay = Math.min(initialDelay * Math.pow(backoffMultiplier, attempt), maxDelay);

                if (onRetry) {
                    onRetry(attempt + 1, delay, error);
                }

                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        throw lastError;
    },

    /**
     * Circuit breaker pattern
     */
    async withCircuitBreaker(name, operation, options = {}) {
        const {
            failureThreshold = 5,
            successThreshold = 2,
            timeout = 60000
        } = options;

        if (!this.circuits[name]) {
            this.circuits[name] = {
                state: 'closed',
                failures: 0,
                successes: 0,
                nextAttempt: Date.now()
            };
        }

        const circuit = this.circuits[name];

        if (circuit.state === 'open') {
            if (Date.now() < circuit.nextAttempt) {
                throw new Error(`Circuit breaker ${name} is open`);
            }
            circuit.state = 'half-open';
        }

        try {
            const result = await operation();

            if (circuit.state === 'half-open') {
                circuit.successes++;
                if (circuit.successes >= successThreshold) {
                    circuit.state = 'closed';
                    circuit.failures = 0;
                    circuit.successes = 0;
                }
            }

            return result;
        } catch (error) {
            circuit.failures++;
            circuit.successes = 0;

            if (circuit.failures >= failureThreshold) {
                circuit.state = 'open';
                circuit.nextAttempt = Date.now() + timeout;
            }

            throw error;
        }
    }
};
