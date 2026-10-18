# Navbar: clear groups, easy to use

Audit first (5 rules from the brief), then the fix. UI only.

## Audit of the current bar
| Rule | Finding | Severity |
|---|---|---|
| Focused navigation | The full bar shows only from 1536px. A 1366–1440px laptop gets only a hamburger, so every link is hidden. | Serious |
| Focused navigation | Where a link lives is arbitrary. Community is buried in the avatar menu, Help is an icon for guests but a menu item for members, and "Thêm" mixes reference pages (Từ điển, Bảng giá) with personal ones (Tiến trình, Gamification, Lớp của em). | Serious |
| Visual hierarchy | Teacher and Admin sit in the same row as learning links, with no separation. The mobile menu is one long flat list. | Medium |
| Consistency | Desktop and mobile use different groupings, and the pending-friends count is written into the label as "(2)". | Medium |
| Simplicity | A guest sees Help, a theme switch and a language switch before Sign in. | Recommended |
| Feedback | Active link and open menus are already marked well. Kept. | OK |

## Fix
Four groups with fixed places:
1. **Học (bar)**: Trang chủ, Môn học, Mô phỏng, Thi thử, Giáo sư AI, and Cộng đồng for members. A count badge shows waiting friend requests.
2. **Thêm (menu)**: reference pages only, the same for everyone: Từ điển, Bảng giá, Hướng dẫn.
3. **Tài khoản (avatar menu)**: everything personal: Hồ sơ, Tiến trình, Gamification, Lớp của em, Gói của tôi, then theme and sign out.
4. **Quản lý**: Giáo viên and Quản trị, after a divider and apart from the learning links.

- The full bar shows from 1280px. The fold-away toggle follows the same breakpoint.
- The mobile menu uses the same groups, each with a small heading: Học, Của tôi, Thêm, Quản lý. The account footer stays.
- The guest's Help icon goes. Help is in Thêm.
- Test updates: `primaryLinks`, `moreLinks` and the new `accountLinks`.

## Not now
- Search in the bar and a bottom tab bar on phones.
