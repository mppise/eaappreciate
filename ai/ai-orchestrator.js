/**
 * AI Orchestrator Module - Simplified Version
 * Handles AI-powered text generation using SAP BTP AI Core
 * Combines functionality from genai.js and ai-orchestrator.js
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const creds = require('../credentials.json');

class AIOrchestrator {
    constructor() {
        this.currentProvider = 'sap-btp-ai-core';
        this.loadPrompts();
    }

    // Load prompt templates from JSON files
    loadPrompts() {
        this.prompts = {};
        const promptsDir = path.join(__dirname, 'prompts');

        try {
            const promptFiles = fs.readdirSync(promptsDir).filter(file => file.endsWith('.json'));
            promptFiles.forEach(file => {
                const name = path.parse(file).name;
                const filePath = path.join(promptsDir, file);
                const content = fs.readFileSync(filePath, 'utf8');
                this.prompts[name] = JSON.parse(content);
            });
            console.log(`✅ Loaded ${promptFiles.length} prompt templates`);
        } catch (error) {
            console.error('❌ Failed to load prompts:', error);
            this.prompts = {};
        }
    }

    // Get SAP BTP AI Core access token
    async getAICoreAccessToken() {
        try {
            const response = await axios({
                method: "GET",
                url: creds.url + "/oauth/token?grant_type=client_credentials",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Basic " + Buffer.from(creds.clientid + ":" + creds.clientsecret).toString('base64'),
                }
            });
            console.log('✅ SAP BTP AI Core token obtained successfully');
            return response.data;
        } catch (error) {
            console.error('❌ Failed to get SAP BTP AI Core token:', error.message);
            throw error;
        }
    }

    // Call SAP BTP AI Core for text generation
    async callSAPAI(prompt) {
        const DEPLOYMENT_ID = "deaf6d11f22b1764"; // gpt-4o

        try {
            const auth = await this.getAICoreAccessToken();

            const response = await axios({
                method: "POST",
                url: creds.serviceurls.AI_API_URL + "/v2/inference/deployments/" + DEPLOYMENT_ID + "/chat/completions?api-version=2023-05-15",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + auth.access_token,
                    "AI-Resource-Group": process.env.AICORE_RESOURCE_GROUP || 'default'
                },
                data: {
                    "messages": [
                        { "role": "system", "content": prompt.system + "\n\n" },
                        { "role": "user", "content": prompt.context + "\n\n" + prompt.task + "\n\n" + prompt.format }
                    ],
                    "temperature": 0.82
                }
            });

            let result = response.data.choices[0].message.content;
            console.log('✅ SAP BTP AI Core response received');
            return { json: false, response: result };

        } catch (error) {
            console.error('❌ SAP BTP AI Core call failed:', error.message);
            throw error;
        }
    }

    // Generate accomplishment statement
    async generateAccomplishmentStatement(accomplishmentData) {
        try {
            console.log('🎯 Generating accomplishment statement...');

            // Build prompt
            const prompt = this.buildSAPAIPrompt(accomplishmentData);

            // Try SAP BTP AI Core first
            const result = await this.callSAPAI(prompt);

            if (result && result.response) {
                const response = typeof result.response === 'string' ? result.response : JSON.stringify(result.response);
                console.log('✅ Successfully generated with SAP BTP AI Core');
                return response;
            }

            throw new Error('No response received');

        } catch (error) {
            console.error('⚠️  SAP BTP AI Core failed, using fallback:', error.message);
            return this.generateMockResponse(accomplishmentData);
        }
    }

    // Generate contextual questions to gather more accomplishment details
    async generateContextualQuestions(basicData) {
        try {
            console.log('🎯 Generating contextual questions...');

            const variables = {
                originalStatement: basicData.originalStatement,
                impactType: basicData.impactType || 'Not specified',
                emailAppreciation: basicData.emailAppreciation || 'None provided'
            };

            const prompt = this.buildPrompt('contextual-questions-generation', variables);
            const result = await this.callSAPAI(prompt);

            if (result && result.response) {
                try {
                    // Parse the JSON response to get the questions array
                    const questions = JSON.parse(result.response);
                    if (Array.isArray(questions) && questions.length >= 3 && questions.length <= 5) {
                        console.log('✅ Successfully generated contextual questions');
                        return questions;
                    } else {
                        throw new Error('Invalid questions format received');
                    }
                } catch (parseError) {
                    console.error('❌ Failed to parse AI response as JSON:', parseError);
                    throw new Error('Invalid JSON response from AI');
                }
            }

            throw new Error('No response received');

        } catch (error) {
            console.error('⚠️ SAP BTP AI Core failed, using fallback questions:', error.message);
            return this.generateMockQuestions(basicData);
        }
    }

    // Generate mock questions for fallback
    generateMockQuestions(basicData) {
        const genericQuestions = [
            "What specific challenges did you overcome to achieve this?",
            "How long did this accomplishment take to complete?",
            "What was the measurable impact or outcome of your work?",
            "Who were the key stakeholders who benefited from this accomplishment?",
            "What skills or expertise did you demonstrate in completing this work?"
        ];

        const customerQuestions = [
            "What specific problem was the customer experiencing?",
            "How did your solution impact the customer's business operations?",
            "What technical approaches or tools did you use?",
            "How quickly were you able to resolve the customer's issue?",
            "What feedback did you receive from the customer about your work?"
        ];

        const teamQuestions = [
            "How did this accomplishment benefit your team or organization?",
            "What collaboration or leadership skills did you demonstrate?",
            "What was the scope or scale of your contribution?",
            "How did this work improve team processes or efficiency?",
            "What knowledge or skills did you share with colleagues during this work?"
        ];

        let questions = genericQuestions;
        if (basicData.impactType === 'customer') {
            questions = customerQuestions;
        } else if (basicData.impactType === 'team') {
            questions = teamQuestions;
        }

        // Return random 3-4 questions
        const shuffled = [...questions].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.random() < 0.5 ? 3 : 4);
    }

    // Generic prompt builder - works with any JSON prompt template
    buildPrompt(promptId, variables = {}) {
        const promptTemplate = this.prompts[promptId];

        if (!promptTemplate) {
            throw new Error(`Prompt template '${promptId}' not found`);
        }

        // Replace variables in context template
        let context = promptTemplate.contextTemplate || '';

        // Process variables with defaults
        const processedVars = {};
        if (promptTemplate.variables) {
            Object.keys(promptTemplate.variables).forEach(key => {
                const varConfig = promptTemplate.variables[key];
                let value = variables[key];

                // Use default if value not provided or is empty
                if (value === undefined || value === null || value === '') {
                    value = varConfig.default || (varConfig.required ? '' : 'Not specified');
                }

                processedVars[key] = value;
            });
        }

        // Replace template variables {{variable}} with actual values
        Object.keys(processedVars).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            context = context.replace(regex, processedVars[key]);
        });

        return {
            system: promptTemplate.system,
            context: context.trim(),
            task: promptTemplate.task,
            format: promptTemplate.format
        };
    }

    // Build SAP AI prompt using generic system (backward compatibility)
    buildSAPAIPrompt(data) {
        const variables = {
            originalStatement: data.originalStatement,
            userName: data.userName,
            emailAppreciation: data.responses?.emailAppreciation,
            impactType: data.responses?.impactType,
            additionalDetails: data.responses?.additionalDetails
        };

        return this.buildPrompt('accomplishment-generation', variables);
    }

    // Mock response for fallback
    generateMockResponse(data) {
        const templates = {
            customer: (name, statement, appreciation, details) => {
                let result = `${name} ${statement.toLowerCase().replace(/^(today )?i /i, '')}`;

                if (details) {
                    result += `. ${details}`;
                }

                if (appreciation) {
                    const quote = appreciation.length > 80 ?
                        appreciation.substring(0, 77) + '...' :
                        appreciation;
                    result += ` The customer expressed appreciation, stating "${quote}"`;
                }

                result += ' This effort had direct customer impact and demonstrated strong problem-solving capabilities.';
                return result;
            },

            team: (name, statement, appreciation, details) => {
                let result = `${name} ${statement.toLowerCase().replace(/^(today )?i /i, '')}`;

                if (details) {
                    result += `. ${details}`;
                }

                if (appreciation) {
                    result += ' This effort was recognized by colleagues.';
                }

                result += ' This initiative had positive team impact and contributed to collective success.';
                return result;
            }
        };

        const impactType = data.responses?.impactType || 'team';
        const template = templates[impactType] || templates.team;

        const statement = template(
            data.userName,
            data.originalStatement,
            data.responses?.emailAppreciation,
            data.responses?.additionalDetails
        );

        // Ensure under 100 words
        const words = statement.split(' ');
        if (words.length > 100) {
            return words.slice(0, 97).join(' ') + '...';
        }

        return statement;
    }

    // Get embeddings
    async getEmbeddings(content) {
        try {
            const auth = await this.getAICoreAccessToken();

            const response = await axios({
                method: "POST",
                url: creds.serviceurls.AI_API_URL + "/v2/inference/deployments/df7d80b9631d2737/embeddings?api-version=2023-05-15",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + auth.access_token,
                    "AI-Resource-Group": process.env.AICORE_RESOURCE_GROUP || 'default'
                },
                data: {
                    "model": "text-embedding-3-small",
                    "input": content
                }
            });

            return response.data.data[0].embedding;
        } catch (error) {
            console.error('Error getting embeddings:', error);
            throw error;
        }
    }

    // Send email via Brevo
    async sendEmail(to, subject, htmlBody) {
        try {
            const response = await axios({
                "method": "POST",
                "url": "https://api.brevo.com/v3/smtp/email",
                "headers": {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "API-Key": process.env.BREVO_API_KEY
                },
                "data": {
                    "sender": { "name": "EA Appreciate Service", "email": "no-reply@company.com" },
                    "replyTo": { "name": to.name, "email": to.email },
                    "to": [{ "name": to.name, "email": to.email }],
                    "subject": subject,
                    "htmlContent": htmlBody
                }
            });

            return response.data;
        } catch (error) {
            console.error('Email send failed:', error);
            throw error;
        }
    }

    // Health check
    async healthCheck() {
        try {
            const token = await this.getAICoreAccessToken();
            return {
                status: 'healthy',
                service: 'SAP BTP AI Core',
                provider: this.currentProvider,
                token: !!token.access_token
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                service: 'SAP BTP AI Core',
                provider: this.currentProvider,
                error: error.message
            };
        }
    }

    // Generic AI generation method
    async generateWithPrompt(promptId, variables = {}) {
        try {
            console.log(`🎯 Generating content with prompt: ${promptId}`);
            const prompt = this.buildPrompt(promptId, variables);
            const result = await this.callSAPAI(prompt);

            if (result && result.response) {
                const response = typeof result.response === 'string' ? result.response : JSON.stringify(result.response);
                console.log(`✅ Successfully generated with prompt: ${promptId}`);
                return response;
            }

            throw new Error('No response received');
        } catch (error) {
            console.error(`⚠️ Generation failed for prompt ${promptId}:`, error.message);
            throw error;
        }
    }

    // Validate prompt variables
    validatePromptVariables(promptId, variables = {}) {
        const promptTemplate = this.prompts[promptId];
        if (!promptTemplate) {
            return { valid: false, errors: [`Prompt template '${promptId}' not found`] };
        }

        const errors = [];
        if (promptTemplate.variables) {
            Object.keys(promptTemplate.variables).forEach(key => {
                const varConfig = promptTemplate.variables[key];
                const value = variables[key];

                if (varConfig.required && (value === undefined || value === null || value === '')) {
                    errors.push(`Required variable '${key}' is missing`);
                }
            });
        }

        return { valid: errors.length === 0, errors };
    }

    // Legacy compatibility methods
    setProvider(provider) {
        console.log(`Provider set to: SAP BTP AI Core (${provider} requested)`);
        this.currentProvider = 'sap-btp-ai-core';
    }

    getCurrentProvider() {
        return this.currentProvider;
    }

    getAvailablePrompts() {
        return Object.keys(this.prompts).map(key => ({
            id: key,
            name: this.prompts[key].name,
            description: this.prompts[key].description
        }));
    }

    getPrompt(name) {
        return this.prompts[name];
    }

    // Get prompt schema for validation
    getPromptSchema(promptId) {
        const prompt = this.prompts[promptId];
        return prompt ? prompt.variables : null;
    }
}

// Export as singleton
module.exports = new AIOrchestrator();