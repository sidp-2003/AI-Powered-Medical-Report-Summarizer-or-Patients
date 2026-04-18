import CanvasSequence from "@/components/CanvasSequence";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AiBreakdown from "@/components/AiBreakdown";
import SimplificationRoadmap from "@/components/SimplificationRoadmap";
import CorePipeline from "@/components/CorePipeline";
import ContinuousSupport from "@/components/ContinuousSupport";
import LocalCare from "@/components/LocalCare";
import FooterSecurity from "@/components/FooterSecurity";

export default function Home() {
  return (
    <main className="relative w-full text-foreground">
      {/* Background Sequence fixed to the back */}
      <CanvasSequence className="pointer-events-none" />

      {/* Global Navbar */}
      <Navbar />

      {/* Foreground Scrollable Content */}
      <div className="relative z-10 w-full">
        <HeroSection />
        <AiBreakdown />
        <SimplificationRoadmap />
        <CorePipeline />
        <ContinuousSupport />
        <LocalCare />
        <FooterSecurity />
      </div>
    </main>
  );
}

