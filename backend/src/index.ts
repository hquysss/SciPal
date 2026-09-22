import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { supabasePlugin } from './plugins/supabase.js';
import { authPlugin } from './plugins/auth.js';
import { scoreRoutes } from './routes/score.js';
import { surveyRoutes } from './routes/survey.js';

const app = Fastify({ logger: true });

await app.register(cors, { origin: process.env.CORS_ORIGINS?.split(',') ?? '*' });
await app.register(supabasePlugin);
await app.register(authPlugin);
await app.register(scoreRoutes);
await app.register(surveyRoutes);

app.get('/health', async () => ({ status: 'ok' }));

const port = Number(process.env.PORT ?? 3001);
await app.listen({ port, host: '0.0.0.0' });
console.log(`API running on port ${port}`);
