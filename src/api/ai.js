// 1. Get your free API key from https://console.groq.com/keys
const apiKey = '';
const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';

// 2. Use the new "openai/gpt-oss-120b" model
const model = 'openai/gpt-oss-120b';

export async function callGemini(prompt, onDone) {
  if (!apiKey) {
    onDone(null, 'Groq API key is missing from src/api/ai.js. Get one from https://console.groq.com/');
    return;
  }
  
  const payload = {
    model: model, // Using the new gpt-oss model
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.3, 
    max_tokens: 1024,
  };

  let retries = 3;
  let delay = 1000;

  while (retries > 0) {
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.text();
        console.error('Groq API Error Body:', errBody);
        throw new Error(`Status ${res.status} - ${res.statusText}`);
      }

      const json = await res.json();

      const text = json.choices?.[0]?.message?.content ?? null;

      if (text) {
        onDone(text); 
        return;
      } else {
        console.warn('Invalid Groq response structure:', json);
        throw new Error('Invalid Groq response structure');
      }
    } catch (err) {
      console.error('Error calling Groq API:', err.message);
      retries--;
      if (retries === 0) {
        onDone(null, `Failed to get a response from Groq after ${3} attempts. Is your API key valid?`);
        return;
      }
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
    }
  }
}