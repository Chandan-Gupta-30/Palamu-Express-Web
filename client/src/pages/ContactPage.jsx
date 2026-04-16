import { useState } from "react";
import { http } from "../api/http";

const initialForm = {
  fullName: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
};

export const ContactPage = () => {
  const [form, setForm] = useState(initialForm);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatusMessage("");
    setErrorMessage("");
    setSubmitting(true);

    try {
      const { data } = await http.post("/contact", form);
      setStatusMessage(data.message || "Message sent successfully.");
      setForm(initialForm);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Unable to send your message right now.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-12">
      <div className="panel p-8">
        <p className="text-sm uppercase tracking-[0.28em] text-orange-300">Contact Us</p>
        <h1 className="mt-3 font-display text-4xl text-white">Contact Us</h1>
        <p className="mt-4 text-sm leading-7 text-slate-400">
          Reach the Palamu Express newsroom for corrections, reader support, editorial coordination, advertising enquiries,
          or regional coverage feedback.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={handleSubmit} className="panel grid gap-4 p-8">
          <div>
            <h2 className="text-2xl font-semibold text-white">Send A Message</h2>
            <p className="mt-2 text-sm text-slate-500">Share your concern, correction request, support issue, or newsroom query.</p>
          </div>
          {statusMessage ? <p className="text-sm text-green-500">{statusMessage}</p> : null}
          {errorMessage ? <p className="text-sm text-rose-400">{errorMessage}</p> : null}
          <input
            autoFocus
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            placeholder="Full name"
            value={form.fullName}
            onChange={(event) => setForm({ ...form, fullName: event.target.value })}
          />
          <input
            type="email"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            placeholder="Email address"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
          <input
            inputMode="numeric"
            maxLength={10}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            placeholder="Phone number, optional"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value.replace(/\D/g, "").slice(0, 10) })}
          />
          <input
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            placeholder="Subject"
            value={form.subject}
            onChange={(event) => setForm({ ...form, subject: event.target.value })}
          />
          <textarea
            rows="6"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            placeholder="Describe your problem or message in detail"
            value={form.message}
            onChange={(event) => setForm({ ...form, message: event.target.value })}
          />
          <button disabled={submitting} className="rounded-2xl bg-orange-500 px-4 py-3 font-semibold text-white disabled:opacity-60">
            {submitting ? "Sending..." : "Send Message"}
          </button>
        </form>

        <div className="space-y-6">
          <div className="panel p-8">
            <h2 className="text-2xl font-semibold text-white">Newsroom Desk</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-400">
              <p>Email: desk@palamuexpress.in</p>
              <p>City Desk: Bishrampur, Ranka, Garhwa, Jharkhand 822125</p>
              <p>Coverage Hours: 6:00 AM to 11:00 PM</p>
              <p>Editorial Workflow: Reporter, Chief Editor, and Super Admin coordination</p>
            </div>
          </div>

          <div className="panel p-8">
            <h2 className="text-2xl font-semibold text-white">Support Guidance</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-400">
              <p>Use this form for corrections, account issues, editorial feedback, or publishing support.</p>
              <p>For advertising requests, mention campaign duration, preferred placement, and contact details.</p>
              <p>Super admin can review, update, and resolve contact requests directly from the dashboard.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
