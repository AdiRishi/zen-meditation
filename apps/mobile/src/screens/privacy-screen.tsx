import { useRouter } from "expo-router";

import { DeleteZenDataSection } from "@/components/screens/settings/delete-zen-data-section";
import { PrivacySummary } from "@/components/screens/settings/privacy-panel";
import { SettingsScreenLayout, SettingsSection } from "@/components/screens/settings/settings-layout";
import { useAsyncAction } from "@/hooks/use-async-action";
import { confirmDeleteZenData } from "@/lib/confirm-delete-zen-data";
import { useMeditation } from "@/providers/meditation-provider";

export function PrivacyScreen() {
  const router = useRouter();
  const { resetAllData } = useMeditation();
  const deleteAction = useAsyncAction();

  const deleteAllData = async () => {
    const deletionSucceeded = await deleteAction.run(resetAllData);
    if (deletionSucceeded) {
      router.replace("/");
    }
  };

  const confirmDeletion = () => {
    confirmDeleteZenData(() => void deleteAllData());
  };

  return (
    <SettingsScreenLayout title="Privacy & Data">
      <SettingsSection title="Privacy by design" description="No accounts. No tracking.">
        <PrivacySummary />
      </SettingsSection>
      <DeleteZenDataSection
        isDeleting={deleteAction.isPending}
        deletionFailed={deleteAction.error !== null}
        onDelete={confirmDeletion}
      />
    </SettingsScreenLayout>
  );
}
