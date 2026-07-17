import { ObservedRoute } from "@/components/observed-route";
import { MeditationScreen } from "@/screens/meditation-screen";

export default function Meditation() {
  return (
    <ObservedRoute>
      <MeditationScreen />
    </ObservedRoute>
  );
}
