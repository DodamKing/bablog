import { useEffect, useRef } from "react";

// 안드로이드 뒤로가기로 하위 화면(보정/검색/수정 등)을 "닫기"로 처리.
// 열릴 때 history에 트랩 한 칸을 넣고, 뒤로가기(popstate)를 가로채 닫기 콜백을 호출한다.
// → 입력 중인 내용이 페이지 이탈로 날아가는 걸 막고, 뒤로가기가 네이티브 "닫기"처럼 동작.
export function useBackTrap(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  // 이미 트랩을 걸어둔 상태인지. React StrictMode(개발 모드 기본 활성)가 마운트 시
  // effect를 mount→cleanup→mount로 두 번 실행하는데, 그 가짜 cleanup이 호출한
  // history.back()이 비동기로 늦게 도착해 "진짜" 두 번째 mount의 리스너를 잘못
  // 건드리는 걸 막기 위한 가드.
  const trappedRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    if (trappedRef.current) return;
    trappedRef.current = true;
    window.history.pushState({ bablogSub: true }, "");

    const onPop = () => {
      // popstate 직후에도 여전히 트랩 state라면(StrictMode 잔여 back() 등으로
      // 생긴 가짜 이벤트) 아직 트랩을 빠져나간 게 아니므로 무시한다.
      const st = window.history.state as { bablogSub?: boolean } | null;
      if (st?.bablogSub) return;
      trappedRef.current = false;
      closeRef.current();
    };
    window.addEventListener("popstate", onPop);

    return () => {
      window.removeEventListener("popstate", onPop);
      // UI로 닫은 경우(취소/저장)엔 우리가 넣은 트랩 칸을 직접 회수.
      if (trappedRef.current) {
        trappedRef.current = false;
        const st = window.history.state as { bablogSub?: boolean } | null;
        if (st?.bablogSub) window.history.back();
      }
    };
  }, [open]);
}
