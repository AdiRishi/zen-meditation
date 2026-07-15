import { renderWithSafeArea } from "@tests/testing-utils/render-meditation-screen";

import { AboutScreen } from "@/screens/about-screen";

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn() }),
}));

describe("<AboutScreen />", () => {
  it("states Moss’s product promise and local app version", () => {
    const { getByText } = renderWithSafeArea(<AboutScreen />);

    getByText("A quiet rhythm for daily practice.");
    getByText("Support the practice without becoming the focus of it.");
    getByText(/^Version /);
  });
});
