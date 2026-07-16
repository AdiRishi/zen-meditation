import type { ReactNode } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";

import { MossPrimaryButton } from "@/components/ui/moss/moss-button";
import { ScreenHeader } from "@/components/ui/moss/screen-header";
import { StandardScrollView } from "@/components/ui/screen-containers/standard-scroll-view";
import { StickyFooterScrollView } from "@/components/ui/screen-containers/sticky-footer-scroll-view";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/cn";
import { crossfadeIn, crossfadeOut, glide } from "@/lib/motion";
import { useMeditation } from "@/providers/meditation-provider";

type SettingsScreenLayoutProps = {
  title: string;
  children: ReactNode;
  showBack?: boolean;
  contentContainerClassName?: string;
};

function SettingsTitle({ title, showBack }: Pick<SettingsScreenLayoutProps, "title" | "showBack">) {
  if (showBack) {
    return <ScreenHeader title={title} />;
  }

  return (
    <View className="min-h-14 items-center justify-center py-2">
      <Typography accessibilityRole="header" variant="h4" align="center" className="font-serif font-normal">
        {title}
      </Typography>
    </View>
  );
}

export function SettingsScreenLayout({
  title,
  children,
  showBack = true,
  contentContainerClassName,
}: SettingsScreenLayoutProps) {
  return (
    <StandardScrollView className="flex-1" contentContainerClassName={cn("gap-8 pb-10", contentContainerClassName)}>
      <SettingsTitle title={title} showBack={showBack} />
      {children}
    </StandardScrollView>
  );
}

type SettingsFormLayoutProps = {
  title: string;
  children: ReactNode;
  onSave: () => void;
  isSaving?: boolean;
  saveDisabled?: boolean;
  saveLabel?: string;
  feedback?: ReactNode;
};

export function SettingsFormLayout({
  title,
  children,
  onSave,
  isSaving = false,
  saveDisabled = false,
  saveLabel = "Save",
  feedback,
}: SettingsFormLayoutProps) {
  const { reducedMotion } = useMeditation();

  return (
    <StickyFooterScrollView.Root>
      <StickyFooterScrollView.FormBody className="flex-1" contentContainerClassName="gap-8 pb-8">
        <SettingsTitle title={title} showBack />
        {children}
      </StickyFooterScrollView.FormBody>
      <StickyFooterScrollView.Footer className="border-t border-border">
        {feedback ? (
          <Animated.View entering={crossfadeIn} exiting={crossfadeOut} className="pb-3">
            {feedback}
          </Animated.View>
        ) : null}
        <Animated.View layout={glide(reducedMotion)}>
          <MossPrimaryButton
            accessibilityState={{ busy: isSaving, disabled: isSaving || saveDisabled }}
            isDisabled={isSaving || saveDisabled}
            onPress={onSave}
          >
            {isSaving ? "Saving…" : saveLabel}
          </MossPrimaryButton>
        </Animated.View>
      </StickyFooterScrollView.Footer>
    </StickyFooterScrollView.Root>
  );
}

type SettingsSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <View className="gap-3">
      <View className="gap-1">
        <Typography variant="bodyBold">{title}</Typography>
        {description ? (
          <Typography variant="small" tone="muted">
            {description}
          </Typography>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export function SettingsFeedback({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "success" | "danger";
}) {
  return (
    <Typography variant="small" tone={tone === "success" ? "muted" : tone} accessibilityLiveRegion="polite" selectable>
      {children}
    </Typography>
  );
}

export type SettingsFeedbackState = {
  message: string;
  tone: "muted" | "success" | "danger";
} | null;

export function SettingsLoading({ title }: { title: string }) {
  return (
    <SettingsScreenLayout title={title}>
      <View className="min-h-48 items-center justify-center">
        <Typography variant="small" tone="muted" accessibilityLiveRegion="polite">
          Preparing your settings…
        </Typography>
      </View>
    </SettingsScreenLayout>
  );
}
