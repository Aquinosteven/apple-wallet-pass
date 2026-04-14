import { PhoneCall } from 'lucide-react';
import LandingPageTemplate from './LandingPageTemplate';

export default function BookedCallRemindersPage() {
  return (
    <LandingPageTemplate
      badgeLabel="Booked call reminders"
      badgeIcon={PhoneCall}
      accentClassName="from-gblue/[0.05]"
      badgeBorderClassName="border-gblue/15"
      badgeTextClassName="text-gblue"
      primaryButtonClassName="bg-gblue hover:bg-gblue-dark"
      title="Booked call reminders for sales teams that need fewer no-shows"
      description="ShowFi.io helps operators reinforce booked call attendance with wallet-based reminders that stay visible closer to the appointment, especially for mobile-first funnels."
      benefits={[
        'Give booked calls a more visible reminder surface than email alone',
        'Useful for sales calls, consultations, demos, and appointment funnels',
        'Support Apple Wallet and Google Wallet from one workflow',
      ]}
      reasonsTitle="Why booked call reminders break down"
      reasonsDescription="A contact can be interested enough to book and still miss the call because the confirmation gets buried. ShowFi.io focuses on reducing retrieval friction at the moment of attendance instead of just adding more messages."
      reasons={[
        'Reinforce mobile call bookings with wallet-native visibility',
        'Help no-show reduction without rebuilding the whole reminder stack',
        'Pair booked call flows with GoHighLevel-friendly wallet delivery',
      ]}
      relatedLinks={[
        { to: '/gohighlevel-wallet-pass', label: 'GoHighLevel wallet pass' },
        { to: '/wallet-pass-software', label: 'Wallet pass software' },
        { to: '/webinar-reminder-software', label: 'Webinar reminder software' },
        { to: '/event-reminder-software', label: 'Event reminder software' },
        { to: '/pricing', label: 'ShowFi pricing' },
      ]}
    />
  );
}
