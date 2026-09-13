import { proxyBinance } from '../_lib/proxy';

export default async function handler(req: Parameters<typeof proxyBinance>[0], res: Parameters<typeof proxyBinance>[1]) {
  return proxyBinance(req, res, 'https://eapi.binance.com/eapi/v1', 'mark');
}
