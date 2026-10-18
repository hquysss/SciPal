# Chat: unsend, Messenger-style actions, motion

## Unsend (thu hồi)
- Migration `20261018150000_chat_recall.sql` (additive):
  - Add `chat_messages.recalled_at`.
  - Widen the content check to allow an empty body once recalled.
  - Add a table `chat_recalls(message_id, sender_id, body, image_url, recalled_at)` with RLS on and no policies, so only the service role reads it. Moderators keep the original, and nothing can be erased before a report.
- `POST /api/chat/messages/:id/recall`: only the sender, on a message not deleted and not already recalled.
  - It copies the message to `chat_recalls`, then clears `body` and `image_url` and sets `recalled_at`, then drops the message's reactions.
  - It does not delete the image file from storage; moderators keep it.
- Client: `recalled_at` joins the selected columns. Realtime also listens for `UPDATE`, so the bubble turns into "đã thu hồi" for everyone.

## Messenger-style actions
- Hovering a bubble (always shown on touch) brings up a small toolbar next to it with React (smile), Reply and More (⋯).
- More opens a menu with Thu hồi (own messages) or Chặn (others). Thu hồi asks for confirmation in a dialog.
- The reaction picker floats above the bubble as a pill.
- Reaction chips sit on the bubble's bottom corner, Messenger style.
- A recalled message shows a muted, outlined italic bubble ("Bạn đã thu hồi một tin nhắn" or "X đã thu hồi một tin nhắn") with no actions.

## Motion (all off under `prefers-reduced-motion`)
- A new message rises in.
- The picker and menu scale in.
- Emojis grow on hover.
- A reaction chip pops when it changes.

## Not now
- A time limit on unsending, and "remove for you only".
