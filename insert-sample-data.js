#!/usr/bin/env node

/**
 * Safe Sample Data Insertion Script
 * Run this to insert only new sample data without affecting existing records
 * Usage: node insert-sample-data.js
 */

const hanaConnection = require('./db/hana-connection');
const hanaSchema = require('./db/hana-schema');

async function insertSampleDataOnly() {
    console.log('🚀 Starting safe sample data insertion...');

    try {
        // Connect to HANA
        console.log('📡 Connecting to HANA database...');
        await hanaConnection.connect();

        // Insert only new sample data (safe operation)
        console.log('🌱 Inserting new sample data only...');
        await hanaSchema.insertNewSampleDataOnly();

        console.log('✅ Sample data insertion completed successfully!');
        console.log('');
        console.log('ℹ️ No existing data was modified or deleted.');
        console.log('ℹ️ Only missing sample records were added.');

    } catch (error) {
        console.error('❌ Sample data insertion failed:', error);
        process.exit(1);
    } finally {
        // Close connection
        await hanaConnection.disconnect();
        process.exit(0);
    }
}

// Run insertion if this script is executed directly
if (require.main === module) {
    insertSampleDataOnly();
}

module.exports = { insertSampleDataOnly };