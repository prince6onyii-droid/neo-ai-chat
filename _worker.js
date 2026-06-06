export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        
        // Handle API requests
        if (url.pathname === '/api/chat' && request.method === 'POST') {
            try {
                const { message } = await request.json();
                
                if (!message) {
                    return new Response(JSON.stringify({ error: "Message required" }), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }

                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${env.OPENAI_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: [
                            { role: 'system', content: 'You are Neo AI, a helpful and friendly AI assistant.' },
                            { role: 'user', content: message }
                        ],
                        max_tokens: 1000,
                        temperature: 0.7
                    })
                });

                const data = await response.json();

                if (data.error) {
                    return new Response(JSON.stringify({ error: data.error.message }), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }

                return new Response(JSON.stringify({ reply: data.choices[0].message.content }), {
                    headers: { 'Content-Type': 'application/json' }
                });

            } catch (error) {
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        // THIS IS CRITICAL - Serve static files
        // Without this, the Worker will error and no assets will be served
        return env.ASSETS.fetch(request);
    }
};
