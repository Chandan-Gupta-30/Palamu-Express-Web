export const MetricCard = ({ label, value, hint }) => (
  <div className="panel p-5">
    <p className="text-sm uppercase tracking-[0.2em] text-slate-500">{label}</p>
    <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
    <p className="mt-2 text-sm text-slate-500">{hint}</p>
  </div>
);
