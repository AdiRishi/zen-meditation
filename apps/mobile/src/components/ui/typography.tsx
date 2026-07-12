import { Text, type TextProps, type TextStyle } from "react-native";
import { type VariantProps, tv } from "tailwind-variants";

const typographyVariants = tv({
  base: "font-sans text-foreground",
  variants: {
    variant: {
      display: "font-serif text-5xl leading-[52px] font-normal",
      h1: "font-serif text-4xl leading-[42px] font-normal",
      h2: "font-serif text-[28px] leading-[34px] font-normal",
      h3: "text-xl leading-[26px] font-medium",
      h4: "text-lg leading-6 font-medium",
      body: "text-base leading-6",
      bodyBold: "text-base leading-6 font-medium",
      small: "text-sm leading-5",
      smallBold: "text-sm leading-5 font-medium",
      label: "text-xs leading-4 font-medium tracking-wide",
      caption: "text-[11px] leading-[15px]",
      code: "font-mono text-sm leading-5",
      link: "text-base leading-6 underline",
    },
    tone: {
      default: "",
      muted: "text-muted",
      link: "text-link",
      accent: "text-accent",
      success: "text-success",
      warning: "text-warning",
      danger: "text-danger",
    },
    align: {
      left: "text-left",
      center: "text-center",
      right: "text-right",
    },
    truncate: {
      true: "truncate",
      false: "",
    },
  },
  compoundVariants: [
    {
      variant: "caption",
      tone: "default",
      class: "text-muted",
    },
    {
      variant: "link",
      tone: "default",
      class: "text-link",
    },
  ],
  defaultVariants: {
    variant: "body",
    tone: "default",
    align: "left",
    truncate: false,
  },
});

const TABULAR_NUMS_STYLE: TextStyle = { fontVariant: ["tabular-nums"] };

export type TypographyProps = TextProps &
  VariantProps<typeof typographyVariants> & {
    tabularNums?: boolean;
  };

export function Typography({
  className,
  variant,
  tone,
  align,
  truncate,
  tabularNums = false,
  style,
  ...props
}: TypographyProps) {
  return (
    <Text
      className={typographyVariants({ variant, tone, align, truncate, class: className })}
      style={tabularNums ? [TABULAR_NUMS_STYLE, style] : style}
      {...props}
    />
  );
}
