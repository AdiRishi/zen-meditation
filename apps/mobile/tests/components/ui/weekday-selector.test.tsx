import { within } from "@testing-library/react-native";
import { renderWithTestProviders } from "@tests/testing-utils/render-with-test-providers";

import { WeekdaySelector } from "@/components/ui/zen/weekday-selector";

describe("<WeekdaySelector />", () => {
  test("shows a non-colour completion mark in the read-only rhythm", () => {
    const { getByLabelText } = renderWithTestProviders(<WeekdaySelector selected={[1, 2]} completed={new Set([1])} />);

    within(getByLabelText("Monday, practice complete")).getByText("checkmark", { includeHiddenElements: true });
    within(getByLabelText("Tuesday, practice day")).getByText("T");
  });
});
