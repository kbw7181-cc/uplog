// src/lib/intercept-console-error.ts
// ✅ 콘솔 에러 가로채기 "안전버전" (재귀 방지)
let installed = false;

export function installConsoleErrorIntercept() {
  if (installed) return;
  installed = true;

  const original = console.error.bind(console);

  console.error = (...args: any[]) => {
    try {
      // ✅ 여기서 console.error 다시 부르면 재귀. 원본만 호출!
      original(...args);
    } catch {
      // 아무것도 하지 않음 (여기서도 console.error 금지)
    }
  };
}
