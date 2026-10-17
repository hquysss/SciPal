# Mô phỏng dao động tắt dần của con lắc đơn (Vật lí 11, Bài 6, Hình 6.1)

## Mục tiêu
Tái hiện thí nghiệm SGK: con lắc có bút dạ ở vật nặng, tấm nhựa chuyển động đều dưới bút. Học sinh thấy bút vẽ đồ thị li độ – thời gian có biên độ giảm dần và rút ra nhận xét về biên độ, chu kì (tần số).

## Kind mới `damped-pendulum` (3D Three.js, theo mẫu `harmonic-3d`)
- Cảnh 3D: giá đỡ, dây, vật nặng có bút, tấm nhựa trượt đều theo phương vuông góc mặt phẳng dao động, nét vẽ kéo dài phía sau bút, nguồn điện chạy tấm nhựa. Xoay/zoom, nhãn bộ phận bấm được như `harmonic-3d`.
- Vật lí (góc nhỏ): x(t) = A·e^(−γt)·cos(ω_d·t), ω₀ = √(g/ℓ), ω_d = √(ω₀² − γ²). Giới hạn γ < ω₀ nên luôn dao động tắt dần chậm (đúng phạm vi SGK). Đồng hồ chạy theo `useHarmonicPlayback` hoặc bản tương đương.
- Điều khiển: Phát/Tạm dừng, về đầu, thanh thời gian; chiều dài ℓ, biên độ ban đầu A₀, môi trường cản (không khí / nước / dầu, ba mức γ cố định) và tốc độ tấm nhựa.
- Hiển thị: đường bao ±A·e^(−γt) nét đứt trên đồ thị, bảng A(t), T, f, tỉ số biên độ sau mỗi chu kì (= e^(−γT), không đổi); công thức; chú thích "chu kì gần như không đổi, biên độ giảm dần".
- Dự phòng: SVG 2D khi không có WebGL (như `harmonic-3d`); `prefers-reduced-motion` dừng tự chạy.
- Song ngữ EN/VI, vùng chạm 44px, màu chỉ từ token/CSS module riêng (không hard-code màu môn học).

## Phạm vi file
`packages/types/src/simulations.ts` + bản sao `backend/src/schemas/simulations.ts` (giống hệt) · `engines/dampedPendulum.ts` (+ test) · `dampedPendulum*.tsx/.module.css` · `registry.ts` · `features/lab/catalog.ts` · fixture dùng chung · test schema/lab/render.

## Không làm
Dao động góc lớn (phi tuyến), cưỡng bức/cộng hưởng, lưu số liệu, thay đổi DB/API. Không gắn vào bài cụ thể (giáo viên thêm qua Studio).

## Kiểm chứng
Test engine (đường bao, chu kì, tỉ số biên độ), schema/fixture, typecheck 7/7, `pnpm --filter @scipal/web test` cho simulations/lab, xem trong Browser `/lab/damped-pendulum` ở 1280 và 375px.
