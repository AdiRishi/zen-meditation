import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";

import { useMeditation } from "@/providers/meditation-provider";
import { getMossNotificationKind } from "@/services/local-notifications";

export function NotificationResponseNavigator() {
  const router = useRouter();
  const response = Notifications.useLastNotificationResponse();
  const { activeSession, error, isReady, pendingCompletion, preferences, refresh } = useMeditation();
  const handledIdentifier = useRef<string | null>(null);

  useEffect(() => {
    if (!response) {
      handledIdentifier.current = null;
      return;
    }

    if (!isReady) {
      return;
    }

    if (error) {
      try {
        Notifications.clearLastNotificationResponse();
      } catch {
        handledIdentifier.current = null;
      }
      return;
    }

    const request = response.notification.request;
    const kind = getMossNotificationKind(request.content.data);
    if (!kind || handledIdentifier.current === request.identifier) {
      return;
    }

    handledIdentifier.current = request.identifier;
    try {
      Notifications.clearLastNotificationResponse();
    } catch {
      // The response remains guarded by its handled identifier.
    }

    if (kind === "session-completion") {
      void refresh().then((didRefresh) => {
        if (didRefresh) {
          router.replace("/meditation");
        }
      });
      return;
    }

    if (pendingCompletion) {
      router.replace({ pathname: "/session-complete", params: { id: pendingCompletion.id } });
    } else if (activeSession) {
      router.replace("/meditation");
    } else if (preferences.onboardingCompleted) {
      router.push("/session-setup");
    } else {
      router.replace("/");
    }
  }, [activeSession, error, isReady, pendingCompletion, preferences.onboardingCompleted, refresh, response, router]);

  return null;
}
