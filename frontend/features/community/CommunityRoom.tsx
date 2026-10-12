'use client';

import { ChatPane } from './ChatPane';

/** The one room everyone shares, whatever subject they study. */
export function CommunityRoom() {
  return <ChatPane target={{ community: true }} />;
}
