#!/usr/bin/env node

/**
 * Enhanced Database Setup Script
 * Ensures proper field consistency between database and UI transform functions
 * Usage: node setup-database-enhanced.js
 */

const hanaConnection = require('./db/hana-connection');
const hanaSchema = require('./db/hana-schema');

async function setupDatabase() {
    console.log('🚀 Starting enhanced database setup...');

    try {
        // Connect to HANA
        console.log('📡 Connecting to HANA database...');
        await hanaConnection.connect();

        // Drop existing schema to ensure clean start
        console.log('🗑️ Dropping existing schema...');
        await hanaSchema.dropSchema();

        // Initialize fresh schema
        console.log('🔧 Setting up database schema...');
        await hanaSchema.initializeSchema();

        // Insert enhanced sample data with explicit field validation
        console.log('🌱 Adding enhanced sample data...');
        await insertEnhancedSampleData();

        // Verify data integrity
        console.log('🔍 Verifying data integrity...');
        await verifyDataIntegrity();

        console.log('✅ Enhanced database setup completed successfully!');
        console.log('');
        console.log('You can now start the server with: npm start');

    } catch (error) {
        console.error('❌ Enhanced database setup failed:', error);
        process.exit(1);
    } finally {
        // Close connection
        await hanaConnection.disconnect();
        process.exit(0);
    }
}

// Insert enhanced sample data that matches transform function expectations exactly
async function insertEnhancedSampleData() {
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
            congratulationsCount: 0,
            votesCount: 0,
            createdAt: '2026-02-07 15:30:00.000000000'
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
            congratulationsCount: 0,
            votesCount: 0,
            createdAt: '2026-02-06 10:15:00.000000000'
        }
    ];

    console.log('🔧 Inserting sample data with explicit field mapping...');

    for (const data of sampleData) {
        const insertSQL = `
            INSERT INTO ACCOMPLISHMENTS (
                ID, USER_ID, USER_NAME, ORIGINAL_STATEMENT,
                EMAIL_APPRECIATION, IMPACT_TYPE, ADDITIONAL_DETAILS,
                AI_GENERATED_STATEMENT, CONGRATULATIONS_COUNT, VOTES_COUNT, CREATED_AT
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            data.congratulationsCount,
            data.votesCount,
            data.createdAt
        ];

        console.log(`📝 Inserting record: ${data.userName} (${data.id})`);
        await hanaConnection.execute(insertSQL, params);
    }
}

// Verify that inserted data matches transform function expectations
async function verifyDataIntegrity() {
    console.log('🔍 Verifying database records match transform function expectations...');

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
        ORDER BY CREATED_AT DESC
    `;

    const results = await hanaConnection.execute(sql);
    console.log('📊 Raw database results for verification:');

    for (let i = 0; i < results.length; i++) {
        const row = results[i];
        console.log(`\n🔸 Record ${i + 1}:`);
        console.log(`   ID: ${row.id || row.ID}`);
        console.log(`   User: ${row.userName || row.USER_NAME || row.USERNAME}`);
        console.log(`   Statement length: ${(row.aiGeneratedStatement || row.AI_GENERATED_STATEMENT || '').length} chars`);
        console.log(`   Email appreciation length: ${(row.emailAppreciation || row.EMAIL_APPRECIATION || '').length} chars`);
        console.log(`   Congratulations: ${row.congratulationsCount || row.CONGRATULATIONS_COUNT || row.CONGRATULATIONSCOUNT || 0}`);
        console.log(`   Votes: ${row.votesCount || row.VOTES_COUNT || row.VOTESCOUNT || 0}`);
        console.log(`   Created: ${row.createdAt || row.CREATED_AT || row.CREATEDAT}`);

        // Test the transform function
        const transformed = transformAccomplishment(row);
        console.log(`   ✅ Transformed userName: ${transformed.userName}`);
        console.log(`   ✅ Transformed statement present: ${!!transformed.statement}`);
    }

    console.log('\n✅ Data integrity verification complete');
}

// Copy of transform function from db-server.js to test consistency
function transformAccomplishment(row) {
    const userName = row.userName || row.USER_NAME || row.USERNAME || 'Unknown User';
    return {
        id: row.id || row.ID,
        userId: row.userId || row.USER_ID || row.USERID,
        userName: userName,
        userThumbnail: null,
        statement: row.aiGeneratedStatement || row.AI_GENERATED_STATEMENT || row.AIGENERATEDSTATEMENT,
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
}

// Run setup if this script is executed directly
if (require.main === module) {
    setupDatabase();
}

module.exports = { setupDatabase, insertEnhancedSampleData, verifyDataIntegrity };