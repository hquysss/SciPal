import { authoringCall, type ApiResult } from '../../authoring/apiClient';

// Honor badges from the backend (routes/badges.ts). Automatic badges cannot be given or taken by hand.

export const awardBadge = (userId: string, badgeId: string, reason: string): Promise<ApiResult<Record<string, never>>> =>
  authoringCall('/api/admin/badges/award', 'POST', { user_id: userId, badge_id: badgeId, reason });

export const revokeBadge = (userId: string, badgeId: string): Promise<ApiResult<Record<string, never>>> =>
  authoringCall('/api/admin/badges/revoke', 'POST', { user_id: userId, badge_id: badgeId });
