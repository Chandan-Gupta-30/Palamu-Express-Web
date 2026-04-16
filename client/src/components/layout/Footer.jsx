import { Link } from "react-router-dom";
import { jharkhandDistricts } from "../../data/districts";

const quickLinks = [
  { label: "Home", to: "/" },
  { label: "Search", to: "/search" },
  { label: "Enrollment", to: "/register" },
  { label: "Login", to: "/login" },
  { label: "Contact Us", to: "/contact" },
  { label: "Privacy Policy", to: "/privacy-policy" },
  { label: "Terms & Conditions", to: "/terms-and-conditions" },
];
const coverageHighlights = ["Palamu", "Ranchi", "Dhanbad", "Dumka", "Garhwa", "Latehar"];

export const Footer = () => (
  <footer className="mt-16 border-t border-white/10">
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="grid gap-8 border-b border-white/10 pb-10 lg:grid-cols-[1.4fr_0.9fr_1fr_1fr]">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-3">
            <div className="rounded-2xl bg-orange-500 px-3 py-2 text-sm font-bold text-white">PE</div>
            <div>
              <h3 className="font-display text-2xl text-white">Palamu Express</h3>
              <p className="text-sm text-slate-500">Jharkhand-focused digital newsroom</p>
            </div>
          </div>
          <p className="max-w-xl text-sm leading-7 text-slate-400">
            Independent district-first reporting across Jharkhand with local updates, breaking news coverage, editorial review,
            and a publishing desk built for fast and credible regional journalism.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Coverage</p>
              <p className="mt-2 text-xl font-semibold text-white">{jharkhandDistricts.length} Districts</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Focus</p>
              <p className="mt-2 text-xl font-semibold text-white">Block-Level News</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Desk</p>
              <p className="mt-2 text-xl font-semibold text-white">Editorial Review</p>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Reader Links</h4>
          <div className="mt-4 grid gap-3">
            {quickLinks.map((item) => (
              <Link key={item.to} to={item.to} className="text-sm text-slate-400 transition hover:text-orange-300">
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Jharkhand Coverage</h4>
          <div className="mt-4 flex flex-wrap gap-2">
            {coverageHighlights.map((district) => (
              <span key={district} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-400">
                {district}
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-500">
            District, block, and area-level news tracking designed for readers across urban and rural Jharkhand.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Newsroom Desk</h4>
          <div className="mt-4 space-y-3 text-sm text-slate-400">
            <p>Email: desk@palamuexpress.in</p>
            <p>City Desk: Bishrampur, Ranka, Garhwa, Jharkhand 822125</p>
            <p>Coverage Hours: 6:00 AM to 11:00 PM</p>
            <p>Editorial Coordination: Reporter, Chief Editor, and Super Admin workflow</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 pt-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-4">
          <Link to="/privacy-policy" className="text-sm text-slate-500 transition hover:text-orange-300">
            Privacy Policy
          </Link>
          <Link to="/terms-and-conditions" className="text-sm text-slate-500 transition hover:text-orange-300">
            Terms & Conditions
          </Link>
          <Link to="/contact" className="text-sm text-slate-500 transition hover:text-orange-300">
            Contact Us
          </Link>
        </div>
        <p className="text-sm text-slate-500">
          © {new Date().getFullYear()} Palamu Express. Regional journalism for Jharkhand with local accountability and newsroom transparency.
        </p>
      </div>
    </div>
  </footer>
);
