'use client';

export type DailyTask = {
    id: string;
    content: string;
    done: boolean;
    task_date: string;
};

type Props = {
    tasks: DailyTask[];
    onToggle: (id: string, current: boolean) => void;
};

export default function TodayTasks({ tasks, onToggle }: Props) {
    return (
        <section className="rounded-3xl bg-white/4 border border-white/8 p-4 md:p-5 space-y-2 shadow-[0_18px_50px_rgba(0,0,0,0.55)]">
            <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm md:text-base font-semibold">
                    오늘의 할 일 / 이번 달 체크
                </h2>
                <span className="text-[11px] text-slate-400">
                    상세 편집은 <b className="text-pink-200">「나의 UP 관리」 페이지</b>
                    에서 합니다.
                </span>
            </div>
            {tasks.length === 0 ? (
                <>
                    <p className="text-[11px] text-slate-400 mt-1">
                        아직 오늘 날짜에 등록된 할 일이 없습니다. 나의 UP 관리에서 “매일
                        지키고 싶은 체크항목”과 오늘의 할 일을 입력하면 이곳에서 체크할 수
                        있어요.
                    </p>
                    <ul className="list-disc list-inside text-[12px] text-slate-200 mt-1 space-y-1">
                        <li>신규 상담 10명 만들기</li>
                        <li>반론 기록 1개씩 남기기</li>
                        <li>오늘 고객 10명에게 안부 연락하기</li>
                        <li>긍정마인드로 밝고 씩씩하게 임하기</li>
                    </ul>
                </>
            ) : (
                <ul className="mt-2 grid gap-1.5 md:grid-cols-2 text-[12px]">
                    {tasks.map((task) => (
                        <li
                            key={task.id}
                            className="flex items-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-3 py-2"
                        >
                            <input
                                type="checkbox"
                                checked={task.done}
                                onChange={() => onToggle(task.id, task.done)}
                                className="h-4 w-4 accent-pink-500"
                            />
                            <span
                                className={
                                    task.done
                                        ? 'line-through opacity-60'
                                        : 'opacity-100 text-slate-50'
                                }
                            >
                                {task.content}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
