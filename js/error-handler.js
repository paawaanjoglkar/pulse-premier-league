/**
 * PULSE PREMIER LEAGUE - Error Handler & Boundaries
 * Provides graceful error handling and fallback mechanisms
 * Phase 3 implementation
 */

window.PPL = window.PPL || {};

/**
 * Error handling and recovery system
 */
PPL.errorHandler = {
    // Error tracking
    errors: [],
    maxErrors: 50,

    /**
     * Log an error with context
     */
    logError: function(level, message, error, context = {}) {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            level, // 'error', 'warning', 'info'
            message,
            error: error ? error.message : null,
            stack: error ? error.stack : null,
            context
        };

        // Store in memory (up to maxErrors)
        this.errors.push(errorEntry);
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }

        // Log based on level
        switch (level) {
            case 'error':
                console.error(`[ERROR] ${message}`, error, context);
                break;
            case 'warning':
                console.warn(`[WARN] ${message}`, context);
                break;
            default:
                console.log(`[INFO] ${message}`, context);
        }

        return errorEntry;
    },

    /**
     * Get error history for debugging
     */
    getErrorHistory: function(limit = 20) {
        return this.errors.slice(-limit);
    },

    /**
     * Clear error history
     */
    clearErrorHistory: function() {
        this.errors = [];
    },

    /**
     * Safe try-catch wrapper for async operations
     */
    async tryCatch: async function(operation, fallback = null, errorMessage = 'Operation failed') {
        try {
            return await operation();
        } catch (error) {
            this.logError('error', errorMessage, error);
            if (fallback !== null) {
                return fallback;
            }
            throw error;
        }
    },

    /**
     * Handle critical errors with user feedback
     */
    handleCriticalError: function(message, error = null) {
        this.logError('error', message, error);

        // Show to user
        if (PPL.showToast) {
            PPL.showToast(message, 'error');
        }

        // Could also send to error tracking service here
        // navigator.sendBeacon('/api/log-error', JSON.stringify({...}));
    },

    /**
     * Graceful degradation handler
     */
    gracefulDegrade: function(primaryFunction, fallbackFunction) {
        try {
            return primaryFunction();
        } catch (error) {
            this.logError('warning', 'Primary function failed, using fallback', error);
            try {
                return fallbackFunction();
            } catch (fallbackError) {
                this.logError('error', 'Fallback also failed', fallbackError);
                throw fallbackError;
            }
        }
    }
};

/**
 * Fallback in-memory storage for when IndexedDB fails
 */
PPL.memoryStorage = {
    data: {
        tournament: null,
        teams: [],
        players: [],
        fixtures: [],
        matches: [],
        deliveries: [],
        innings: [],
        partnerships: [],
        points: [],
        editLog: [],
        metadata: {}
    },

    isActive: false,

    /**
     * Activate memory storage as fallback
     */
    activate: function() {
        console.warn('Using fallback memory storage - data will NOT persist after page reload!');
        this.isActive = true;
        PPL.showToast('⚠️ Using temporary memory storage - data will be lost on page refresh!', 'warning');
    },

    /**
     * Get all from store
     */
    getAll: function(storeName) {
        return this.data[storeName] || [];
    },

    /**
     * Get by ID
     */
    get: function(storeName, id) {
        const store = this.data[storeName] || [];
        if (Array.isArray(store)) {
            return store.find(item => item.id === id);
        }
        return store;
    },

    /**
     * Save data
     */
    save: function(storeName, data) {
        if (!this.data[storeName]) {
            this.data[storeName] = [];
        }
        if (Array.isArray(this.data[storeName])) {
            const existing = this.data[storeName].find(item => item.id === data.id);
            if (existing) {
                Object.assign(existing, data);
            } else {
                this.data[storeName].push(data);
            }
        } else {
            this.data[storeName] = data;
        }
        return data.id || data.key || true;
    },

    /**
     * Clear store
     */
    clear: function(storeName) {
        this.data[storeName] = Array.isArray(this.data[storeName]) ? [] : null;
    }
};

/**
 * Global error handlers for unhandled rejections
 */
window.addEventListener('unhandledrejection', (event) => {
    PPL.errorHandler.logError('error', 'Unhandled Promise rejection', event.reason);
    // Prevent the error from being logged by the browser
    event.preventDefault();

    // Show to user
    if (PPL.showToast) {
        PPL.showToast('An unexpected error occurred. Please refresh the page.', 'error');
    }
});

/**
 * Global error handler for synchronous errors
 */
window.addEventListener('error', (event) => {
    if (event.error) {
        PPL.errorHandler.logError('error', 'Uncaught error', event.error, {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
        });
    }
});

/**
 * Safe navigation helper - check if path exists before accessing
 */
PPL.getSafely = function(obj, path, defaultValue = null) {
    try {
        const value = path.split('.').reduce((current, prop) => current?.[prop], obj);
        return value !== undefined ? value : defaultValue;
    } catch (error) {
        return defaultValue;
    }
};

/**
 * Safe element access
 */
PPL.getElementSafely = function(id) {
    const element = document.getElementById(id);
    if (!element) {
        PPL.errorHandler.logError('warning', `Element not found: ${id}`);
        return null;
    }
    return element;
};
