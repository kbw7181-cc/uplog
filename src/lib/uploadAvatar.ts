// src/lib/uploadAvatar.ts
"use client";

import { supabase } from "./supabaseClient";

export async function uploadAvatar(userId: string, file: File) {
  try {
    const ext = file.name.split(".").pop() || "jpg";
    const filePath = `avatars/${userId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars") // ❗ 버킷 이름 고정
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("[AVATAR_UPLOAD] 업로드 실패:", uploadError);
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);

    return {
      filePath,
      publicUrl,
    };
  } catch (e) {
    console.error("[AVATAR_UPLOAD] 예외 에러:", e);
    throw e;
  }
}
