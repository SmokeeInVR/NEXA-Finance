import { useQuery } from "@tanstack/react-query";
import type { WeeklySnapshot } from "@shared/schema";

export function useWeeklySnapshots() {
  return useQuery<WeeklySnapshot[]>({
    queryKey: ["weekly-snapshots"],
    queryFn: async () => {
      const res = await fetch("/api/weekly-snapshots", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch weekly snapshots");
      return res.json();
    },
  });
}
