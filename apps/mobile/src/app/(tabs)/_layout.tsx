import { Redirect } from "expo-router";

import { AppTabs } from "@/components/app-tabs";
import { ScreenContainerScopeProvider } from "@/components/ui/screen-containers/screen-container-scope";
import { useMeditation } from "@/providers/meditation-provider";

export default function TabsLayout() {
  const { activeSession, pendingCompletion } = useMeditation();

  if (pendingCompletion) {
    return <Redirect href={{ pathname: "/session-complete", params: { id: pendingCompletion.id } }} />;
  }
  if (activeSession) {
    return <Redirect href="/meditation" />;
  }

  return (
    <ScreenContainerScopeProvider scope="tabs">
      <AppTabs />
    </ScreenContainerScopeProvider>
  );
}
