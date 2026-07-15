import { Button, type ButtonRootProps } from "heroui-native";

import { cn } from "@/lib/cn";

type ScaleHighlightButtonProps = Extract<ButtonRootProps, { feedbackVariant?: "scale-highlight" }>;

type ZenButtonProps = Omit<ScaleHighlightButtonProps, "children" | "feedbackVariant"> & {
  children: string;
};

export function ZenPrimaryButton({ children, className, ...props }: ZenButtonProps) {
  return (
    <Button
      variant="primary"
      feedbackVariant="scale-highlight"
      size="lg"
      className={cn("min-h-14 w-full rounded-full py-3", className)}
      accessibilityRole="button"
      {...props}
    >
      <Button.Label className="font-sans text-base font-medium">{children}</Button.Label>
    </Button>
  );
}

export function ZenSecondaryButton({ children, className, ...props }: ZenButtonProps) {
  return (
    <Button
      variant="outline"
      feedbackVariant="scale-highlight"
      size="lg"
      className={cn("min-h-14 w-full rounded-full border-border py-3", className)}
      accessibilityRole="button"
      {...props}
    >
      <Button.Label className="font-sans text-base font-medium">{children}</Button.Label>
    </Button>
  );
}

export function ZenDangerButton({ children, className, ...props }: ZenButtonProps) {
  return (
    <Button
      variant="danger-soft"
      feedbackVariant="scale-highlight"
      size="lg"
      className={cn("min-h-14 w-full rounded-full py-3", className)}
      accessibilityRole="button"
      {...props}
    >
      <Button.Label className="font-sans text-base font-medium">{children}</Button.Label>
    </Button>
  );
}
