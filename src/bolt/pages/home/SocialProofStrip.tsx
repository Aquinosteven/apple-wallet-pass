const stats = [
  { value: '12,000+', label: 'passes delivered' },
  { value: '500+', label: 'active teams' },
  { value: '99.9%', label: 'delivery reliability' },
  { value: '<2s', label: 'pass generation' },
];

export default function SocialProofStrip() {
  return (
    <section className="py-6 bg-gray-50/80 border-y border-gray-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          {stats.map(({ value, label }) => (
            <div key={label} className="text-center flex-1">
              <p className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
