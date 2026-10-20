# Profile: X-style header (Figma "X Twitter Profile Template")

Reference: Figma `WK5E8BEhT9So86Af4WGAHs`, frames `41:1438` (desktop) and `206:1939` (mobile). UI only.

## Shared header: `ProfileHero.tsx` (new)
- A tall cover (`h-32` on phones, `h-48` on larger screens).
- A round avatar with a surface ring, overlapping the bottom-left of the cover.
- The action buttons sit on the avatar row, aligned right, as pills. Secondary actions are round icon buttons.
- The name is bold, followed by the role badge. A muted line under it holds the email or the grade.
- Then the bio, and a meta row with icons (grade, school, streak, joined).
- The stats are inline in the "143 Following" style: a bold number with a muted label.
- Only tokens are used. The default cover keeps the current token gradient.

## Own profile (`/profile`)
- `ProfileCard` uses the hero. It reads `getProfile('me')` to fill in the grade, school and bio.
- The actions are "Sửa hồ sơ" (outline pill) and "Xem hồ sơ công khai" (round icon).
- Tabs below the hero, X-style with an underline in `action`: Đi nhanh (the shortcuts) and Danh hiệu (`BadgeShowcase` for "me").
- The right column (teacher request and settings) stays as the X sidebar.

## Public profile (`/community/u/[id]`)
- `PublicProfile` uses the hero. Kết bạn is the primary pill. Nhắn tin is a round mail icon plus a pill.
- Badges sit below a divider.

## Skipped
- Posts, replies and media tabs, the "You might like" list and trends, because SciPal has no posts or follow model.
