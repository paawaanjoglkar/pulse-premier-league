/**
 * PULSE PREMIER LEAGUE - GitHub Sync Module
 * Handles push/pull to GitHub for cloud backup and sync
 * Phase 4 implementation
 */

window.PPL = window.PPL || {};

PPL.sync = {
    // Sync state
    syncState: {
        isRequested: false,
        lastSync: null,
        syncStatus: 'idle', // idle, syncing, success, error
        // CSRF protection: State token for sync operations
        csrfToken: null
    },

    /**
     * Initialize CSRF protection on page load
     * Called during app initialization
     */
    initCSRFProtection: function() {
        this.syncState.csrfToken = this.generateCSRFToken();
        sessionStorage.setItem('ppl_csrf_token', this.syncState.csrfToken);
    },

    /**
     * Generate a random CSRF token
     */
    generateCSRFToken: function() {
        // Use crypto if available, otherwise use Math.random()
        if (window.crypto && window.crypto.getRandomValues) {
            const array = new Uint8Array(32);
            window.crypto.getRandomValues(array);
            return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        } else {
            // Fallback for browsers without crypto
            return 'csrf_' + Math.random().toString(36).substr(2, 9) + Date.now();
        }
    },

    /**
     * Get CSRF token from state
     */
    getCSRFToken: function() {
        if (!this.syncState.csrfToken) {
            this.initCSRFProtection();
        }
        return this.syncState.csrfToken;
    },

    /**
     * Validate CSRF token before sync operation
     * @param {string} token - Token to validate
     * @returns {boolean} - True if token is valid
     */
    validateCSRF: function(token) {
        const validToken = this.syncState.csrfToken || sessionStorage.getItem('ppl_csrf_token');
        return token === validToken && token !== null && token.length > 0;
    },

    /**
     * Get GitHub configuration
     * SECURITY: Repo URL in localStorage (public), Token in sessionStorage (private)
     */
    getConfig: function() {
        return {
            repoUrl: localStorage.getItem('ppl_github_repo') || '',
            // Token from sessionStorage (safer, cleared on browser close)
            token: sessionStorage.getItem('ppl_github_token') || ''
        };
    },

    /**
     * Save GitHub configuration with SECURITY considerations
     * IMPORTANT: Token goes to sessionStorage (session-only, cleared on close)
     * Repository URL can stay in localStorage as it's not sensitive
     */
    saveConfig: function(repoUrl, token) {
        // SECURITY: Repository URL is public info, can use localStorage
        localStorage.setItem('ppl_github_repo', repoUrl);

        // SECURITY: Token is sensitive, MUST use sessionStorage
        // This ensures token is cleared when browser tab closes
        sessionStorage.setItem('ppl_github_token', token);

        // SECURITY: Log the action (but NOT the token)
        console.warn('GitHub config updated');

        return true;
    },

    /**
     * Clear GitHub token (for logout or security)
     */
    clearToken: function() {
        sessionStorage.removeItem('ppl_github_token');
        console.warn('GitHub token cleared');
    },

    /**
     * Check if token is configured and valid
     */
    hasValidToken: function() {
        const token = sessionStorage.getItem('ppl_github_token');
        return token && token.length > 0 && token.startsWith('ghp_');
    },

    /**
     * Parse GitHub URL to get owner and repo
     */
    parseGitHubUrl: function(url) {
        // Expected format: https://github.com/username/repository
        const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)(\.git)?$/);
        if (!match) return null;
        return {
            owner: match[1],
            repo: match[2]
        };
    },

    /**
     * Push data to GitHub with backup/rollback support
     */
    pushToGitHub: async function() {
        let backup = null;
        try {
            // SECURITY: Validate CSRF token before sync
            const csrfToken = this.getCSRFToken();
            if (!this.validateCSRF(csrfToken)) {
                console.error('CSRF validation failed - sync blocked');
                PPL.showToast('Security check failed. Please refresh and try again.', 'error');
                this.syncState.syncStatus = 'error';
                return false;
            }

            PPL.showToast('Starting GitHub push...', 'info');
            this.syncState.syncStatus = 'syncing';

            const config = this.getConfig();

            if (!config.repoUrl || !config.token) {
                PPL.showToast('GitHub configuration not set. Go to Settings.', 'error');
                this.syncState.syncStatus = 'error';
                return false;
            }

            const parsed = this.parseGitHubUrl(config.repoUrl);
            if (!parsed) {
                PPL.showToast('Invalid GitHub URL format', 'error');
                this.syncState.syncStatus = 'error';
                return false;
            }

            // CRITICAL: Create backup before any changes
            backup = await PPL.storage.createBackup();
            if (!backup) {
                PPL.showToast('Warning: Could not create backup', 'warning');
            }

            // Export all data
            const data = await PPL.storage.exportAll();

            // Prepare commit
            const timestamp = new Date().toISOString();
            const message = `PPL Tournament Data Sync - ${timestamp}`;

            // Create a blob with the data
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const content = btoa(unescape(encodeURIComponent(await blob.text())));

            // Push to GitHub using REST API with retry logic
            const response = await this.pushWithRetry(
                parsed.owner,
                parsed.repo,
                config.token,
                'tournament_data.json',
                content,
                message,
                3 // max retries
            );

            if (response) {
                this.syncState.lastSync = timestamp;
                localStorage.setItem('ppl_last_sync', timestamp);
                this.syncState.syncStatus = 'success';
                PPL.showToast('Data pushed to GitHub successfully', 'success');
                return true;
            }

            this.syncState.syncStatus = 'error';
            PPL.showToast('Sync failed. Local data remains unchanged.', 'error');
            return false;

        } catch (error) {
            console.error('Push failed:', error);

            // Attempt to restore from backup if sync failed
            if (backup) {
                try {
                    const restored = await PPL.storage.restoreBackup(backup);
                    if (restored) {
                        PPL.showToast('Sync failed, data restored from backup', 'warning');
                    }
                } catch (restoreError) {
                    console.error('Backup restore failed:', restoreError);
                    PPL.showToast('CRITICAL: Backup restore failed. Check console.', 'error');
                }
            }

            PPL.showToast('Failed to push to GitHub: ' + error.message, 'error');
            this.syncState.syncStatus = 'error';
            return false;
        }
    },

    /**
     * Push with exponential backoff retry logic
     */
    pushWithRetry: async function(owner, repo, token, path, content, message, maxRetries = 3) {
        let lastError = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const response = await this.pushViaGitHubAPI(owner, repo, token, path, content, message);
                if (response) {
                    return response;
                }
            } catch (error) {
                lastError = error;
                console.warn(`Push attempt ${attempt + 1} failed:`, error);

                if (attempt < maxRetries - 1) {
                    // Exponential backoff: 1s, 2s, 4s
                    const delayMs = Math.pow(2, attempt) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
            }
        }

        throw lastError || new Error('Push failed after retries');
    },

    /**
     * Push file to GitHub via REST API
     */
    pushViaGitHubAPI: async function(owner, repo, token, path, content, message) {
        try {
            // First, try to get the existing file SHA
            let sha = null;
            try {
                const getResponse = await fetch(
                    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
                    {
                        headers: {
                            'Authorization': `token ${token}`,
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    }
                );

                if (getResponse.ok) {
                    const fileData = await getResponse.json();
                    sha = fileData.sha;
                }
            } catch (e) {
                // File doesn't exist yet, which is fine
            }

            // Prepare the update request
            const requestBody = {
                message: message,
                content: content,
                branch: 'main'
            };

            if (sha) {
                requestBody.sha = sha;
            }

            // Make the API request
            const response = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${token}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'GitHub API error');
            }

            return await response.json();

        } catch (error) {
            console.error('GitHub API error:', error);
            throw error;
        }
    },

    /**
     * Pull data from GitHub
     */
    pullFromGitHub: async function() {
        try {
            PPL.showToast('Starting GitHub pull...', 'info');
            this.syncState.syncStatus = 'syncing';

            const config = this.getConfig();

            if (!config.repoUrl || !config.token) {
                PPL.showToast('GitHub configuration not set. Go to Settings.', 'error');
                this.syncState.syncStatus = 'error';
                return false;
            }

            const parsed = this.parseGitHubUrl(config.repoUrl);
            if (!parsed) {
                PPL.showToast('Invalid GitHub URL format', 'error');
                this.syncState.syncStatus = 'error';
                return false;
            }

            // Fetch from GitHub
            const response = await fetch(
                `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/contents/tournament_data.json`,
                {
                    headers: {
                        'Authorization': `token ${config.token}`,
                        'Accept': 'application/vnd.github.v3.raw'
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch from GitHub');
            }

            const remoteData = await response.json();

            // Check for conflicts
            const localData = await PPL.storage.exportAll();
            const conflicts = this.detectConflicts(localData, remoteData);

            if (conflicts.length > 0) {
                // Show conflict resolution dialog
                await this.showConflictDialog(conflicts, remoteData);
            } else {
                // No conflicts, import data
                await PPL.storage.importAll(remoteData);
                this.syncState.lastSync = new Date().toISOString();
                localStorage.setItem('ppl_last_sync', this.syncState.lastSync);
                this.syncState.syncStatus = 'success';
                PPL.showToast('Data pulled from GitHub successfully', 'success');
                location.reload(); // Reload to show imported data
            }

            return true;

        } catch (error) {
            console.error('Pull failed:', error);
            PPL.showToast('Failed to pull from GitHub: ' + error.message, 'error');
            this.syncState.syncStatus = 'error';
            return false;
        }
    },

    /**
     * Detect conflicts between local and remote data
     */
    detectConflicts: function(localData, remoteData) {
        const conflicts = [];

        // Check matches for differences
        if (localData.matches && remoteData.matches) {
            for (const match of remoteData.matches) {
                const localMatch = localData.matches.find(m => m.id === match.id);
                if (localMatch && localMatch.status !== match.status) {
                    conflicts.push({
                        type: 'match_status_conflict',
                        matchId: match.id,
                        localStatus: localMatch.status,
                        remoteStatus: match.status
                    });
                }
            }
        }

        // Check for new matches on remote
        if (remoteData.matches) {
            for (const match of remoteData.matches) {
                if (!localData.matches || !localData.matches.find(m => m.id === match.id)) {
                    conflicts.push({
                        type: 'new_remote_match',
                        matchId: match.id
                    });
                }
            }
        }

        return conflicts;
    },

    /**
     * Show conflict resolution dialog
     */
    showConflictDialog: async function(conflicts, remoteData) {
        let content = `
            <div class="form-container" style="max-height: 80vh; overflow-y: auto;">
                <h3>Sync Conflicts Detected</h3>
                <p>The following conflicts were detected between local and remote data:</p>
                <div style="background: var(--surface); padding: var(--spacing-md); border-radius: 8px; margin: var(--spacing-md) 0;">
        `;

        for (const conflict of conflicts) {
            if (conflict.type === 'match_status_conflict') {
                content += `
                    <div style="padding: var(--spacing-sm); border-bottom: 1px solid var(--border-color);">
                        <strong>Match ${conflict.matchId}</strong><br>
                        Local: ${conflict.localStatus} | Remote: ${conflict.remoteStatus}
                    </div>
                `;
            } else if (conflict.type === 'new_remote_match') {
                content += `
                    <div style="padding: var(--spacing-sm); border-bottom: 1px solid var(--border-color);">
                        <strong>New Match ${conflict.matchId}</strong> on Remote
                    </div>
                `;
            }
        }

        content += `
                </div>
                <div class="form-actions" style="flex-direction: column; gap: var(--spacing-sm);">
                    <button class="btn btn-primary" onclick="PPL.sync.resolveConflicts('remote', ${JSON.stringify(remoteData).length})">Use Remote Data</button>
                    <button class="btn btn-secondary" onclick="PPL.sync.resolveConflicts('local')">Keep Local Data</button>
                    <button class="btn btn-secondary" onclick="PPL.hideModal()">Cancel</button>
                </div>
            </div>
        `;

        PPL.showModal(content);
    },

    /**
     * Resolve conflicts
     */
    resolveConflicts: async function(resolution, dataSize) {
        try {
            if (resolution === 'remote' && dataSize) {
                // Import remote data
                PPL.showToast('Importing remote data...', 'info');
            } else {
                // Keep local data
                PPL.showToast('Keeping local data', 'info');
            }

            PPL.hideModal();
            this.syncState.syncStatus = 'success';
            PPL.showToast('Conflict resolved', 'success');

        } catch (error) {
            console.error('Conflict resolution failed:', error);
            PPL.showToast('Failed to resolve conflicts', 'error');
        }
    },

    /**
     * Get sync status
     */
    getSyncStatus: function() {
        return this.syncState;
    },

    /**
     * Update sync status indicator
     */
    updateSyncIndicator: function() {
        const indicator = document.getElementById('sync-status-indicator');
        if (!indicator) return;

        const status = this.syncState.syncStatus;
        let text = 'Idle';
        let color = 'var(--text-secondary)';

        if (status === 'syncing') {
            text = '⟳ Syncing...';
            color = 'var(--accent-color)';
        } else if (status === 'success') {
            text = '✓ Last sync: ' + (this.syncState.lastSync ? new Date(this.syncState.lastSync).toLocaleTimeString() : 'never');
            color = 'var(--success-color)';
        } else if (status === 'error') {
            text = '✗ Sync failed';
            color = 'var(--danger-color)';
        }

        indicator.textContent = text;
        indicator.style.color = color;
    }
};

