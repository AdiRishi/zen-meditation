import { SettingsFeedback, SettingsSection } from "@/components/screens/settings/settings-layout";
import { MossDangerButton } from "@/components/ui/moss/moss-button";

type DeleteMossDataSectionProps = {
  isDeleting: boolean;
  deletionFailed: boolean;
  onDelete: () => void;
};

export function DeleteMossDataSection({ isDeleting, deletionFailed, onDelete }: DeleteMossDataSectionProps) {
  return (
    <SettingsSection
      title="Delete your data"
      description="Delete all data stored by Moss on this device and return to the welcome screen."
    >
      <MossDangerButton
        accessibilityHint="Permanently deletes your Moss data from this device"
        accessibilityState={{ busy: isDeleting, disabled: isDeleting }}
        isDisabled={isDeleting}
        onPress={onDelete}
      >
        {isDeleting ? "Deleting Moss data…" : "Delete All Moss Data"}
      </MossDangerButton>
      {deletionFailed ? (
        <SettingsFeedback tone="danger">Moss couldn’t finish deleting your data. Please try again.</SettingsFeedback>
      ) : null}
    </SettingsSection>
  );
}
