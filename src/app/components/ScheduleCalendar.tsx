'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

type ScheduleRow = {
    id: string;
    user_id: string;
    schedule_date: string; // YYYY-MM-DD
    schedule_type: string;
    content: string;
    status: string | null;
    created_at: string;
};

function getScheduleColor(type: string) {
    const t = (type || '').toLowerCase();

    // 지각/조퇴/결근/고객상담/해피콜/방문예약/교육/미팅/연장/마감/기타
    if (t.includes('지각')) return 'bg-amber-300';
    if (t.includes('조퇴')) return 'bg-orange-400';
    if (t.includes('결근')) return 'bg-red-500';
    if (t.includes('상담') || t.includes('고객')) return 'bg-emerald-400';
    if (t.includes('해피')) return 'bg-sky-400';
    if (t.includes('방문') || t.includes('예약')) return 'bg-yellow-300';
    if (t.includes('교육')) return 'bg-indigo-400';
    if (t.includes('미팅') || t.includes('회의')) return 'bg-pink-400';
    if (t.includes('연장')) return 'bg-violet-400';
    if (t.includes('마감') || t.includes('중요')) return 'bg-rose-500';
    if (t.includes('기타')) return 'bg-slate-400';

    return 'bg-purple-400';
}

function formatDateLabel(iso: string) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${mm}-${dd}`;
}

type Props = {
    userId: string | null;
};

export default function ScheduleCalendar({ userId }: Props) {
    const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [scheduleType, setScheduleType] = useState<string>('고객상담');
    const [scheduleContent, setScheduleContent] = useState<string>('');
    const [scheduleSaving, setScheduleSaving] = useState(false);
    const [scheduleLoading, setScheduleLoading] = useState(false);
    const [allSchedules, setAllSchedules] = useState<ScheduleRow[]>([]);

    // 초기 날짜 설정
    useEffect(() => {
        const today = new Date();
        const tStr = today.toISOString().slice(0, 10);
        setSelectedDate(tStr);
    }, []);

    // 스케줄 로딩
    useEffect(() => {
        if (!userId) return;

        async function loadSchedules() {
            setScheduleLoading(true);
            try {
                const y = calendarMonth.getFullYear();
                const m = calendarMonth.getMonth();
                const start = new Date(y, m, 1).toISOString().slice(0, 10);
                const end = new Date(y, m + 1, 0).toISOString().slice(0, 10);

                const { data, error } = await supabase
                    .from('schedule_events')
                    .select('*')
                    .eq('user_id', userId)
                    .gte('schedule_date', start)
                    .lte('schedule_date', end)
                    .order('schedule_date', { ascending: true })
                    .order('created_at', { ascending: true });

                if (error) throw error;
                setAllSchedules((data || []) as ScheduleRow[]);
            } catch (e) {
                console.error(e);
            } finally {
                setScheduleLoading(false);
            }
        }

        loadSchedules();
    }, [userId, calendarMonth]);

    const calendarDays = useMemo(() => {
        const y = calendarMonth.getFullYear();
        const m = calendarMonth.getMonth();

        const first = new Date(y, m, 1);
        const firstWeekday = first.getDay();
        const daysInMonth = new Date(y, m + 1, 0).getDate();

        const cells: { dateStr: string | null; dayNumber: number | null }[] = [];
        for (let i = 0; i < firstWeekday; i++) {
            cells.push({ dateStr: null, dayNumber: null });
        }
        for (let d = 1; d <= daysInMonth; d++) {
            const iso = new Date(y, m, d).toISOString().slice(0, 10);
            cells.push({ dateStr: iso, dayNumber: d });
        }
        while (cells.length < 42) {
            cells.push({ dateStr: null, dayNumber: null });
        }
        return cells;
    }, [calendarMonth]);

    const calendarWeeks = useMemo(() => {
        const weeks: { dateStr: string | null; dayNumber: number | null }[][] = [];
        for (let i = 0; i < calendarDays.length; i += 7) {
            weeks.push(calendarDays.slice(i, i + 7));
        }
        return weeks;
    }, [calendarDays]);

    const scheduleMap = useMemo(() => {
        const map: Record<string, ScheduleRow[]> = {};
        for (const s of allSchedules) {
            const key = (s.schedule_date || '').slice(0, 10);
            if (!key) continue;
            if (!map[key]) map[key] = [];
            map[key].push(s);
        }
        return map;
    }, [allSchedules]);

    const selectedDateSchedules = selectedDate
        ? scheduleMap[selectedDate] || []
        : [];

    async function handleSaveSchedule() {
        if (!userId) {
            alert('로그인이 필요합니다.');
            return;
        }
        if (!selectedDate) {
            alert('날짜를 먼저 선택해 주세요.');
            return;
        }
        if (!scheduleContent.trim()) {
            alert('스케줄 내용을 입력해 주세요.');
            return;
        }

        setScheduleSaving(true);
        try {
            const { error } = await supabase.from('schedule_events').insert({
                user_id: userId,
                schedule_date: selectedDate,
                schedule_type: scheduleType,
                content: scheduleContent.trim(),
                status: 'scheduled',
            });
            if (error) throw error;

            setScheduleContent('');

            const y = calendarMonth.getFullYear();
            const m = calendarMonth.getMonth();
            const start = new Date(y, m, 1).toISOString().slice(0, 10);
            const end = new Date(y, m + 1, 0).toISOString().slice(0, 10);

            const { data } = await supabase
                .from('schedule_events')
                .select('*')
                .eq('user_id', userId)
                .gte('schedule_date', start)
                .lte('schedule_date', end)
                .order('schedule_date', { ascending: true })
                .order('created_at', { ascending: true });

            setAllSchedules((data || []) as ScheduleRow[]);
        } catch (e: unknown) {
            console.error(e);
            let msg = '오류가 발생했습니다.';
            if (e instanceof Error) msg = e.message;
            alert('스케줄 저장 중 오류가 발생했습니다.\n' + msg);
        } finally {
            setScheduleSaving(false);
        }
    }

    function moveMonth(offset: number) {
        setCalendarMonth((prev) => {
            const y = prev.getFullYear();
            const m = prev.getMonth();
            return new Date(y, m + offset, 1);
        });
    }

    const monthLabel = (() => {
        const y = calendarMonth.getFullYear();
        const m = calendarMonth.getMonth() + 1;
        return `${y}년 ${m}월`;
    })();

    const todayDateStr = new Date().toISOString().slice(0, 10);

    return (
        <section className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6 items-start">
            {/* CALENDAR */}
            <div className="rounded-3xl bg-white/5 border border-white/10 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.6)] backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base md:text-lg font-bold text-slate-100">
                        📅 이번 달 스케줄
                    </h2>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => moveMonth(-1)}
                            className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 transition"
                        >
                            ◀
                        </button>
                        <span className="text-sm md:text-base font-bold text-white">
                            {monthLabel}
                        </span>
                        <button
                            type="button"
                            onClick={() => moveMonth(1)}
                            className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 transition"
                        >
                            ▶
                        </button>
                    </div>
                </div>

                {/* TABLE CALENDAR */}
                <table className="w-full text-center border-separate border-spacing-1">
                    <thead>
                        <tr>
                            {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                                <th
                                    key={d}
                                    className={
                                        'py-2 text-xs md:text-sm font-medium ' +
                                        (i === 0
                                            ? 'text-rose-400'
                                            : i === 6
                                                ? 'text-indigo-400'
                                                : 'text-slate-400')
                                    }
                                >
                                    {d}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {calendarWeeks.map((week, rowIdx) => (
                            <tr key={rowIdx}>
                                {week.map(({ dateStr, dayNumber }, colIdx) => {
                                    if (!dateStr || !dayNumber) {
                                        return <td key={colIdx} />;
                                    }

                                    const daySchedules = scheduleMap[dateStr] || [];
                                    const hasSchedules = daySchedules.length > 0;
                                    const isSelected = selectedDate === dateStr;
                                    const isToday = todayDateStr === dateStr;

                                    return (
                                        <td key={colIdx}>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedDate(dateStr)}
                                                className={`relative w-full h-[50px] md:h-[56px] rounded-xl border transition-all duration-200 flex flex-col items-center justify-start pt-1.5 gap-0.5
                              ${isSelected
                                                        ? 'bg-gradient-to-br from-pink-500/20 to-purple-500/20 border-pink-400 ring-1 ring-pink-400/50 z-10'
                                                        : hasSchedules
                                                            ? 'bg-white/5 border-white/10 hover:bg-white/10'
                                                            : 'bg-transparent border-transparent hover:bg-white/5'
                                                    }`}
                                            >
                                                <span
                                                    className={
                                                        'text-sm md:text-base ' +
                                                        (isToday
                                                            ? 'font-extrabold text-pink-400'
                                                            : isSelected
                                                                ? 'font-bold text-white'
                                                                : 'font-medium text-slate-300')
                                                    }
                                                >
                                                    {dayNumber}
                                                </span>

                                                <div className="flex flex-wrap justify-center gap-0.5 px-1 w-full">
                                                    {daySchedules.slice(0, 4).map((s) => (
                                                        <span
                                                            key={s.id}
                                                            className={`w-1.5 h-1.5 rounded-full ${getScheduleColor(
                                                                s.schedule_type,
                                                            )}`}
                                                        />
                                                    ))}
                                                    {daySchedules.length > 4 && (
                                                        <span className="text-[8px] text-slate-500 leading-none">
                                                            +
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Legend */}
                <div className="mt-4 flex flex-wrap gap-x-3 gap-y-2 justify-center text-[10px] text-slate-400 bg-black/20 rounded-xl p-2">
                    {[
                        { label: '지각', color: 'bg-amber-300' },
                        { label: '조퇴', color: 'bg-orange-400' },
                        { label: '결근', color: 'bg-red-500' },
                        { label: '고객상담', color: 'bg-emerald-400' },
                        { label: '해피콜', color: 'bg-sky-400' },
                        { label: '방문예약', color: 'bg-yellow-300' },
                        { label: '교육', color: 'bg-indigo-400' },
                        { label: '미팅', color: 'bg-pink-400' },
                        { label: '연장', color: 'bg-violet-400' },
                        { label: '마감', color: 'bg-rose-500' },
                        { label: '기타', color: 'bg-slate-400' },
                    ].map((item) => (
                        <span key={item.label} className="flex items-center gap-1">
                            <span className={`w-2 h-2 rounded-full ${item.color}`} />
                            {item.label}
                        </span>
                    ))}
                </div>
            </div>

            {/* SCHEDULE INPUT & LIST */}
            <div className="flex flex-col gap-4">
                {/* Selected Date Info */}
                <div className="rounded-3xl bg-gradient-to-br from-[#1a1033] to-[#0d061f] border border-white/10 p-5 shadow-lg">
                    <div className="text-xs font-medium text-slate-400 mb-1">
                        선택한 날짜
                    </div>
                    <div className="flex items-end justify-between">
                        <div className="text-xl md:text-2xl font-bold text-white">
                            {selectedDate ? formatDateLabel(selectedDate) : '날짜 미선택'}
                        </div>
                        <div className="text-xs text-pink-300 font-medium">
                            {selectedDateSchedules.length}개의 일정
                        </div>
                    </div>

                    <div className="mt-4 space-y-3">
                        <div>
                            <label className="text-[11px] text-slate-400 mb-1 block">
                                일정 종류
                            </label>
                            <select
                                className="w-full rounded-xl bg-black/30 border border-white/10 text-sm text-slate-200 px-3 py-2.5 focus:border-pink-500/50 focus:outline-none transition"
                                value={scheduleType}
                                onChange={(e) => setScheduleType(e.target.value)}
                            >
                                <option value="고객상담">고객상담</option>
                                <option value="해피콜">해피콜</option>
                                <option value="방문예약">방문예약</option>
                                <option value="교육">교육</option>
                                <option value="미팅">미팅</option>
                                <option value="연장">연장</option>
                                <option value="마감">마감</option>
                                <option value="지각">지각</option>
                                <option value="조퇴">조퇴</option>
                                <option value="결근">결근</option>
                                <option value="기타">기타</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[11px] text-slate-400 mb-1 block">
                                내용 입력
                            </label>
                            <div className="flex gap-2">
                                <input
                                    className="flex-1 rounded-xl bg-black/30 border border-white/10 text-sm text-slate-200 px-3 py-2.5 focus:border-pink-500/50 focus:outline-none transition placeholder:text-slate-600"
                                    value={scheduleContent}
                                    onChange={(e) => setScheduleContent(e.target.value)}
                                    placeholder="일정 내용을 입력하세요"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveSchedule();
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={handleSaveSchedule}
                                    disabled={scheduleSaving || !selectedDate}
                                    className="px-4 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-sm font-bold shadow-lg shadow-pink-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                >
                                    저장
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Schedule List */}
                <div className="flex-1 rounded-3xl bg-white/5 border border-white/10 p-5 min-h-[200px]">
                    <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
                        <span>📝 일정 목록</span>
                        {scheduleLoading && (
                            <span className="text-[10px] font-normal text-slate-500">
                                로딩 중...
                            </span>
                        )}
                    </h3>

                    {selectedDateSchedules.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs py-8">
                            <div className="text-2xl mb-2">📭</div>
                            등록된 일정이 없습니다.
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                            {selectedDateSchedules.map((s) => (
                                <div
                                    key={s.id}
                                    className="group relative rounded-xl bg-black/20 border border-white/5 hover:border-white/10 p-3 transition hover:bg-black/30"
                                >
                                    <div className="flex items-start gap-3">
                                        <div
                                            className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${getScheduleColor(
                                                s.schedule_type,
                                            )} shadow-[0_0_8px_currentColor]`}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <span className="text-xs font-semibold text-slate-300 group-hover:text-pink-200 transition">
                                                    {s.schedule_type}
                                                </span>
                                                {s.status && (
                                                    <span className="text-[10px] text-emerald-500/80 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                                        {s.status === 'scheduled' ? '완료' : s.status}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-100 break-words leading-snug">
                                                {s.content}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
