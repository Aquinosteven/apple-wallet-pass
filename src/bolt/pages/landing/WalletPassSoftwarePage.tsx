import { WalletCards } from 'lucide-react';
import LandingPageTemplate from './LandingPageTemplate';

export default function WalletPassSoftwarePage() {
  return (
    <LandingPageTemplate
      badgeLabel="Wallet pass software"
      badgeIcon={WalletCards}
      accentClassName="from-gblue/[0.08]"
      badgeBorderClassName="border-gblue/15"
      badgeTextClassName="text-gblue"
      primaryButtonClassName="bg-gblue hover:bg-gblue-dark"
      title="Wallet pass software for attendance-driven funnels"
      description="ShowFi.io is wallet pass software for marketers, agencies, and event operators who need booked calls, webinars, and live events to stay visible beyond the inbox."
      benefits={[
        'One workflow for Apple Wallet and Google Wallet pass delivery',
        'Claim flows, reminders, and tracking built around show rate',
        'Useful for events, webinars, booked calls, challenges, and ticketed experiences',
      ]}
      reasonsTitle="Why wallet pass software changes the reminder channel"
      reasonsDescription="Wallet passes live on the phone, stay easy to find, and surface near the attendance window. That gives high-intent events a stronger memory trigger than relying on an old email thread alone."
      reasons={[
        'Reduce “I booked but forgot where to find it” friction',
        'Support Apple Wallet and Google Wallet without separate systems',
        'Tie reminder visibility more closely to the event moment',
      ]}
      relatedLinks={[
        { to: '/apple-wallet-pass-software', label: 'Apple Wallet pass software' },
        { to: '/google-wallet-pass-software', label: 'Google Wallet pass software' },
        { to: '/webinar-reminder-software', label: 'Webinar reminder software' },
        { to: '/event-reminder-software', label: 'Event reminder software' },
        { to: '/gohighlevel-wallet-pass', label: 'GoHighLevel wallet pass' },
      ]}
    />
  );
}
