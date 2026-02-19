import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import WizardStepper from './wizard/WizardStepper';
import EventDetailsStep, { EventDetailsData } from './wizard/EventDetailsStep';
import TicketDesignStep, { TicketDesignData } from './wizard/TicketDesignStep';

const steps = [
  { id: 1, label: 'Event Details' },
  { id: 2, label: 'Ticket Design' },
];

const defaultEventDetails: EventDetailsData = {
  name: '',
  eventType: 'webinar',
  dateMode: 'single',
  startDate: '',
  endDate: '',
  startTime: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
  primaryActionType: 'fixed',
  primaryActionUrl: '',
  actionButtonLabel: '',
  websiteUrl: '',
  description: '',
  organizerName: '',
  supportContact: '',
  relevanceTiming: 'at_start',
  relevanceCustomTime: '',
  postEventBehavior: 'nothing',
  postEventUrl: '',
  expiration: 'never',
  expirationDate: '',
  allowUpdates: true,
  enableCheckIn: false,
};

const defaultTicketDesign: TicketDesignData = {
  logoUrl: null,
  stripUrl: null,
  backgroundColor: '#1a1a2e',
  labelColor: '#ffffff',
  autoContrast: true,
  showDateTime: true,
  showPrimaryAction: true,
  showOrganizer: false,
  showQr: true,
};

export default function NewEventWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [eventDetails, setEventDetails] = useState<EventDetailsData>(defaultEventDetails);
  const [ticketDesign, setTicketDesign] = useState<TicketDesignData>(defaultTicketDesign);
  const [isPublishing, setIsPublishing] = useState(false);

  const handleSaveDraft = () => {
    console.log('Saving draft:', { eventDetails, ticketDesign });
  };

  const handleContinueToDesign = () => {
    setCompletedSteps([1]);
    setCurrentStep(2);
  };

  const handleBackToDetails = () => {
    setCurrentStep(1);
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const newEventId = Date.now().toString();
    navigate(`/dashboard/events/${newEventId}?published=true`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-8 py-8">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Events
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">New Event</h1>
          <p className="text-sm text-gray-500 mt-1">
            Set up your event and ticket once. You'll issue attendee tickets automatically after publishing.
          </p>
        </div>

        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-3">
            <div className="sticky top-8">
              <WizardStepper
                steps={steps}
                currentStep={currentStep}
                completedSteps={completedSteps}
              />
            </div>
          </div>

          <div className="col-span-9">
            <div className="bg-gray-50 rounded-2xl">
              {currentStep === 1 && (
                <EventDetailsStep
                  data={eventDetails}
                  onChange={setEventDetails}
                  onSaveDraft={handleSaveDraft}
                  onContinue={handleContinueToDesign}
                />
              )}

              {currentStep === 2 && (
                <TicketDesignStep
                  eventData={eventDetails}
                  designData={ticketDesign}
                  onChange={setTicketDesign}
                  onBack={handleBackToDetails}
                  onSaveDraft={handleSaveDraft}
                  onPublish={handlePublish}
                  isPublishing={isPublishing}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
