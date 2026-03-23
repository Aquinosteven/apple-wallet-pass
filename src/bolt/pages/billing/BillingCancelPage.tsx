import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

export default function BillingCancelPage() {
  const [params] = useSearchParams();
  const plan = params.get('plan');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
        <AlertCircle className="w-12 h-12 mx-auto text-amber-500" />
        <h1 className="mt-4 text-2xl font-semibold text-gray-900">Checkout canceled</h1>
        <p className="mt-2 text-sm text-gray-600">
          {plan ? `No charge was made for ${plan}. ` : ''}
          You can resume account setup any time.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
          <Link
            to={plan ? `/login?plan=${encodeURIComponent(plan)}` : '/login'}
            className="px-4 py-2.5 rounded-lg bg-gblue text-white text-sm font-semibold hover:bg-gblue-dark"
          >
            Return to billing
          </Link>
          <Link
            to="/"
            className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
