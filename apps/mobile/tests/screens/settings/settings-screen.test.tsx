import { fireEvent } from "@testing-library/react-native";
import { renderWithSafeArea } from "@tests/testing-utils/render-meditation-screen";

import { SettingsScreen } from "@/screens/settings-screen";

const mockPush = jest.fn();

jest.mock("expo-application", () => ({
  nativeApplicationVersion: "9.9.9",
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), push: mockPush }),
}));

describe("<SettingsScreen />", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("offers the complete settings menu in its canonical order and opens each destination", () => {
    const { getAllByRole, getByLabelText, getByText } = renderWithSafeArea(<SettingsScreen />);

    getByText("Version 9.9.9");

    expect(getAllByRole("button").map((row) => row.props.accessibilityLabel)).toEqual([
      "Schedule",
      "Notifications",
      "Completion sound",
      "Appearance",
      "Privacy & Data",
      "About",
    ]);

    fireEvent.press(getByLabelText("Schedule"));
    fireEvent.press(getByLabelText("Notifications"));
    fireEvent.press(getByLabelText("Completion sound"));
    fireEvent.press(getByLabelText("Appearance"));
    fireEvent.press(getByLabelText("Privacy & Data"));
    fireEvent.press(getByLabelText("About"));

    expect(mockPush.mock.calls.map(([href]) => href)).toEqual([
      "/schedule",
      "/reminders",
      "/completion-sound?source=settings",
      "/appearance",
      "/privacy",
      "/about",
    ]);
  });
});
