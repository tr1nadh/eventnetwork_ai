const FIREWORKS_API_KEY = process.env.FIREWORKS_API_KEY || 'fw_9A6q6BuGeYKSnUHfgpMMVb';

async function test() {
  try {
    const res = await fetch('https://api.fireworks.ai/inference/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + FIREWORKS_API_KEY
      },
      body: JSON.stringify({
        model: 'accounts/fireworks/models/qwen3p7-plus',
        messages: [
          { role: 'system', content: 'You are a profile generator for a tech networking event. Generate exactly 5 fictional attendee profiles.\n\nEach profile must have these fields:\n- "display_name": A realistic full name (diverse backgrounds)\n- "what_i_do": A 1-2 sentence description of their role/work (varied: engineer, designer, founder, marketer, researcher, etc.)\n- "looking_for": Who they want to meet and why (1-2 sentences)\n- "about_me": A genuine 2-3 sentence bio that sounds natural\n\nIMPORTANT GUIDELINES:\n- Make profiles varied in role, industry, experience level, and goals\n- Profile 1 & 2: Strong matches (highly complementary to the user)\n- Profile 3: Moderate match (some overlap but different focus)\n- Profile 4: Complementary skills match (different domain but useful connection)\n- Profile 5: Serendipity match (unexpected but potentially valuable connection)\n- Each profile must be distinctly different — no duplicates or near-duplicates\n- Use realistic, diverse names from different backgrounds\n- DO NOT truncate the output. You MUST write out all 5 profiles completely. Do not use "..." or skip any fields.\n\nRespond ONLY with a valid JSON object containing a single key "profiles" which is an array of exactly 5 profile objects. Do not output any markdown formatting or explanations.' },
          { role: 'user', content: 'Generate 5 diverse dummy networking profiles for a tech event.' }
        ],
        temperature: 0.8
      })
    });
    const data = await res.json();
    console.log(data.choices[0].message.content);
  } catch (err) {
    console.error(err);
  }
}
test();
