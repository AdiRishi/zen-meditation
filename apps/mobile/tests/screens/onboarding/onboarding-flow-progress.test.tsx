import { waitFor } from "@testing-library/react-native";
import { renderMeditationScreen } from "@tests/testing-utils/render-meditation-screen";

import { OnboardingScheduleScreen } from "@/screens/onboarding/onboarding-schedule-screen";
import { PracticeGoalScreen } from "@/screens/onboarding/practice-goal-screen";
import { ReminderPermissionScreen } from "@/screens/onboarding/reminder-permission-screen";
import { WelcomeScreen } from "@/screens/onboarding/welcome-screen";

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
}));

describe("onboarding setup progress", () => {
  it.each([
    { name: "practice goal", Screen: PracticeGoalScreen, step: 1 },
    { name: "schedule", Screen: OnboardingScheduleScreen, step: 2 },
    { name: "reminders", Screen: ReminderPermissionScreen, step: 3 },
  ] as const)("identifies the $name screen as setup step $step", async ({ Screen, step }) => {
    const { getByLabelText } = renderMeditationScreen(<Screen />);

    await waitFor(() =>
      expect(getByLabelText("Onboarding progress")).toHaveAccessibilityValue({
        min: 1,
        max: 3,
        now: step,
        text: `Step ${step} of 3`,
      }),
    );
  });

  it("keeps the welcome screen separate from setup progress", async () => {
    const { queryByLabelText } = renderMeditationScreen(<WelcomeScreen />);

    await waitFor(() => expect(queryByLabelText("Onboarding progress")).toBeNull());
  });
});
