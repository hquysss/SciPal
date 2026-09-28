import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@scipal/supabase';
import { Bi } from '@/components/ui/bilingual';
import { parseEducationLevel, type EducationLevel } from '@/features/landing/educationLevel';
import { TutorPage } from '@/features/ai-tutor/TutorPage';
import { getTutorLessons } from '@/features/ai-tutor/tutorLessons';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuidParam = (value: string | string[] | undefined) => (typeof value === 'string' && UUID.test(value) ? value : undefined);

export default async function TutorRoute({ searchParams }: { searchParams: Promise<{ conversation?: string | string[]; lesson?: string | string[] }> }) {
  const params = await searchParams;
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const back = params.lesson && uuidParam(params.lesson) ? `/tutor?lesson=${params.lesson}` : '/tutor';
    redirect(`/login?redirect=${encodeURIComponent(back)}`);
  }

  const [{ data: profile }, lessons] = await Promise.all([
    supabase.from('profiles').select('preferred_education_level').eq('id', user.id).maybeSingle(),
    getTutorLessons(supabase),
  ]);
  const level: EducationLevel = parseEducationLevel(profile?.preferred_education_level) ?? 'upper_secondary';

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pb-6 pt-6 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          <Bi en="AI tutor" vi="Gia sư AI" />
        </h1>
        <p className="max-w-prose text-sm text-ink-muted sm:text-base">
          <Bi en="Hints one step at a time, so you work out the answer yourself." vi="Thầy gợi ý từng bước để em tự tìm ra lời giải." />
        </p>
      </header>
      <TutorPage level={level} lessons={lessons} initialConversationId={uuidParam(params.conversation)} lessonId={uuidParam(params.lesson)} />
    </main>
  );
}
