import { render } from "@testing-library/react-native";
import { InMemoryMeditationStore } from "@tests/testing-utils/in-memory-meditation-store";
import type { ReactElement } from "react";
import { type Metrics, SafeAreaProvider } from "react-native-safe-area-context";

import type { MeditationStore } from "@/data/meditation-store";
import { MeditationProvider } from "@/providers/meditation-provider";
import type {
  LocalNotificationPermissionStatus,
  LocalNotifications,
  SessionCompletionNotification,
} from "@/services/local-notifications";

const SAFE_AREA_METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

export function renderWithSafeArea(ui: ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>{children}</SafeAreaProvider>,
  });
}

export function renderMeditationScreen(
  ui: ReactElement,
  options: { store?: MeditationStore; notifications?: LocalNotifications } = {},
) {
  const store = options.store ?? new InMemoryMeditationStore();
  const result = renderWithSafeArea(
    <MeditationProvider store={store} notifications={options.notifications}>
      {ui}
    </MeditationProvider>,
  );

  return { ...result, store };
}

export function createNotifications(initialPermission: LocalNotificationPermissionStatus = "granted") {
  let permission = initialPermission;
  const notifications: jest.Mocked<LocalNotifications> = {
    getPermissionStatus: jest.fn(async () => permission),
    requestPermission: jest.fn(async () => {
      permission = "granted";
      return permission;
    }),
    rescheduleWeeklyReminders: jest.fn(async (preferences) => ({
      permissionStatus: permission,
      scheduledCount: permission === "granted" && preferences.remindersEnabled ? 1 : 0,
    })),
    syncSessionCompletion: jest.fn(async (_notification: SessionCompletionNotification | null) => true),
    clearAllManagedNotifications: jest.fn(async () => undefined),
  };
  return notifications;
}
