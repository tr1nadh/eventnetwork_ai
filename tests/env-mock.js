// Mock for $env/static/private — used only during vitest runs.
// The actual values are never needed because tests inject a MockRedis.
export const KV_REST_API_URL = 'https://mock-redis.example.com';
export const KV_REST_API_TOKEN = 'mock-token';
