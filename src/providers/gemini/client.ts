export interface GeminiEnv {
  GEMINI_API_KEY: string;
}

const MODEL = "gemini-3.1-flash-lite";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

/**
 * Gemini APIへJSON専用プロンプトを送信し、レスポンステキストを返す。
 * システムプロンプトはWorkers側で固定（Rule4）。JSONのみ返す前提（Rule5）。
 */
export async function callGemini(
  env: GeminiEnv,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const res = await fetch(`${ENDPOINT}?key=${env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json<{
    candidates: { content: { parts: { text: string }[] } }[];
  }>();

  return data.candidates[0]?.content?.parts?.[0]?.text ?? "";
}
