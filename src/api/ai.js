export async function callGemini(prompt, onDone) {

  const apiKey = ''; 
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
  };

  let retries = 3;
  let delay = 1000;

  while (retries > 0) {
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      const candidate = json.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text ?? null;
      if (text) {
        onDone(text);
        return;
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (err) {
      retries--;
      if (retries === 0) {
        onDone(null, 'Failed to get a response from the AI after multiple attempts.');
        return;
      }
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
    }
  }
}
