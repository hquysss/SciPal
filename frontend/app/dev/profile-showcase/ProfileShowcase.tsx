'use client';

import { ProfileCard } from '@/features/profile/ProfileCard';
import { AccountSettings } from '@/features/profile/AccountSettings';
import { TeacherRequestCardView, type TeacherCardState } from '@/features/teacherRequests/TeacherRequestCard';
import { TeacherRequestsPanelView } from '@/features/teacherRequests/TeacherRequestsPanel';
import type { TeacherRequest } from '@/features/teacherRequests/teacherRequestsApi';
import type { BillingAccount } from '@scipal/types';
import { MyPlanView } from '@/features/billing/MyPlan';

const SAMPLE: TeacherRequest = {
  id: 'r1', user_id: 'u1', email: 'an@gmail.com', display_name: 'Lê An', school: 'THPT Nguyễn Du', subject: 'Tin học',
  note: 'Em dạy lớp 10, muốn soạn bài và giao bài cho lớp.', evidence_url: 'https://example.edu.vn/giao-vien/le-an',
  status: 'pending', review_note: null, reviewed_at: null, created_at: '2026-09-30T02:00:00Z',
};

export function ProfileShowcase({ role, request, renewalStatus }: {
  role: 'student' | 'teacher' | 'admin';
  request: 'none' | 'form' | 'pending' | 'rejected';
  renewalStatus: 'manual' | 'active' | 'cancel_pending' | 'failed' | 'paused' | 'cancelled';
}) {
  const noop = () => {};
  const state: TeacherCardState =
    request === 'form' ? { kind: 'form', sending: false, error: null }
      : request === 'pending' ? { kind: 'request', request: SAMPLE, busy: false }
        : request === 'rejected' ? { kind: 'request', request: { ...SAMPLE, status: 'rejected', review_note: 'Chưa có minh chứng, bạn gửi kèm link trang trường nhé.' }, busy: false }
          : { kind: 'none' };
  const billingAccount: BillingAccount = role === 'admin'
    ? { role, plan: null, paidThrough: null, renewal: null, quotas: [] }
    : {
      role,
      plan: role === 'student' ? 'student_plus' : 'teacher_pro',
      paidThrough: '2026-12-10T00:00:00.000Z',
      renewal: {
        status: renewalStatus,
        interval: renewalStatus === 'manual' ? null : 'month',
        amountVnd: renewalStatus === 'manual' ? null : 39_000,
        nextChargeAt: renewalStatus === 'active' ? '2026-11-10T00:00:00.000Z' : null,
      },
      quotas: [],
    };
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-20 pt-8 sm:px-6 sm:pt-10">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="flex flex-col gap-6 lg:sticky lg:top-24">
          <ProfileCard displayName="Lê An" role={role} email="an@gmail.com" joinedAt="2026-09-01T00:00:00Z" avatarUrl={null} stats={{ totalXP: 1300, completedLessons: 4, longestStreak: 3 }} />
        </div>
        <div className="flex flex-col gap-6">
          {role === 'student' && <TeacherRequestCardView state={state} onOpen={noop} onCancel={noop} onSubmit={noop} onClose={noop} />}
          <AccountSettings currentRole={role} educationPreference={{ level: 'upper_secondary', source: 'account' }} isAuthenticated />
        </div>
      </div>
      {role === 'admin' && (
        <TeacherRequestsPanelView requests={[SAMPLE, { ...SAMPLE, id: 'r2', display_name: null, email: 'binh@school.vn', school: 'THCS Lê Lợi', subject: 'Vật lí', note: null, evidence_url: null }]} busyId={null} rejecting="r2" reason="" error={null} lang="vi" onApprove={noop} onStartReject={noop} onReason={noop} onReject={noop} onCancelReject={noop} />
      )}
      <section aria-labelledby="profile-showcase-billing" className="flex flex-col gap-3">
        <h2 id="profile-showcase-billing" className="text-xl font-bold text-ink">Gói của tôi · dữ liệu thử</h2>
        <MyPlanView state={{ status: 'ready', account: billingAccount }} onCancelRenewal={noop} />
      </section>
    </main>
  );
}
