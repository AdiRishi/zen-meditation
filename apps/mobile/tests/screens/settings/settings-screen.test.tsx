import { fireEvent } from "@testing-library/react-native";
import { renderWithSafeArea } from "@tests/testing-utils/render-meditation-screen";

import { SettingsScreen } from "@/screens/settings-screen";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), push: mockPush }),
}));

describe("<SettingsScreen />", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("offers the complete settings menu in its canonical order and opens each destination", () => {
    const { getAllByRole, getByLabelText } = renderWithSafeArea(<SettingsScreen />);

    expect(getAllByRole("button").map((row) => row.props.accessibilityLabel)).toEqual([
      "Schedule",
      "Reminders",
      "Completion sound",
      "Appearance",
      "Reduced motion",
      "Privacy & Data",
      "About",
    ]);

    fireEvent.press(getByLabelText("Schedule"));
    fireEvent.press(getByLabelText("Reminders"));
    fireEvent.press(getByLabelText("Completion sound"));
    fireEvent.press(getByLabelText("Appearance"));
    fireEvent.press(getByLabelText("Reduced motion"));
    fireEvent.press(getByLabelText("Privacy & Data"));
    fireEvent.press(getByLabelText("About"));

    expect(mockPush.mock.calls.map(([href]) => href)).toEqual([
      "/schedule",
      "/reminders",
      "/completion-sound?source=settings",
      "/appearance",
      "/appearance",
      "/privacy",
      "/about",
    ]);
  });
});
