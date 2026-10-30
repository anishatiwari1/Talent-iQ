import React from 'react';
import LandingNavbar from '../components/landing/LandingNavbar';
import LandingHero from '../components/landing/LandingHero';
import LandingFeatures from '../components/landing/LandingFeatures';
import LandingHowItWorks from '../components/landing/LandingHowItWorks';
import LandingProjectSimulation from '../components/landing/LandingProjectSimulation';
import LandingFooter from '../components/landing/LandingFooter';

export const Landing = () => {
  return (
    <div className="min-h-screen bg-[#F3F5EF] text-[#10221E] selection:bg-[#A8D85A] selection:text-[#063C32] font-sans">
      <LandingNavbar />
      <main>
        <LandingHero />
        <LandingFeatures />
        <LandingHowItWorks />
        <LandingProjectSimulation />
      </main>
      <LandingFooter />
    </div>
  );
};

export default Landing;
