import { useState } from "react";
import { termsData } from "../components/onboarding/TermsModal";

export const TermsPage = () => {
  const [lang, setLang] = useState("en"); // "en" or "hi"
  const data = termsData[lang];

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-12">
      <div className="panel p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-orange-300">Enrollment & Platform Policy</p>
          <h1 className="mt-3 font-display text-4xl text-white">Terms & Conditions</h1>
          <p className="mt-4 text-sm leading-7 text-slate-400">
            {lang === "en" ? "PALAMU EXPRESS – TERMS & CONDITIONS AGREEMENT" : "पलामू एक्सप्रेस – नियम और शर्तें समझौता"}<br />
            <span className="text-xs text-slate-500 font-semibold tracking-wider uppercase">
              {data.reporterAgreement}
            </span>
          </p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-4 text-xs text-slate-400">
            <p><span className="font-semibold text-slate-300">{data.effectiveDate}:</span> 21 {lang === "en" ? "May" : "मई"} 2026</p>
            <p><span className="font-semibold text-slate-300">{data.websites}:</span> palamuexpress.com | palamuexpress.in | palamuexpress.live</p>
            <p><span className="font-semibold text-slate-300">{data.jurisdiction}:</span> {lang === "en" ? "Garhwa" : "गढ़वा"}</p>
          </div>
        </div>

        {/* Language Toggle */}
        <div className="flex items-center gap-1 rounded-full bg-white/5 p-1 border border-white/10 self-start md:self-center">
          <button
            type="button"
            onClick={() => setLang("en")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${lang === "en" ? "bg-orange-500 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => setLang("hi")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${lang === "hi" ? "bg-orange-500 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}
          >
            हिंदी
          </button>
        </div>
      </div>

      <div className="panel space-y-8 p-8 text-slate-300 text-sm leading-7">
        {data.sections.map((section, idx) => (
          <section key={idx} className="space-y-3">
            <h2 className="text-xl font-bold text-white border-b border-white/5 pb-2">{section.title}</h2>
            {section.content && section.content.map((p, pIdx) => (
              <p key={pIdx}>{p}</p>
            ))}
            {section.bullets && (
              <ul className="list-disc pl-5 space-y-2 text-slate-400">
                {section.bullets.map((bullet, bIdx) => (
                  <li key={bIdx}>{bullet}</li>
                ))}
              </ul>
            )}
            {section.postContent && (
              <p>{section.postContent}</p>
            )}
            {section.subsections && (
              <div className="pl-4 space-y-4">
                {section.subsections.map((sub, sIdx) => (
                  <div key={sIdx}>
                    <h3 className="font-semibold text-white text-base">{sub.title}</h3>
                    <p className="text-slate-400 mt-1">{sub.content}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}

        <div className="mt-8 rounded-[24px] border border-white/10 bg-white/5 p-6 space-y-4">
          <p className="font-semibold text-white uppercase tracking-wider text-sm border-b border-white/10 pb-2">
            {data.acceptanceTitle}
          </p>
          <p className="text-xs text-slate-400 leading-6">
            {data.acceptanceText}
          </p>
          
          <div className="grid gap-4 md:grid-cols-2 pt-4 border-t border-white/10 text-xs text-slate-400">
            <div>
              <p className="font-semibold text-white text-sm">
                {lang === "en" ? "PALAMU EXPRESS DIGITAL MEDIA" : "पलामू एक्सप्रेस डिजिटल मीडिया"}
              </p>
              <p className="text-slate-400">{data.hyperLocalText}</p>
            </div>
            <div className="md:text-right">
              <p><span className="text-slate-300 font-semibold">{data.authorizedBy}:</span> {lang === "en" ? "Pankaj Kumar Gupta" : "पंकज कुमार गुप्ता"}</p>
              <p><span className="text-slate-300 font-semibold">{data.dateText}:</span> 21 {lang === "en" ? "May" : "मई"} 2026</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
