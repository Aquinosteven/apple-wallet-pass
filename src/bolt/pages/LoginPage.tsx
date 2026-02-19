import { useNavigate } from 'react-router-dom';
import { ArrowRight, Wallet } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/80 px-4">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-navy flex items-center justify-center mx-auto shadow-lg shadow-navy/15">
            <Wallet className="w-6 h-6 text-white" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <div className="text-center mb-6">
            <h1 className="text-xl font-semibold text-gray-900">No auth implemented yet</h1>
            <p className="mt-1.5 text-sm text-gray-500">
              Authentication is disabled for now. Continue to the dashboard to work with placeholder data.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            Continue to Dashboard
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="mt-4 text-center text-xs text-gray-400">
            No redirects or sessions are enabled in this build.
          </p>
        </div>
      </div>
    </div>
  );
}
