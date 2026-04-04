import LandingNav from '../components/landing/LandingNav';
import Hero from '../components/landing/Hero';
import ValueProp from '../components/landing/ValueProp';
import JDMatching from '../components/landing/JDMatching';
import AIQuestioning from '../components/landing/AIQuestioning';
import HowItWorks from '../components/landing/HowItWorks';
import MatchScore from '../components/landing/MatchScore';
import GitHubIntegration from '../components/landing/GitHubIntegration';
import Features from '../components/landing/Features';
import WhyMoreInterviews from '../components/landing/WhyMoreInterviews';
import Pricing from '../components/landing/Pricing';
import Comparison from '../components/landing/Comparison';
import FinalCTA from '../components/landing/FinalCTA';

export default function LandingPage() {
  return (
    <>
      <LandingNav />
      <main>
        <Hero />
        <ValueProp />
        <MatchScore />
        <JDMatching />
        <AIQuestioning />
        <HowItWorks />
        <GitHubIntegration />
        <Features />
        <WhyMoreInterviews />
        <Comparison />
        <Pricing />
        <FinalCTA />
      </main>
    </>
  );
}
