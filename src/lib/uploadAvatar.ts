import { supabase } from '@/lib/supabaseClient';

export async function uploadAvatar(userId: string, file: File) {
  const ext = file.name.split('.').pop();
  const fileName = `${userId}.${ext}`;
  const path = `avatars/${fileName}`;

  // 1) 스토리지 업로드
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) throw uploadError;

  // 2) DB에는 "path만" 저장 (절대 URL 저장 ❌)
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: path })
    .eq('user_id', userId);

  if (updateError) throw updateError;

  return path;
}
