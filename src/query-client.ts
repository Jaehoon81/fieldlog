/**
 * [파일 역할]
 * 앱 전체 TanStack Query cache와 기본 retry/refetch 정책을 한 곳에서 만든다.
 * `app/_layout.tsx`의 `QueryClientProvider`가 아래 singleton을 모든 query와
 * mutation hook에 제공한다.
 */

import { QueryClient } from "@tanstack/react-query";

// Factory를 export해 필요하면 test가 독립된 빈 cache를 만들 수 있게 한다.
export function createQueryClient(): QueryClient {
  // [문법] `new`는 QueryClient class instance를 생성한다.
  return new QueryClient({
    defaultOptions: {
      queries: {
        // React Native용 online/focus manager를 별도 구성하지 않은 현재 범위에 맞춘다.
        refetchOnReconnect: false,
        refetchOnWindowFocus: false,
        // 개별 weather query만 자기 retry callback을 명시하고 기본은 재시도하지 않는다.
        retry: false,
      },
      mutations: {
        // SQLite write를 자동 재시도하면 같은 기록을 중복 저장할 수 있어 끈다.
        retry: false,
      },
    },
  });
}

// [FLOW-01 / 관련 코드] module당 한 번 만들어 같은 runtime cache를 계속 공유한다.
export const queryClient = createQueryClient();
