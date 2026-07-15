import { deleteDatabaseAsync, SQLiteProvider } from "expo-sqlite";
import { HeroUINativeConfig, HeroUINativeProvider } from "heroui-native";
import { useState } from "react";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";

import { initializeDatabase } from "@/data/database";
import { SQLiteMeditationProvider } from "@/providers/meditation-provider";
import { LocalDataErrorScreen } from "@/screens/error/local-data-error-screen";
import { localNotifications } from "@/services/local-notifications";

import { AppThemeProvider } from "./app-theme-provider";
import { NotificationResponseNavigator } from "./notification-response-navigator";

const heroUINativeConfig: HeroUINativeConfig = {
  devInfo: { stylingPrinciples: false },
};

type AppProvidersProps = {
  children: React.ReactNode;
};

function LocalDataProvider({ children }: { children: React.ReactNode }) {
  const [databaseError, setDatabaseError] = useState<Error | null>(null);
  const [databaseKey, setDatabaseKey] = useState(0);

  const retry = () => {
    setDatabaseError(null);
    setDatabaseKey((value) => value + 1);
  };

  const reset = async () => {
    try {
      await localNotifications.clearAllManagedNotifications();
      await deleteDatabaseAsync("moss.db");
      retry();
    } catch (error) {
      const databaseResetError = error instanceof Error ? error : new Error("Local data could not be reset.");
      setDatabaseError(databaseResetError);
      throw databaseResetError;
    }
  };

  if (databaseError) {
    return <LocalDataErrorScreen onRetry={retry} onReset={reset} />;
  }

  return (
    <SQLiteProvider key={databaseKey} databaseName="moss.db" onError={setDatabaseError} onInit={initializeDatabase}>
      <SQLiteMeditationProvider>{children}</SQLiteMeditationProvider>
    </SQLiteProvider>
  );
}

export function AppProviders({ children }: AppProvidersProps) {
  const runtime = (
    <>
      <NotificationResponseNavigator />
      {children}
    </>
  );

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <HeroUINativeProvider config={heroUINativeConfig}>
        <AppThemeProvider>
          <LocalDataProvider>{runtime}</LocalDataProvider>
        </AppThemeProvider>
      </HeroUINativeProvider>
    </SafeAreaProvider>
  );
}
