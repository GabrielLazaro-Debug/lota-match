import Landing from "./Landing";
import Onboarding from "./Onboarding";
import Dashboard from "./Dashboard";
import { useStore } from "@/lib/store";
import { Navigate } from "react-router-dom";

const Index = () => {
  const onboarded = useStore((s) => s.onboarded);
  return onboarded ? <Navigate to="/dashboard" replace /> : <Landing />;
};

export default Index;
export { Landing, Onboarding, Dashboard };
