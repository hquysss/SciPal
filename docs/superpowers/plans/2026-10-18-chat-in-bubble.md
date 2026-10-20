# Community chat inside the floating bubble

UI only. The bubble is the AI Professor widget on every page.

- For a signed-in reader, the panel gets two tabs: "Giáo sư AI" (unchanged) and "Cộng đồng".
- The community tab loads lazily on first open (`next/dynamic`, no realtime until then). It shows the conversation list (rooms, classes, friends); a row opens that chat in the panel with a back button.
- "+" (find friends) and the header link go to the full `/community` page.
- Shared with the page: `useConversations` (data loader) and `ConversationPane` (which chat to open). `CommunityPage` now uses both, so there is one copy of that logic.
- A signed-out visitor sees no tabs.

Not done: unread badge on the bubble.
