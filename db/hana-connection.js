/**
 * HANA Database Connection Module
 * Handles connection to SAP HANA Cloud database
 */

const hana = require('@sap/hana-client');

class HanaConnection {
    constructor() {
        this.connection = null;

        // Validate required environment variables
        const requiredEnvVars = ['VDB_H', 'VDB_N', 'VDB_U', 'VDB_P'];
        const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

        if (missingEnvVars.length > 0) {
            console.error('Missing required environment variables:', missingEnvVars);
            throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
        }

        this.connectionParams = {
            serverNode: `${process.env.VDB_H}:${process.env.VDB_N}`,
            uid: process.env.VDB_U,
            pwd: process.env.VDB_P,
            encrypt: true,
            sslValidateCertificate: false,
            connectTimeout: 30000,
            idleTimeout: 900000
        };

        // Add schema if provided
        if (process.env.VDB_SCHEMA) {
            this.connectionParams.currentSchema = process.env.VDB_SCHEMA;
        }

        // -- DEBUG --
        console.log('HANA Connection parameters set', {
            serverNode: this.connectionParams.serverNode,
            uid: this.connectionParams.uid,
            currentSchema: this.connectionParams.currentSchema || 'default'
        });
    }

    // Connect to HANA database
    async connect() {
        try {
            if (this.connection && this.connection.state() === 'connected') {
                return this.connection;
            }

            console.log('Attempting to connect to HANA database...');
            this.connection = hana.createConnection();

            // Set connection timeout
            const connectTimeout = setTimeout(() => {
                console.error('Database connection timeout after 30 seconds');
                if (this.connection) {
                    this.connection.disconnect();
                }
            }, 30000);

            await new Promise((resolve, reject) => {
                this.connection.connect(this.connectionParams, (err) => {
                    clearTimeout(connectTimeout);

                    if (err) {
                        console.error('HANA Connection Error:', err);
                        console.error('Connection params used:', {
                            serverNode: this.connectionParams.serverNode,
                            uid: this.connectionParams.uid,
                            currentSchema: this.connectionParams.currentSchema
                        });
                        reject(err);
                    } else {
                        console.log('✅ Connected to HANA database successfully');
                        // Set autocommit to false to ensure manual commit control
                        this.connection.setAutoCommit(false);
                        resolve();
                    }
                });
            });

            return this.connection;
        } catch (error) {
            console.error('Failed to connect to HANA:', error);
            throw error;
        }
    }

    // Execute SQL query
    async execute(sql, params = []) {
        // -- DEBUG --
        console.log('Executing HANA SQL:', sql, 'with params:', params);
        try {
            const conn = await this.connect();

            return new Promise((resolve, reject) => {
                conn.exec(sql, params, (err, result) => {
                    if (err) {
                        console.error('HANA Query Error:', err);
                        console.error('SQL:', sql);
                        console.error('Params:', params);
                        reject(err);
                    } else {
                        // Explicitly commit for write operations
                        if (sql.trim().toUpperCase().startsWith('UPDATE') ||
                            sql.trim().toUpperCase().startsWith('INSERT') ||
                            sql.trim().toUpperCase().startsWith('DELETE')) {
                            conn.commit((commitErr) => {
                                if (commitErr) {
                                    console.error('HANA Commit Error:', commitErr);
                                    reject(commitErr);
                                } else {
                                    console.log('✅ Transaction committed successfully');
                                    resolve(result);
                                }
                            });
                        } else {
                            resolve(result);
                        }
                    }
                });
            });
        } catch (error) {
            console.error('Failed to execute query:', error);
            throw error;
        }
    }

    // Close connection
    async disconnect() {
        if (this.connection) {
            try {
                if (this.connection.state() === 'connected') {
                    this.connection.disconnect();
                    console.log('Disconnected from HANA database');
                }
            } catch (error) {
                console.log('Connection already closed or error disconnecting:', error.message);
            }
        }
    }

    // Check if connected
    isConnected() {
        return this.connection && this.connection.state() === 'connected';
    }

    // Test connection function
    async testConnection() {
        try {
            const conn = await this.connect();
            console.log('Database connection test successful');
            return true;
        } catch (error) {
            console.error('Database connection test failed:', error);
            return false;
        }
    }
}

module.exports = new HanaConnection();
