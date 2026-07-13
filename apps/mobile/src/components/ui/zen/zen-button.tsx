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
      className={`min-h-14 w-full rounded-md py-3 ${className ?? ""}`}
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
      className={`min-h-14 w-full rounded-md border-border py-3 ${className ?? ""}`}
      accessibilityRole="button"
      {...props}
    >
      <Button.Label className="font-sans text-base font-medium">{children}</Button.Label>
    </Button>
  );
}
