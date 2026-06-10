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
      whenToUse={{
        title: 'When to use webinar reminder software',
        description:
          'Use a dedicated reminder layer when webinar registration is working but live attendance, late joins, or join-link retrieval are leaking revenue.',
        items: [
          'Zoom webinar reminders are being missed or buried in inboxes.',
          'Registrants ask support where the join link is close to start time.',
          'Show-up rate is lower than expected even when registration volume is healthy.',
          'The webinar sequence needs email, SMS, calendar, and wallet to work together.',
        ],
      }}
      retrievalComparison={{
        title: 'The reminder stack for webinar show-up rate',
        description:
          'A strong webinar reminder system gives each channel a job instead of sending the same message everywhere.',
        items: [
          'Email explains why the session matters and carries longer details.',
          'SMS is best for short, consent-based urgency.',
          'Calendar blocks the time before the session is forgotten.',
          'Wallet passes help registrants recover the session from mobile when timing matters.',
        ],
      }}
      faqs={[
        {
          question: 'What is webinar reminder software?',
          answer:
            'It is software that helps move registrants from signup to attendance with timed reminders, join-link retrieval, and channel coordination.',
        },
        {
          question: 'How do wallet passes help reduce webinar no-shows?',
          answer:
            'Wallet passes give the webinar a more visible mobile surface so registrants do not have to dig through old email when the session starts.',
        },
        {
          question: 'Should Zoom webinar reminders still be used?',
          answer:
            'Yes. Native Zoom reminders are useful, but teams with attendance pressure should add fallback retrieval through calendar, SMS, and wallet.',
        },
        {
          question: 'What should a webinar reminder sequence include?',
          answer:
            'Start with instant confirmation, add calendar and wallet options, then send reminders one day before, one hour before, and close to start.',
        },
      ]}
      relatedLinks={[
        { to: '/wallet-pass-software', label: 'Wallet pass software' },
        { to: '/zoom-webinar-reminders', label: 'Zoom webinar reminders' },
        { to: '/reduce-webinar-no-shows', label: 'Reduce webinar no-shows' },
        { to: '/webinar-reminder-sequence-template', label: 'Webinar reminder sequence' },
        { to: '/why-webinar-reminders-fail', label: 'Why webinar reminders fail' },
        { to: '/webinar-show-up-rate-calculator', label: 'Webinar show-up rate calculator' },
        { to: '/event-reminder-software', label: 'Event reminder software' },
        { to: '/booked-call-reminders', label: 'Booked call reminders' },
        { to: '/apple-wallet-pass-software', label: 'Apple Wallet pass software' },
        { to: '/google-wallet-pass-software', label: 'Google Wallet pass software' },
      ]}
    />
  );
}
