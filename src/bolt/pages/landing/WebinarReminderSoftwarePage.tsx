import { Presentation } from 'lucide-react';
import LandingPageTemplate from './LandingPageTemplate';

export default function WebinarReminderSoftwarePage() {
  return (
    <LandingPageTemplate
      badgeLabel="Webinar reminder software"
      badgeIcon={Presentation}
      accentClassName="from-ggreen/[0.08]"
      badgeBorderClassName="border-ggreen/15"
      badgeTextClassName="text-ggreen"
      primaryButtonClassName="bg-ggreen hover:opacity-95"
      title="Webinar reminder software for teams that care about show rate"
      description="ShowFi.io helps webinar operators reinforce attendance with wallet-based visibility, so registrants can find the session when it is time to join instead of digging through email."
      benefits={[
        'Deliver webinar access details into Apple Wallet and Google Wallet',
        'Keep registrants closer to the event moment with more visible reminders',
        'Pair wallet delivery with webinar follow-up and operational tracking',
      ]}
      reasonsTitle="Why webinar attendance drops after registration"
      reasonsDescription="Most webinar no-shows are not caused by lack of intent. They come from timing, inbox clutter, and retrieval friction on the day of the event. ShowFi.io is designed to reduce that last-mile problem."
      reasons={[
        'Help registrants find the webinar faster on mobile',
        'Reinforce the session after opt-in without adding noise',
        'Support repeated webinar and challenge launch workflows',
      ]}
      relatedLinks={[
        { to: '/wallet-pass-software', label: 'Wallet pass software' },
        { to: '/event-reminder-software', label: 'Event reminder software' },
        { to: '/booked-call-reminders', label: 'Booked call reminders' },
        { to: '/apple-wallet-pass-software', label: 'Apple Wallet pass software' },
        { to: '/google-wallet-pass-software', label: 'Google Wallet pass software' },
      ]}
    />
  );
}
