import { Button, type ButtonRootProps } from "heroui-native";

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
      className={`min-h-14 w-full rounded-xl py-3 ${className ?? ""}`}
      accessibilityRole="button"
      {...props}
    >
      <Button.Label className="font-sans-medium text-base">{children}</Button.Label>
    </Button>
  );
}

export function ZenSecondaryButton({ children, className, ...props }: ZenButtonProps) {
  return (
    <Button
      variant="outline"
      feedbackVariant="scale-highlight"
      size="lg"
      className={`min-h-14 w-full rounded-xl border-border py-3 ${className ?? ""}`}
      accessibilityRole="button"
      {...props}
    >
      <Button.Label className="font-sans-medium text-base">{children}</Button.Label>
    </Button>
  );
}
