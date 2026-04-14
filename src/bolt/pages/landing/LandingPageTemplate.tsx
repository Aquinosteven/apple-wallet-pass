import { ArrowRight, CheckCircle2, LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface RelatedLink {
  to: string;
  label: string;
}

interface LandingPageTemplateProps {
  badgeLabel: string;
  badgeIcon: LucideIcon;
  accentClassName: string;
  badgeBorderClassName: string;
  badgeTextClassName: string;
  primaryButtonClassName: string;
  title: string;
  description: string;
  benefits: string[];
  reasonsTitle: string;
  reasonsDescription: string;
  reasons: string[];
  relatedLinks: RelatedLink[];
}

export default function LandingPageTemplate({
  badgeLabel,
  badgeIcon: BadgeIcon,
  accentClassName,
  badgeBorderClassName,
  badgeTextClassName,
  primaryButtonClassName,
  title,
  description,
  benefits,
  reasonsTitle,
  reasonsDescription,
  reasons,
  relatedLinks,
}: LandingPageTemplateProps) {
  return (
    <div className="bg-white">
      <section className={`pt-24 pb-12 lg:pt-28 lg:pb-16 bg-gradient-to-b ${accentClassName} via-white to-white`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div
              className={`inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-semibold ${badgeBorderClassName} ${badgeTextClassName}`}
            >
              <BadgeIcon className="w-4 h-4" />
              {badgeLabel}
            </div>
            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight leading-tight">
              {title}
            </h1>
            <p className="mt-5 max-w-2xl text-base sm:text-lg text-gray-600 leading-relaxed">
              {description}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/pricing"
                className={`inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-white transition-colors ${primaryButtonClassName}`}
              >
                See pricing
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/waitlist"
                className="inline-flex items-center rounded-lg border border-gray-200 px-5 py-3 text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Join waitlist
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-5 md:grid-cols-3">
            {benefits.map((benefit) => (
              <div key={benefit} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <CheckCircle2 className={`w-5 h-5 ${badgeTextClassName}`} />
                <p className="mt-3 text-sm text-gray-700 leading-relaxed">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-gray-200 bg-gray-50/70 p-6 sm:p-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{reasonsTitle}</h2>
            <p className="mt-3 max-w-3xl text-sm sm:text-base text-gray-600 leading-relaxed">
              {reasonsDescription}
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-3">
              {reasons.map((item) => (
                <li key={item} className="rounded-xl border border-white bg-white p-4 text-sm text-gray-700">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Related ways to use ShowFi.io</h2>
            <div className="mt-5 flex flex-wrap gap-3">
              {relatedLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="inline-flex items-center rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
