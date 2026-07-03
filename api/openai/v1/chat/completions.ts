import type { VercelRequest, VercelResponse } from '@vercel/node';
import { proxyOpenAiRequest } from '../../../_lib/openaiProxy.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await proxyOpenAiRequest(req, res, 'v1/chat/completions');
}
