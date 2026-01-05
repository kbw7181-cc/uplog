'use client';

export default function RebuttalShareModal({ id, title, content, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="w-[90%] max-w-md rounded-3xl p-6 bg-gradient-to-br from-[#1a0235] to-[#050013]
                      border border-[#ffffff20] shadow-[0_0_40px_rgba(168,85,247,0.6)] space-y-6">
        <h2 className="text-xl font-bold">공유하기</h2>

        <p className="text-sm opacity-80">어디로 공유할까요?</p>

        {/* 버튼들 */}
        <div className="space-y-3">
          <button
            className="w-full py-3 rounded-xl bg-[#291046] border border-[#ffffff30] hover:bg-[#3a155f] transition"
            onClick={() => alert('친구에게 공유하기 (추후 연동)')}
          >
            친구에게 공유하기
          </button>

          <button
            className="w-full py-3 rounded-xl bg-[#291046] border border-[#ffffff30] hover:bg-[#3a155f] transition"
            onClick={() => alert('커뮤니티로 공유하기 (추후 연동)')}
          >
            커뮤니티에 공유하기
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-[#f472b6] bg-opacity-70 hover:bg-opacity-100 transition"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
