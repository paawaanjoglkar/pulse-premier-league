/**
 * PULSE PREMIER LEAGUE - Utility Functions
 * Helper functions used across the application
 */

window.PPL = window.PPL || {};

/**
 * Format overs in cricket notation (e.g., 4.2)
 */
PPL.formatOvers = function(completedOvers, balls) {
    return `${completedOvers}.${balls}`;
};

/**
 * Convert cricket overs to decimal for calculations
 * Example: 4.2 overs = 4 + (2/6) = 4.333 overs
 */
PPL.oversToDecimal = function(completedOvers, balls) {
    return completedOvers + (balls / 6);
};

/**
 * Parse decimal overs back to cricket notation
 */
PPL.decimalToOvers = function(decimal) {
    const completed = Math.floor(decimal);
    const balls = Math.round((decimal - completed) * 6);
    return { completed, balls };
};

/**
 * Calculate strike rate
 */
PPL.calculateStrikeRate = function(runs, balls) {
    if (balls === 0) return 0;
    return ((runs / balls) * 100).toFixed(2);
};

/**
 * Calculate batting average
 */
PPL.calculateAverage = function(runs, dismissals) {
    if (dismissals === 0) return runs; // Not out
    return (runs / dismissals).toFixed(2);
};

/**
 * Calculate economy rate
 */
PPL.calculateEconomy = function(runs, overs) {
    if (overs === 0) return 0;
    return (runs / overs).toFixed(2);
};

/**
 * Calculate bowling average
 */
PPL.calculateBowlingAverage = function(runs, wickets) {
    if (wickets === 0) return 0;
    return (runs / wickets).toFixed(2);
};

/**
 * Format date for display
 */
PPL.formatDate = function(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

/**
 * Format time for display
 */
PPL.formatTime = function(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
    });
};

/**
 * Format date and time together
 */
PPL.formatDateTime = function(dateString) {
    return `${PPL.formatDate(dateString)} ${PPL.formatTime(dateString)}`;
};

/**
 * Get time ago string
 */
PPL.timeAgo = function(dateString) {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return PPL.formatDate(dateString);
};

/**
 * Show toast notification
 */
PPL.showToast = function(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            container.removeChild(toast);
        }, 300);
    }, duration);
};

/**
 * Show/hide modal
 */
PPL.showModal = function(content) {
    const overlay = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('modal-content');

    modalContent.innerHTML = content;
    overlay.classList.add('open');

    // Close on overlay click
    overlay.onclick = function(e) {
        if (e.target === overlay) {
            PPL.hideModal();
        }
    };
};

PPL.hideModal = function() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('open');
};

/**
 * Confirm dialog using modal
 */
PPL.confirm = function(message, onConfirm, onCancel) {
    const content = `
        <div class="confirm-dialog">
            <h3>Confirm</h3>
            <p>${message}</p>
            <div class="form-actions">
                <button class="btn btn-primary" id="confirm-yes">Yes</button>
                <button class="btn btn-secondary" id="confirm-no">No</button>
            </div>
        </div>
    `;

    PPL.showModal(content);

    document.getElementById('confirm-yes').onclick = () => {
        PPL.hideModal();
        if (onConfirm) onConfirm();
    };

    document.getElementById('confirm-no').onclick = () => {
        PPL.hideModal();
        if (onCancel) onCancel();
    };
};

/**
 * Generate unique ID
 */
PPL.generateId = function() {
    return Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

/**
 * Deep clone object
 */
PPL.clone = function(obj) {
    return JSON.parse(JSON.stringify(obj));
};

/**
 * Validate email
 */
PPL.isValidEmail = function(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

/**
 * Sanitize HTML to prevent XSS
 */
PPL.sanitize = function(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
};

/**
 * Get ordinal suffix (1st, 2nd, 3rd, etc.)
 */
PPL.getOrdinal = function(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

/**
 * Format player name for display
 */
PPL.formatPlayerName = function(player) {
    if (!player) return '';
    return player.name || 'Unknown';
};

/**
 * Format team name for display
 */
PPL.formatTeamName = function(team) {
    if (!team) return '';
    return team.shortName || team.name || 'Unknown';
};

/**
 * Get ball symbol for display in "This Over"
 */
PPL.getBallSymbol = function(delivery) {
    if (!delivery) return '·';

    // Wicket
    if (delivery.isWicket) return 'W';

    // Extras
    if (delivery.isWide) {
        const additionalRuns = delivery.runs - 1;
        return additionalRuns > 0 ? `Wd${additionalRuns}` : 'Wd';
    }

    if (delivery.isNoBall) {
        return delivery.runs > 1 ? `Nb${delivery.runs - 1}` : 'Nb';
    }

    if (delivery.isBye) {
        return `B${delivery.runs}`;
    }

    if (delivery.isLegBye) {
        return `Lb${delivery.runs}`;
    }

    // Regular runs
    if (delivery.runs === 0) return '·';
    if (delivery.runs === 4) return '4';
    if (delivery.runs === 6) return '6'; // Shouldn't happen in box cricket

    return delivery.runs.toString();
};

/**
 * Format dismissal text
 */
PPL.formatDismissal = function(player, dismissalType, bowler, fielder) {
    if (!dismissalType || dismissalType === 'not_out') {
        return 'not out';
    }

    let text = '';

    switch (dismissalType) {
        case 'bowled':
            text = `b ${bowler.name}`;
            break;
        case 'caught':
            text = `c ${fielder.name} b ${bowler.name}`;
            break;
        case 'lbw':
            text = `lbw b ${bowler.name}`;
            break;
        case 'stumped':
            text = `st ${fielder.name} b ${bowler.name}`;
            break;
        case 'run_out':
            text = fielder ? `run out (${fielder.name})` : 'run out';
            break;
        case 'hit_wicket':
            text = `hit wicket b ${bowler.name}`;
            break;
        case 'hit_ball_twice':
            text = 'hit ball twice';
            break;
        case 'obstructing_field':
            text = 'obstructing field';
            break;
        case 'handled_ball':
            text = 'handled ball';
            break;
        case 'timed_out':
            text = 'timed out';
            break;
        case 'hit_six':
            text = `hit six b ${bowler.name}`;
            break;
        case 'retired_hurt':
            text = 'retired hurt';
            break;
        default:
            text = dismissalType;
    }

    return text;
};

/**
 * Calculate required run rate
 */
PPL.calculateRequiredRate = function(runsNeeded, ballsRemaining) {
    if (ballsRemaining === 0) return 0;
    const oversRemaining = ballsRemaining / 6;
    return (runsNeeded / oversRemaining).toFixed(2);
};

/**
 * Format match result
 */
PPL.formatMatchResult = function(match) {
    if (!match || !match.result) return '';

    const result = match.result;

    if (result.type === 'win_by_runs') {
        return `${result.winner} won by ${result.margin} runs`;
    } else if (result.type === 'win_by_wickets') {
        return `${result.winner} won by ${result.margin} wickets`;
    } else if (result.type === 'tied') {
        return 'Match Tied';
    } else if (result.type === 'cancelled') {
        return 'Match Cancelled';
    }

    return 'Result pending';
};

/**
 * Local storage helpers
 */
PPL.localStorage = {
    set: function(key, value) {
        try {
            localStorage.setItem(`PPL_${key}`, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('localStorage.setItem failed:', e);
            return false;
        }
    },

    get: function(key) {
        try {
            const value = localStorage.getItem(`PPL_${key}`);
            return value ? JSON.parse(value) : null;
        } catch (e) {
            console.error('localStorage.getItem failed:', e);
            return null;
        }
    },

    remove: function(key) {
        try {
            localStorage.removeItem(`PPL_${key}`);
            return true;
        } catch (e) {
            console.error('localStorage.removeItem failed:', e);
            return false;
        }
    }
};

/**
 * Check if online
 */
PPL.isOnline = function() {
    return navigator.onLine;
};

/**
 * Sort array of objects by key
 */
PPL.sortBy = function(array, key, descending = false) {
    return array.sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];

        if (aVal < bVal) return descending ? 1 : -1;
        if (aVal > bVal) return descending ? -1 : 1;
        return 0;
    });
};

/**
 * Debounce function
 */
PPL.debounce = function(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * Format runs with 4s count
 */
PPL.formatRuns = function(runs, fours, sixes = 0) {
    let str = runs.toString();
    if (fours > 0) str += ` (${fours}×4)`;
    if (sixes > 0) str += ` (${sixes}×6)`;
    return str;
};

/**
 * SECURITY: Escape HTML special characters
 * Prevents XSS attacks by converting < > & " ' to HTML entities
 * @param {string} text - Unsafe text to escape
 * @returns {string} - Escaped text safe for HTML
 */
PPL.escapeHtml = function(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

/**
 * SECURITY: Sanitize input string
 * Removes or escapes potentially dangerous characters
 * @param {string} input - User input to sanitize
 * @returns {string} - Sanitized input
 */
PPL.sanitize = function(input) {
    if (!input) return '';
    // Remove script tags, event handlers, etc.
    return input
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/on\w+\s*=\s*[^\s>]*/gi, '');
};

/**
 * SECURITY: Validate input before storing
 * @param {string} input - Input to validate
 * @param {string} type - Type of input (name, number, url, email)
 * @returns {boolean} - True if valid
 */
PPL.validateInput = function(input, type = 'text') {
    if (!input) return false;

    const input_str = String(input).trim();

    switch (type) {
        case 'name':
            // Names: 1-100 chars, alphanumeric + spaces and special chars like -'
            return /^[a-zA-Z0-9\s\-']{1,100}$/.test(input_str);
        case 'number':
            // Numbers only
            return /^\d+$/.test(input_str);
        case 'email':
            // Basic email validation
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input_str);
        case 'url':
            // URL validation
            try {
                new URL(input_str);
                return true;
            } catch (e) {
                return false;
            }
        case 'text':
        default:
            // Any text, but no script tags
            return input_str.length > 0 && !/<script/i.test(input_str);
    }
};

/**
 * SECURITY: Safe innerHTML replacement
 * Uses textContent for plain text (safest)
 * Or manually sanitizes if HTML needed
 * @param {HTMLElement} element - Element to update
 * @param {string} text - Text to set (plain text is safest)
 * @param {boolean} asHtml - If true, sanitize before setting as HTML
 */
PPL.setSafeContent = function(element, text, asHtml = false) {
    if (!element) return;

    if (asHtml) {
        // If HTML is needed, sanitize first
        element.innerHTML = PPL.sanitize(text);
    } else {
        // Use textContent for plain text (prevents XSS completely)
        element.textContent = text;
    }
};

/**
 * Gender label
 */
PPL.getGenderLabel = function(gender) {
    return gender === 'M' ? 'Male' : gender === 'F' ? 'Female' : 'Other';
};

/**
 * Role label
 */
PPL.getRoleLabel = function(role) {
    const roles = {
        'batsman': 'Batter',
        'bowler': 'Bowler',
        'all_rounder': 'All-Rounder',
        'wicket_keeper': 'Wicket-Keeper'
    };
    return roles[role] || role || 'Player';
};
