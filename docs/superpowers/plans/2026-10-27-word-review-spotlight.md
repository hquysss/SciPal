# Plan: Ôn từ và Sổ từ nổi bật, song ngữ

Spec: `docs/superpowers/specs/2026-10-27-word-review-spotlight-design.md` (đã duyệt, có mục menu).

| # | File | Việc |
|---|---|---|
| 1 | `frontend/features/review/reviewApi.ts` (mới) | `getReviewSummary()` bằng browser client (RLS): `due`, `total`, `preview` (≤ 3 `term_en` đến hạn), `nextDue`. |
| 2 | `frontend/features/games/ReviewSpotlight.tsx` (mới) + `app/games/page.tsx` | Dải "Ôn từ hôm nay" dưới `PlayerHero`: số đến hạn, tổng từ, xem trước EN, nút "Ôn ngay · +2 XP/từ", "Mở sổ từ"; trạng thái xong / sổ trống. View tách riêng để test. |
| 3 | `frontend/features/review/ReviewSession.tsx` | Mặt sau: `term_vi` to, hai cột English / Tiếng Việt (định nghĩa + ví dụ, nghe cả hai), xếp chồng ở màn hẹp. |
| 4 | `frontend/features/glossary/GlossarySearch.tsx` | Khi lọc "Đã lưu": đầu trang Sổ từ (số từ, nút "Ôn N từ đến hạn"); mỗi thẻ hiện EN ↔ VI ngang hàng và ví dụ cả hai ngôn ngữ. |
| 5 | `frontend/components/nav/NavBar.tsx` | `learnLinks(lang, review?)`: thêm `/review` khi đã đăng nhập, hint ghi số thẻ đến hạn; chấm trên "Học tập" khi có thẻ đến hạn. Đếm lại khi chuyển trang. |
| 6 | Kiểm tra | Test view dải ôn từ, thẻ ôn song ngữ, `learnLinks`; `tsc` + test frontend. |
