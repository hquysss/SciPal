'use client';

import { useCallback, useEffect, useState } from 'react';
import { FRIENDS_CHANGED_EVENT, listFriends } from '../friends/friendsApi';
import { getChatRooms, listChatClasses, loadRoomAvatars, setChatGrade } from './chatApi';
import type { ConversationData } from './ConversationList';

type Bilingual = { vi: string; en: string };

/** What the conversation list shows: grade rooms, classes and friends, reloaded when friends change. */
export function useConversations(): {
  data: ConversationData | null;
  error: Bilingual | null;
  reload: () => Promise<void>;
  /** Saves the reader's grade; resolves true when the grade room is now open to them. */
  chooseGrade: (grade: number) => Promise<boolean>;
} {
  const [data, setData] = useState<ConversationData | null>(null);
  const [error, setError] = useState<Bilingual | null>(null);

  const reload = useCallback(async () => {
    const [rooms, classes, friends, roomAvatars] = await Promise.all([getChatRooms(), listChatClasses(), listFriends(), loadRoomAvatars()]);
    const failed = [rooms, classes, friends].find((r) => !r.ok);
    setError(failed && !failed.ok ? failed.error : null);
    setData({
      grades: rooms.ok ? rooms.data.grades : [],
      classes: classes.ok ? classes.data.classes : [],
      friends: friends.ok ? friends.data.friends : [],
      incoming: friends.ok ? friends.data.incoming.length : 0,
      roomAvatars,
    });
  }, []);

  useEffect(() => {
    void reload();
    const refresh = () => void reload();
    window.addEventListener(FRIENDS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(FRIENDS_CHANGED_EVENT, refresh);
  }, [reload]);

  const chooseGrade = async (grade: number) => {
    const result = await setChatGrade(grade);
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    setError(null);
    setData((prev) => (prev ? { ...prev, grades: [grade] } : prev));
    return true;
  };

  return { data, error, reload, chooseGrade };
}
