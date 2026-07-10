import { FIREWORKS_API_KEY, FIREWORKS_MODEL } from '$env/static/private';
import { demoAttendees } from '$lib/demo';
import { explainMatch, scoreAttendee } from '$lib/match';
import { json } from '@sveltejs/kit';
import { generateText } from 'ai';
import { fireworks } from '@ai-sdk/fireworks';

export async function POST({ request }) {
  const body = await request.json().catch(() => null);

  const profile = body?.profile;

  if (!profile?.whoTheyAre || !profile.whatTheyDo || !profile.whoTheyWant || !profile.expectations) {
    return json({ error: 'Incomplete profile.' }, { status: 400 });
  }

  const normalizedProfile = {
    whoTheyAre: profile.whoTheyAre,
    whatTheyDo: profile.whatTheyDo,
    whoTheyWant: profile.whoTheyWant,
    expectations: profile.expectations
  };

  const ranked = [...demoAttendees]
    .map((attendee) => ({
      attendee,
      score: scoreAttendee(normalizedProfile, attendee)
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);

  const recommendations = await Promise.all(
    ranked.map(async ({ attendee, score }) => {
      const fallback = explainMatch(normalizedProfile, attendee);

      if (!FIREWORKS_API_KEY) {
        return { ...attendee, score, explanation: fallback };
      }

      try {
        const { text } = await generateText({
          model: fireworks(FIREWORKS_MODEL || 'accounts/fireworks/models/llama-v3p1-8b-instruct'),
          prompt: `You are matching attendees for an offline networking event.\n\nAttendee profile:\n- Who they are: ${normalizedProfile.whoTheyAre}\n- What they do: ${normalizedProfile.whatTheyDo}\n- Who they want to network with: ${normalizedProfile.whoTheyWant}\n- Expectations: ${normalizedProfile.expectations}\n\nRecommended match:\n- Name: ${attendee.name}\n- Role: ${attendee.role}\n- Company: ${attendee.company}\n- Looking for: ${attendee.lookingFor}\n- About: ${attendee.about}\n\nWrite one short, warm explanation that says why they should connect.`
        });

        return { ...attendee, score, explanation: text.trim() || fallback };
      } catch {
        return { ...attendee, score, explanation: fallback };
      }
    })
  );

  return json({ recommendations });
}
