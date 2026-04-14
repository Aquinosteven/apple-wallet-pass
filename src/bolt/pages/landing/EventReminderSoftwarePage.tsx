import { CalendarDays } from 'lucide-react';
import LandingPageTemplate from './LandingPageTemplate';

export default function EventReminderSoftwarePage() {
  return (
    <LandingPageTemplate
      badgeLabel="Event reminder software"
      badgeIcon={CalendarDays}
      accentClassName="from-gyellow/[0.10]"
      badgeBorderClassName="border-gyellow/20"
      badgeTextClassName="text-yellow-600"
      primaryButtonClassName="bg-gray-900 hover:bg-black"
      title="Event reminder software built for live attendance"
      description="ShowFi.io gives event teams a wallet-first reminder layer for conferences, workshops, community events, and ticketed experiences that need stronger visibility near the check-in window."
      benefits={[
        'Event details stay accessible in Apple Wallet and Google Wallet',
        'Useful for live check-in, ticket visibility, and day-of reminders',
        'Designed for campaigns where attendance matters more than vanity registrations',
      ]}
      reasonsTitle="Why event reminder software needs better retrieval"
      reasonsDescription="For many events, the problem is not whether someone registered. It is whether they can instantly find the ticket, location, or join details when they actually need them. That is where wallet delivery becomes useful."
      reasons={[
        'Reduce event-day search friction on mobile devices',
        'Make event tickets and reminders easier to access at check-in time',
        'Support both smaller live events and higher-volume campaign funnels',
      ]}
      relatedLinks={[
        { to: '/wallet-pass-software', label: 'Wallet pass software' },
        { to: '/webinar-reminder-software', label: 'Webinar reminder software' },
        { to: '/google-wallet-pass-software', label: 'Google Wallet pass software' },
        { to: '/apple-wallet-pass-software', label: 'Apple Wallet pass software' },
        { to: '/pricing', label: 'ShowFi pricing' },
      ]}
    />
  );
}
