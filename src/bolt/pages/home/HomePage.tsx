import HeroSection from './HeroSection';
import SocialProofStrip from './SocialProofStrip';
import EnemySection from './EnemySection';
import MechanismSection from './MechanismSection';
import UseCaseGrid from './UseCaseGrid';
import ToolbeltSection from './ToolbeltSection';
import HowItWorks from './HowItWorks';
import FeatureHighlights from './FeatureHighlights';
import CtaBlock from './CtaBlock';

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <SocialProofStrip />
      <EnemySection />
      <MechanismSection />
      <UseCaseGrid />
      <ToolbeltSection />
      <HowItWorks />
      <FeatureHighlights />
      <CtaBlock />
    </>
  );
}
