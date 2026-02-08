/**
 * Database Server Module (HANA Version)
 * Handles data storage using SAP HANA Cloud database
 * Replaces the localStorage-based implementation with proper database operations
 */

const hanaConnection = require('./hana-connection');
const hanaSchema = require('./hana-schema');

class DBServer {
    constructor() {
        this.initialized = false;
    }

    // Initialize database connection only (schema should be set up separately)
    async initialize() {
        if (this.initialized) return;

        try {
            await hanaConnection.connect();
            this.initialized = true;
        } catch (error) {
            console.error('❌ Database connection failed:', error);
            throw error;
        }
    }

    // Ensure database connection is established
    async ensureInitialized() {
        if (!this.initialized) {
            await this.initialize();
        }
    }

    // Get accomplishments with optional filtering (main API method)
    async getAccomplishments(filters = {}) {
        await this.ensureInitialized();

        // If no filters provided, return all accomplishments
        if (!filters || Object.keys(filters).length === 0) {
            return this.getAllAccomplishments();
        }

        // Use the existing filter method for filtered requests
        return this.filterAccomplishments(filters);
    }

    // Get all accomplishments sorted by creation date (newest first), then votes, then congratulations
    async getAllAccomplishments() {
        await this.ensureInitialized();

        const sql = `
            SELECT 
                ID as id,
                USER_ID as userId,
                USER_NAME as userName,
                ORIGINAL_STATEMENT as originalStatement,
                EMAIL_APPRECIATION as emailAppreciation,
                IMPACT_TYPE as impactType,
                ADDITIONAL_DETAILS as additionalDetails,
                AI_GENERATED_STATEMENT as aiGeneratedStatement,
                CONGRATULATIONS_COUNT as congratulationsCount,
                VOTES_COUNT as votesCount,
                CREATED_AT as createdAt
            FROM ACCOMPLISHMENTS 
            ORDER BY CREATED_AT DESC, VOTES_COUNT DESC, CONGRATULATIONS_COUNT DESC
        `;

        try {
            const results = await hanaConnection.execute(sql);
            const transformed = results.map(this.transformAccomplishment);
            return transformed;
        } catch (error) {
            console.error('Error getting all accomplishments:', error);
            throw new Error('Failed to retrieve accomplishments');
        }
    }

    // Get accomplishments by user
    async getAccomplishmentsByUser(userId) {
        await this.ensureInitialized();

        const sql = `
            SELECT 
                ID as id,
                USER_ID as userId,
                USER_NAME as userName,
                ORIGINAL_STATEMENT as originalStatement,
                EMAIL_APPRECIATION as emailAppreciation,
                IMPACT_TYPE as impactType,
                ADDITIONAL_DETAILS as additionalDetails,
                AI_GENERATED_STATEMENT as aiGeneratedStatement,
                CONGRATULATIONS_COUNT as congratulationsCount,
                VOTES_COUNT as votesCount,
                CREATED_AT as createdAt
            FROM ACCOMPLISHMENTS 
            WHERE USER_ID = ?
            ORDER BY CREATED_AT DESC, VOTES_COUNT DESC, CONGRATULATIONS_COUNT DESC
        `;

        try {
            const results = await hanaConnection.execute(sql, [userId]);
            return results.map(this.transformAccomplishment);
        } catch (error) {
            console.error('Error getting accomplishments by user:', error);
            throw new Error('Failed to retrieve user accomplishments');
        }
    }

    // Filter accomplishments based on criteria
    async filterAccomplishments(filters) {
        await this.ensureInitialized();

        let sql = `
            SELECT 
                ID as id,
                USER_ID as userId,
                USER_NAME as userName,
                ORIGINAL_STATEMENT as originalStatement,
                EMAIL_APPRECIATION as emailAppreciation,
                IMPACT_TYPE as impactType,
                ADDITIONAL_DETAILS as additionalDetails,
                AI_GENERATED_STATEMENT as aiGeneratedStatement,
                CONGRATULATIONS_COUNT as congratulationsCount,
                VOTES_COUNT as votesCount,
                CREATED_AT as createdAt
            FROM ACCOMPLISHMENTS 
            WHERE 1=1
        `;

        const params = [];

        // Filter by date range
        if (filters.startDate) {
            sql += ` AND CREATED_AT >= ?`;
            params.push(filters.startDate);
        }
        if (filters.endDate) {
            sql += ` AND CREATED_AT <= ?`;
            params.push(filters.endDate + ' 23:59:59'); // Include full end date
        }

        // Filter by user name or email (partial search, case-insensitive)
        if (filters.user) {
            sql += ` AND (UPPER(USER_NAME) LIKE UPPER(?) OR UPPER(USER_ID) LIKE UPPER(?))`;
            const userPattern = `%${filters.user}%`;
            params.push(userPattern);
            params.push(userPattern);
        }

        // Filter by impact type
        if (filters.impactType) {
            sql += ` AND IMPACT_TYPE = ?`;
            params.push(filters.impactType);
        }

        sql += ` ORDER BY CREATED_AT DESC, VOTES_COUNT DESC, CONGRATULATIONS_COUNT DESC`;

        try {
            const results = await hanaConnection.execute(sql, params);
            return results.map(this.transformAccomplishment);
        } catch (error) {
            console.error('Error filtering accomplishments:', error);
            console.error('SQL:', sql);
            console.error('Params:', params);
            throw new Error('Failed to filter accomplishments');
        }
    }

    // Save new accomplishment
    async saveAccomplishment(accomplishment) {
        await this.ensureInitialized();

        const sql = `
            INSERT INTO ACCOMPLISHMENTS (
                ID, USER_ID, USER_NAME, ORIGINAL_STATEMENT,
                EMAIL_APPRECIATION, IMPACT_TYPE, ADDITIONAL_DETAILS,
                AI_GENERATED_STATEMENT, CREATED_AT
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            accomplishment.id,
            accomplishment.userId,
            accomplishment.userName,
            accomplishment.originalStatement,
            accomplishment.responses?.emailAppreciation || '',
            accomplishment.impactType || accomplishment.responses?.impactType,
            accomplishment.responses?.additionalDetails || '',
            accomplishment.aiGeneratedStatement,
            accomplishment.createdAt
        ];

        try {
            await hanaConnection.execute(sql, params);
            console.log(`✅ Saved accomplishment: ${accomplishment.id}`);
            return accomplishment;
        } catch (error) {
            console.error('Error saving accomplishment:', error);
            console.error('SQL:', sql);
            console.error('Params:', params);
            throw new Error('Failed to save accomplishment');
        }
    }

    // Get accomplishment by ID
    async getAccomplishmentById(id) {
        await this.ensureInitialized();

        const sql = `
            SELECT 
                ID as id,
                USER_ID as userId,
                USER_NAME as userName,
                ORIGINAL_STATEMENT as originalStatement,
                EMAIL_APPRECIATION as emailAppreciation,
                IMPACT_TYPE as impactType,
                ADDITIONAL_DETAILS as additionalDetails,
                AI_GENERATED_STATEMENT as aiGeneratedStatement,
                CONGRATULATIONS_COUNT as congratulationsCount,
                VOTES_COUNT as votesCount,
                CREATED_AT as createdAt
            FROM ACCOMPLISHMENTS 
            WHERE ID = ?
        `;

        try {
            const results = await hanaConnection.execute(sql, [id]);
            if (results.length === 0) {
                return null;
            }
            return this.transformAccomplishment(results[0]);
        } catch (error) {
            console.error('Error getting accomplishment by ID:', error);
            throw new Error('Failed to retrieve accomplishment');
        }
    }

    // Transform database row to application format
    transformAccomplishment(row) {
        // HANA returns field names in ALL CAPS, so we need to handle that
        const userName = row.userName || row.USER_NAME || row.USERNAME || 'Unknown User';
        const result = {
            id: row.id || row.ID,
            userId: row.userId || row.USER_ID || row.USERID,
            userName: userName,
            userThumbnail: null, // Will be generated by frontend using getUserThumbnail()
            statement: row.aiGeneratedStatement || row.AI_GENERATED_STATEMENT || row.AIGENERATEDSTATEMENT, // This is what frontend expects for display
            originalStatement: row.originalStatement || row.ORIGINAL_STATEMENT || row.ORIGINALSTATEMENT,
            impactType: row.impactType || row.IMPACT_TYPE || row.IMPACTTYPE,
            createdAt: row.createdAt || row.CREATED_AT || row.CREATEDAT,
            emailAppreciation: row.emailAppreciation || row.EMAIL_APPRECIATION || row.EMAILAPPRECIATION || '',
            additionalDetails: row.additionalDetails || row.ADDITIONAL_DETAILS || row.ADDITIONALDETAILS || '',
            congratulationsCount: row.congratulationsCount || row.CONGRATULATIONS_COUNT || row.CONGRATULATIONSCOUNT || 0,
            votesCount: row.votesCount || row.VOTES_COUNT || row.VOTESCOUNT || 0,
            responses: {
                emailAppreciation: row.emailAppreciation || row.EMAIL_APPRECIATION || row.EMAILAPPRECIATION || '',
                impactType: row.impactType || row.IMPACT_TYPE || row.IMPACTTYPE,
                additionalDetails: row.additionalDetails || row.ADDITIONAL_DETAILS || row.ADDITIONALDETAILS || ''
            },
            aiGeneratedStatement: row.aiGeneratedStatement || row.AI_GENERATED_STATEMENT || row.AIGENERATEDSTATEMENT
        };
        return result;
    }

    // Toggle congratulations on an accomplishment
    async toggleCongratulations(accomplishmentId, userEmail) {
        await this.ensureInitialized();

        try {

            // Get current count from database
            const getCurrentSql = `
                SELECT CONGRATULATIONS_COUNT as congratulationsCount
                FROM ACCOMPLISHMENTS 
                WHERE ID = ?
            `;

            const currentResult = await hanaConnection.execute(getCurrentSql, [accomplishmentId]);
            if (currentResult.length === 0) {
                throw new Error('Accomplishment not found');
            }

            // Handle both HANA field name variations
            const currentCount = currentResult[0].congratulationsCount || currentResult[0].CONGRATULATIONSCOUNT || 0;
            // For demo purposes, always increment
            // In reality, you'd check if user already congratulated and toggle accordingly
            const newCount = currentCount + 1;

            const updateSql = `
                UPDATE ACCOMPLISHMENTS 
                SET CONGRATULATIONS_COUNT = ?
                WHERE ID = ?
            `;

            const updateResult = await hanaConnection.execute(updateSql, [newCount, accomplishmentId]);

            return {
                congratulationsCount: newCount,
                userCongratulated: true
            };
        } catch (error) {
            console.error('Error toggling congratulations:', error);
            throw new Error('Failed to update congratulations');
        }
    }

    // Toggle vote on an accomplishment
    async toggleVote(accomplishmentId, userEmail) {
        await this.ensureInitialized();

        try {
            // Get current count from database
            const getCurrentSql = `
                SELECT VOTES_COUNT as votesCount
                FROM ACCOMPLISHMENTS 
                WHERE ID = ?
            `;

            const currentResult = await hanaConnection.execute(getCurrentSql, [accomplishmentId]);
            if (currentResult.length === 0) {
                throw new Error('Accomplishment not found');
            }

            // Handle both HANA field name variations
            const currentCount = currentResult[0].votesCount || currentResult[0].VOTESCOUNT || 0;

            // For demo purposes, always increment
            // In reality, you'd check if user already voted and toggle accordingly
            const newCount = currentCount + 1;

            const updateSql = `
                UPDATE ACCOMPLISHMENTS 
                SET VOTES_COUNT = ?
                WHERE ID = ?
            `;

            const updateResult = await hanaConnection.execute(updateSql, [newCount, accomplishmentId]);
            return {
                votesCount: newCount,
                userVoted: true
            };
        } catch (error) {
            console.error('Error toggling vote:', error);
            throw new Error('Failed to update vote');
        }
    }

    // Clear all data (for testing)
    async clearData() {
        await this.ensureInitialized();

        try {
            await hanaConnection.execute('DELETE FROM ACCOMPLISHMENTS');
            await hanaSchema.insertSampleData();
            console.log('✅ Data cleared and sample data restored');
        } catch (error) {
            console.error('Error clearing data:', error);
            throw new Error('Failed to clear data');
        }
    }

    // Get connection status
    async getStatus() {
        try {
            const isConnected = hanaConnection.isConnected();
            const testQuery = await hanaConnection.execute('SELECT 1 as TEST FROM DUMMY');

            return {
                connected: isConnected,
                queryTest: testQuery.length > 0,
                initialized: this.initialized
            };
        } catch (error) {
            return {
                connected: false,
                queryTest: false,
                initialized: this.initialized,
                error: error.message
            };
        }
    }

    // Close database connection
    async disconnect() {
        await hanaConnection.disconnect();
        this.initialized = false;
    }
}

module.exports = new DBServer();