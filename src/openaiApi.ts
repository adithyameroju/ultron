/** Same-origin OpenAI proxy (`/api/openai` → server adds API key). */
export function openAiProxyUrl(apiPath: string): string {
  const path = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
  return `/api/openai${path}`;
}

export const OPENAI_CHAT_COMPLETIONS_URL = openAiProxyUrl('/v1/chat/completions');
export const OPENAI_IMAGES_GENERATIONS_URL = openAiProxyUrl('/v1/images/generations');

export function openAiProxyErrorMessage(status: number, bodyText: string): string {
  if (status === 404) {
    return 'OpenAI API route not found on server. Redeploy the latest version with /api/openai functions enabled.';
  }
  if (bodyText.includes('FUNCTION_INVOCATION_FAILED')) {
    return 'OpenAI API route crashed on the server. Redeploy the latest version, then confirm OPENAI_API_KEY is set in Vercel.';
  }
  if (status === 500) {
    try {
      const parsed = JSON.parse(bodyText) as { error?: { message?: string } };
      if (parsed.error?.message) {
        return parsed.error.message;
      }
    } catch {
      /* use fallback */
    }
    return 'OpenAI is not configured on the server. Set OPENAI_API_KEY in Vercel (or .env.local for local dev).';
  }
  try {
    const parsed = JSON.parse(bodyText) as { error?: { message?: string } };
    if (parsed.error?.message) {
      return parsed.error.message;
    }
  } catch {
    /* fall through */
  }
  return `${status}: ${bodyText.slice(0, 200)}`;
}
