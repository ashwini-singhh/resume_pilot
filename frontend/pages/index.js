import LandingNav from '../components/landing/LandingNav';
import Hero from '../components/landing/Hero';
import HowItWorks from '../components/landing/HowItWorks';
import MatchScore from '../components/landing/MatchScore';
import Features from '../components/landing/Features';
import WhyMoreInterviews from '../components/landing/WhyMoreInterviews';
import Comparison from '../components/landing/Comparison';
import Testimonials from '../components/landing/Testimonials';
import FAQ from '../components/landing/FAQ';
import FinalCTA from '../components/landing/FinalCTA';
import Footer from '../components/landing/Footer';

import Head from 'next/head';

export default function LandingPage() {
  return (
    <>
      <Head>
        <title>ResumeSailor | AI-Powered Resume Success</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <LandingNav />
      <main>
        <Hero />
        <WhyMoreInterviews />
        <Comparison />
        <Features />
        <HowItWorks />
        <MatchScore />
        <Testimonials />
        <FAQ />
        <FinalCTA />
        <Footer />
      </main>
    </>
  );
}
