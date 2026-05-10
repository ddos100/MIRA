import { useQuery } from "@tanstack/react-query";
import { conductorApi } from "@/api/conductor";

export interface ConductorStatusResult {
  enabled: boolean;
  ollamaHealthy: boolean;
  isLoading: boolean;
}

export function useConductorStatus(): ConductorStatusResult {
  const { data, isLoading } = useQuery({
    queryKey: ["conductor-status"],
    queryFn: () => conductorApi.getStatus().then((r) => r.data),
    refetchInterval: 30_000,
    retry: 1,
    throwOnError: false,
  });

  return {
    enabled: data?.enabled ?? false,
    ollamaHealthy: data?.ollama_healthy ?? false,
    isLoading,
  };
}
