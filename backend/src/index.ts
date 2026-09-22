import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { authPlugin } from './plugins/auth.js';

const app = Fastify({ logger: true });

await app.register(cors, { origin: process.env.CORS_ORIGINS?.split(',') ?? '*' });
await app.register(authPlugin);

app.get('/health', async () => ({ status: 'ok' }));

const port = Number(process.env.PORT ?? 3001);
await app.listen({ port, host: '0.0.0.0' });
console.log(`API running on port ${port}`);
