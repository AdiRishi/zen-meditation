import { SettingsFeedback, SettingsSection } from "@/components/screens/settings/settings-layout";
import { ZenDangerButton } from "@/components/ui/zen/zen-button";

type DeleteZenDataSectionProps = {
  isDeleting: boolean;
  deletionFailed: boolean;
  onDelete: () => void;
};

export function DeleteZenDataSection({ isDeleting, deletionFailed, onDelete }: DeleteZenDataSectionProps) {
  return (
    <SettingsSection
      title="Delete your data"
      description="Delete all data stored by Zen on this device and return to the welcome screen."
    >
      <ZenDangerButton
        accessibilityHint="Permanently deletes your Zen data from this device"
        accessibilityState={{ busy: isDeleting, disabled: isDeleting }}
        isDisabled={isDeleting}
        onPress={onDelete}
      >
        {isDeleting ? "Deleting Zen data…" : "Delete All Zen Data"}
      </ZenDangerButton>
      {deletionFailed ? (
        <SettingsFeedback tone="danger">Zen couldn’t delete your data. Please try again.</SettingsFeedback>
      ) : null}
    </SettingsSection>
  );
}
