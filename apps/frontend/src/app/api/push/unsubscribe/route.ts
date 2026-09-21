import { proxyPushRequest } from '../../../../lib/push/proxy';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  return proxyPushRequest('/push/unsubscribe', 'POST', body ?? {});
}
