import type { ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StandardScrollView } from "@/components/ui/screen-containers/standard-scroll-view";
import { StickyFooterFormScrollView } from "@/components/ui/screen-containers/sticky-footer-form-scroll-view";
import { Typography } from "@/components/ui/typography";
import { ScreenHeader } from "@/components/ui/zen/screen-header";
import { ZenPrimaryButton } from "@/components/ui/zen/zen-button";

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
    <StandardScrollView className="flex-1" contentContainerClassName={`gap-8 pb-10 ${contentContainerClassName ?? ""}`}>
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
  const insets = useSafeAreaInsets();

  return (
    <StickyFooterFormScrollView.Root>
      <StickyFooterFormScrollView.Body className="flex-1" contentContainerClassName="gap-8 pb-8">
        <SettingsTitle title={title} showBack />
        {children}
      </StickyFooterFormScrollView.Body>
      <StickyFooterFormScrollView.Footer
        className="border-t border-border bg-background px-6 pt-4"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        {feedback ? <View className="pb-3">{feedback}</View> : null}
        <ZenPrimaryButton
          accessibilityState={{ busy: isSaving, disabled: isSaving || saveDisabled }}
          isDisabled={isSaving || saveDisabled}
          onPress={onSave}
        >
          {isSaving ? "Saving…" : saveLabel}
        </ZenPrimaryButton>
      </StickyFooterFormScrollView.Footer>
    </StickyFooterFormScrollView.Root>
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
