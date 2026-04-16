export const TermsPage = () => (
  <div className="mx-auto max-w-4xl space-y-8 px-4 py-12">
    <div className="panel p-8">
      <p className="text-sm uppercase tracking-[0.28em] text-orange-300">Terms & Conditions</p>
      <h1 className="mt-3 font-display text-4xl text-white">Terms & Conditions</h1>
      <p className="mt-4 text-sm leading-7 text-slate-400">
        These terms govern the use of Palamu Express as a reader, enrolled newsroom member, or platform administrator.
      </p>
    </div>

    <div className="panel space-y-6 p-8">
      <section>
        <h2 className="text-2xl font-semibold text-white">Platform Use</h2>
        <p className="mt-3 text-sm leading-7 text-slate-400">
          Users must use the platform lawfully and must not misuse newsroom tools, publishing workflows, saved-story features,
          analytics access, or authentication systems.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">Editorial Responsibility</h2>
        <p className="mt-3 text-sm leading-7 text-slate-400">
          Reporters and chief editors are responsible for the accuracy, legality, and originality of the material they submit.
          Palamu Express reserves the right to review, reject, update, or remove submitted content under newsroom policy.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">Account Access</h2>
        <p className="mt-3 text-sm leading-7 text-slate-400">
          Users are responsible for protecting their credentials. The platform may suspend, restrict, or remove access where
          verification issues, policy violations, or security concerns are identified.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">Advertising and Sponsored Content</h2>
        <p className="mt-3 text-sm leading-7 text-slate-400">
          Sponsored placements are managed through platform controls and may be reviewed, hidden, reordered, or removed according
          to internal advertising standards and publishing priorities.
        </p>
      </section>
    </div>
  </div>
);
