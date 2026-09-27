'use client';

import { useLanguage } from '@scipal/hooks';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export interface StudentMember {
  student_id: string;
  display_name: string;
  joined_at: string;
  total_xp: number;
  completed_lessons?: number;
}

interface StudentRosterProps {
  classNameTitle: string;
  inviteCode: string;
  members: StudentMember[];
}

export function StudentRoster({ classNameTitle, inviteCode, members }: StudentRosterProps) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-6">
      <Card className="gap-2 px-6">
        <p className="text-sm text-ink-muted">
          {t({ en: 'Invite code', vi: 'Mã mời' })}: <span className="font-mono text-lg font-semibold tracking-wider text-ink">{inviteCode}</span>
        </p>
        <h1 className="text-2xl font-bold text-ink">{classNameTitle}</h1>
        <p className="text-sm text-ink-muted">
          {t({ en: `${members.length} students have joined`, vi: `${members.length} học sinh đã tham gia lớp` })}
        </p>
      </Card>

      <section className="flex flex-col gap-3" aria-labelledby="roster-heading">
        <h2 id="roster-heading" className="text-base font-semibold text-ink">
          {t({ en: 'Students', vi: 'Danh sách học sinh' })}
        </h2>
        {members.length === 0 ? (
          <EmptyState
            title={t({ en: 'No students yet', vi: 'Chưa có học sinh' })}
            description={t({ en: 'Share the invite code so students can join.', vi: 'Chia sẻ mã mời để học sinh tham gia lớp.' })}
          />
        ) : (
          <Table label={t({ en: 'Students in this class', vi: 'Học sinh trong lớp' })}>
            <TableHeader>
              <TableRow>
                <TableHead>{t({ en: 'Name', vi: 'Tên' })}</TableHead>
                <TableHead>{t({ en: 'Joined', vi: 'Ngày tham gia' })}</TableHead>
                <TableHead className="text-right">XP</TableHead>
                <TableHead className="text-right">{t({ en: 'Lessons done', vi: 'Bài đã học' })}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.student_id}>
                  <TableCell className="whitespace-nowrap font-semibold">{member.display_name}</TableCell>
                  <TableCell className="whitespace-nowrap text-ink-muted">{new Date(member.joined_at).toLocaleDateString('vi-VN')}</TableCell>
                  <TableCell className="text-right tabular-nums">{member.total_xp}</TableCell>
                  <TableCell className="text-right tabular-nums">{member.completed_lessons ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
