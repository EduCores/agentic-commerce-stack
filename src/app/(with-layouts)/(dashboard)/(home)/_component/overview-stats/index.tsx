"use client";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/tailgrids/core/card";
import { getHomeOverviewStats } from "@/services/api/home";
import { cn } from "@/utils/cn";
import { ArrowDownIcon, ArrowUpIcon } from "@/utils/icon";
import { useQuery } from "@tanstack/react-query";
import OverviewStatsSkeleton from "./skeleton";
import { mapOverviewStats } from "./utils";

export default function ECommerceOverviewStats() {
  // Gating por `data` (no `isLoading`) para evitar hydration mismatch:
  // en SSR react-query no fetcha (isLoading=false) pero en el cliente sí.
  const { data } = useQuery({
    queryKey: ["home-overview-stats"],
    queryFn: getHomeOverviewStats,
  });

  if (!data) {
    return <OverviewStatsSkeleton />;
  }

  const overviewStats = mapOverviewStats(data);

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
      {overviewStats.map((item) => (
        <Card key={item.id}>
          {/* Icon */}
          <CardHeader>
            <div
              className={cn(
                "flex size-8 items-center justify-center rounded-lg",
                item.iconBgClass,
                item.iconColorClass,
              )}
            >
              {item.icon}
            </div>
          </CardHeader>

          {/* Value */}
          <CardContent className="mt-6 p-0">
            <div className="mb-1.25 text-xl leading-7 font-semibold text-text-primary md:text-2xl md:leading-8">
              {item.value}
            </div>
          </CardContent>

          {/* Label and Percentage */}
          <CardFooter className="flex items-center justify-between p-0">
            <span className="text-sm leading-5 font-medium text-text-tertiary">{item.title}</span>
            <div
              className={cn(
                "flex items-center gap-1 text-sm leading-5 font-medium",
                item.isPositive ? "text-green-600" : "text-red-600",
              )}
            >
              {item.change}
              {item.isPositive ? <ArrowUpIcon /> : <ArrowDownIcon />}
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
