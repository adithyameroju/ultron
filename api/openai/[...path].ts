import type { VercelRequest, VercelResponse } from '@vercel/node';

const OPENAI_ORIGIN = 'https://api.openai.com';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    res.status(500).json({
      error: {
        message:
          'OpenAI API key not configured on server. Set OPENAI_API_KEY in Vercel project environment variables.',
      },
    });
    return;
  }

  const rawPath = req.query.path;
  const segments = Array.isArray(rawPath) ? rawPath : rawPath ? [rawPath] : [];
  const path = segments.map(String).join('/');
  if (!path) {
    res.status(400).json({ error: { message: 'Missing OpenAI API path.' } });
    return;
  }

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (key === 'path' || value === undefined) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const v of value) {
        query.append(key, String(v));
      }
    } else {
      query.append(key, String(value));
    }
  }
  const qs = query.toString();
  const upstreamUrl = `${OPENAI_ORIGIN}/${path}${qs ? `?${qs}` : ''}`;

  const method = req.method ?? 'GET';
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
  };
  const contentType = req.headers['content-type'];
  if (typeof contentType === 'string' && contentType.length > 0) {
    headers['Content-Type'] = contentType;
  }

  let body: string | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    if (typeof req.body === 'string') {
      body = req.body;
    } else if (req.body !== undefined && req.body !== null) {
      body = JSON.stringify(req.body);
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
    }
  }

  try {
    const upstream = await fetch(upstreamUrl, { method, headers, body });
    const text = await upstream.text();
    res.status(upstream.status);
    const upstreamType = upstream.headers.get('content-type');
    if (upstreamType) {
      res.setHeader('Content-Type', upstreamType);
    }
    res.send(text);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    res.status(502).json({ error: { message: `OpenAI proxy error: ${message}` } });
  }
}
