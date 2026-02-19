export default function SupabaseNotConfigured() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 py-16">
      <div className="max-w-xl text-center bg-white border border-amber-200 rounded-2xl shadow-sm p-8">
        <h1 className="text-xl font-semibold text-gray-900">Supabase not configured</h1>
        <p className="mt-3 text-sm text-gray-600">
          This page requires a Supabase connection. Set
          <code className="mx-1">VITE_SUPABASE_URL</code>
          and
          <code className="mx-1">VITE_SUPABASE_ANON_KEY</code>
          to enable database-backed views.
        </p>
      </div>
    </div>
  );
}
