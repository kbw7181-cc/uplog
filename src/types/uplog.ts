// src/types/uplog.ts

export type FriendStatus = 'pending' | 'accepted' | 'declined';

export type Friend = {
  id: string;
  user_id: string;
  friend_id: string;
  status: FriendStatus;
  created_at: string;
};
