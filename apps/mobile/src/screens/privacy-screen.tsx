import { useRouter } from "expo-router";

import { DeleteMossDataSection } from "@/components/screens/settings/delete-moss-data-section";
import { PrivacySummary } from "@/components/screens/settings/privacy-panel";
import { SettingsScreenLayout, SettingsSection } from "@/components/screens/settings/settings-layout";
import { useAsyncAction } from "@/hooks/use-async-action";
import { confirmDeleteMossData } from "@/lib/confirm-delete-moss-data";
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
    confirmDeleteMossData(() => void deleteAllData());
  };

  return (
    <SettingsScreenLayout title="Privacy & Data">
      <SettingsSection title="Privacy by design" description="No accounts. No tracking.">
        <PrivacySummary />
      </SettingsSection>
      <DeleteMossDataSection
        isDeleting={deleteAction.isPending}
        deletionFailed={deleteAction.error !== null}
        onDelete={confirmDeletion}
      />
    </SettingsScreenLayout>
  );
}
