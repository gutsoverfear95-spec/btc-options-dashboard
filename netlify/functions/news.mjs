import { newsResponse } from '../../server/news.mjs';
export default async function handler(request) {
  if (request.method !== 'GET') return new Response(null, {status: 405, headers: {Allow: 'GET'}});
  return newsResponse();
}
