import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { supabasePlugin } from './plugins/supabase.js';
import { authPlugin } from './plugins/auth.js';
import { scoreRoutes } from './routes/score.js';
import { surveyRoutes } from './routes/survey.js';
import { examRoutes } from './routes/exam.js';
import { authoringRoutes } from './routes/authoring.js';
import { mediaRoutes } from './routes/media.js';
import { simulationRequestRoutes } from './routes/simulationRequests.js';
import { classRoutes } from './routes/classes.js';
import { accountsRoutes } from './routes/accounts.js';
import { examImportRoutes } from './routes/examImport.js';
import { questionRoutes } from './routes/questions.js';

const app = Fastify({ logger: true });

const corsOrigins = process.env.CORS_ORIGINS?.split(',').map((origin) => origin.trim()).filter(Boolean);
await app.register(cors, { origin: corsOrigins?.length ? corsOrigins : '*' });
await app.register(supabasePlugin);
await app.register(authPlugin);
await app.register(scoreRoutes);
await app.register(surveyRoutes);
await app.register(examRoutes);
await app.register(authoringRoutes);
await app.register(mediaRoutes);
await app.register(simulationRequestRoutes);
await app.register(classRoutes);
await app.register(accountsRoutes);
await app.register(examImportRoutes);
await app.register(questionRoutes);

app.get('/health', async () => ({ status: 'ok' }));

const port = Number(process.env.PORT ?? (process.env.VERCEL ? 3000 : 3001));
if (process.env.VERCEL) {
  void app.listen({ port }).catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
} else {
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`API running on port ${port}`);
}
