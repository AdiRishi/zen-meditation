import { renderWithSafeArea } from "@tests/testing-utils/render-meditation-screen";

import { AboutScreen } from "@/screens/about-screen";

jest.mock("expo-application", () => ({
  nativeApplicationVersion: "9.9.9",
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn() }),
}));

describe("<AboutScreen />", () => {
  it("describes the app plainly and shows the local app version", () => {
    const { getByText } = renderWithSafeArea(<AboutScreen />);

    getByText("A quiet rhythm for daily practice.");
    getByText(/Moss is a small meditation timer/);
    getByText("Version 9.9.9");
  });
});
