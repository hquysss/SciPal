import { authoringCall, type ApiResult } from '../authoring/apiClient';

const path = (classId: string) => `/api/classes/${encodeURIComponent(classId)}`;

export const renameClass = (classId: string, name: string): Promise<ApiResult<{ class_room: { id: string; name: string } }>> =>
  authoringCall(path(classId), 'PATCH', { name });

/** Whether the class's students see a leaderboard of the class. */
export const setClassLeaderboard = (classId: string, enabled: boolean): Promise<ApiResult<{ class_room: { id: string; leaderboard_enabled: boolean } }>> =>
  authoringCall(path(classId), 'PATCH', { leaderboard_enabled: enabled });

/** Removes the class with its members, assignments, games and chat. */
export const deleteClass = (classId: string): Promise<ApiResult<{ success: true }>> => authoringCall(path(classId), 'DELETE');
