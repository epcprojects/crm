import { proxyPushRequest } from '../../../../../lib/push/proxy';

export async function POST() {
  return proxyPushRequest('/push/preference/disable', 'POST');
}
