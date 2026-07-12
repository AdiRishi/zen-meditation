import { deleteDatabaseAsync, SQLiteProvider } from "expo-sqlite";
import { HeroUINativeConfig, HeroUINativeProvider } from "heroui-native";
import { useState } from "react";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";

import { initializeDatabase } from "@/data/database";
import type { MeditationStore } from "@/data/meditation-store";
import { MeditationProvider, SQLiteMeditationProvider } from "@/providers/meditation-provider";
import { LocalDataErrorScreen } from "@/screens/error/local-data-error-screen";

const heroUINativeConfig: HeroUINativeConfig = {
  devInfo: { stylingPrinciples: false },
};

type AppProvidersProps = {
  children: React.ReactNode;
  meditationStore?: MeditationStore;
};

function LocalDataProvider({ children }: { children: React.ReactNode }) {
  const [databaseError, setDatabaseError] = useState<Error | null>(null);
  const [databaseKey, setDatabaseKey] = useState(0);

  const retry = () => {
    setDatabaseError(null);
    setDatabaseKey((value) => value + 1);
  };

  const reset = () => {
    void deleteDatabaseAsync("zen.db").then(retry).catch(setDatabaseError);
  };

  if (databaseError) {
    return <LocalDataErrorScreen onRetry={retry} onReset={reset} />;
  }

  return (
    <SQLiteProvider key={databaseKey} databaseName="zen.db" onError={setDatabaseError} onInit={initializeDatabase}>
      <SQLiteMeditationProvider>{children}</SQLiteMeditationProvider>
    </SQLiteProvider>
  );
}

export function AppProviders({ children, meditationStore }: AppProvidersProps) {
  const content = meditationStore ? (
    <MeditationProvider store={meditationStore}>{children}</MeditationProvider>
  ) : (
    <LocalDataProvider>{children}</LocalDataProvider>
  );

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <KeyboardProvider>
        <HeroUINativeProvider config={heroUINativeConfig}>{content}</HeroUINativeProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
