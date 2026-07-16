import { Button, type ButtonRootProps } from "heroui-native";

import { cn } from "@/lib/cn";
import { buttonPressAnimation, reducedButtonPressAnimation } from "@/lib/motion";
import { useReducedMotionPreference } from "@/providers/meditation-provider";

type ScaleHighlightButtonProps = Extract<ButtonRootProps, { feedbackVariant?: "scale-highlight" }>;

type MossButtonProps = Omit<ScaleHighlightButtonProps, "children" | "feedbackVariant"> & {
  children: string;
};

export function MossPrimaryButton({ children, className, ...props }: MossButtonProps) {
  const reducedMotion = useReducedMotionPreference();
  return (
    <Button
      variant="primary"
      feedbackVariant="scale-highlight"
      animation={reducedMotion ? reducedButtonPressAnimation : buttonPressAnimation}
      size="lg"
      className={cn("min-h-14 w-full rounded-full py-3", className)}
      accessibilityRole="button"
      {...props}
    >
      <Button.Label className="font-sans text-base font-medium">{children}</Button.Label>
    </Button>
  );
}

export function MossSecondaryButton({ children, className, ...props }: MossButtonProps) {
  const reducedMotion = useReducedMotionPreference();
  return (
    <Button
      variant="outline"
      feedbackVariant="scale-highlight"
      animation={reducedMotion ? reducedButtonPressAnimation : buttonPressAnimation}
      size="lg"
      className={cn("min-h-14 w-full rounded-full border-border py-3", className)}
      accessibilityRole="button"
      {...props}
    >
      <Button.Label className="font-sans text-base font-medium">{children}</Button.Label>
    </Button>
  );
}

export function MossDangerButton({ children, className, ...props }: MossButtonProps) {
  const reducedMotion = useReducedMotionPreference();
  return (
    <Button
      variant="danger-soft"
      feedbackVariant="scale-highlight"
      animation={reducedMotion ? reducedButtonPressAnimation : buttonPressAnimation}
      size="lg"
      className={cn("min-h-14 w-full rounded-full py-3", className)}
      accessibilityRole="button"
      {...props}
    >
      <Button.Label className="font-sans text-base font-medium">{children}</Button.Label>
    </Button>
  );
}
