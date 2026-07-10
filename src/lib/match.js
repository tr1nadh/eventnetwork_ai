const normalize = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

function overlapScore(query, candidate) {
  const queryTokens = new Set(normalize(query));
  const candidateTokens = normalize(candidate);

  if (!queryTokens.size || !candidateTokens.length) return 0;

  let matches = 0;
  for (const token of candidateTokens) {
    if (queryTokens.has(token)) matches += 1;
  }

  return matches / candidateTokens.length;
}

export function scoreAttendee(profile, attendee) {
  const signal = [profile.whoTheyAre, profile.whatTheyDo, profile.whoTheyWant, profile.expectations].join(' ');

  const keywordScore = attendee.tags.reduce((total, tag) => {
    return total + overlapScore(signal, tag);
  }, 0);

  const textScore =
    overlapScore(signal, attendee.role) +
    overlapScore(signal, attendee.company) +
    overlapScore(signal, attendee.lookingFor) +
    overlapScore(signal, attendee.about);

  return keywordScore * 2 + textScore;
}

export function explainMatch(profile, attendee) {
  const signals = [profile.whatTheyDo, profile.whoTheyWant, profile.expectations, attendee.lookingFor].join(' ');

  const matchedWords = normalize(signals)
    .filter((word, index, array) => array.indexOf(word) === index)
    .filter((word) => word.length > 3)
    .slice(0, 3);

  if (matchedWords.length > 0) {
    return `Shared focus around ${matchedWords.join(', ')} makes this a natural intro.`;
  }

  return `Their background and networking goals complement yours, so this is a useful cross-functional introduction.`;
}
