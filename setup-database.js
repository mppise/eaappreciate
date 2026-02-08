#!/usr/bin/env node

/**
 * Database Setup Script
 * Run this manually to initialize HANA database schema and sample data
 * Usage: node setup-database.js
 */

const hanaConnection = require('./db/hana-connection');
const hanaSchema = require('./db/hana-schema');

async function setupDatabase() {
    console.log('🚀 Starting database setup...');

    try {
        // Connect to HANA
        console.log('📡 Connecting to HANA database...');
        await hanaConnection.connect();

        // Initialize schema
        console.log('🔧 Setting up database schema...');
        await hanaSchema.initializeSchema();

        // Insert sample data
        console.log('🌱 Adding sample data...');
        await hanaSchema.insertSampleData();

        console.log('✅ Database setup completed successfully!');
        console.log('');
        console.log('You can now start the server with: npm start');

    } catch (error) {
        console.error('❌ Database setup failed:', error);
        process.exit(1);
    } finally {
        // Close connection
        await hanaConnection.disconnect();
        process.exit(0);
    }
}

// Run setup if this script is executed directly
if (require.main === module) {
    setupDatabase();
}

module.exports = { setupDatabase };