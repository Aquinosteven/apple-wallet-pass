import { useState } from 'react';
import PricingCard from './PricingCard';
import PricingCta from './PricingCta';
import PricingDetails from './PricingDetails';
import PricingFaq from './PricingFaq';
import PricingHero from './PricingHero';
import { BillingInterval } from './pricingContent';

export default function PricingPage() {
  const [interval, setInterval] = useState<BillingInterval>('monthly');

  return (
    <>
      <PricingHero interval={interval} onIntervalChange={setInterval} />
      <PricingCard interval={interval} />
      <PricingDetails />
      <PricingFaq />
      <PricingCta />
    </>
  );
}
