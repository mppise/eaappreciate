/**
 * HANA Database Schema Setup
 * Creates and manages database tables for EA Appreciate application
 */

const hanaConnection = require('./hana-connection');

class HanaSchema {

    // Initialize all required tables
    async initializeSchema() {
        console.log('🔧 Initializing HANA database schema...');

        try {
            await this.createAccomplishmentsTable();
            await this.createIndexes();
            console.log('✅ Database schema initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize schema:', error);
            throw error;
        }
    }

    // Create accomplishments table
    async createAccomplishmentsTable() {
        // First check if table exists
        const checkTableSQL = `
            SELECT COUNT(*) as COUNT FROM SYS.TABLES 
            WHERE TABLE_NAME = 'ACCOMPLISHMENTS' AND SCHEMA_NAME = CURRENT_SCHEMA
        `;

        try {
            const result = await hanaConnection.execute(checkTableSQL);
            const tableExists = result[0]?.COUNT > 0;

            if (tableExists) {
                console.log('✅ ACCOMPLISHMENTS table already exists');
                return;
            }
        } catch (error) {
            console.log('⚠️ Could not check table existence, proceeding with creation');
        }

        const createTableSQL = `
            CREATE TABLE ACCOMPLISHMENTS (
                ID NVARCHAR(50) PRIMARY KEY,
                USER_ID NVARCHAR(255) NOT NULL,
                USER_NAME NVARCHAR(255) NOT NULL,
                ORIGINAL_STATEMENT NCLOB NOT NULL,
                EMAIL_APPRECIATION NCLOB,
                IMPACT_TYPE NVARCHAR(20) NOT NULL,
                ADDITIONAL_DETAILS NCLOB,
                AI_GENERATED_STATEMENT NCLOB NOT NULL,
                CONGRATULATIONS_COUNT INTEGER DEFAULT 0,
                VOTES_COUNT INTEGER DEFAULT 0,
                CREATED_AT TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UPDATED_AT TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `;

        await hanaConnection.execute(createTableSQL);
        console.log('✅ ACCOMPLISHMENTS table created successfully');

        // Add CHECK constraint separately (HANA syntax)
        try {
            const addConstraintSQL = `
                ALTER TABLE ACCOMPLISHMENTS 
                ADD CONSTRAINT CHK_IMPACT_TYPE 
                CHECK (IMPACT_TYPE IN ('team', 'customer'))
            `;
            await hanaConnection.execute(addConstraintSQL);
            console.log('✅ CHECK constraint added successfully');
        } catch (error) {
            if (!error.message.includes('already exists') && error.code !== 288) {
                console.warn('⚠️ Could not add CHECK constraint:', error.message);
            }
        }
    }

    // Create performance indexes
    async createIndexes() {
        const indexes = [
            {
                name: 'IDX_ACCOMPLISHMENTS_USER_ID',
                sql: 'CREATE INDEX IDX_ACCOMPLISHMENTS_USER_ID ON ACCOMPLISHMENTS (USER_ID)'
            },
            {
                name: 'IDX_ACCOMPLISHMENTS_CREATED_AT',
                sql: 'CREATE INDEX IDX_ACCOMPLISHMENTS_CREATED_AT ON ACCOMPLISHMENTS (CREATED_AT DESC)'
            },
            {
                name: 'IDX_ACCOMPLISHMENTS_IMPACT_TYPE',
                sql: 'CREATE INDEX IDX_ACCOMPLISHMENTS_IMPACT_TYPE ON ACCOMPLISHMENTS (IMPACT_TYPE)'
            },
            {
                name: 'IDX_ACCOMPLISHMENTS_USER_NAME',
                sql: 'CREATE INDEX IDX_ACCOMPLISHMENTS_USER_NAME ON ACCOMPLISHMENTS (USER_NAME)'
            }
        ];

        for (const index of indexes) {
            try {
                await hanaConnection.execute(index.sql);
                console.log(`✅ Index ${index.name} created`);
            } catch (error) {
                // Handle duplicate index errors (codes 288, 289) - HANA specific error codes
                if (error.message.includes('already exists') ||
                    error.message.includes('duplicate') ||
                    error.message.includes('cannot use duplicate') ||
                    error.code === 288 || error.code === 289) {
                    console.log(`ℹ️ Index ${index.name} already exists (silently ignored)`);
                } else {
                    console.warn(`⚠️ Failed to create index ${index.name}:`, error.message);
                }
            }
        }
    }

    // Insert sample data if table is empty
    async insertSampleData() {
        try {
            // Check if data already exists
            const countResult = await hanaConnection.execute('SELECT COUNT(*) as COUNT FROM ACCOMPLISHMENTS');
            const count = countResult[0]?.COUNT || 0;

            if (count > 0) {
                console.log(`📊 Database already contains ${count} accomplishments`);
                return;
            }

            console.log('🌱 Inserting sample data...');

            const sampleData = [
                {
                    id: '1',
                    userId: 'john.doe@company.com',
                    userName: 'John Doe',
                    originalStatement: 'Today I helped my customer by resolving their critical database issue that was preventing their application from running.',
                    emailAppreciation: 'Thanks John! You saved our production deployment. Your quick thinking and expertise made all the difference. - Sarah, Customer Success Manager',
                    impactType: 'customer',
                    additionalDetails: 'The issue was affecting their main production database and could have resulted in significant downtime.',
                    aiGeneratedStatement: 'John Doe successfully resolved a critical database issue for a customer that was preventing their application from running in production. The customer expressed appreciation through email, noting that John\'s quick thinking and expertise prevented significant downtime and saved their production deployment. This technical intervention had direct customer impact and demonstrated strong problem-solving capabilities.',
                    createdAt: '2026-02-07T15:30:00.000Z'
                },
                {
                    id: '2',
                    userId: 'jane.smith@company.com',
                    userName: 'Jane Smith',
                    originalStatement: 'I mentored a new team member and helped them complete their first major project successfully.',
                    emailAppreciation: '',
                    impactType: 'team',
                    additionalDetails: 'The new hire was struggling with our codebase and I spent extra time explaining our architecture and best practices.',
                    aiGeneratedStatement: 'Jane Smith provided mentorship to a new team member, enabling them to successfully complete their first major project. She invested additional time explaining the team\'s codebase architecture and best practices, demonstrating leadership and commitment to team development. This mentoring effort had positive team impact and contributed to onboarding success.',
                    createdAt: '2026-02-06T10:15:00.000Z'
                }
            ];

            for (const data of sampleData) {
                await this.insertSampleAccomplishment(data);
            }

            console.log('✅ Sample data inserted successfully');
        } catch (error) {
            console.error('❌ Failed to insert sample data:', error);
            throw error;
        }
    }

    async insertSampleAccomplishment(data) {
        const insertSQL = `
            INSERT INTO ACCOMPLISHMENTS (
                ID, USER_ID, USER_NAME, ORIGINAL_STATEMENT,
                EMAIL_APPRECIATION, IMPACT_TYPE, ADDITIONAL_DETAILS,
                AI_GENERATED_STATEMENT, CREATED_AT
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            data.id,
            data.userId,
            data.userName,
            data.originalStatement,
            data.emailAppreciation,
            data.impactType,
            data.additionalDetails,
            data.aiGeneratedStatement,
            data.createdAt
        ];

        await hanaConnection.execute(insertSQL, params);
    }

    // Drop all tables (for testing/reset)
    async dropSchema() {
        console.log('🗑️ Dropping database schema...');

        try {
            await hanaConnection.execute('DROP TABLE IF EXISTS ACCOMPLISHMENTS');
            console.log('✅ Schema dropped successfully');
        } catch (error) {
            console.error('❌ Failed to drop schema:', error);
            throw error;
        }
    }
}

module.exports = new HanaSchema();