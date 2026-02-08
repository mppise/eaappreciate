const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const dbServer = require('./db/db-server');
const aiOrchestrator = require('./ai/ai-orchestrator');

console.log(process.env);

const app = express();
const PORT = process.env.PORT || 8100;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from UI directory
app.use(express.static('ui'));

// Health check endpoint for Kubernetes probes
app.get('/health', async (req, res) => {
    try {
        const dbStatus = await dbServer.getStatus();
        if (dbStatus.connected && dbStatus.queryTest) {
            res.status(200).json({
                status: 'healthy',
                database: 'connected',
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV || 'development'
            });
        } else {
            res.status(503).json({
                status: 'unhealthy',
                database: 'disconnected',
                error: dbStatus.error || 'Database connection failed',
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV || 'development'
            });
        }
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development'
        });
    }
});

// API Routes

// Get all accomplishments (for main feed)
app.get('/api/accomplishments', async (req, res) => {
    try {
        const accomplishments = await dbServer.getAllAccomplishments();
        res.json({ success: true, data: accomplishments });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get accomplishments by user (for individual contributor view)
app.get('/api/accomplishments/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const accomplishments = await dbServer.getAccomplishmentsByUser(userId);
        res.json({ success: true, data: accomplishments });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Filter accomplishments (for manager view)
app.get('/api/accomplishments/filter', async (req, res) => {
    try {
        const filters = req.query;
        const accomplishments = await dbServer.filterAccomplishments(filters);
        res.json({ success: true, data: accomplishments });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Generate contextual questions based on basic accomplishment info
app.post('/api/questions/generate', async (req, res) => {
    try {
        const { originalStatement, impactType, emailAppreciation } = req.body;

        // Generate contextual questions using AI
        const questions = await aiOrchestrator.generateContextualQuestions({
            originalStatement,
            impactType,
            emailAppreciation
        });

        res.json({ success: true, data: { questions } });
    } catch (error) {
        console.error('Error generating questions:', error);
        res.status(500).json({ success: false, error: 'Failed to generate questions' });
    }
});

// Statement generation endpoint (preview only, no saving)
app.post('/api/accomplishment/generate', async (req, res) => {
    try {
        const accomplishmentData = req.body;

        // Generate AI statement
        const aiGeneratedStatement = await aiOrchestrator.generateAccomplishmentStatement(accomplishmentData);

        // Return the generated statement without saving
        res.json({
            success: true,
            data: {
                aiGeneratedStatement
            }
        });

    } catch (error) {
        console.error('Statement generation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate statement'
        });
    }
});

// Submit new accomplishment
app.post('/api/accomplishments', async (req, res) => {
    try {
        const accomplishmentData = req.body;

        // Check if statement is already generated (preview flow)
        let aiStatement = accomplishmentData.aiGeneratedStatement;

        // If no pre-generated statement, generate one now (legacy flow)
        if (!aiStatement) {
            aiStatement = await aiOrchestrator.generateAccomplishmentStatement(accomplishmentData);
        }

        // Save to database
        const savedAccomplishment = await dbServer.saveAccomplishment({
            ...accomplishmentData,
            aiGeneratedStatement: aiStatement,
            createdAt: new Date().toISOString(),
            id: Date.now().toString()
        });

        res.json({ success: true, data: savedAccomplishment });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get accomplishment details
app.get('/api/accomplishments/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const accomplishment = await dbServer.getAccomplishmentById(id);
        res.json({ success: true, data: accomplishment });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Toggle congratulations on an accomplishment
app.post('/api/accomplishments/:id/congratulations', async (req, res) => {
    try {
        const { id } = req.params;
        const { userEmail } = req.body;

        if (!userEmail) {
            return res.status(400).json({ success: false, error: 'User email is required' });
        }

        const result = await dbServer.toggleCongratulations(id, userEmail);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error toggling congratulations:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Toggle vote on an accomplishment
app.post('/api/accomplishments/:id/vote', async (req, res) => {
    try {
        const { id } = req.params;
        const { userEmail } = req.body;

        if (!userEmail) {
            return res.status(400).json({ success: false, error: 'User email is required' });
        }

        const result = await dbServer.toggleVote(id, userEmail);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error toggling vote:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Routes for serving pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'ui', 'pages', 'feed', 'feed.html'));
});

app.get('/submit', (req, res) => {
    res.sendFile(path.join(__dirname, 'ui', 'pages', 'submit', 'submit.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`EAchieversClub server running on http://localhost:${PORT}`);
});

module.exports = app;