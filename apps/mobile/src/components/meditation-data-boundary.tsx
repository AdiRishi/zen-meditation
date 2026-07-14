import { useMeditation } from "@/providers/meditation-provider";
import { LocalDataErrorScreen } from "@/screens/error/local-data-error-screen";

export function MeditationDataBoundary({ children }: { children: React.ReactNode }) {
  const { error, isReady, refresh, resetAllData } = useMeditation();

  if (!isReady) {
    return null;
  }

  if (error) {
    return (
      <LocalDataErrorScreen
        onRetry={async () => {
          await refresh();
        }}
        onReset={resetAllData}
      />
    );
  }

  return children;
}
