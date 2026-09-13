// Natural-language -> SQL for the admin console's per-customer query
// console. Generates a single SQL statement only — it is never executed
// automatically; the caller always drops it into the console for a human
// to review (and, for anything that writes or deletes, explicitly confirm)
// before running it.

const GROQ_MODEL = 'llama-3.1-8b-instant';

function stripCodeFence(text: string): string {
  const fenced = text.match(/```(?:sql)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1] : text).trim().replace(/;+\s*$/, '') + ';';
}

export async function generateSqlFromPrompt(prompt: string, schemaSql: string): Promise<string> {
  const config = useRuntimeConfig();
  if (!config.groqApiKey) {
    throw createError({ statusCode: 500, message: 'Natural-language SQL is not configured on this deployment.' });
  }

  const response = await $fetch<{ choices: { message: { content: string } }[] }>(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: {
        model: GROQ_MODEL,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content:
              'You translate a plain-English request into a single SQLite statement for the given schema. ' +
              'Output ONLY the raw SQL statement — no explanation, no markdown code fences, no comments. ' +
              'Use only tables and columns that appear in the schema. Prefer SELECT unless the request clearly asks to change data. ' +
              'If the request is ambiguous, make the most reasonable interpretation and still output exactly one statement.',
          },
          {
            role: 'user',
            content: `Schema:\n${schemaSql}\n\nRequest: ${prompt}`,
          },
        ],
      },
    }
  ).catch((e) => {
    const message = e?.data?.error?.message || e?.message || 'Groq request failed';
    throw createError({ statusCode: 502, message: `Groq error: ${message}` });
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) {
    throw createError({ statusCode: 502, message: 'Groq returned no SQL.' });
  }

  return stripCodeFence(content);
}
