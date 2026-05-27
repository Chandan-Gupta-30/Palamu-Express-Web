import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
  ShieldCheck, 
  ShieldAlert, 
  MapPin, 
  User, 
  Calendar, 
  Award, 
  ExternalLink,
  ChevronRight,
  Search,
  CheckCircle2,
  Copy,
  Building,
  Smartphone
} from "lucide-react";
import { http } from "../api/http";

export const VerificationPage = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [manualCode, setManualCode] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!code) return;
    
    setLoading(true);
    setError(null);
    setUser(null);
    
    http.get(`/users/verify/${code}`)
      .then(({ data }) => {
        setUser(data.user);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Verification error:", err);
        setError(err.response?.data?.message || "Accreditation credentials could not be verified.");
        setLoading(false);
      });
  }, [code]);

  const handleManualSearch = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      navigate(`/verify/${manualCode.trim().toUpperCase()}`);
      setManualCode("");
    }
  };

  const copyCode = async () => {
    if (!user) return;
    const staffCode = user.role === "chief_editor" ? user.chiefEditorCode : user.reporterCode;
    try {
      await navigator.clipboard.writeText(staffCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  };

  return (
    <div className="min-h-screen bg-[#070b13] text-white flex flex-col justify-between py-12 px-4 relative overflow-hidden">
      
      {/* Background dynamic ambient glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-orange-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-4xl mx-auto flex-grow flex flex-col justify-center">
        
        {/* Branding Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block transition-transform hover:scale-102">
            <span className="text-2xl font-extrabold tracking-tight text-white">
              PALAMU <span className="text-orange-500">EXPRESS</span>
            </span>
            <div className="text-[10px] tracking-[0.3em] text-orange-400 font-bold uppercase mt-0.5">
              Digital Media Accreditation Board
            </div>
          </Link>
        </div>

        {/* LOADING STATE */}
        {loading && (
          <div className="panel p-12 text-center flex flex-col items-center justify-center min-h-[400px] border border-white/5 bg-slate-950/40 backdrop-blur-md rounded-2xl">
            <div className="relative w-16 h-16 mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-orange-500/20" />
              <div className="absolute inset-0 rounded-full border-4 border-t-orange-500 animate-spin" />
            </div>
            <p className="text-slate-400 text-sm tracking-widest uppercase">Querying Secure Database...</p>
            <p className="text-slate-500 text-xs mt-2">Checking accreditation code: {code}</p>
          </div>
        )}

        {/* ERROR STATE / INVALID CREDENTIALS */}
        {!loading && error && (
          <div className="panel p-8 md:p-12 border-2 border-red-500/30 bg-slate-950/60 backdrop-blur-lg rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.15)] flex flex-col items-center text-center">
            
            <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <ShieldAlert className="h-10 w-10 text-red-500" />
            </div>

            <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full mb-4">
              Verification Failed
            </span>

            <h1 className="text-2xl font-black text-white tracking-tight sm:text-3xl">
              Accreditation Record Invalid
            </h1>

            <p className="text-slate-300 text-sm leading-relaxed max-w-xl mt-4">
              The accreditation token <span className="text-red-400 font-mono font-bold bg-slate-900 px-2 py-0.5 rounded border border-white/5">{code}</span> does not match any active reporter or chief editor registered in our system.
            </p>

            <div className="my-6 p-4 rounded-xl bg-red-950/20 border border-red-900/30 text-[11px] text-red-300 max-w-lg leading-relaxed text-left">
              <span className="font-bold block mb-1">⚠️ SECURITY ALERT:</span>
              If this URL was scanned from a physical identity card, the card may be counterfeit, expired, or suspended. Please report this immediately to the administrative team at <span className="text-white font-semibold">contact@palamuexpress.com</span>.
            </div>

            {/* Quick manual re-lookup form */}
            <div className="w-full max-w-md mt-6 border-t border-white/10 pt-6">
              <p className="text-xs text-slate-400 mb-3 font-semibold uppercase tracking-wider">Manual Credentials Verification</p>
              <form onSubmit={handleManualSearch} className="flex gap-2">
                <div className="relative flex-grow">
                  <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-500 h-4 w-4" />
                  <input
                    type="text"
                    required
                    placeholder="Enter Code (e.g., CED-707539)"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    className="w-full bg-slate-900/80 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all uppercase"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs px-5 rounded-xl uppercase tracking-wider transition"
                >
                  Verify
                </button>
              </form>
            </div>

            <div className="mt-8 flex gap-4">
              <Link
                to="/"
                className="text-xs text-slate-400 hover:text-white transition font-medium flex items-center gap-1"
              >
                ← Back to Home
              </Link>
            </div>

          </div>
        )}

        {/* SUCCESS STATE / VERIFIED ACCREDITATION */}
        {!loading && !error && user && (
          <div className="panel border-2 border-emerald-500/40 bg-slate-950/70 backdrop-blur-xl rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.15)]">
            
            {/* Top Verified Header Bar */}
            <div className="bg-emerald-950/30 border-b border-emerald-500/20 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)] animate-pulse">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="text-center sm:text-left">
                  <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest leading-none block mb-0.5">ACCREDITATION AUDIT</span>
                  <span className="text-white text-sm font-black tracking-wide">AUTHENTIC CREDENTIAL RECORD</span>
                </div>
              </div>
              
              <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-[0.15em] px-4 py-1.5 rounded-full shadow-inner animate-pulse flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                Active / Verified
              </span>
            </div>

            {/* Profile Content Body */}
            <div className="p-6 md:p-8">
              
              {/* Profile Pictures Visual Comparison Grid */}
              <div className="flex flex-col md:flex-row gap-6 items-center justify-between mb-8 pb-8 border-b border-white/5">
                
                {/* Visual Identity Title */}
                <div className="text-center md:text-left flex-grow">
                  <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight leading-none mb-2">
                    {user.fullName}
                  </h1>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                    <span className="bg-orange-500/10 border border-orange-500/20 text-orange-400 font-extrabold tracking-wider text-[10px] uppercase px-3 py-1 rounded">
                      {user.role === "chief_editor" ? "Chief Editor" : "Reporter"}
                    </span>
                    <span className="text-slate-500 text-xs font-medium">Accredited under platform parameters.</span>
                  </div>
                </div>

                {/* Photo Gallery (Registration & Live verification) */}
                <div className="flex gap-4 flex-shrink-0">
                  
                  {/* Photo 1: Registration Profile Image */}
                  <div className="flex flex-col items-center">
                    <div className="w-24 h-28 rounded-xl border border-white/10 overflow-hidden bg-slate-900 flex items-center justify-center p-0.5">
                      <img
                        src={user.profilePhotoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80"}
                        alt="Registration Profile"
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Profile Photo</span>
                  </div>

                  {/* Photo 2: Live selfie image */}
                  {user.livePhotoUrl && (
                    <div className="flex flex-col items-center">
                      <div className="w-24 h-28 rounded-xl border border-orange-500/30 overflow-hidden bg-slate-900 flex items-center justify-center p-0.5">
                        <img
                          src={user.livePhotoUrl}
                          alt="Live Verification Selfie"
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>
                      <span className="text-[8px] font-bold text-orange-400 uppercase tracking-widest mt-1">Live Selfie</span>
                    </div>
                  )}

                </div>
              </div>

              {/* Identity Specifications Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                
                {/* left Column */}
                <div className="space-y-4">
                  
                  {/* Accreditation Code */}
                  <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-400">
                        <Award className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-widest block mb-0.5">Accreditation Code</span>
                        <span className="text-white font-mono font-bold tracking-wider">
                          {user.role === "chief_editor" ? user.chiefEditorCode : user.reporterCode}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={copyCode}
                      className={`h-8 w-8 rounded-lg flex items-center justify-center border transition ${
                        copied 
                          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" 
                          : "bg-white/5 border-white/10 hover:bg-white/10 text-slate-400"
                      }`}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Platform Authority */}
                  <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400">
                      <Building className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-widest block mb-0.5">Platform Affiliation</span>
                      <span className="text-white text-xs font-bold uppercase tracking-wider block">PALAMU EXPRESS DIGITAL MEDIA</span>
                      <span className="text-slate-400 text-[9px] leading-none mt-0.5 block">palamuexpress.com | .in | .live</span>
                    </div>
                  </div>

                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  
                  {/* Jurisdiction / Location */}
                  <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-9 h-9 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-widest block mb-0.5">Jurisdiction Area</span>
                      <span className="text-white text-xs font-bold block">
                        {user.area || "Block"}, {user.district || "District"}
                      </span>
                      <span className="text-slate-400 text-[9px] uppercase font-bold tracking-wider leading-none mt-0.5 block">State: Jharkhand, India</span>
                    </div>
                  </div>

                  {/* Date Approved / Joined */}
                  <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-9 h-9 bg-teal-500/10 rounded-xl flex items-center justify-center text-teal-400">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-widest block mb-0.5">Accreditation Date</span>
                      <span className="text-white text-xs font-bold block">
                        {formatDate(user.createdAt)}
                      </span>
                      <span className="text-slate-400 text-[9px] leading-none mt-0.5 block">Official registration timestamp</span>
                    </div>
                  </div>

                </div>

              </div>

              {/* Disclaimer Panel */}
              <div className="mt-6 p-5 rounded-2xl bg-slate-900/40 border border-white/5 text-[11px] leading-relaxed text-slate-400">
                <span className="font-bold text-white block mb-1">Official Legal Notice:</span>
                This portal guarantees that the staff identity holder listed above is an authorized representative of **Palamu Express Digital Media**. They are entitled to capture news reporting, interview public officials, and record digital stories within their approved jurisdiction area of Garhwa, Jharkhand. All authorities and administrative bodies are requested to extend support and cooperation.
              </div>

            </div>

            {/* Bottom Footer Actions */}
            <div className="bg-slate-950/80 border-t border-white/5 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-[10px] text-slate-500 font-mono">Token ID: {user._id}</span>
              
              <div className="flex gap-4">
                <a
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/5 hover:bg-white/10 text-white font-bold text-xs px-4 py-2 rounded-xl transition border border-white/10 flex items-center gap-1.5"
                >
                  Visit Portal
                  <ExternalLink className="h-3 w-3" />
                </a>
                
                {user.idCardUrl && (
                  <a
                    href={user.idCardUrl}
                    download={`Palamu_Express_Accreditation_${user.fullName.replace(/\s+/g, "_")}.pdf`}
                    className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-lg shadow-orange-950/20 flex items-center gap-1.5"
                  >
                    Get ID Document
                  </a>
                )}
              </div>
            </div>

          </div>
        )}

        {/* Manual lookup input form below success block as well, for extreme flexibility */}
        {!loading && !error && user && (
          <div className="mt-8 text-center max-w-sm mx-auto">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3">Accreditation Quick Lookup</p>
            <form onSubmit={handleManualSearch} className="flex gap-2">
              <input
                type="text"
                required
                placeholder="Lookup another code"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="w-full bg-slate-950/60 border border-white/5 rounded-xl py-2 px-3 text-xs font-mono text-center text-white placeholder-slate-600 focus:outline-none focus:border-white/10 transition uppercase"
              />
              <button
                type="submit"
                className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-4 rounded-xl text-xs uppercase tracking-wider font-bold transition"
              >
                Go
              </button>
            </form>
          </div>
        )}

      </div>

      {/* Corporate Board Footer Tagline */}
      <div className="w-full text-center mt-12 border-t border-white/5 pt-6 text-[10px] text-slate-500 tracking-wider">
        <span>© {new Date().getFullYear()} PALAMU EXPRESS DIGITAL MEDIA. All Rights Reserved.</span>
        <div className="mt-1 text-slate-600">Garhwa, Jharkhand, India. Contact: palamuexpress.com</div>
      </div>

    </div>
  );
};
