import { twMerge } from "tailwind-merge";

type ClassName = string | false | null | undefined;

export function cn(...classNames: ClassName[]) {
  return twMerge(classNames.filter(Boolean).join(" "));
}
