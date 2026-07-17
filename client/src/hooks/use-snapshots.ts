import { useQuery } from "@tanstack/react-query";
import type { WeeklySnapshot } from "@shared/schema";

export function useWeeklySnapshots() {
  return useQuery<WeeklySnapshot[]>({
    queryKey: ["weekly-snapshots"],
    queryFn: async () => {
      const res = await fetch("/api/weekly-snapshots", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch weekly snapshots");

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Weekly snapshots endpoint returned unexpected content");
      }

      return res.json();
    },
  });
}
