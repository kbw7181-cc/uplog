// ✅ src/app/community/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ClientShell from '../../components/ClientShell';
import { supabase } from '@/lib/supabaseClient';

export default function CommunityDetailPage() {
  const { id } = useParams();
  const [post, setPost] = useState<any>(null);

  useEffect(() => {
    supabase
      .from('community_posts')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => setPost(data));
  }, [id]);

  if (!post) return <ClientShell>불러오는 중…</ClientShell>;

  return (
    <ClientShell>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 1000 }}>{post.title}</h1>
        <div style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>
          {post.content}
        </div>
      </div>
    </ClientShell>
  );
}
