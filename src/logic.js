// QVAC Wingman Text Generator — core logic.
// completion() writes the result from a single user input field.
// The smoothness meter is a deterministic score from keyword density
// and length — never the model rating its own writing.

import { completion } from "@qvac/sdk";

function looksUnusable(text) {
  if (!text || text.trim().length === 0) return true;
  if (text.length > 500) return true;
  const bad = [
    "i cannot", "i can't", "as an ai", "i'm not able", "i do not have", "i don't have",
    "didn't input", "did not input", "not enough information", "please provide more",
    "please try again", "i'd be happy to help", "i'll be happy to help", "could you provide",
    "can you provide", "i need more", "please give me more",
  ];
  const lower = text.toLowerCase();
  return bad.some((phrase) => lower.includes(phrase));
}

const FALLBACK = (v) => `Hey! Random thought but it reminded me of you — hope things are good. No worries if you're slammed, just wanted to say hi given ${v}.`;

export async function generate(modelId, input) {
  const run = completion({
    modelId,
    history: [
      {
        role: "system",
        content: ((v) => `Write one short, friendly, low-pressure text message (1-2 sentences) to send in this situation: ${v}. Keep it casual and not needy. Reply with ONLY the text, no preamble.`)(input),
      },
      { role: "user", content: `Input: ${input}` },
    ],
    stream: true,
    completionOpts: { temperature: 0.9, maxTokens: 150 },
  });

  let text = "";
  for await (const token of run.tokenStream) text += token;
  text = text
    .trim()
    .replace(/^.*?\b(?:here'?s|here is)\b[^:\n]*:\s*\n*/i, "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();

  const result = looksUnusable(text) ? FALLBACK(input) : text;
  return { result, smoothness: scoreSmoothness(result) };
}

const KEYWORDS = ["hey", "thought", "hope", "no worries", "casual", "smile", "fun"];

function scoreSmoothness(text) {
  const lower = text.toLowerCase();
  let score = 45;
  score += KEYWORDS.filter((w) => lower.includes(w)).length * 8;
  score += Math.min(text.split(/\s+/).length, 20);
  return Math.max(1, Math.min(99, Math.round(score)));
}
