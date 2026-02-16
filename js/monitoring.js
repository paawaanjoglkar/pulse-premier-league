/**
 * Monitoring and Analytics Module
 * Tracks performance metrics, errors, and application health
 */

(function() {
    'use strict';

    // Initialize monitoring namespace
    if (!window.PPL) {
        window.PPL = {};
    }

    PPL.monitoring = {
        // Performance metrics storage
        metrics: {
            pageLoadTime: 0,
            dbOperationTimes: [],
            syncOperationTimes: [],
            renderTimes: [],
            errorCount: 0,
            warningCount: 0,
            userActions: []
        },

        // Session tracking
        session: {
            startTime: null,
            sessionId: null,
            pageViews: 0,
            interactions: 0
        },

        // Performance thresholds (milliseconds)
        thresholds: {
            dbOperation: 100,      // DB operations should complete within 100ms
            syncOperation: 5000,   // Sync should complete within 5s
            render: 16,            // Render should be within 16ms (60fps)
            pageLoad: 3000         // Page should load within 3s
        },

        /**
         * Initialize monitoring system
         */
        init: function() {
            this.session.startTime = Date.now();
            this.session.sessionId = this.generateSessionId();
            this.trackPageLoad();
            this.setupPerformanceObserver();
            this.trackUserActivity();
        },

        /**
         * Generate unique session ID
         */
        generateSessionId: function() {
            return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        },

        /**
         * Track page load performance
         */
        trackPageLoad: function() {
            if (window.performance && window.performance.timing) {
                window.addEventListener('load', () => {
                    setTimeout(() => {
                        const timing = window.performance.timing;
                        const loadTime = timing.loadEventEnd - timing.navigationStart;
                        this.metrics.pageLoadTime = loadTime;
                        this.recordMetric('page_load', loadTime);

                        if (loadTime > this.thresholds.pageLoad) {
                            this.logWarning('Slow page load', { loadTime: loadTime });
                        }
                    }, 0);
                });
            }
        },

        /**
         * Setup Performance Observer for monitoring
         */
        setupPerformanceObserver: function() {
            if ('PerformanceObserver' in window) {
                try {
                    // Observe long tasks (tasks > 50ms)
                    const longTaskObserver = new PerformanceObserver((list) => {
                        for (const entry of list.getEntries()) {
                            if (entry.duration > 50) {
                                this.logWarning('Long task detected', {
                                    duration: entry.duration,
                                    name: entry.name
                                });
                            }
                        }
                    });

                    // Note: longtask requires origin trial or browser support
                    // For now, we'll skip if not supported
                    try {
                        longTaskObserver.observe({ entryTypes: ['longtask'] });
                    } catch (e) {
                        // longtask not supported, skip
                    }
                } catch (e) {
                    // PerformanceObserver not fully supported
                }
            }
        },

        /**
         * Track user activity
         */
        trackUserActivity: function() {
            // Track page visibility
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.recordEvent('page_hidden');
                } else {
                    this.recordEvent('page_visible');
                }
            });

            // Track interactions
            ['click', 'touchstart'].forEach(eventType => {
                document.addEventListener(eventType, () => {
                    this.session.interactions++;
                }, { passive: true });
            });
        },

        /**
         * Record performance metric
         */
        recordMetric: function(name, value) {
            const metric = {
                name: name,
                value: value,
                timestamp: Date.now()
            };

            // Store in appropriate array
            switch (name) {
                case 'db_operation':
                    this.metrics.dbOperationTimes.push(metric);
                    if (value > this.thresholds.dbOperation) {
                        this.logWarning('Slow DB operation', metric);
                    }
                    break;
                case 'sync_operation':
                    this.metrics.syncOperationTimes.push(metric);
                    if (value > this.thresholds.syncOperation) {
                        this.logWarning('Slow sync operation', metric);
                    }
                    break;
                case 'render':
                    this.metrics.renderTimes.push(metric);
                    if (value > this.thresholds.render) {
                        this.logWarning('Slow render', metric);
                    }
                    break;
            }

            // Keep only last 100 metrics of each type
            this.trimMetricsArray(this.metrics.dbOperationTimes);
            this.trimMetricsArray(this.metrics.syncOperationTimes);
            this.trimMetricsArray(this.metrics.renderTimes);
        },

        /**
         * Trim metrics array to last 100 entries
         */
        trimMetricsArray: function(array) {
            if (array.length > 100) {
                array.splice(0, array.length - 100);
            }
        },

        /**
         * Record user action
         */
        recordEvent: function(eventName, data) {
            const event = {
                name: eventName,
                data: data || {},
                timestamp: Date.now(),
                sessionId: this.session.sessionId
            };

            this.metrics.userActions.push(event);
            this.trimMetricsArray(this.metrics.userActions);
        },

        /**
         * Log error
         */
        logError: function(message, error) {
            this.metrics.errorCount++;
            const errorData = {
                message: message,
                error: error ? {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                } : null,
                timestamp: Date.now(),
                url: window.location.href
            };

            // Use error handler if available
            if (PPL.errorHandler) {
                PPL.errorHandler.logError('error', message, error, errorData);
            }

            this.recordEvent('error', errorData);
        },

        /**
         * Log warning
         */
        logWarning: function(message, data) {
            this.metrics.warningCount++;
            const warningData = {
                message: message,
                data: data,
                timestamp: Date.now()
            };

            // Use error handler if available
            if (PPL.errorHandler) {
                PPL.errorHandler.logError('warn', message, null, data);
            }

            this.recordEvent('warning', warningData);
        },

        /**
         * Get performance summary
         */
        getPerformanceSummary: function() {
            return {
                pageLoad: this.metrics.pageLoadTime,
                avgDbOperation: this.calculateAverage(this.metrics.dbOperationTimes),
                avgSyncOperation: this.calculateAverage(this.metrics.syncOperationTimes),
                avgRenderTime: this.calculateAverage(this.metrics.renderTimes),
                errors: this.metrics.errorCount,
                warnings: this.metrics.warningCount,
                sessionDuration: Date.now() - this.session.startTime,
                interactions: this.session.interactions
            };
        },

        /**
         * Calculate average from metrics array
         */
        calculateAverage: function(metricsArray) {
            if (metricsArray.length === 0) return 0;
            const sum = metricsArray.reduce((acc, m) => acc + m.value, 0);
            return Math.round(sum / metricsArray.length);
        },

        /**
         * Get health status
         */
        getHealthStatus: function() {
            const summary = this.getPerformanceSummary();
            const issues = [];

            if (summary.pageLoad > this.thresholds.pageLoad) {
                issues.push('Slow page load');
            }
            if (summary.avgDbOperation > this.thresholds.dbOperation) {
                issues.push('Slow database operations');
            }
            if (summary.avgSyncOperation > this.thresholds.syncOperation) {
                issues.push('Slow sync operations');
            }
            if (summary.errors > 10) {
                issues.push('High error count');
            }
            if (summary.warnings > 20) {
                issues.push('High warning count');
            }

            return {
                status: issues.length === 0 ? 'healthy' : 'degraded',
                issues: issues,
                summary: summary
            };
        },

        /**
         * Track database operation
         */
        trackDBOperation: async function(operation, operationName) {
            const startTime = performance.now();
            try {
                const result = await operation();
                const duration = performance.now() - startTime;
                this.recordMetric('db_operation', duration);
                this.recordEvent('db_operation', {
                    name: operationName,
                    duration: duration,
                    success: true
                });
                return result;
            } catch (error) {
                const duration = performance.now() - startTime;
                this.recordMetric('db_operation', duration);
                this.recordEvent('db_operation', {
                    name: operationName,
                    duration: duration,
                    success: false,
                    error: error.message
                });
                this.logError('DB operation failed: ' + operationName, error);
                throw error;
            }
        },

        /**
         * Track sync operation
         */
        trackSyncOperation: async function(operation, operationName) {
            const startTime = performance.now();
            try {
                const result = await operation();
                const duration = performance.now() - startTime;
                this.recordMetric('sync_operation', duration);
                this.recordEvent('sync_operation', {
                    name: operationName,
                    duration: duration,
                    success: true
                });
                return result;
            } catch (error) {
                const duration = performance.now() - startTime;
                this.recordMetric('sync_operation', duration);
                this.recordEvent('sync_operation', {
                    name: operationName,
                    duration: duration,
                    success: false,
                    error: error.message
                });
                this.logError('Sync operation failed: ' + operationName, error);
                throw error;
            }
        },

        /**
         * Export monitoring data for diagnostics
         */
        exportData: function() {
            return {
                session: this.session,
                metrics: {
                    pageLoadTime: this.metrics.pageLoadTime,
                    dbOperations: {
                        count: this.metrics.dbOperationTimes.length,
                        average: this.calculateAverage(this.metrics.dbOperationTimes),
                        recent: this.metrics.dbOperationTimes.slice(-10)
                    },
                    syncOperations: {
                        count: this.metrics.syncOperationTimes.length,
                        average: this.calculateAverage(this.metrics.syncOperationTimes),
                        recent: this.metrics.syncOperationTimes.slice(-10)
                    },
                    renders: {
                        count: this.metrics.renderTimes.length,
                        average: this.calculateAverage(this.metrics.renderTimes)
                    },
                    errors: this.metrics.errorCount,
                    warnings: this.metrics.warningCount
                },
                recentEvents: this.metrics.userActions.slice(-20),
                health: this.getHealthStatus(),
                timestamp: Date.now()
            };
        },

        /**
         * Clear old metrics (called periodically)
         */
        clearOldMetrics: function() {
            const oneHourAgo = Date.now() - (60 * 60 * 1000);

            // Filter out metrics older than 1 hour
            this.metrics.dbOperationTimes = this.metrics.dbOperationTimes.filter(
                m => m.timestamp > oneHourAgo
            );
            this.metrics.syncOperationTimes = this.metrics.syncOperationTimes.filter(
                m => m.timestamp > oneHourAgo
            );
            this.metrics.renderTimes = this.metrics.renderTimes.filter(
                m => m.timestamp > oneHourAgo
            );
            this.metrics.userActions = this.metrics.userActions.filter(
                m => m.timestamp > oneHourAgo
            );
        }
    };

    // Auto-initialize on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            PPL.monitoring.init();
        });
    } else {
        PPL.monitoring.init();
    }

    // Clear old metrics every hour
    setInterval(function() {
        PPL.monitoring.clearOldMetrics();
    }, 60 * 60 * 1000);

})();
