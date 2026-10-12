// A short list of clearly abusive words and phrases, matched as whole words after lowercasing and
// dropping accents. Words that turn innocent once accents go ("lon" from "lớn", "cac" from "các")
// stay off the list; this is a first net, and reports plus admins catch the rest.
const BANNED = ['du ma', 'du me', 'dit me', 'dit con me', 'vcl', 'dcm', 'dkm', 'fuck', 'shit', 'bitch', 'asshole', 'cunt'];

function normalise(text: string): string {
  return text.toLowerCase().replace(/đ/g, 'd').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/).filter(Boolean).join(' ');
}

export function hasBannedWord(text: string): boolean {
  const padded = ` ${normalise(text)} `;
  return BANNED.some((word) => padded.includes(` ${word} `));
}
