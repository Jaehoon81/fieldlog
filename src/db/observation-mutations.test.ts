// [파일 역할] 생성·삭제 mutation 성공 callback이 TanStack Query cache를 올바르게 갱신하는지 검증합니다.
// [검증 경계] useMutation과 DB는 mock이므로 실제 row 생성/삭제가 아닌 cache 후처리 계약만 확인합니다.
import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useSQLiteContext, type SQLiteDatabase } from "expo-sqlite";

import {
  observationKeys,
  useCreateObservationMutation,
  useDeleteObservationMutation,
} from "@/src/db/observations";

// useMutation이 options를 그대로 돌려주게 해 Hook 내부의 onSuccess 함수를 test에서 직접 꺼냅니다.
jest.mock("@tanstack/react-query", () => ({
  useMutation: jest.fn((options) => options),
  useQuery: jest.fn(),
  useQueryClient: jest.fn(),
}));

jest.mock("expo-sqlite", () => ({
  useSQLiteContext: jest.fn(),
}));

// Jest mock API(.mock.calls)에 접근하도록 imported Hook을 mock 타입으로 좁힙니다.
const useMutationMock = useMutation as jest.Mock;
const useQueryClientMock =
  useQueryClient as jest.MockedFunction<typeof useQueryClient>;
const useSQLiteContextMock =
  useSQLiteContext as jest.MockedFunction<typeof useSQLiteContext>;

// 생성 test에서 필요한 options의 최소 계약만 정의합니다.
type MutationOptions = {
  onSuccess: (...args: never[]) => Promise<void>;
};

describe("observation mutation cache 처리", () => {
  // QueryClient와 SQLiteDatabase 전체 구현 대신 Hook이 실제 호출하는 method만 spy로 만듭니다.
  const invalidateQueries = jest.fn().mockResolvedValue(undefined);
  const removeQueries = jest.fn();
  const queryClient = {
    invalidateQueries,
    removeQueries,
  } as unknown as QueryClient;
  const db = {
    runAsync: jest.fn(),
  } as unknown as SQLiteDatabase;

  beforeEach(() => {
    // 호출 기록을 비우고 각 Hook이 사용할 Context 반환값을 다시 연결합니다.
    jest.clearAllMocks();
    useQueryClientMock.mockReturnValue(queryClient);
    useSQLiteContextMock.mockReturnValue(db);
  });

  it("생성 성공 후 observations query를 invalidate한다", async () => {
    // Hook 호출이 useMutation(options)을 실행하도록 한 뒤 첫 호출의 options를 꺼냅니다.
    useCreateObservationMutation();
    const options = useMutationMock.mock.calls[0][0] as MutationOptions;

    // 실제 INSERT 성공 뒤 React Query가 호출한다고 가정하고 callback을 직접 실행합니다.
    await options.onSuccess();

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: observationKeys.all,
    });
  });

  it("삭제 성공 후 상세 query를 먼저 제거하고 observations query를 invalidate한다", async () => {
    useDeleteObservationMutation();
    // 삭제 callback은 사용하지 않는 성공값과 삭제했던 id 두 인자를 받습니다.
    const options = useMutationMock.mock.calls[0][0] as {
      onSuccess: (_data: void, id: number) => Promise<void>;
    };

    await options.onSuccess(undefined, 9);

    // 삭제된 활성 상세가 refetch되지 않도록 해당 cache를 먼저 정확히 제거해야 합니다.
    expect(removeQueries).toHaveBeenCalledWith({
      queryKey: observationKeys.detail(9),
      exact: true,
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: observationKeys.all,
    });
    expect(removeQueries.mock.invocationCallOrder[0]).toBeLessThan(
      invalidateQueries.mock.invocationCallOrder[0],
    );
  });
});
