/**
 * HANA Database Connection Module
 * Handles connection to SAP HANA Cloud database
 */

const hana = require('@sap/hana-client');

class HanaConnection {
    constructor() {
        this.connection = null;
        this.connectionParams = {
            serverNode: `${process.env.VDB_H}:${process.env.VDB_N}`,
            uid: process.env.VDB_U,
            pwd: process.env.VDB_P,
            encrypt: true,
            sslValidateCertificate: false
        };
        console.log('HANA Connection parameters set', this.connectionParams);
    }

    // Connect to HANA database
    async connect() {
        try {
            if (this.connection && this.connection.state() === 'connected') {
                return this.connection;
            }

            this.connection = hana.createConnection();
            await new Promise((resolve, reject) => {
                this.connection.connect(this.connectionParams, (err) => {
                    if (err) {
                        console.error('HANA Connection Error:', err);
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
}

module.exports = new HanaConnection();