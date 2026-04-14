export default function PrivacyPage() {
  return (
    <section className="min-h-[calc(100vh-8rem)] bg-white">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gblue">Legal</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-900">Privacy Policy</h1>
        <p className="mt-4 text-base text-gray-600">
          This page explains the information ShowFi collects to operate the product, support customers, and improve
          the reliability of wallet-pass and reminder workflows.
        </p>

        <div className="mt-10 space-y-8 text-sm leading-7 text-gray-700">
          <section>
            <h2 className="text-lg font-semibold text-gray-900">Information we collect</h2>
            <p className="mt-2">
              We collect account information, usage data, workflow configuration, and support communications needed to
              provide the service and maintain account security.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">How we use data</h2>
            <p className="mt-2">
              We use data to authenticate users, deliver product functionality, troubleshoot incidents, process billing,
              and communicate important service updates.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">Data sharing</h2>
            <p className="mt-2">
              We share information only with service providers and integrations required to run ShowFi, process payments,
              or comply with legal obligations.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">Retention and access</h2>
            <p className="mt-2">
              We retain information for as long as needed to operate the service, satisfy contractual obligations, and
              resolve disputes. You can contact us to request account-related privacy support.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">Contact</h2>
            <p className="mt-2">
              Privacy questions can be sent to <a className="text-gblue hover:underline" href="mailto:hello@showfi.io">hello@showfi.io</a>.
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}
