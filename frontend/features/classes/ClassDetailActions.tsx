'use client';

import { useRouter } from 'next/navigation';
import { ClassManageButtons } from './ClassManageButtons';

/** Rename and delete on the class page: a rename reloads the page's data, a delete leaves for the class list. */
export function ClassDetailActions({ classId, name }: { classId: string; name: string }) {
  const router = useRouter();
  return <ClassManageButtons classId={classId} name={name} onRenamed={() => router.refresh()} onDeleted={() => router.push('/teacher/classes')} />;
}
