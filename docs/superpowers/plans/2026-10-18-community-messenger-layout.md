# Community: messenger layout (Figma "Chat Web App UI Kit")

Reference: Figma `dLzeIjZVOiIaxVOvvYQmaj`, node `101:141`. UI only, no backend or schema change.

## Layout
- `/community` becomes one shell: a conversation list on the left and the open chat on the right (desktop). On a phone it shows one at a time, with a back button.
- The list has a "Tin nhắn" header, a "+" button (find friends), and a search box that filters by name.
- The list has three groups: Phòng (Tất cả, plus the reader's grade rooms, or a grade chooser), Lớp học (class chats), and Bạn bè (DMs). A row shows an avatar, a name, a muted line and a tag pill. The active row has a tint.
- The URL keeps its scheme so links still work: `?room=all|10`, `?tab=classes&class=`, `?tab=friends&dm=`, `?tab=friends` (find and manage friends).

## Chat pane
- Header: a 40px avatar, the name in bold, a muted subtitle, and a soft Report button on the right.
- Each run has the avatar at the top beside separate rounded bubbles. Others' bubbles are sunken; your own are `action`, aligned right with your avatar.
- Composer: the attach icon sits outside on the left. The input is bordered, with a ghost send icon inside on the right.

## Files
- New: `ConversationList.tsx` with its test, which replaces `CommunityRoom.tsx`, `ClassesTab.tsx` and its test.
- `CommunityPage.tsx` is rewritten. `FriendsTab` loses its DM branch. `ChatPane.tsx` and `SendButton.tsx` are restyled. The route page is widened.

## Skipped
- The right "Directory" panel (members and files), because there is no member or file API for rooms yet.
- Last message and time on list rows, because there is no summary API.
