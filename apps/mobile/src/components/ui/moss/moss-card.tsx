import { Card } from "heroui-native";

import { cn } from "@/lib/cn";

export function MossCard({ className, ...props }: React.ComponentProps<typeof Card>) {
  return (
    <Card className={cn("overflow-hidden rounded-[20px] border border-border bg-surface p-0", className)} {...props} />
  );
}
