import { ObservedRoute } from "@/components/observed-route";
import { WelcomeScreen } from "@/screens/onboarding/welcome-screen";

export default function Welcome() {
  return (
    <ObservedRoute>
      <WelcomeScreen />
    </ObservedRoute>
  );
}
