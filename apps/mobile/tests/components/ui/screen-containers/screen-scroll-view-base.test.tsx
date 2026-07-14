import { fireEvent } from "@testing-library/react-native";
import { renderWithTestProviders } from "@tests/testing-utils/render-with-test-providers";
import { Dimensions, type StyleProp, StyleSheet, Text, type ViewStyle } from "react-native";
import { type Metrics, SafeAreaProvider } from "react-native-safe-area-context";

import { FormScrollView } from "@/components/ui/screen-containers/form-scroll-view";
import { ScreenContainerScopeProvider } from "@/components/ui/screen-containers/screen-container-scope";
import { StandardScrollView } from "@/components/ui/screen-containers/standard-scroll-view";
import { StickyFooterScrollView } from "@/components/ui/screen-containers/sticky-footer-scroll-view";

const WINDOW_HEIGHT = Dimensions.get("window").height;

const INSET_METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 59, right: 0, bottom: 34, left: 0 },
};

function flattenedContentStyle(scrollView: { props: Record<string, unknown> }): ViewStyle {
  return StyleSheet.flatten(scrollView.props.contentContainerStyle as StyleProp<ViewStyle>);
}

describe("screen scroll containers", () => {
  test("standard scroll views use shared inset and indicator defaults", () => {
    const { getByTestId } = renderWithTestProviders(
      <StandardScrollView testID="standard-scroll">
        <Text>Content</Text>
      </StandardScrollView>,
    );

    expect(getByTestId("standard-scroll").props).toEqual(
      expect.objectContaining({
        automaticallyAdjustsScrollIndicatorInsets: true,
        contentInsetAdjustmentBehavior: "automatic",
        showsHorizontalScrollIndicator: false,
        showsVerticalScrollIndicator: false,
      }),
    );
  });

  test("form scroll views keep taps handled by default", () => {
    const { getByTestId } = renderWithTestProviders(
      <FormScrollView testID="form-scroll">
        <Text>Form</Text>
      </FormScrollView>,
    );

    expect(getByTestId("form-scroll").props.keyboardShouldPersistTaps).toBe("handled");
  });

  test("edge-to-edge scroll views disable automatic inset adjustment", () => {
    const { getByTestId } = renderWithTestProviders(
      <StandardScrollView edgeToEdge testID="edge-scroll">
        <Text>Full bleed</Text>
      </StandardScrollView>,
    );

    expect(getByTestId("edge-scroll").props).toEqual(
      expect.objectContaining({
        automaticallyAdjustsScrollIndicatorInsets: false,
        contentInsetAdjustmentBehavior: "never",
      }),
    );
  });

  test("content is guaranteed to fill the visible viewport between the safe areas", () => {
    const { getByTestId } = renderWithTestProviders(
      <SafeAreaProvider initialMetrics={INSET_METRICS}>
        <StandardScrollView testID="stack-scroll">
          <Text>Content</Text>
        </StandardScrollView>
      </SafeAreaProvider>,
    );

    expect(flattenedContentStyle(getByTestId("stack-scroll")).minHeight).toBe(
      WINDOW_HEIGHT - INSET_METRICS.insets.top - INSET_METRICS.insets.bottom,
    );
  });

  test("edge-to-edge content fills the full window", () => {
    const { getByTestId } = renderWithTestProviders(
      <SafeAreaProvider initialMetrics={INSET_METRICS}>
        <StandardScrollView edgeToEdge testID="edge-scroll">
          <Text>Full bleed</Text>
        </StandardScrollView>
      </SafeAreaProvider>,
    );

    expect(flattenedContentStyle(getByTestId("edge-scroll")).minHeight).toBe(WINDOW_HEIGHT);
  });

  test("tab surfaces make no viewport promise and scroll under the tab bar", () => {
    const { getByTestId } = renderWithTestProviders(
      <SafeAreaProvider initialMetrics={INSET_METRICS}>
        <ScreenContainerScopeProvider scope="tabs">
          <StandardScrollView testID="tabs-scroll">
            <Text>Content</Text>
          </StandardScrollView>
        </ScreenContainerScopeProvider>
      </SafeAreaProvider>,
    );

    expect(flattenedContentStyle(getByTestId("tabs-scroll")).minHeight).toBeUndefined();
  });

  test("contained surfaces make no full-window viewport promise", () => {
    const { getByTestId } = renderWithTestProviders(
      <SafeAreaProvider initialMetrics={INSET_METRICS}>
        <ScreenContainerScopeProvider scope="contained">
          <StandardScrollView testID="contained-scroll">
            <Text>Content</Text>
          </StandardScrollView>
        </ScreenContainerScopeProvider>
      </SafeAreaProvider>,
    );

    expect(flattenedContentStyle(getByTestId("contained-scroll")).minHeight).toBeUndefined();
  });

  test("a measured footer replaces the bottom safe area and pads the body", () => {
    const { getByTestId } = renderWithTestProviders(
      <SafeAreaProvider initialMetrics={INSET_METRICS}>
        <StickyFooterScrollView.Root>
          <StickyFooterScrollView.Body testID="footer-body">
            <Text>Content</Text>
          </StickyFooterScrollView.Body>
          <StickyFooterScrollView.Footer testID="footer">
            <Text>Action</Text>
          </StickyFooterScrollView.Footer>
        </StickyFooterScrollView.Root>
      </SafeAreaProvider>,
    );

    fireEvent(getByTestId("footer"), "layout", { nativeEvent: { layout: { height: 96 } } });

    const bodyStyle = flattenedContentStyle(getByTestId("footer-body"));
    expect(bodyStyle.paddingBottom).toBe(96);
    expect(bodyStyle.minHeight).toBe(WINDOW_HEIGHT - INSET_METRICS.insets.top);
  });
});
