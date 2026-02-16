/**
 * PULSE PREMIER LEAGUE - IndexedDB Storage Layer
 * Handles all local data persistence with 10 object stores
 */

const DB_NAME = 'PPL_Database';
const DB_VERSION = 2; // Incremented for migration support

// Store names
const STORES = {
    TOURNAMENT: 'tournament',
    TEAMS: 'teams',
    PLAYERS: 'players',
    FIXTURES: 'fixtures',
    MATCHES: 'matches',
    DELIVERIES: 'deliveries',
    INNINGS: 'innings',
    PARTNERSHIPS: 'partnerships',
    POINTS: 'points',
    EDIT_LOG: 'editLog'
};

class Storage {
    constructor() {
        this.db = null;
    }

    /**
     * Database migration handlers
     * Each version should handle migration from previous version
     */
    static migrations = {
        // Version 1 to 2: Add backup/metadata store
        2: (db, oldVersion) => {
            if (!db.objectStoreNames.contains('metadata')) {
                db.createObjectStore('metadata', { keyPath: 'key' });
            }
        }
    };

    /**
     * Initialize IndexedDB and create all object stores
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                reject('Failed to open database');
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const oldVersion = event.oldVersion;

                // 1. Tournament Store - Single record
                if (!db.objectStoreNames.contains(STORES.TOURNAMENT)) {
                    const tournamentStore = db.createObjectStore(STORES.TOURNAMENT, {
                        keyPath: 'id',
                        autoIncrement: false
                    });
                    tournamentStore.createIndex('name', 'name', { unique: false });
                }

                // 2. Teams Store
                if (!db.objectStoreNames.contains(STORES.TEAMS)) {
                    const teamsStore = db.createObjectStore(STORES.TEAMS, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    teamsStore.createIndex('name', 'name', { unique: true });
                    teamsStore.createIndex('shortName', 'shortName', { unique: false });
                    teamsStore.createIndex('active', 'active', { unique: false });
                }

                // 3. Players Store
                if (!db.objectStoreNames.contains(STORES.PLAYERS)) {
                    const playersStore = db.createObjectStore(STORES.PLAYERS, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    playersStore.createIndex('name', 'name', { unique: false });
                    playersStore.createIndex('teamId', 'teamId', { unique: false });
                    playersStore.createIndex('gender', 'gender', { unique: false });
                    playersStore.createIndex('active', 'active', { unique: false });
                }

                // 4. Fixtures Store
                if (!db.objectStoreNames.contains(STORES.FIXTURES)) {
                    const fixturesStore = db.createObjectStore(STORES.FIXTURES, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    fixturesStore.createIndex('matchNumber', 'matchNumber', { unique: true });
                    fixturesStore.createIndex('status', 'status', { unique: false });
                    fixturesStore.createIndex('type', 'type', { unique: false });
                    fixturesStore.createIndex('date', 'date', { unique: false });
                }

                // 5. Matches Store - Full match state
                if (!db.objectStoreNames.contains(STORES.MATCHES)) {
                    const matchesStore = db.createObjectStore(STORES.MATCHES, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    matchesStore.createIndex('fixtureId', 'fixtureId', { unique: false });
                    matchesStore.createIndex('status', 'status', { unique: false });
                    matchesStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // 6. Deliveries Store - Ball-by-ball records
                if (!db.objectStoreNames.contains(STORES.DELIVERIES)) {
                    const deliveriesStore = db.createObjectStore(STORES.DELIVERIES, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    deliveriesStore.createIndex('matchId', 'matchId', { unique: false });
                    deliveriesStore.createIndex('inningsNumber', 'inningsNumber', { unique: false });
                    deliveriesStore.createIndex('overNumber', 'overNumber', { unique: false });
                    deliveriesStore.createIndex('ballNumber', 'ballNumber', { unique: false });
                    deliveriesStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // 7. Innings Store
                if (!db.objectStoreNames.contains(STORES.INNINGS)) {
                    const inningsStore = db.createObjectStore(STORES.INNINGS, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    inningsStore.createIndex('matchId', 'matchId', { unique: false });
                    inningsStore.createIndex('inningsNumber', 'inningsNumber', { unique: false });
                }

                // 8. Partnerships Store
                if (!db.objectStoreNames.contains(STORES.PARTNERSHIPS)) {
                    const partnershipsStore = db.createObjectStore(STORES.PARTNERSHIPS, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    partnershipsStore.createIndex('matchId', 'matchId', { unique: false });
                    partnershipsStore.createIndex('inningsNumber', 'inningsNumber', { unique: false });
                }

                // 9. Points Store - Points table data
                if (!db.objectStoreNames.contains(STORES.POINTS)) {
                    const pointsStore = db.createObjectStore(STORES.POINTS, {
                        keyPath: 'teamId',
                        autoIncrement: false
                    });
                    pointsStore.createIndex('position', 'position', { unique: false });
                    pointsStore.createIndex('points', 'points', { unique: false });
                    pointsStore.createIndex('nrr', 'nrr', { unique: false });
                }

                // 10. Edit Log Store
                if (!db.objectStoreNames.contains(STORES.EDIT_LOG)) {
                    const editLogStore = db.createObjectStore(STORES.EDIT_LOG, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    editLogStore.createIndex('matchId', 'matchId', { unique: false });
                    editLogStore.createIndex('timestamp', 'timestamp', { unique: false });
                    editLogStore.createIndex('action', 'action', { unique: false });
                }

                // Run migrations for each version
                for (let v = oldVersion + 1; v <= DB_VERSION; v++) {
                    if (Storage.migrations[v]) {
                        try {
                            Storage.migrations[v](db, oldVersion);
                        } catch (error) {
                            console.error(`Migration v${v} failed:`, error);
                            // Continue anyway - some migrations might be optional
                        }
                    }
                }
            };
        });
    }

    /**
     * Save migration metadata
     */
    async saveMigrationLog(version, status) {
        try {
            const data = {
                key: `migration_${version}`,
                version,
                status,
                timestamp: new Date().toISOString()
            };

            const transaction = this.db.transaction(['metadata'], 'readwrite');
            const store = transaction.objectStore('metadata');
            await new Promise((resolve, reject) => {
                const request = store.put(data);
                request.onsuccess = () => resolve();
                request.onerror = () => reject();
            });
        } catch (error) {
            // Migration logging optional - don't fail
        }
    }

    /**
     * Get migration history
     */
    async getMigrationHistory() {
        try {
            const transaction = this.db.transaction(['metadata'], 'readonly');
            const store = transaction.objectStore('metadata');
            return new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject([]);
            });
        } catch (error) {
            return [];
        }
    }

    /**
     * Generic CRUD operations
     */

    // Create/Update
    async save(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(`Failed to save to ${storeName}`);
            };
        });
    }

    // Read by ID
    async get(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(`Failed to get from ${storeName}`);
            };
        });
    }

    // Read all
    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(`Failed to get all from ${storeName}`);
            };
        });
    }

    // Read by index
    async getByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(`Failed to get by index from ${storeName}`);
            };
        });
    }

    // Delete
    async delete(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = () => {
                reject(`Failed to delete from ${storeName}`);
            };
        });
    }

    // Clear store
    async clear(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = () => {
                reject(`Failed to clear ${storeName}`);
            };
        });
    }

    // Count records
    async count(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.count();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(`Failed to count ${storeName}`);
            };
        });
    }

    /**
     * Specialized methods for common operations
     */

    // Tournament
    async getTournament() {
        const all = await this.getAll(STORES.TOURNAMENT);
        return all.length > 0 ? all[0] : null;
    }

    async saveTournament(data) {
        data.id = 1; // Single tournament record
        data.lastModified = new Date().toISOString();
        return await this.save(STORES.TOURNAMENT, data);
    }

    // Teams
    async getActiveTeams() {
        const teams = await this.getByIndex(STORES.TEAMS, 'active', true);
        return teams.sort((a, b) => a.name.localeCompare(b.name));
    }

    async getTeamById(teamId) {
        return await this.get(STORES.TEAMS, teamId);
    }

    async saveTeam(team) {
        if (!team.id) {
            team.createdAt = new Date().toISOString();
        }
        team.lastModified = new Date().toISOString();
        team.active = team.active !== false; // Default true
        return await this.save(STORES.TEAMS, team);
    }

    // Players
    async getPlayersByTeam(teamId) {
        return await this.getByIndex(STORES.PLAYERS, 'teamId', teamId);
    }

    async getActivePlayers() {
        return await this.getByIndex(STORES.PLAYERS, 'active', true);
    }

    async getActivePlayersByTeam(teamId) {
        const players = await this.getPlayersByTeam(teamId);
        return players.filter(p => p.active !== false);
    }

    async savePlayer(player) {
        if (!player.id) {
            player.createdAt = new Date().toISOString();
        }
        player.lastModified = new Date().toISOString();
        player.active = player.active !== false; // Default true
        return await this.save(STORES.PLAYERS, player);
    }

    // Fixtures
    async getFixturesByStatus(status) {
        return await this.getByIndex(STORES.FIXTURES, 'status', status);
    }

    async saveFixture(fixture) {
        if (!fixture.id) {
            fixture.createdAt = new Date().toISOString();
        }
        fixture.lastModified = new Date().toISOString();
        return await this.save(STORES.FIXTURES, fixture);
    }

    // Matches
    async getMatchByFixtureId(fixtureId) {
        const matches = await this.getByIndex(STORES.MATCHES, 'fixtureId', fixtureId);
        return matches.length > 0 ? matches[0] : null;
    }

    async saveMatch(match) {
        if (!match.id) {
            match.createdAt = new Date().toISOString();
        }
        match.lastModified = new Date().toISOString();
        return await this.save(STORES.MATCHES, match);
    }

    // Deliveries
    async getDeliveriesByMatch(matchId) {
        const deliveries = await this.getByIndex(STORES.DELIVERIES, 'matchId', matchId);
        return deliveries.sort((a, b) => a.timestamp - b.timestamp);
    }

    async saveDelivery(delivery) {
        if (!delivery.timestamp) {
            delivery.timestamp = Date.now();
        }
        return await this.save(STORES.DELIVERIES, delivery);
    }

    async getLastDelivery(matchId) {
        const deliveries = await this.getDeliveriesByMatch(matchId);
        return deliveries.length > 0 ? deliveries[deliveries.length - 1] : null;
    }

    async deleteLastDelivery(matchId) {
        const lastDelivery = await this.getLastDelivery(matchId);
        if (lastDelivery) {
            await this.delete(STORES.DELIVERIES, lastDelivery.id);
        }
        return lastDelivery;
    }

    // Deliveries
    async getDeliveriesByMatch(matchId) {
        return await this.getByIndex(STORES.DELIVERIES, 'matchId', matchId);
    }

    async getAllDeliveries(matchId) {
        return await this.getDeliveriesByMatch(matchId);
    }

    async deleteDelivery(id) {
        return await this.delete(STORES.DELIVERIES, id);
    }

    // Innings
    async getInningsByMatch(matchId) {
        return await this.getByIndex(STORES.INNINGS, 'matchId', matchId);
    }

    async saveInnings(innings) {
        if (!innings.id) {
            innings.createdAt = new Date().toISOString();
        }
        innings.lastModified = new Date().toISOString();
        return await this.save(STORES.INNINGS, innings);
    }

    async deleteInnings(id) {
        return await this.delete(STORES.INNINGS, id);
    }

    // Points Table
    async getPointsByMatch(matchId) {
        const allPoints = await this.getAll(STORES.POINTS);
        return allPoints.find(p => p.matchId === matchId);
    }

    async deletePoints(id) {
        return await this.delete(STORES.POINTS, id);
    }

    // Edit Log
    async logEdit(matchId, action, description, before, after) {
        const log = {
            matchId,
            action,
            description,
            before,
            after,
            timestamp: new Date().toISOString()
        };
        return await this.save(STORES.EDIT_LOG, log);
    }

    async getEditLogByMatch(matchId) {
        const logs = await this.getByIndex(STORES.EDIT_LOG, 'matchId', matchId);
        return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    /**
     * Backup all data (for migration safety)
     * Stores backup in memory/localStorage for recovery
     */
    async createBackup() {
        try {
            const backup = {
                timestamp: new Date().toISOString(),
                version: DB_VERSION,
                data: {}
            };

            for (const storeName of Object.values(STORES)) {
                backup.data[storeName] = await this.getAll(storeName);
            }

            // Also store backup in localStorage (small size)
            if (backup.data && Object.keys(backup.data).length > 0) {
                localStorage.setItem('PPL_BACKUP_' + backup.timestamp.slice(0, 10), JSON.stringify(backup));
            }

            return backup;
        } catch (error) {
            console.error('Backup creation failed:', error);
            return null;
        }
    }

    /**
     * Restore from backup
     */
    async restoreBackup(backup) {
        if (!backup || !backup.data) {
            throw new Error('Invalid backup data');
        }

        try {
            // Clear all stores
            for (const storeName of Object.values(STORES)) {
                await this.clear(storeName);
            }

            // Restore from backup
            for (const [storeName, records] of Object.entries(backup.data)) {
                if (Array.isArray(records) && records.length > 0) {
                    const transaction = this.db.transaction([storeName], 'readwrite');
                    const store = transaction.objectStore(storeName);
                    for (const record of records) {
                        await new Promise((resolve, reject) => {
                            const request = store.put(record);
                            request.onsuccess = () => resolve();
                            request.onerror = () => reject();
                        });
                    }
                }
            }

            return true;
        } catch (error) {
            console.error('Backup restore failed:', error);
            return false;
        }
    }

    /**
     * Export all data for GitHub sync
     */
    async exportAll() {
        const data = {};

        for (const storeName of Object.values(STORES)) {
            data[storeName] = await this.getAll(storeName);
        }

        data.exportTimestamp = new Date().toISOString();
        data.version = DB_VERSION;

        return data;
    }

    /**
     * Import all data from GitHub sync
     */
    async importAll(data) {
        if (!data || !data.version) {
            throw new Error('Invalid import data');
        }

        // Clear all stores first
        for (const storeName of Object.values(STORES)) {
            await this.clear(storeName);
        }

        // Import data to each store
        for (const storeName of Object.values(STORES)) {
            if (data[storeName] && Array.isArray(data[storeName])) {
                for (const record of data[storeName]) {
                    await this.save(storeName, record);
                }
            }
        }

        return true;
    }

    /**
     * Clear all data (dangerous!)
     */
    async clearAll() {
        for (const storeName of Object.values(STORES)) {
            await this.clear(storeName);
        }
    }
}

// Global storage instance
const storage = new Storage();

// Export for use in other modules
window.PPL = window.PPL || {};
window.PPL.storage = storage;
window.PPL.STORES = STORES;
