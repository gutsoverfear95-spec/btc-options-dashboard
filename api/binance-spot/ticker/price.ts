import { proxyBinance } from '../../_lib/proxy';

export default async function handler(req: Parameters<typeof proxyBinance>[0], res: Parameters<typeof proxyBinance>[1]) {
  return proxyBinance(req, res, 'https://api.binance.com/api/v3', 'ticker/price');
}
