'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useLanguage } from '@scipal/hooks';

// The public privacy policy, with data-deletion instructions. It describes what the code actually does; update it with the code.

const CONTACT_EMAIL = 'tuilangus@gmail.com';
const UPDATED = { vi: 'Cập nhật ngày 29/09/2026', en: 'Updated 29 September 2026' };

type Copy = { vi: string; en: string };

function Section({ id, title, children }: { id?: string; title: Copy; children: ReactNode }) {
  const { t } = useLanguage();
  return (
    <section id={id} className="flex scroll-mt-24 flex-col gap-3">
      <h2 className="text-xl font-bold text-ink">{t(title)}</h2>
      <div className="flex flex-col gap-3 text-base leading-relaxed text-ink-muted">{children}</div>
    </section>
  );
}

function Items({ items }: { items: Copy[] }) {
  const { t } = useLanguage();
  return (
    <ul className="flex list-disc flex-col gap-2 pl-5">
      {items.map((item) => (
        <li key={item.en}>{t(item)}</li>
      ))}
    </ul>
  );
}

export default function PrivacyPage() {
  const { t } = useLanguage();
  const mail = (
    <a href={`mailto:${CONTACT_EMAIL}?subject=SciPal%20-%20X%C3%B3a%20d%E1%BB%AF%20li%E1%BB%87u`} className="font-semibold text-action underline underline-offset-4">
      {CONTACT_EMAIL}
    </a>
  );

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 pb-16 pt-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {t({ vi: 'Chính sách quyền riêng tư', en: 'Privacy policy' })}
        </h1>
        <p className="text-sm text-ink-muted">{t(UPDATED)}</p>
        <p className="text-base leading-relaxed text-ink-muted">
          {t({
            vi: 'SciPal là nền tảng học song ngữ Anh–Việt theo Chương trình GDPT 2018. Trang này nói rõ SciPal thu thập dữ liệu gì, dùng để làm gì, chia sẻ với ai và cách bạn xóa dữ liệu của mình.',
            en: 'SciPal is a Vietnamese–English learning platform for Vietnam’s 2018 curriculum. This page explains what SciPal collects, why, who processes it and how to delete your data.',
          })}
        </p>
      </header>

      <Section title={{ vi: 'Dữ liệu SciPal thu thập', en: 'What SciPal collects' }}>
        <Items
          items={[
            { vi: 'Tài khoản: email, họ tên, mật khẩu (được mã hóa, SciPal không đọc được). Khi đăng nhập bằng Google: email, tên và ảnh đại diện mà Google chia sẻ.', en: 'Account: email, name, password (hashed; SciPal cannot read it). With Google sign-in: the email, name and profile picture Google shares.' },
            { vi: 'Việc học: cấp học đã chọn, tiến trình bài học, điểm và bài làm khi thi thử, lớp học tham gia.', en: 'Learning: chosen school level, lesson progress, exam answers and scores, classes joined.' },
            { vi: 'Giáo sư SciPal: câu hỏi và câu trả lời trong các cuộc trò chuyện của tài khoản, để bạn xem lại. Câu hỏi thử của khách chưa đăng nhập không được lưu.', en: 'SciPal Professor: questions and answers in your account’s conversations, so you can come back to them. A visitor’s trial question is not stored.' },
            { vi: 'Thanh toán: mã đơn, gói, số tiền và trạng thái giao dịch. SciPal không nhận và không lưu số thẻ hay thông tin ngân hàng.', en: 'Payments: order code, plan, amount and status. SciPal never receives or stores card or bank details.' },
            { vi: 'Khách dùng thử: một mã băm (HMAC) của địa chỉ IP để đếm lượt thử. SciPal không lưu địa chỉ IP gốc.', en: 'Trial visitors: a keyed hash (HMAC) of the IP address to count trials. SciPal does not store the IP address itself.' },
          ]}
        />
      </Section>

      <Section title={{ vi: 'SciPal dùng dữ liệu để', en: 'How SciPal uses it' }}>
        <Items
          items={[
            { vi: 'Cho bạn đăng nhập, lưu tiến trình và hiện đúng bài học, lớp học của bạn.', en: 'To sign you in, keep your progress and show your lessons and classes.' },
            { vi: 'Chấm bài thi, tính điểm kinh nghiệm và hạn mức của gói.', en: 'To grade exams and count XP and plan limits.' },
            { vi: 'Trả lời câu hỏi cho Giáo sư SciPal.', en: 'To answer your SciPal Professor questions.' },
            { vi: 'Xử lý thanh toán và hỗ trợ khi có sự cố.', en: 'To process payments and help when something goes wrong.' },
          ]}
        />
        <p>
          {t({ vi: 'SciPal không bán dữ liệu và không dùng dữ liệu của bạn cho quảng cáo.', en: 'SciPal does not sell your data or use it for advertising.' })}
        </p>
      </Section>

      <Section title={{ vi: 'Bên xử lý dữ liệu cùng SciPal', en: 'Who processes data for SciPal' }}>
        <Items
          items={[
            { vi: 'Supabase: cơ sở dữ liệu và đăng nhập.', en: 'Supabase: database and sign-in.' },
            { vi: 'Vercel: máy chủ chạy website và API.', en: 'Vercel: hosting for the website and API.' },
            { vi: 'Google Gemini và OpenAI: tạo câu trả lời của Giáo sư SciPal và hỗ trợ soạn bài. Chỉ nội dung câu hỏi và ngữ cảnh bài học được gửi đi, không kèm email hay tên của bạn.', en: 'Google Gemini and OpenAI: generate SciPal Professor answers and help write lessons. Only the question and lesson context are sent, not your email or name.' },
            { vi: 'payOS: xử lý thanh toán chuyển khoản/QR.', en: 'payOS: processes bank transfer / QR payments.' },
            { vi: 'Google: chỉ khi bạn chọn đăng nhập bằng Google.', en: 'Google: only if you choose to sign in with Google.' },
          ]}
        />
      </Section>

      <Section title={{ vi: 'Cookie và bộ nhớ trình duyệt', en: 'Cookies and browser storage' }}>
        <p>
          {t({
            vi: 'SciPal dùng cookie cần thiết để giữ phiên đăng nhập và đếm lượt dùng thử, và bộ nhớ trình duyệt để nhớ ngôn ngữ, giao diện sáng/tối, cấp học và email đăng nhập (nếu bạn chọn "Ghi nhớ đăng nhập"). SciPal không dùng cookie quảng cáo hay theo dõi của bên thứ ba.',
            en: 'SciPal uses necessary cookies to keep you signed in and count trials, and browser storage to remember your language, light/dark theme, school level and sign-in email (if you choose “Remember login”). SciPal uses no advertising or third-party tracking cookies.',
          })}
        </p>
      </Section>

      <Section title={{ vi: 'Lưu giữ và bảo mật', en: 'Retention and security' }}>
        <p>
          {t({
            vi: 'Dữ liệu được giữ khi tài khoản còn hoạt động. Kết nối được mã hóa (HTTPS); mỗi tài khoản chỉ đọc được dữ liệu của mình nhờ phân quyền ở cơ sở dữ liệu. Giao dịch thanh toán có thể được giữ lâu hơn theo quy định kế toán.',
            en: 'Data is kept while the account is active. Connections are encrypted (HTTPS), and database access rules let each account read only its own data. Payment records may be kept longer where accounting rules require.',
          })}
        </p>
      </Section>

      <Section id="xoa-du-lieu" title={{ vi: 'Xóa dữ liệu của bạn', en: 'Deleting your data' }}>
        <p>
          {t({ vi: 'Để xóa tài khoản và toàn bộ dữ liệu liên quan (kể cả khi bạn đăng nhập bằng Google):', en: 'To delete your account and all related data (including accounts made with Google):' })}
        </p>
        <ol className="flex list-decimal flex-col gap-2 pl-5">
          <li>
            {t({ vi: 'Gửi email tới ', en: 'Email ' })}
            {mail}
            {t({ vi: ' từ địa chỉ email của tài khoản, tiêu đề "Xóa dữ liệu".', en: ' from your account’s email address with the subject “Delete my data”.' })}
          </li>
          <li>{t({ vi: 'SciPal xác nhận và xóa tài khoản trong vòng 30 ngày, rồi báo lại cho bạn.', en: 'SciPal confirms and deletes the account within 30 days, then lets you know.' })}</li>
        </ol>
      </Section>

      <Section title={{ vi: 'Trẻ em', en: 'Children' }}>
        <p>
          {t({
            vi: 'SciPal dành cho học sinh phổ thông. Học sinh dưới 16 tuổi nên dùng SciPal với sự đồng ý của cha mẹ hoặc giáo viên. Cha mẹ có thể yêu cầu xem hoặc xóa dữ liệu của con qua email bên dưới.',
            en: 'SciPal is made for school students. Students under 16 should use SciPal with a parent’s or teacher’s consent. Parents can ask to see or delete their child’s data at the email below.',
          })}
        </p>
      </Section>

      <Section title={{ vi: 'Liên hệ', en: 'Contact' }}>
        <p>
          {t({ vi: 'Câu hỏi về quyền riêng tư: ', en: 'Privacy questions: ' })}
          {mail}
        </p>
        <p>
          <Link href="/" className="font-semibold text-action underline underline-offset-4">
            {t({ vi: '← Về trang chủ', en: '← Back to home' })}
          </Link>
        </p>
      </Section>
    </main>
  );
}
