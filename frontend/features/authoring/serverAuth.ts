import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@scipal/supabase';

export async function getAuthoringSession(redirectPath: string) {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(redirectPath)}`);
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect(`/login?redirect=${encodeURIComponent(redirectPath)}`);
  }

  const role = user.app_metadata?.app_role;
  if (!['teacher', 'admin'].includes(role)) redirect('/profile');

  return { token: session.access_token, role };
}
