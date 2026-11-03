// Allowed: packages/llm is the one package that reaches a provider, with an injected key.
export async function complete(apiKey: string, body: unknown): Promise<unknown> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  return res.json();
}
