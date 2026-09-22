# Agent Workflow & Execution Rules

Tất cả AI Agent khi tham gia phát triển SciPal bắt buộc phải tuân thủ nghiêm ngặt quy trình làm việc chuẩn sau:

## 1. Trình tự bắt đầu phiên làm việc (Session Startup)
1. Đọc [`AGENTS.md`](../../AGENTS.md) để nắm nhanh nguyên tắc cốt lõi và định hướng.
2. Đọc các tài liệu quy tắc trong `.agents/rules/` liên quan trực tiếp đến phạm vi công việc.
3. Đọc [`PROJECT_STATE.md`](../../PROJECT_STATE.md) để nắm rõ:
   - Mục tiêu hiện tại (Current Goal).
   - Task đang thực hiện dở dang (Current Task).
   - Các phần đã hoàn thành và **CẤM LÀM LẠI (Do Not Redo)**.
4. Nếu đang thực thi một plan có sẵn, đọc kỹ file plan tương ứng trong `docs/superpowers/plans/`.

## 2. Quy tắc khảo sát & Viết mã (Implementation Discipline)
- **Chỉ đọc những gì cần thiết**: Không quét hoặc đọc toàn bộ codebase bừa bãi. Chỉ đọc các file liên quan trực tiếp đến task hiện tại.
- **Tận dụng mã nguồn có sẵn trước khi tạo mới**:
  - Types/Schemas: Xem `@scipal/types` trước khi tự tạo interface mới.
  - Theming & UI: Tái sử dụng `SubjectProvider` và `tokens.ts` từ `@scipal/ui`.
  - Ngôn ngữ: Dùng `useLanguage` từ `@scipal/hooks`.
  - Supabase client: Dùng `createBrowserClient` / `createServerClient` từ `@scipal/supabase`.
- **Triển khai từng task một (One Task at a Time)**:
  - Hoàn thành trọn vẹn 1 task, kiểm thử đạt rồi mới chuyển sang task tiếp theo.
  - Không triển khai trước các tính năng thuộc về các phase tương lai.
- **Không mở rộng scope (Strict Scope Boundary)**:
  - Không tự ý refactor các đoạn code đang hoạt động ổn định nếu không nằm trong yêu cầu task.
  - Không thay đổi kiến trúc hệ thống (như chuyển thư viện, thay đổi cấu trúc monorepo) nếu chưa có sự đồng ý rõ ràng từ người dùng.
  - Không tự thêm thư viện ngoài (dependencies) khi các gói hiện có đã đáp ứng đủ.
- **Tôn trọng mã nguồn người dùng**: Không bao giờ ghi đè hoặc xóa bỏ các thay đổi tùy chỉnh của người dùng trừ khi được yêu cầu trực tiếp.

## 3. Quy trình Kiểm thử & Xác thực (Verification Mandatory)
Trước khi đánh dấu một task là hoàn tất hoặc thông báo thành công cho người dùng:
1. **Kiểm tra kiểu dữ liệu (Typecheck)**:
   ```bash
   pnpm turbo typecheck
   ```
   Bắt buộc đạt 7/7 package/app thành công, 0 lỗi TypeScript.
2. **Kiểm tra Unit Test**:
   ```bash
   pnpm turbo test
   ```
   Đảm bảo toàn bộ các bài test hiện có và test mới viết đều Pass.
3. **Kiểm tra Build (khi hoàn thành màn hình hoặc module lớn)**:
   ```bash
   pnpm turbo build
   ```
4. **Nếu gặp lỗi**: Sử dụng quy trình chẩn đoán có hệ thống (systematic debugging) để tìm nguyên nhân gốc rễ, sửa lỗi và chạy lại kiểm thử. Không che giấu lỗi bằng `any` hoặc `@ts-ignore` bừa bãi.

## 4. Báo cáo & Chuyển giao (Handoff)
Khi hoàn tất công việc:
1. Rà soát lại diff (`git status`, `git diff`) để đảm bảo không để sót file rác hoặc chỉnh sửa ngoài ý muốn.
2. Cập nhật trạng thái mới nhất vào [`PROJECT_STATE.md`](../../PROJECT_STATE.md) (đánh dấu hoàn thành, ghi chú quyết định mới).
3. Báo cáo cho người dùng ngắn gọn, súc tích:
   - Danh sách file đã tạo / chỉnh sửa.
   - Các lệnh kiểm tra đã chạy và kết quả cụ thể.
   - Vấn đề còn tồn đọng hoặc câu hỏi mở (nếu có).
4. Người dùng luôn là người phê duyệt cuối cùng (Final Reviewer).
