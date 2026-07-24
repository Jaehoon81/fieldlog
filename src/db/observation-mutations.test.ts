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

jest.mock("@tanstack/react-query", () => ({
  useMutation: jest.fn((options) => options),
  useQuery: jest.fn(),
  useQueryClient: jest.fn(),
}));

jest.mock("expo-sqlite", () => ({
  useSQLiteContext: jest.fn(),
}));

const useMutationMock = useMutation as jest.Mock;
const useQueryClientMock =
  useQueryClient as jest.MockedFunction<typeof useQueryClient>;
const useSQLiteContextMock =
  useSQLiteContext as jest.MockedFunction<typeof useSQLiteContext>;

type MutationOptions = {
  onSuccess: (...args: never[]) => Promise<void>;
};

describe("observation mutation cache 처리", () => {
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
    jest.clearAllMocks();
    useQueryClientMock.mockReturnValue(queryClient);
    useSQLiteContextMock.mockReturnValue(db);
  });

  it("생성 성공 후 observations query를 invalidate한다", async () => {
    useCreateObservationMutation();
    const options = useMutationMock.mock.calls[0][0] as MutationOptions;

    await options.onSuccess();

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: observationKeys.all,
    });
  });

  it("삭제 성공 후 목록을 invalidate하고 상세 query를 제거한다", async () => {
    useDeleteObservationMutation();
    const options = useMutationMock.mock.calls[0][0] as {
      onSuccess: (_data: void, id: number) => Promise<void>;
    };

    await options.onSuccess(undefined, 9);

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: observationKeys.all,
    });
    expect(removeQueries).toHaveBeenCalledWith({
      queryKey: observationKeys.detail(9),
      exact: true,
    });
  });
});
