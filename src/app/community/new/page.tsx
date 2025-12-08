'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const CATEGORIES = ["영업 노하우", "거절 경험", "멘탈 관리", "오늘의 기록", "자유"] as const;
type Category = (typeof CATEGORIES)[number];

const IMAGE_KEY_PREFIX = 'uplog-community-image-';

export default function NewPostPage() {
  const router = useRouter();
  const [category, setCategory] = useState<Category>("영업 노하우");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // 사진 업로드용 상태 (로컬 미리보기 + base64 데이터)
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  function handleImageChange(e: any) {
    const file = e.target.files?.[0];
    if (!file) {
      setImagePreview(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 업로드할 수 있습니다.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setImagePreview(result); // data URL (base64)
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit() {
    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 입력해주세요.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }

    // 글 등록 + 방금 작성한 글 데이터 같이 가져오기
    const { data, error } = await supabase
      .from("community_posts")
      .insert({
        user_id: user.id,
        category,
        title,
        content,
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      alert("등록 중 오류가 발생했습니다.");
      return;
    }

    // 이미지가 있다면, 브라우저 localStorage에 캐싱 (DB는 건드리지 않음)
    if (data && imagePreview) {
      try {
        if (typeof window !== "undefined") {
          const key = `${IMAGE_KEY_PREFIX}${data.id}`;
          window.localStorage.setItem(key, imagePreview);
        }
      } catch (e) {
        console.error("IMAGE_CACHE_ERROR", e);
      }
    }

    alert("글이 등록되었습니다.");
    router.push("/community");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#ffffff", // 완전 흰색
        color: "#111827", // 진한 글씨
        padding: "32px 16px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        {/* 상단 타이틀 */}
        <div style={{ marginBottom: 24 }}>
          <p
            style={{
              fontSize: 11,
              color: "#7c3aed",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            UPLOG · COMMUNITY
          </p>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              marginTop: 4,
            }}
          >
            새 글 쓰기
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "#4b5563",
              marginTop: 8,
              lineHeight: 1.5,
            }}
          >
            오늘 있었던 일, 배운 점, 거절 경험까지 대표님의 기록을 솔직하게 남겨주세요.
          </p>
        </div>

        {/* 글쓰기 가이드 */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 16,
            border: "1px solid #e5e7eb",
            padding: 20,
            marginBottom: 24,
            boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            글쓰기 가이드 ✨
          </h2>
          <ul
            style={{
              fontSize: 14,
              color: "#374151",
              lineHeight: 1.6,
              paddingLeft: 18,
              margin: 0,
            }}
          >
            <li>고객정보(연락처·실명)는 절대 금지입니다.</li>
            <li>거절 경험은 대표님의 성장 기록이 됩니다.</li>
            <li>배운 점·깨달은 점을 간단히 요약해도 좋습니다.</li>
            <li>멘탈 관리, 영업 팁 등 노하우를 자유롭게 남겨주세요.</li>
            <li>신고 기준은 커뮤니티 가이드와 동일하게 적용됩니다.</li>
          </ul>
        </div>

        {/* 글쓰기 폼 */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 16,
            border: "1px solid #e5e7eb",
            padding: 20,
            boxShadow: "0 6px 18px rgba(0,0,0,0.04)",
          }}
        >
          {/* 카테고리 */}
          <label
            style={{
              display: "block",
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            카테고리
          </label>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 16,
            }}
          >
            {CATEGORIES.map((c) => {
              const active = c === category;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 999,
                    fontSize: 13,
                    border: active ? "none" : "1px solid #d1d5db",
                    background: active
                      ? "linear-gradient(90deg,#ec4899,#a855f7)"
                      : "#ffffff",
                    color: active ? "#ffffff" : "#374151",
                    fontWeight: active ? 600 : 400,
                    cursor: "pointer",
                  }}
                >
                  {c}
                </button>
              );
            })}
          </div>

          {/* 제목 */}
          <label
            style={{
              display: "block",
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            제목
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예) '10번 연속 거절당한 날, 그 이후'"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #d1d5db",
              fontSize: 14,
              color: "#111827",
              marginBottom: 16,
              boxSizing: "border-box",
            }}
          />

          {/* 내용 */}
          <label
            style={{
              display: "block",
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            내용
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="오늘 있었던 일, 배운 점, 느낀 점 등을 자세히 적어주세요."
            rows={8}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #d1d5db",
              fontSize: 14,
              color: "#111827",
              boxSizing: "border-box",
              resize: "vertical",
            }}
          />

          {/* 사진 업로드 영역 */}
          <div
            style={{
              marginTop: 16,
              borderTop: "1px solid #e5e7eb",
              paddingTop: 16,
            }}
          >
            <label
              style={{
                display: "block",
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              사진 업로드 (선택)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={{
                fontSize: 13,
              }}
            />
            {imagePreview && (
              <div
                style={{
                  marginTop: 12,
                  borderRadius: 12,
                  overflow: "hidden",
                  border: "1px solid #e5e7eb",
                  maxWidth: 320,
                }}
              >
                <img
                  src={imagePreview}
                  alt="미리보기"
                  style={{ width: "100%", display: "block" }}
                />
              </div>
            )}
            <p
              style={{
                marginTop: 8,
                fontSize: 12,
                color: "#6b7280",
              }}
            >
              현재는 내 기기 안에서만 저장·표시되며, 서버에는 아직 저장되지 않습니다.
              (자세히 보기 화면에서만 함께 보여집니다.)
            </p>
          </div>

          {/* 버튼 */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 20,
            }}
          >
            <button
              type="button"
              onClick={() => router.push("/community")}
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                border: "1px solid #d1d5db",
                backgroundColor: "#e5e7eb",
                color: "#374151",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              style={{
                padding: "8px 18px",
                borderRadius: 999,
                border: "none",
                background: "linear-gradient(90deg, #ec4899, #a855f7)",
                color: "#ffffff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              등록하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
