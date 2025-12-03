// src/types/rebuttal.ts
export type Rebuttal = {
  id: string;
  user_id: string;
  title: string;
  objection_text: string;
  situation: string | null;
  category: string | null;
  my_response: string | null;
  final_script: string | null;
  likes_count: number;
  feedback_count: number;
  created_at: string;
};

export type RebuttalFeedbackType = 'ai' | 'friend' | 'community';

export type RebuttalFeedback = {
  id: string;
  rebuttal_id: string;
  from_user_id: string | null;
  feedback_type: RebuttalFeedbackType;
  content: string;
  is_story: boolean;
  adopted: boolean;
  likes_count: number;
  created_at: string;
};
