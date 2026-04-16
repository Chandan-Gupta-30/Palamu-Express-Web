export const PrivacyPolicyPage = () => (
  <div className="mx-auto max-w-4xl space-y-8 px-4 py-12">
    <div className="panel p-8">
      <p className="text-sm uppercase tracking-[0.28em] text-orange-300">Privacy Policy</p>
      <h1 className="mt-3 font-display text-4xl text-white">Privacy Policy</h1>
      <p className="mt-4 text-sm leading-7 text-slate-400">
        Palamu Express collects only the information needed to operate a district-focused digital news platform,
        manage newsroom accounts, and provide reader-facing services safely and transparently.
      </p>
    </div>

    <div className="panel space-y-6 p-8">
      <section>
        <h2 className="text-2xl font-semibold text-white">Information We Collect</h2>
        <p className="mt-3 text-sm leading-7 text-slate-400">
          We may collect account details such as name, phone number, email address, district, area, and newsroom verification
          records for enrolled reporters and chief editors. Reader-side interactions such as saved stories, page views, and search
          activity may also be processed to improve newsroom performance and content delivery.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">How Information Is Used</h2>
        <p className="mt-3 text-sm leading-7 text-slate-400">
          Data is used for authentication, role-based newsroom access, editorial review workflows, saved story features,
          analytics, and platform security. Verification images and onboarding details are used only for account review and
          internal publishing operations.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">Data Security</h2>
        <p className="mt-3 text-sm leading-7 text-slate-400">
          We use reasonable technical and operational safeguards to protect account and newsroom data. While no digital platform
          can guarantee absolute security, Palamu Express aims to limit access to sensitive information to authorized workflows only.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">Contact</h2>
        <p className="mt-3 text-sm leading-7 text-slate-400">
          For privacy-related queries, contact the newsroom desk at <span className="text-white">desk@palamuexpress.in</span>.
        </p>
      </section>
    </div>
  </div>
);
