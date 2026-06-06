const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// TEST ENDPOINT - Check if API key exists
app.get('/api/test', (req, res) => {
    const key = process.env.OPENAI_API_KEY;
    res.json({
        keyExists: !!key,
        keyLength: key ? key.length : 0,
        keyPrefix: key ? key.substring(0, 10) + '...' : 'NONE'
    });
});

// Chat API endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: "Message required" });
        }

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: "OpenAI API key not configured" });
        }

        // Try using https module instead of fetch
        const https = require('https');
        
        const postData = JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You are Neo AI, a helpful and friendly AI assistant.' },
                { role: 'user', content: message }
            ],
            max_tokens: 1000,
            temperature: 0.7
        });

        const options = {
            hostname: 'api.openai.com',
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + apiKey,
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const apiReq = https.request(options, (apiRes) => {
            let data = '';
            apiRes.on('data', (chunk) => { data += chunk; });
            apiRes.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.error) {
                        res.status(400).json({ error: parsed.error.message });
                    } else {
                        res.json({ reply: parsed.choices[0].message.content });
                    }
                } catch (e) {
                    res.status(500).json({ error: 'Failed to parse API response: ' + data.substring(0, 100) });
                }
            });
        });

        apiReq.on('error', (e) => {
            res.status(500).json({ error: 'API request failed: ' + e.message });
        });

        apiReq.write(postData);
        apiReq.end();

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('Server running on port ' + PORT);
});
