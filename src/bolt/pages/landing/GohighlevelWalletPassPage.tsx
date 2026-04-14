import { Link2 } from 'lucide-react';
import LandingPageTemplate from './LandingPageTemplate';

export default function GohighlevelWalletPassPage() {
  return (
    <LandingPageTemplate
      badgeLabel="GoHighLevel wallet pass"
      badgeIcon={Link2}
      accentClassName="from-gblue/[0.05]"
      badgeBorderClassName="border-gblue/15"
      badgeTextClassName="text-gblue"
      primaryButtonClassName="bg-gblue hover:bg-gblue-dark"
      title="GoHighLevel wallet pass workflows for booked calls, webinars, and events"
      description="ShowFi.io adds wallet pass delivery to GoHighLevel follow-up flows so agencies and operators can reinforce attendance with Apple Wallet and Google Wallet instead of relying only on email and SMS."
      benefits={[
        'Use GoHighLevel as the source workflow and ShowFi.io for wallet delivery',
        'Improve reminder visibility for calls, webinars, and campaign events',
        'Track claims, wallet saves, and attendance-oriented follow-up paths',
      ]}
      reasonsTitle="Why GoHighLevel users test wallet passes"
      reasonsDescription="When a contact books from mobile, wallet passes can be easier to find later than a buried confirmation message. That makes them a useful layer for high-intent funnels that depend on people actually showing up."
      reasons={[
        'Fit wallet delivery into your existing GHL reminder stack',
        'Support Apple Wallet and Google Wallet from one campaign workflow',
        'Give agencies a clearer attendance-focused offer for clients',
      ]}
      relatedLinks={[
        { to: '/booked-call-reminders', label: 'Booked call reminders' },
        { to: '/wallet-pass-software', label: 'Wallet pass software' },
        { to: '/webinar-reminder-software', label: 'Webinar reminder software' },
        { to: '/event-reminder-software', label: 'Event reminder software' },
        { to: '/pricing', label: 'ShowFi pricing' },
      ]}
    />
  );
}
