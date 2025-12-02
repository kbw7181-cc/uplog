'use client';

type WeatherSlot = {
    time: string;
    temp: number;
    desc: string;
    icon: string;
};

const weatherNow = 18;
const weatherSlots: WeatherSlot[] = [
    { time: '08시', temp: 16, desc: '맑음', icon: '☀️' },
    { time: '12시', temp: 20, desc: '구름', icon: '⛅' },
    { time: '15시', temp: 22, desc: '맑음', icon: '☀️' },
    { time: '18시', temp: 19, desc: '부분 흐림', icon: '🌤️' },
];

export default function WeatherCard() {
    return (
        <div className="rounded-3xl bg-white/5 border border-white/10 p-4 md:p-5 shadow-[0_18px_55px_rgba(0,0,0,0.6)]">
            <h2 className="text-sm md:text-base font-semibold">오늘의 날씨</h2>
            <p className="text-[11px] md:text-xs text-slate-300 mt-1">
                영업 나가기 전, 바깥 공기도 한 번 체크해 볼까요?
            </p>
            <div className="flex items-end justify-between mt-3 mb-2">
                <div>
                    <div className="text-3xl md:text-4xl font-semibold text-pink-200">
                        {weatherNow}°C
                    </div>
                    <div className="text-[12px] text-slate-300 mt-1">
                        체감상 선선한 하루
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-3">
                {weatherSlots.map((slot) => (
                    <div
                        key={slot.time}
                        className="rounded-2xl bg-white/5 border border-white/10 px-2 py-2 flex flex-col items-center gap-1 text-[11px]"
                    >
                        <div>{slot.icon}</div>
                        <div className="font-medium text-slate-100">{slot.time}</div>
                        <div className="text-pink-200">{slot.temp}°</div>
                        <div className="text-[10px] text-slate-300">{slot.desc}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
