import { Check } from 'lucide-react';

interface Step {
  id: number;
  label: string;
}

interface WizardStepperProps {
  steps: Step[];
  currentStep: number;
  completedSteps: number[];
}

export default function WizardStepper({ steps, currentStep, completedSteps }: WizardStepperProps) {
  return (
    <div className="space-y-1">
      {steps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted = completedSteps.includes(step.id);
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="relative">
            <div
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                ${isActive ? 'bg-gblue/8' : ''}
              `}
            >
              <div
                className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0 transition-colors
                  ${isCompleted
                    ? 'bg-ggreen text-white'
                    : isActive
                      ? 'bg-gblue text-white'
                      : 'bg-gray-100 text-gray-400'
                  }
                `}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5" /> : step.id}
              </div>
              <span
                className={`
                  text-sm font-medium transition-colors
                  ${isActive ? 'text-gray-900' : isCompleted ? 'text-gray-600' : 'text-gray-400'}
                `}
              >
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div className="absolute left-[22px] top-[42px] w-0.5 h-3 bg-gray-100" />
            )}
          </div>
        );
      })}
    </div>
  );
}
