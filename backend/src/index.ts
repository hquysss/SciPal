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
import { assignmentRoutes } from './routes/assignments.js';
import { accountsRoutes } from './routes/accounts.js';
import { examImportRoutes } from './routes/examImport.js';
import { examRoutesAuthoring } from './routes/exams.js';
import { topicAdminRoutes } from './routes/topicAdmin.js';
import { tutorRoutes } from './routes/tutor.js';
import { guestRoutes } from './routes/guest.js';
import { teacherRequestRoutes } from './routes/teacherRequests.js';
import { problemReportRoutes } from './routes/problemReports.js';
import { lazyAIProvider } from './providers/ai.js';
import { aiSettingsRoutes, loadAiSettings } from './routes/aiSettings.js';
import { translateRoutes } from './routes/translate.js';
import { adminTutorRoutes } from './routes/adminTutor.js';
import { accountQuotaRoutes } from './routes/accountQuotas.js';
import { adminPlanRoutes } from './routes/adminPlans.js';
import { billingRoutes } from './routes/billingPlans.js';
import { billingCheckoutRoutes } from './routes/billingCheckout.js';
import { billingReconciliationRoutes } from './routes/billingReconciliation.js';
import { authorAiRoutes } from './routes/authorAi.js';
import { createSettingsStore } from './tutor/settings.js';
import { questionRoutes } from './routes/questions.js';
import { practiceRoutes } from './routes/practice.js';

const app = Fastify({ logger: true });

const corsOrigins = process.env.CORS_ORIGINS?.split(',').map((origin) => origin.trim()).filter(Boolean);
await app.register(cors, { origin: corsOrigins?.length ? corsOrigins : '*' });
app.decorate('aiProvider', lazyAIProvider());
app.decorate('tutorSettings', createSettingsStore(() => loadAiSettings(app.supabase)));
await app.register(supabasePlugin);
await app.register(authPlugin);
await app.register(scoreRoutes);
await app.register(surveyRoutes);
await app.register(examRoutes);
await app.register(authoringRoutes);
await app.register(mediaRoutes);
await app.register(simulationRequestRoutes);
await app.register(classRoutes);
await app.register(assignmentRoutes);
await app.register(accountsRoutes);
await app.register(examImportRoutes);
await app.register(questionRoutes);
await app.register(examRoutesAuthoring);
await app.register(topicAdminRoutes);
await app.register(tutorRoutes);
await app.register(guestRoutes);
await app.register(teacherRequestRoutes);
await app.register(problemReportRoutes);
await app.register(aiSettingsRoutes);
await app.register(translateRoutes);
await app.register(adminTutorRoutes);
await app.register(accountQuotaRoutes);
await app.register(adminPlanRoutes);
await app.register(billingRoutes);
await app.register(billingCheckoutRoutes);
await app.register(billingReconciliationRoutes);
await app.register(authorAiRoutes);
await app.register(practiceRoutes);

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
