# SciPal — Đặc tả khung chung

**Phiên bản:** 1.5  
**Ngày cập nhật:** 2026-09-22  
**Ưu tiên:** Tin học (Informatics) first  
**Mới trong v1.5:** §9.7 Khảo sát nhu cầu & phản hồi người dùng

---

## 1. Nguyên tắc

Mỗi màn hình được tách làm hai lớp:

- **Phần cố định** — bố cục, cơ chế, thành phần dùng lại. Viết một lần, mọi môn giống nhau.
- **Phần thay theo môn** — chỉ ba thứ: màu nhận diện, icon, và nội dung (bài học, thuật ngữ, câu hỏi). Nạp từ dữ liệu, không sửa code.

**Nguyên tắc vàng:** Nội dung là dữ liệu, không phải code. Thêm môn mới = nạp thêm dữ liệu + chọn màu/icon, không dựng lại giao diện.

---

## 2. Biến thể theo môn — màu · icon

Mỗi môn khai báo một bộ nhận diện. Toàn bộ khung đọc biến màu này để tô — không hard-code màu ở bất kỳ màn hình nào.

| Môn | Tên tiếng Anh | Màu nhận diện | Icon | Status |
|-----|--------------|---------------|------|--------|
| Tin học | Informatics | `#16a34a` (green-600) | `</>` | active |
| Toán | Mathematics | `#2563eb` (blue-600) | `∑` | upcoming |
| Vật lí | Physics | `#7c3aed` (violet-600) | `⚛` | upcoming |
| Hoá học | Chemistry | `#0d9488` (teal-600) | `⚗` | upcoming |
| Sinh học | Biology | `#65a30d` (lime-600) | `❁` | upcoming |

```css
/* CSS variable set by SubjectProvider — consumed by ALL themed components */
--accent: #16a34a;   /* ← thay đổi duy nhất giữa các môn */
```

---

## 3. Kiến trúc hệ thống

```
scipal/                          ← Turborepo monorepo root
├── backend/                     ← Node.js + Fastify → VM (Docker)
├── frontend/                    ← Next.js 15 (App Router) → Vercel
├── mobile/                      ← Expo 52 (React Native) → EAS
├── packages/
│   ├── ui/                      ← Design tokens, SubjectProvider, shared components
│   ├── types/                   ← Zod schemas: Block, Question, Subject
│   ├── hooks/                   ← useLanguage, useProgress, useStreak
│   └── supabase/                ← Typed Supabase client (browser + server)
└── supabase/
    ├── migrations/              ← SQL migrations (0001–0004)
    └── seed/                    ← Subjects + Informatics sample lesson
```

### Luồng dữ liệu

```
Client (web/mobile)
  ↓ fetch content/progress
Supabase (Postgres + Auth)   ← RLS on all user tables
  ↑ service_role only
backend/ (Fastify on VM)
  ↓ proxies AI calls (key hidden server-side)
Claude API / OpenAI API       ← provider-agnostic interface
```

---

## 4. Danh sách màn hình (12 màn hình)

| # | Màn hình | Dependency chính |
|---|----------|-----------------|
| S1 | Navigation (Nav Bar) | Design tokens, subject registry |
| S2 | Home (Trang chủ) | S1, subject list |
| S3 | Lesson List (Danh sách bài học) | S1, lessons + topics |
| S4 | Lesson View (Xem bài học) | S3, block renderer, glossary |
| S5 | AI Tutor (Gia sư AI) | S4, `/api/ai/chat` |
| S6 | Glossary (Từ điển thuật ngữ) | S1, terms |
| S6b | Resources (Tài nguyên học tập) | S1, resources |
| S7 | Progress / Streak / Badges | S4, `/api/score/lesson` |
| S8 | Profile (Hồ sơ) | S7, auth |
| S9 | Exam Mode (Thi thử) | S7, `/api/score/exam`, blueprints |
| S10 | Authoring (Soạn nội dung) | Supabase service_role |
| S11 | Class Management (Quản lí lớp) | S8, class_rooms, assignments |
| S12 | Survey & Feedback (Khảo sát) | §9.7, S8 |

---

## 5. Đặc tả từng màn hình

### S1 — Navigation Bar

**Cấu trúc:**
- Logo SciPal (4-leaf clover icon + wordmark "SciPal")
- Background: `bg-[--scipal-green]` (light green brand color)
- Menu items: Môn học · Cách học · Về AI
- EN/VI language toggle (pill button)
- Online/Offline status pill (dot + label)
- "Bắt đầu" (Start) CTA button → accent color

**Quy tắc màu:**
- Nav background luôn dùng `--scipal-green` (brand green), không thay đổi theo môn
- CTA button dùng `--accent` (màu môn hiện tại)
- Subject switcher dropdown hiển thị màu từng môn

**State:**
- Khi offline: Offline pill hiện, AI Tutor + streak sync bị vô hiệu hoá
- Subject switcher: chọn môn → `SubjectProvider` cập nhật `--accent`

---

### S2 — Home (Trang chủ)

**Layout:**
- Hero section: tiêu đề "Học khoa học tự nhiên — không khó như bạn nghĩ" + tagline
- Subject grid: 5 thẻ môn, mỗi thẻ hiển thị icon + tên + màu nhận diện riêng
- "Tiếp tục học" (Continue Learning) section — bài học gần nhất của user
- Streak banner — chuỗi ngày học liên tiếp
- "Được đề xuất" (Recommended) section — AI gợi ý dựa trên progress

**Tương tác:**
- Click thẻ môn → `SubjectProvider` set `--accent` → điều hướng S3
- Upcoming môn: disabled card với "Sắp ra mắt" badge

---

### S3 — Lesson List (Danh sách bài học)

**Layout:**
- Header: tên môn + icon + màu `--accent`
- Topic accordion: mỗi topic là một accordion group
  - Lesson cards bên trong: tiêu đề + status chip (chưa học / đang học / hoàn thành)
  - Progress bar theo màu `--accent`
- Grade filter tabs: Lớp 10 · Lớp 11 · Lớp 12
- Search bar (client-side filter)

**Data:**
```
topics (subject_id) → lessons (topic_id)
```

---

### S4 — Lesson View (Xem bài học)

**Layout:**
- Breadcrumb: Môn → Topic → Bài học
- Block renderer: render từng block theo thứ tự trong `lessons.blocks`
- Floating: AI Tutor button (bottom-right), language toggle (top-right)
- Footer nav: Bài trước / Bài tiếp theo

**7 loại block:**

| Block type | Mô tả |
|-----------|-------|
| `theory` | Văn bản lý thuyết song ngữ, hỗ trợ Markdown + KaTeX inline |
| `code` | Code editor multi-tab: Python / C++ / JavaScript |
| `formula` | Công thức KaTeX độc lập + caption song ngữ |
| `quiz` | Câu hỏi nhúng (tham chiếu ID → bảng questions) |
| `interactive` | Mô phỏng tương tác (xem bên dưới) |
| `term-ref` | Thẻ thuật ngữ inline → liên kết sang Glossary |
| `resource-ref` | Thẻ tài nguyên: link, ảnh thu nhỏ, mô tả |

**Interactive block — 5 loại kind:**

| Kind | Mô tả | Offline? |
|------|-------|---------|
| `algorithm-sim` | Mô phỏng thuật toán bước từng bước (dùng D3 / custom) | ✅ |
| `function-graph` | Đồ thị hàm số kéo-thả (Desmos-style) | ✅ |
| `geometry-3d` | Khám phá hình học 3D (Three.js) | ✅ |
| `experiment` | Thí nghiệm ảo (PhET embed, online-only) | ❌ |
| `bio-diagram` | Sơ đồ sinh học có nhãn tương tác | ✅ |

**Hoàn thành bài học:**
- Khi user cuộn tới cuối + trả lời đủ quiz → gọi `POST /api/score/lesson`
- Server ghi `progress`, `xp_log`, kiểm tra `streak`, trả về badges mới
- Client hiển thị "Chúc mừng" modal với XP + badge

---

### S5 — AI Tutor (Gia sư AI)

**Trigger:** Floating button ở S4, hoặc menu "AI Tutor" trực tiếp

**Layout:**
- Chat panel (slide-up on mobile, side panel on web)
- Header: avatar bot + tên môn + badge "AI" màu `--accent`
- Message list: bubble chat song ngữ
- Input: text field + mic button (§9.6 voice Q&A)
- Suggested prompts: 3–4 gợi ý dựa trên bài học hiện tại

**API:**
```
POST /api/ai/chat
Body: { lesson_id, messages, subject_slug, language: 'en'|'vi' }
→ Stream SSE response
```

**RAG context:**
- Backend fetch lesson blocks + related terms từ Supabase
- Build system prompt: "Em là gia sư Tin học... Bài học hiện tại: {title}. Các thuật ngữ: ..."
- Stream Claude/OpenAI response → SSE chunks

**Offline:** Button disabled, tooltip "Cần kết nối mạng để dùng AI Tutor"

---

### S6 — Glossary (Từ điển thuật ngữ)

**Layout:**
- Search bar + alphabet quick-jump (A–Z hoặc theo tiếng Việt)
- Filter: Tất cả môn / Tin học / Toán / ...
- Term card: term_en / term_vi · part_of_speech · definition (song ngữ) · ví dụ
- Audio button (§9.6): phát âm term_en → TTS pre-generated URL
- "Xem trong bài học" link → S4 scroll tới block chứa term này

---

### S6b — Resources (Tài nguyên học tập)

**Layout:**
- Filter: môn + category (practice / reference / simulation)
- Resource card: tiêu đề + mô tả song ngữ + thumbnail + nút "Mở"
- Simulation resources → mở PhET embed trong modal (online-only)

---

### S7 — Progress / Streak / Badges

**Layout:**
- Header: tổng XP + level badge
- Streak calendar: 7 ngày gần nhất (ô vuông màu `--accent` nếu có học)
- Subject progress bars: mỗi môn 1 thanh tiến trình
- Badge wall: grid huy hiệu (earned = màu, unearned = grayscale)
- "Mục tiêu tuần này" (Weekly Goal) mini-section

**Data source:**
- `progress` + `xp_log` + `streaks` + `user_badges` → Supabase RLS queries
- XP/streak/badge chỉ được cập nhật bởi backend (`/api/score/*`), không phải client

---

### S8 — Profile (Hồ sơ)

**Layout:**
- Avatar + display_name + role (student / teacher)
- Thống kê: tổng bài hoàn thành · XP · ngày học liên tiếp dài nhất
- Cài đặt: ngôn ngữ mặc định, thông báo, tài khoản
- Đăng xuất
- Nếu role = teacher → link sang S11 Class Management

---

### S9 — Exam Mode (Thi thử)

**Layout:**
- Chọn đề: theo grade + môn + blueprint_id
- Timer countdown (configurable per blueprint)
- Question view: 1 câu / trang (có thể switch)
  - MC: 4 options
  - TrueFalse: 4 sub-statements
  - Short: text input
- Answer palette: grid ô câu (màu: chưa làm / đã làm / đánh dấu)
- Submit → `POST /api/score/exam` → kết quả breakdown

**Bảo mật:**
- Đáp án không bao giờ gửi xuống client
- Short answer: graded server-side, rubric optional

---

### S10 — Authoring Tool (Soạn nội dung — Teacher)

**Phạm vi:** Chỉ user role = teacher, authenticate thêm với service_role restricted action

**Layout:**
- Lesson editor: drag-drop block builder (7 block types)
- Block palette: click to add block type
- Theory block: rich text editor song ngữ (en/vi tabs)
- Code block: Monaco editor với syntax highlight
- Formula block: KaTeX live preview
- Quiz block: form tạo câu hỏi MC / TrueFalse / Short
- Interactive block: chọn kind + nhập config JSON
- Preview mode: xem bài như student
- Publish toggle: draft → published

**Data flow:**
- Save draft → `PATCH /api/authoring/lessons/:id` (service_role)
- Publish → set `published = true`

---

### S11 — Class Management (Quản lí lớp — Teacher)

**Layout:**
- Danh sách lớp: tên + môn + số học sinh + invite_code (copy button)
- Tạo lớp mới: form chọn môn + tên lớp → server tạo invite_code ngẫu nhiên
- Chi tiết lớp:
  - Danh sách học sinh (từ class_members)
  - Progress overview: mỗi học sinh đã hoàn thành bao nhiêu bài
  - Giao bài (assignment): chọn lesson hoặc exam_blueprint + due_at
- Assignment list: danh sách bài đã giao + trạng thái nộp

---

### S12 — Survey & Feedback (Khảo sát nhu cầu & Phản hồi — §9.7)

**Mục đích:**
- Thu thập dữ liệu nhu cầu người dùng (môn nào muốn học trước, tính năng nào cần nhất)
- Nhận phản hồi sau mỗi bài học / sau mỗi phiên học

**Layout:**
- **Post-lesson micro-survey** (hiện sau khi hoàn thành S4):
  - Rating 1–5 sao cho bài học
  - "Bài này khó / vừa / dễ?" (3 option)
  - Optional text feedback (max 200 ký tự)
  - Dismiss after 2 seconds nếu user không tương tác
- **Subject demand survey** (lần đầu vào app, hoặc trigger từ S2):
  - "Bạn muốn học môn nào nhất?" (checkbox, multiple)
  - "Bạn học lớp mấy?" (10 / 11 / 12)
  - "Mục tiêu của bạn?" (thi THPT / học thêm / yêu thích)
- **Feature request** (trong S8 Profile):
  - Danh sách tính năng → vote up/down
  - Free-text "Tính năng bạn mong muốn"

**Database:**
```sql
surveys (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES profiles(id),  -- null = anonymous
  type        text NOT NULL,  -- 'post_lesson' | 'demand' | 'feature_request'
  payload     jsonb NOT NULL,
  created_at  timestamptz DEFAULT now()
);
```

**API:**
```
POST /api/survey
Body: { type, payload }
→ writes to surveys table (anon allowed for demand survey)
```

---

## 6. Content Block Schema (chi tiết)

```typescript
// Theory text — bilingual
type TheoryBlock = {
  type: 'theory';
  content: { en: string; vi: string };   // Markdown + KaTeX inline
};

// Code block with multiple language tabs
type CodeBlock = {
  type: 'code';
  tabs: Array<{ lang: 'python' | 'cpp' | 'javascript'; code: string }>;
};

// Standalone KaTeX formula
type FormulaBlock = {
  type: 'formula';
  katex: string;
  caption?: { en: string; vi: string };
};

// Embedded quiz question (reference by ID)
type QuizBlock = {
  type: 'quiz';
  question_id: string;   // uuid → questions table
};

// Interactive simulation / experiment
type InteractiveBlock = {
  type: 'interactive';
  kind: 'algorithm-sim' | 'function-graph' | 'geometry-3d' | 'experiment' | 'bio-diagram';
  heading: { en: string; vi: string };
  caption?: { en: string; vi: string };
  offline: boolean;
  embed_url?: string;    // PhET or similar, online only
  config: Record<string, unknown>;  // kind-specific params
};

// Term reference → links to Glossary
type TermRefBlock = {
  type: 'term-ref';
  term_id: string;       // uuid → terms table
};

// External resource card
type ResourceRefBlock = {
  type: 'resource-ref';
  resource_id: string;   // uuid → resources table
};

type Block =
  | TheoryBlock
  | CodeBlock
  | FormulaBlock
  | QuizBlock
  | InteractiveBlock
  | TermRefBlock
  | ResourceRefBlock;
```

---

## 7. Question Schema

```typescript
// Multiple-choice (4 options)
type MCData = {
  stem: { en: string; vi: string };
  options: Array<{ id: string; text: { en: string; vi: string } }>;
  answer: string;            // option id
  explanation?: { en: string; vi: string };
};

// True/False with 4 sub-statements
type TrueFalseData = {
  stem: { en: string; vi: string };
  items: Array<{ id: string; text: { en: string; vi: string }; correct: boolean }>;
  explanation?: { en: string; vi: string };
};

// Short answer
type ShortData = {
  stem: { en: string; vi: string };
  answer_key: string;        // kept server-side only
  rubric?: { en: string; vi: string };
};
```

---

## 8. Design Tokens

```css
/* Global — never changes */
--font-sans: 'Inter', sans-serif;
--font-mono: 'JetBrains Mono', monospace;
--radius: 0.5rem;
--scipal-green: #16a34a;   /* brand color — 4-leaf clover logo */

/* Per-subject — set by SubjectProvider on a scope element */
--accent: #16a34a;          /* Informatics (green)   */
/* --accent: #2563eb; */    /* Mathematics (blue)    */
/* --accent: #7c3aed; */    /* Physics (violet)      */
/* --accent: #0d9488; */    /* Chemistry (teal)      */
/* --accent: #65a30d; */    /* Biology (lime)        */

/* Derived semantic tokens (always from --accent) */
--accent-10: color-mix(in srgb, var(--accent) 10%, white);
--accent-20: color-mix(in srgb, var(--accent) 20%, white);
--btn-primary-bg: var(--accent);
--progress-fill: var(--accent);
--badge-border: var(--accent);
```

---

## 9. Database Schema

### 9.1 Content tables

```sql
subjects (id, slug, name_en, name_vi, accent_color, icon, status, sort_order, created_at)
topics (id, subject_id, slug, name_en, name_vi, sort_order)
lessons (id, topic_id, subject_id, slug, title_en, title_vi, grade, blocks jsonb, sort_order, published, created_at, updated_at)
terms (id, subject_id, term_en, term_vi, part_of_speech, definition_en, definition_vi, example_en, example_vi, audio_url, tags)
questions (id, subject_id, lesson_id, type, difficulty, objective_id, data jsonb, created_at)
exam_blueprints (id, name, grade, subject_id, sections jsonb)
resources (id, subject_id, url, title_en, title_vi, description_en, description_vi, category, sort_order)
```

### 9.2 User tables

```sql
profiles (id, display_name, role, avatar_url, created_at)
progress (id, user_id, lesson_id, completed_at, score)
xp_log (id, user_id, subject_id, delta, reason, created_at)
streaks (user_id, subject_id, current_streak, longest_streak, last_active)
badges (id, subject_id, name_en, name_vi, icon, condition jsonb)
user_badges (user_id, badge_id, earned_at)
class_rooms (id, teacher_id, subject_id, name, invite_code, created_at)
class_members (class_id, student_id, joined_at)
assignments (id, class_id, lesson_id, blueprint_id, due_at, created_at)
surveys (id, user_id, type, payload jsonb, created_at)   -- §9.7
```

### 9.3 RLS summary

- `profiles`, `progress`, `xp_log`, `streaks`, `user_badges`: user sees own rows only
- `class_rooms`: teacher sees own; students see joined rooms
- `class_members`, `assignments`: class members see
- Content tables: public read; write = service_role only
- `surveys`: anon insert allowed (for demand survey); read = service_role only

---

## 10. API Design

Base URL: `https://api.scipal.vn` / `http://localhost:3001` (dev)

All routes require `Authorization: Bearer <supabase_jwt>` except `/health` and `POST /api/survey` (anonymous allowed).

```
GET  /health                       → { status: 'ok' }

POST /api/ai/chat                  → SSE stream AI tutor response
  Body: { lesson_id, messages, subject_slug, language: 'en'|'vi' }

POST /api/tts                      → { url } (§9.6 voice)
  Body: { text, language: 'en'|'vi' }

POST /api/score/lesson             → server-authoritative XP grant
  Body: { lesson_id, answers: Answer[] }
  → { xp_earned, new_streak, badges_unlocked[] }

POST /api/score/exam               → server-authoritative exam scoring
  Body: { blueprint_id, answers: Answer[] }
  → { score, breakdown_by_topic[] }

POST /api/survey                   → write survey response (§9.7)
  Body: { type: 'post_lesson'|'demand'|'feature_request', payload }

PATCH /api/authoring/lessons/:id   → update lesson (teacher only, service_role)
  Body: { title_en?, title_vi?, blocks?, published? }
```

---

## 11. Offline Strategy

| Layer | Mechanism |
|-------|-----------|
| Web (Next.js) | Serwist service worker — caches lesson pages after first visit |
| Mobile (Expo) | Content fetched at lesson-list open time, stored in MMKV |
| Interactive blocks | Run in-browser (no network). PhET embeds = online-only (`offline: false`) |
| AI Tutor | Disabled UI when offline; shows "Cần kết nối mạng" tooltip |
| Streak sync | Queued locally (MMKV), synced when reconnect |

---

## 12. Security

- AI API key never leaves the VM
- XP/badges granted only by `backend/` (never client-side)
- Short-answer `answer_key` excluded from client queries via RLS + DB view
- Exam answers submitted to `/api/score/exam`; correct answers never returned to client
- `SERVICE_ROLE` key referenced only in `backend/src/`, never in `frontend/`, `mobile/`, `packages/`

---

## 13. Thứ tự xây dựng khuyến nghị

**Phase 1 — Core web (Tin học reference):**
S1 → S2 → S3 → S4 → S5 → S6 → S7

**Phase 2 — Auth & Gamification:**
S8 → S7 (hoàn chỉnh) → S9

**Phase 3 — Teacher tools:**
S10 → S11

**Phase 4 — Survey & Expansion:**
S12 → thêm môn Toán, Vật lí, Hoá học, Sinh học

---

## 14. Mở rộng (§9.x)

### §9.1 — Nội dung theo chuẩn chương trình
- Mỗi question có `objective_id` → chuẩn CTGDPT 2018
- Exam blueprint ánh xạ theo phân phối chuẩn (số câu theo chủ đề)

### §9.2 — Spaced Repetition
- Thuật toán SM-2 (hoặc FSRS) chạy trên backend
- `POST /api/review` → trả về flashcard queue ngày hôm nay

### §9.3 — Gamification nâng cao
- XP levels (1–50), leaderboard tuần (class + global)
- Seasonal badges (chuỗi 7 ngày / 30 ngày)

### §9.4 — Offline-first nâng cao
- Background sync queue (IndexedDB cho web, MMKV cho mobile)
- Conflict resolution: server wins cho XP/streak

### §9.5 — Đa ngôn ngữ mở rộng
- Thêm ngôn ngữ thứ 3 (ví dụ: Khmer, Lao) — cùng pattern `{ en, vi, km? }`

### §9.6 — Hỏi/Đáp bằng giọng nói
- Mic button ở S5 AI Tutor → Web Speech API (web) / expo-av (mobile)
- STT → text → gửi POST /api/ai/chat
- TTS: `POST /api/tts` → trả URL → play
- Glossary: audio button → phát TTS pre-generated cho term_en

### §9.7 — Khảo sát nhu cầu & Phản hồi người dùng (S12)
- Post-lesson micro-survey: rating + độ khó + optional feedback
- Subject demand survey: môn nào / lớp mấy / mục tiêu
- Feature request voting (trong Profile)
- Anonymous option cho demand survey
- Data dùng để ưu tiên lộ trình phát triển môn học tiếp theo

---

## 15. Component Library (packages/ui)

### Shared components (web + mobile via NativeWind)

| Component | Props | Ghi chú |
|-----------|-------|---------|
| `SubjectProvider` | `subject: Subject` | Sets `--accent` on scope div |
| `AccentButton` | `variant: primary\|outline` | Uses `--accent` for bg/border |
| `ProgressBar` | `value: 0–100` | Fill = `--accent` |
| `BadgeChip` | `badge: Badge, earned: bool` | Earned = color, unearned = gray |
| `StreakFlame` | `streak: number` | Flame icon + count |
| `LanguageToggle` | `lang, setLang` | EN/VI pill switcher |
| `BlockRenderer` | `blocks: Block[]` | Routes to sub-renderer by type |
| `TheoryRenderer` | `block: TheoryBlock` | Markdown + KaTeX |
| `CodeRenderer` | `block: CodeBlock` | Multi-tab Monaco/Prism |
| `FormulaRenderer` | `block: FormulaBlock` | KaTeX display |
| `QuizBlock` | `question: Question` | MC / TrueFalse / Short |
| `InteractiveRenderer` | `block: InteractiveBlock` | Routes to kind |
| `TermRefCard` | `term: Term` | Inline card + link |
| `ResourceRefCard` | `resource: Resource` | Thumbnail + CTA |
| `OnlinePill` | `online: boolean` | Green/red dot + label |
| `SurveyModal` | `type, onSubmit` | §9.7 survey UI |

---

*Spec này là tài liệu sống — cập nhật theo từng phase xây dựng.*
