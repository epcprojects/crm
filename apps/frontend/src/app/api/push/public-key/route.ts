import { proxyPushRequest } from '../../../../lib/push/proxy';

export async function GET() {
  return proxyPushRequest('/push/public-key', 'GET');
}
