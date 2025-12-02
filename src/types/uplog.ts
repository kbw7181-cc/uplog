export type Friend = {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
};

export type ChatRoom = {
  id: string;
  member_a: string;
  member_b: string;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  chat_id: string;
  user_id: string;
  content: string | null;
  attachment_url: string | null;
  created_at: string;
};
