export default function TermsPage() {
  return (
    <section className="min-h-[calc(100vh-8rem)] bg-white">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gblue">Legal</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-900">Terms of Use</h1>
        <p className="mt-4 text-base text-gray-600">
          These terms govern your access to ShowFi and the services we provide for wallet-pass delivery, reminders,
          reporting, and account management.
        </p>

        <div className="mt-10 space-y-8 text-sm leading-7 text-gray-700">
          <section>
            <h2 className="text-lg font-semibold text-gray-900">Service scope</h2>
            <p className="mt-2">
              ShowFi helps teams issue wallet passes, manage campaign and event flows, and review related activity.
              You agree to use the service lawfully and only for workflows you are authorized to run.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">Accounts and security</h2>
            <p className="mt-2">
              You are responsible for maintaining the confidentiality of your credentials and for activity performed
              through your account. Contact us promptly if you believe your account has been accessed without permission.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">Billing and cancellations</h2>
            <p className="mt-2">
              Paid plans renew according to the billing cadence you select. You may cancel future renewals, and service
              remains available through the active billing period unless otherwise stated in your agreement.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">Acceptable use</h2>
            <p className="mt-2">
              You may not use ShowFi to send unlawful, deceptive, or abusive content, or to interfere with the service,
              our infrastructure, or other customers’ access to the platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">Contact</h2>
            <p className="mt-2">
              Questions about these terms can be sent to <a className="text-gblue hover:underline" href="mailto:hello@showfi.io">hello@showfi.io</a>.
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}
