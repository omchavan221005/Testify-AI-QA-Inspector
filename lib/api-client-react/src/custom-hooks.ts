import { useMutation, useQuery } from "@tanstack/react-query";
import type { UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult, QueryKey } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import type { ErrorType } from "./custom-fetch";

export interface ScanHistory {
  scans: Array<{
    jobId: string;
    targetUrl: string;
    scannedAt: string;
    totalBugs: number;
    healthScore: number;
    pagesScanned?: number;
  }>;
}

export const getScansHistory = async (options?: RequestInit): Promise<ScanHistory> => {
  return customFetch<ScanHistory>(`/api/scans/history`, {
    ...options,
    method: "GET",
  });
};

export function useGetScansHistory<TData = Awaited<ReturnType<typeof getScansHistory>>, TError = ErrorType<unknown>>(options?: {
  query?: UseQueryOptions<Awaited<ReturnType<typeof getScansHistory>>, TError, TData>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const { query: queryOptions } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? ["/api/scans/history"];
  const queryFn = ({ signal }: { signal?: AbortSignal }) => getScansHistory({ signal });

  const query = useQuery({
    queryKey,
    queryFn,
    ...queryOptions,
  }) as UseQueryResult<TData, TError> & { queryKey: QueryKey };

  return { ...query, queryKey };
}

export const cancelScan = async (jobId: string): Promise<{ jobId: string; status: string }> => {
  return customFetch<{ jobId: string; status: string }>(`/api/scan/${jobId}`, {
    method: "DELETE",
  });
};

export function useCancelScan<TError = ErrorType<unknown>, TContext = unknown>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof cancelScan>>,
    TError,
    { jobId: string },
    TContext
  >;
}): UseMutationResult<Awaited<ReturnType<typeof cancelScan>>, TError, { jobId: string }, TContext> {
  const { mutation: mutationOptions } = options ?? {};

  const mutationFn = ({ jobId }: { jobId: string }) => cancelScan(jobId);

  return useMutation({
    mutationFn,
    ...mutationOptions,
  });
}
