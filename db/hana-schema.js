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
                    userId: 'john.doe@sap.com',
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
                    userId: 'jane.smith@sap.com',
                    userName: 'Jane Smith',
                    originalStatement: 'I mentored a new team member and helped them complete their first major project successfully.',
                    emailAppreciation: '',
                    impactType: 'team',
                    additionalDetails: 'The new hire was struggling with our codebase and I spent extra time explaining our architecture and best practices.',
                    aiGeneratedStatement: 'Jane Smith provided mentorship to a new team member, enabling them to successfully complete their first major project. She invested additional time explaining the team\'s codebase architecture and best practices, demonstrating leadership and commitment to team development. This mentoring effort had positive team impact and contributed to onboarding success.',
                    createdAt: '2026-02-06T10:15:00.000Z'
                },
                {
                    id: '3',
                    userId: 'michael.chen@sap.com',
                    userName: 'Michael Chen',
                    originalStatement: 'I implemented automated testing that reduced our deployment bugs by 75% over the last quarter.',
                    emailAppreciation: 'Michael\'s automation work has been a game-changer for our release quality. The team can now deploy with confidence! - Alex Rodriguez, Engineering Manager',
                    impactType: 'team',
                    additionalDetails: 'Created comprehensive test suites covering unit, integration, and end-to-end testing scenarios. Also set up CI/CD pipelines.',
                    aiGeneratedStatement: 'Michael Chen implemented comprehensive automated testing solutions that reduced deployment bugs by 75% over a quarter. His work included unit, integration, and end-to-end test suites, along with CI/CD pipeline setup. The Engineering Manager praised this as a game-changer for release quality, enabling the team to deploy with confidence and significantly improving overall development workflow.',
                    createdAt: '2026-02-05T14:20:00.000Z'
                },
                {
                    id: '4',
                    userId: 'm.pise@sap.com',
                    userName: 'Mangesh Pise',
                    originalStatement: 'I worked with a frustrated customer whose integration was failing and walked them through the solution step by step.',
                    emailAppreciation: 'Mangesh was incredibly patient and knowledgeable. He turned a very stressful situation into a positive experience. Thank you! - David Thompson, CTO at TechCorp',
                    impactType: 'customer',
                    additionalDetails: 'The customer had been struggling for 3 days. I provided detailed documentation and a follow-up call to ensure everything was working.',
                    aiGeneratedStatement: 'Mangesh Pise provided exceptional customer support to resolve a complex integration issue that had been causing frustration for three days. He patiently walked the customer through the solution step-by-step, provided comprehensive documentation, and conducted follow-up calls to ensure success. The customer\'s CTO praised his patience and expertise, noting how he transformed a stressful situation into a positive experience.',
                    createdAt: '2026-02-04T09:45:00.000Z'
                },
                {
                    id: '5',
                    userId: 'david.garcia@sap.com',
                    userName: 'David Garcia',
                    originalStatement: 'I organized knowledge sharing sessions that helped our team stay current with new technologies.',
                    emailAppreciation: '',
                    impactType: 'team',
                    additionalDetails: 'Set up monthly tech talks, created a shared learning calendar, and encouraged team members to present topics they\'re passionate about.',
                    aiGeneratedStatement: 'David Garcia established a comprehensive knowledge sharing program for the team, organizing monthly tech talks and creating a shared learning calendar. His initiative encouraged team members to present on topics they\'re passionate about, fostering continuous learning and helping the team stay current with emerging technologies. This program enhanced team collaboration and professional development.',
                    createdAt: '2026-02-03T16:30:00.000Z'
                },
                {
                    id: '6',
                    userId: 'lisa.brown@sap.com',
                    userName: 'Lisa Brown',
                    originalStatement: 'I helped a customer optimize their system performance, reducing their query response times by 80%.',
                    emailAppreciation: 'Lisa\'s optimization suggestions were brilliant! Our application is now lightning fast. Our users are thrilled with the performance improvement. - Jennifer Park, Product Manager at DataFlow Solutions',
                    impactType: 'customer',
                    additionalDetails: 'Analyzed their database queries, suggested indexing strategies, and provided query optimization recommendations.',
                    aiGeneratedStatement: 'Lisa Brown delivered exceptional performance optimization for a customer, achieving an 80% reduction in query response times. Her work involved comprehensive database analysis, strategic indexing recommendations, and query optimization techniques. The customer\'s Product Manager praised the brilliant suggestions, noting that users are thrilled with the lightning-fast application performance improvements.',
                    createdAt: '2026-02-02T11:15:00.000Z'
                },
                {
                    id: '7',
                    userId: 'robert.taylor@sap.com',
                    userName: 'Robert Taylor',
                    originalStatement: 'I created comprehensive documentation for our new API that reduced support tickets by 60%.',
                    emailAppreciation: '',
                    impactType: 'team',
                    additionalDetails: 'Included code examples, troubleshooting guides, and interactive demos. Also created video tutorials for complex scenarios.',
                    aiGeneratedStatement: 'Robert Taylor created comprehensive API documentation that significantly reduced support tickets by 60%. His documentation included detailed code examples, troubleshooting guides, interactive demos, and video tutorials for complex scenarios. This thorough approach to documentation improved developer experience and reduced the support team\'s workload while enabling faster customer onboarding.',
                    createdAt: '2026-02-01T13:00:00.000Z'
                },
                {
                    id: '8',
                    userId: 'emily.johnson@sap.com',
                    userName: 'Emily Johnson',
                    originalStatement: 'I worked late to help a customer meet their critical go-live deadline by troubleshooting their integration issues.',
                    emailAppreciation: 'Emily went above and beyond to help us launch on time. Her dedication and expertise saved our product launch. We couldn\'t be more grateful! - Mark Stevens, VP Engineering at StartupTech',
                    impactType: 'customer',
                    additionalDetails: 'Customer had a hard deadline for their product launch. Spent 4 extra hours debugging and provided real-time support during their deployment.',
                    aiGeneratedStatement: 'Emily Johnson demonstrated exceptional dedication by working extended hours to help a customer meet their critical go-live deadline. She spent four additional hours debugging integration issues and provided real-time support during their deployment. The customer\'s VP of Engineering expressed deep gratitude, noting that her expertise and commitment saved their product launch timeline.',
                    createdAt: '2026-01-31T19:45:00.000Z'
                },
                {
                    id: '9',
                    userId: 'alex.rodriguez@sap.com',
                    userName: 'Alex Rodriguez',
                    originalStatement: 'I implemented a new code review process that improved our code quality and reduced bugs in production.',
                    emailAppreciation: '',
                    impactType: 'team',
                    additionalDetails: 'Introduced peer review guidelines, automated quality checks, and created templates for consistent reviews. Team adoption was 95% within two weeks.',
                    aiGeneratedStatement: 'Alex Rodriguez implemented a comprehensive code review process that significantly improved code quality and reduced production bugs. The initiative included peer review guidelines, automated quality checks, and standardized review templates. The process achieved 95% team adoption within two weeks, demonstrating strong change management and technical leadership that enhanced overall development practices.',
                    createdAt: '2026-01-30T08:30:00.000Z'
                },
                {
                    id: '10',
                    userId: 'maria.gonzalez@sap.com',
                    userName: 'Maria Gonzalez',
                    originalStatement: 'I helped a customer integrate our API with their legacy system, enabling them to modernize their infrastructure.',
                    emailAppreciation: 'Maria\'s expertise in both modern APIs and legacy systems was invaluable. She made our digital transformation possible! - Carlos Mendez, IT Director at Manufacturing Plus',
                    impactType: 'customer',
                    additionalDetails: 'Customer was using a 15-year-old system. Created custom middleware and provided migration strategy.',
                    aiGeneratedStatement: 'Maria Gonzalez successfully enabled a customer\'s digital transformation by integrating modern APIs with their 15-year-old legacy system. Her expertise in both contemporary and legacy technologies proved invaluable as she developed custom middleware and provided a comprehensive migration strategy. The customer\'s IT Director credited her work as making their entire digital transformation initiative possible.',
                    createdAt: '2026-01-29T12:20:00.000Z'
                },
                {
                    id: '11',
                    userId: 'thomas.anderson@sap.com',
                    userName: 'Thomas Anderson',
                    originalStatement: 'I coordinated a cross-team effort to resolve a critical security vulnerability that could have affected thousands of users.',
                    emailAppreciation: '',
                    impactType: 'team',
                    additionalDetails: 'Worked with security, engineering, and operations teams to patch the vulnerability within 6 hours of discovery.',
                    aiGeneratedStatement: 'Thomas Anderson coordinated a critical cross-functional response to address a security vulnerability that could have affected thousands of users. His leadership brought together security, engineering, and operations teams to successfully patch the vulnerability within six hours of discovery. This rapid response demonstrated exceptional crisis management and prevented potential widespread security impact.',
                    createdAt: '2026-01-28T15:10:00.000Z'
                },
                {
                    id: '12',
                    userId: 'm.pise@sap.com',
                    userName: 'Mangesh Pise',
                    originalStatement: 'I designed and delivered training sessions that helped 50+ customers better utilize our platform features.',
                    emailAppreciation: 'Mangesh\'s training was engaging and practical. Our team learned so much and we\'re already seeing improved productivity! - Rachel Kim, Training Manager at EdTech Solutions',
                    impactType: 'customer',
                    additionalDetails: 'Created interactive workshops, hands-on exercises, and follow-up materials. Received 4.8/5 average rating across all sessions.',
                    aiGeneratedStatement: 'Mangesh Pise designed and delivered comprehensive training programs that enhanced platform utilization for over 50 customers. His interactive workshops included hands-on exercises and follow-up materials, achieving an impressive 4.8/5 average rating. A customer training manager praised the engaging and practical approach, noting significant productivity improvements among their team following the sessions.',
                    createdAt: '2026-01-27T10:45:00.000Z'
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

    // Insert new sample data only (safe method that only adds missing records)
    async insertNewSampleDataOnly() {
        try {
            console.log('🌱 Checking for new sample data to insert...');
            await this.ensureInitialized();

            const sampleData = [
                {
                    id: '1',
                    userId: 'john.doe@sap.com',
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
                    userId: 'jane.smith@sap.com',
                    userName: 'Jane Smith',
                    originalStatement: 'I mentored a new team member and helped them complete their first major project successfully.',
                    emailAppreciation: '',
                    impactType: 'team',
                    additionalDetails: 'The new hire was struggling with our codebase and I spent extra time explaining our architecture and best practices.',
                    aiGeneratedStatement: 'Jane Smith provided mentorship to a new team member, enabling them to successfully complete their first major project. She invested additional time explaining the team\'s codebase architecture and best practices, demonstrating leadership and commitment to team development. This mentoring effort had positive team impact and contributed to onboarding success.',
                    createdAt: '2026-02-06T10:15:00.000Z'
                },
                {
                    id: '3',
                    userId: 'michael.chen@sap.com',
                    userName: 'Michael Chen',
                    originalStatement: 'I implemented automated testing that reduced our deployment bugs by 75% over the last quarter.',
                    emailAppreciation: 'Michael\'s automation work has been a game-changer for our release quality. The team can now deploy with confidence! - Alex Rodriguez, Engineering Manager',
                    impactType: 'team',
                    additionalDetails: 'Created comprehensive test suites covering unit, integration, and end-to-end testing scenarios. Also set up CI/CD pipelines.',
                    aiGeneratedStatement: 'Michael Chen implemented comprehensive automated testing solutions that reduced deployment bugs by 75% over a quarter. His work included unit, integration, and end-to-end test suites, along with CI/CD pipeline setup. The Engineering Manager praised this as a game-changer for release quality, enabling the team to deploy with confidence and significantly improving overall development workflow.',
                    createdAt: '2026-02-05T14:20:00.000Z'
                },
                {
                    id: '4',
                    userId: 'm.pise@sap.com',
                    userName: 'Mangesh Pise',
                    originalStatement: 'I worked with a frustrated customer whose integration was failing and walked them through the solution step by step.',
                    emailAppreciation: 'Mangesh was incredibly patient and knowledgeable. He turned a very stressful situation into a positive experience. Thank you! - David Thompson, CTO at TechCorp',
                    impactType: 'customer',
                    additionalDetails: 'The customer had been struggling for 3 days. I provided detailed documentation and a follow-up call to ensure everything was working.',
                    aiGeneratedStatement: 'Mangesh Pise provided exceptional customer support to resolve a complex integration issue that had been causing frustration for three days. He patiently walked the customer through the solution step-by-step, provided comprehensive documentation, and conducted follow-up calls to ensure success. The customer\'s CTO praised his patience and expertise, noting how he transformed a stressful situation into a positive experience.',
                    createdAt: '2026-02-04T09:45:00.000Z'
                },
                {
                    id: '5',
                    userId: 'david.garcia@sap.com',
                    userName: 'David Garcia',
                    originalStatement: 'I organized knowledge sharing sessions that helped our team stay current with new technologies.',
                    emailAppreciation: '',
                    impactType: 'team',
                    additionalDetails: 'Set up monthly tech talks, created a shared learning calendar, and encouraged team members to present topics they\'re passionate about.',
                    aiGeneratedStatement: 'David Garcia established a comprehensive knowledge sharing program for the team, organizing monthly tech talks and creating a shared learning calendar. His initiative encouraged team members to present on topics they\'re passionate about, fostering continuous learning and helping the team stay current with emerging technologies. This program enhanced team collaboration and professional development.',
                    createdAt: '2026-02-03T16:30:00.000Z'
                },
                {
                    id: '6',
                    userId: 'lisa.brown@sap.com',
                    userName: 'Lisa Brown',
                    originalStatement: 'I helped a customer optimize their system performance, reducing their query response times by 80%.',
                    emailAppreciation: 'Lisa\'s optimization suggestions were brilliant! Our application is now lightning fast. Our users are thrilled with the performance improvement. - Jennifer Park, Product Manager at DataFlow Solutions',
                    impactType: 'customer',
                    additionalDetails: 'Analyzed their database queries, suggested indexing strategies, and provided query optimization recommendations.',
                    aiGeneratedStatement: 'Lisa Brown delivered exceptional performance optimization for a customer, achieving an 80% reduction in query response times. Her work involved comprehensive database analysis, strategic indexing recommendations, and query optimization techniques. The customer\'s Product Manager praised the brilliant suggestions, noting that users are thrilled with the lightning-fast application performance improvements.',
                    createdAt: '2026-02-02T11:15:00.000Z'
                },
                {
                    id: '7',
                    userId: 'robert.taylor@sap.com',
                    userName: 'Robert Taylor',
                    originalStatement: 'I created comprehensive documentation for our new API that reduced support tickets by 60%.',
                    emailAppreciation: '',
                    impactType: 'team',
                    additionalDetails: 'Included code examples, troubleshooting guides, and interactive demos. Also created video tutorials for complex scenarios.',
                    aiGeneratedStatement: 'Robert Taylor created comprehensive API documentation that significantly reduced support tickets by 60%. His documentation included detailed code examples, troubleshooting guides, interactive demos, and video tutorials for complex scenarios. This thorough approach to documentation improved developer experience and reduced the support team\'s workload while enabling faster customer onboarding.',
                    createdAt: '2026-02-01T13:00:00.000Z'
                },
                {
                    id: '8',
                    userId: 'emily.johnson@sap.com',
                    userName: 'Emily Johnson',
                    originalStatement: 'I worked late to help a customer meet their critical go-live deadline by troubleshooting their integration issues.',
                    emailAppreciation: 'Emily went above and beyond to help us launch on time. Her dedication and expertise saved our product launch. We couldn\'t be more grateful! - Mark Stevens, VP Engineering at StartupTech',
                    impactType: 'customer',
                    additionalDetails: 'Customer had a hard deadline for their product launch. Spent 4 extra hours debugging and provided real-time support during their deployment.',
                    aiGeneratedStatement: 'Emily Johnson demonstrated exceptional dedication by working extended hours to help a customer meet their critical go-live deadline. She spent four additional hours debugging integration issues and provided real-time support during their deployment. The customer\'s VP of Engineering expressed deep gratitude, noting that her expertise and commitment saved their product launch timeline.',
                    createdAt: '2026-01-31T19:45:00.000Z'
                },
                {
                    id: '9',
                    userId: 'alex.rodriguez@sap.com',
                    userName: 'Alex Rodriguez',
                    originalStatement: 'I implemented a new code review process that improved our code quality and reduced bugs in production.',
                    emailAppreciation: '',
                    impactType: 'team',
                    additionalDetails: 'Introduced peer review guidelines, automated quality checks, and created templates for consistent reviews. Team adoption was 95% within two weeks.',
                    aiGeneratedStatement: 'Alex Rodriguez implemented a comprehensive code review process that significantly improved code quality and reduced production bugs. The initiative included peer review guidelines, automated quality checks, and standardized review templates. The process achieved 95% team adoption within two weeks, demonstrating strong change management and technical leadership that enhanced overall development practices.',
                    createdAt: '2026-01-30T08:30:00.000Z'
                },
                {
                    id: '10',
                    userId: 'maria.gonzalez@sap.com',
                    userName: 'Maria Gonzalez',
                    originalStatement: 'I helped a customer integrate our API with their legacy system, enabling them to modernize their infrastructure.',
                    emailAppreciation: 'Maria\'s expertise in both modern APIs and legacy systems was invaluable. She made our digital transformation possible! - Carlos Mendez, IT Director at Manufacturing Plus',
                    impactType: 'customer',
                    additionalDetails: 'Customer was using a 15-year-old system. Created custom middleware and provided migration strategy.',
                    aiGeneratedStatement: 'Maria Gonzalez successfully enabled a customer\'s digital transformation by integrating modern APIs with their 15-year-old legacy system. Her expertise in both contemporary and legacy technologies proved invaluable as she developed custom middleware and provided a comprehensive migration strategy. The customer\'s IT Director credited her work as making their entire digital transformation initiative possible.',
                    createdAt: '2026-01-29T12:20:00.000Z'
                },
                {
                    id: '11',
                    userId: 'thomas.anderson@sap.com',
                    userName: 'Thomas Anderson',
                    originalStatement: 'I coordinated a cross-team effort to resolve a critical security vulnerability that could have affected thousands of users.',
                    emailAppreciation: '',
                    impactType: 'team',
                    additionalDetails: 'Worked with security, engineering, and operations teams to patch the vulnerability within 6 hours of discovery.',
                    aiGeneratedStatement: 'Thomas Anderson coordinated a critical cross-functional response to address a security vulnerability that could have affected thousands of users. His leadership brought together security, engineering, and operations teams to successfully patch the vulnerability within six hours of discovery. This rapid response demonstrated exceptional crisis management and prevented potential widespread security impact.',
                    createdAt: '2026-01-28T15:10:00.000Z'
                },
                {
                    id: '12',
                    userId: 'm.pise@sap.com',
                    userName: 'Mangesh Pise',
                    originalStatement: 'I designed and delivered training sessions that helped 50+ customers better utilize our platform features.',
                    emailAppreciation: 'Mangesh\'s training was engaging and practical. Our team learned so much and we\'re already seeing improved productivity! - Rachel Kim, Training Manager at EdTech Solutions',
                    impactType: 'customer',
                    additionalDetails: 'Created interactive workshops, hands-on exercises, and follow-up materials. Received 4.8/5 average rating across all sessions.',
                    aiGeneratedStatement: 'Mangesh Pise designed and delivered comprehensive training programs that enhanced platform utilization for over 50 customers. His interactive workshops included hands-on exercises and follow-up materials, achieving an impressive 4.8/5 average rating. A customer training manager praised the engaging and practical approach, noting significant productivity improvements among their team following the sessions.',
                    createdAt: '2026-01-27T10:45:00.000Z'
                }
            ];

            let insertedCount = 0;
            let skippedCount = 0;

            for (const data of sampleData) {
                try {
                    const inserted = await this.insertSampleAccomplishmentIfNotExists(data);
                    if (inserted) {
                        insertedCount++;
                        console.log(`✅ Inserted: ${data.userName} (ID: ${data.id})`);
                    } else {
                        skippedCount++;
                        console.log(`ℹ️ Skipped: ${data.userName} (ID: ${data.id}) - already exists`);
                    }
                } catch (error) {
                    console.error(`❌ Failed to insert ${data.userName} (ID: ${data.id}):`, error.message);
                }
            }

            console.log(`✅ Sample data insertion completed: ${insertedCount} inserted, ${skippedCount} skipped`);
        } catch (error) {
            console.error('❌ Failed to insert new sample data:', error);
            throw error;
        }
    }

    // Helper method to ensure database is initialized
    async ensureInitialized() {
        // This method only initializes schema if needed, never drops existing data
        try {
            await this.createAccomplishmentsTable();
            await this.createIndexes();
        } catch (error) {
            console.error('❌ Failed to ensure initialization:', error);
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

    // Safe method that only inserts if record doesn't exist
    async insertSampleAccomplishmentIfNotExists(data) {
        // First check if record already exists
        const checkExistsSQL = 'SELECT COUNT(*) as COUNT FROM ACCOMPLISHMENTS WHERE ID = ?';

        try {
            const existsResult = await hanaConnection.execute(checkExistsSQL, [data.id]);
            const exists = existsResult[0]?.COUNT > 0;

            if (exists) {
                return false; // Record already exists, skip insertion
            }

            // Record doesn't exist, safe to insert
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
            return true; // Successfully inserted
        } catch (error) {
            console.error(`Error in insertSampleAccomplishmentIfNotExists for ID ${data.id}:`, error);
            throw error;
        }
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