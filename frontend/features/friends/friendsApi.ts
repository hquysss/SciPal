import { authoringCall, queryString, type ApiResult } from '../authoring/apiClient';

// Friends from the backend (routes/friends.ts).

export type FriendEntry = { id: string; user_id: string; display_name: string | null; avatar_url: string | null };
export type SearchUser = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  relation: 'none' | 'friend' | 'pending_out' | 'pending_in';
  friendship_id: string | null;
};
export type FriendsList = { friends: FriendEntry[]; incoming: FriendEntry[]; outgoing: FriendEntry[] };

/** Fired after a request is sent, accepted or removed, so the menu badge can recount. */
export const FRIENDS_CHANGED_EVENT = 'scipal:friends-changed';

async function changed<T>(call: Promise<ApiResult<T>>): Promise<ApiResult<T>> {
  const result = await call;
  if (result.ok && typeof window !== 'undefined') window.dispatchEvent(new Event(FRIENDS_CHANGED_EVENT));
  return result;
}

export const listFriends = (): Promise<ApiResult<FriendsList>> => authoringCall('/api/friends', 'GET');

export const searchUsers = (q: string): Promise<ApiResult<{ users: SearchUser[] }>> =>
  authoringCall(`/api/friends/search${queryString({ q })}`, 'GET');

export const sendRequest = (userId: string): Promise<ApiResult<{ id: string; status: 'pending' | 'accepted' }>> =>
  changed(authoringCall('/api/friends/request', 'POST', { user_id: userId }));

export const acceptRequest = (id: string): Promise<ApiResult<{ id: string; status: 'accepted' }>> =>
  changed(authoringCall(`/api/friends/${encodeURIComponent(id)}/accept`, 'POST'));

export const removeFriendship = (id: string): Promise<ApiResult<Record<string, never>>> =>
  changed(authoringCall(`/api/friends/${encodeURIComponent(id)}`, 'DELETE'));
