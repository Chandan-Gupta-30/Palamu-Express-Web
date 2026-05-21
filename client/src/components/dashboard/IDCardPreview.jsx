import React, { useState, useEffect } from "react";
import { Download, Printer, RefreshCw, ShieldCheck } from "lucide-react";

export const IDCardPreview = ({ profile, cardUrl }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [blobUrl, setBlobUrl] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!cardUrl) return;
    try {
      const parts = cardUrl.split(",");
      const base64Data = parts[1] || parts[0];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);

      return () => {
        if (url) {
          URL.revokeObjectURL(url);
        }
      };
    } catch (e) {
      console.error("Failed to generate Blob URL for ID card", e);
    }
  }, [cardUrl]);

  if (!profile) return null;

  const isChiefEditor = profile.role === "chief_editor";
  const roleLabel = isChiefEditor ? "Chief Editor" : "Reporter";
  const staffCode = isChiefEditor ? profile.chiefEditorCode || "PENDING" : profile.reporterCode || "PENDING";
  const photoUrl = isChiefEditor
    ? profile.livePhotoUrl || profile.profilePhotoUrl
    : profile.profilePhotoUrl || profile.livePhotoUrl;

  const verifyUrl = `${window.location.origin}/verify/${staffCode}`;

  const handlePrint = (e) => {
    e.preventDefault();
    if (!blobUrl) return;
    const printWindow = window.open(blobUrl, "_blank");
    if (printWindow) {
      printWindow.focus();
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy verification link", err);
    }
  };

  return (
    <div className="panel p-6 flex flex-col items-center justify-between h-full min-h-[480px]">
      {/* Cursive Google Font for Signatures */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Alex+Brush&display=swap');
        
        .card-perspective {
          perspective: 1000px;
        }
        .card-inner {
          position: relative;
          width: 350px;
          height: 220px;
          transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          transform-style: preserve-3d;
        }
        .card-inner.flipped {
          transform: rotateY(180deg);
        }
        .card-front, .card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .card-back {
          transform: rotateY(180deg);
        }
        .cursive-signature {
          font-family: 'Alex Brush', cursive;
        }
      `}</style>

      {/* Panel Header */}
      <div className="w-full text-center sm:text-left mb-4">
        <div className="flex items-center justify-center sm:justify-start gap-2">
          <ShieldCheck className="h-5 w-5 text-orange-500" />
          <h2 className="text-xl font-semibold text-white">Identity Credentials</h2>
        </div>
        <p className="text-xs text-slate-400 mt-1">Official Digital Accreditation Staff ID Card</p>
      </div>

      {/* 3D Flippable Card Container */}
      <div 
        className="card-perspective my-auto cursor-pointer"
        onClick={() => setIsFlipped(!isFlipped)}
        title="Click to Flip Card"
      >
        <div className={`card-inner ${isFlipped ? "flipped" : ""}`}>
          
          {/* FRONT SIDE */}
          <div className="card-front bg-[#0b0f19] border-2 border-orange-500/80 flex flex-col justify-between">
            {/* Header Accent Strip */}
            <div className="h-2 bg-orange-600 w-full" />
            
            {/* Logo and Subtext */}
            <div className="px-4 pt-2.5 flex items-center justify-between">
              <div>
                <span className="text-white font-extrabold text-sm tracking-tight">PALAMU EXPRESS</span>
                <span className="text-orange-500 font-extrabold text-[10px] tracking-normal ml-1">DIGITAL MEDIA</span>
              </div>
            </div>
            <div className="px-4 text-[7px] text-slate-400 tracking-tight leading-none mt-[-2px]">
              Websites: palamuexpress.com | palamuexpress.in | palamuexpress.live
            </div>

            {/* Divider */}
            <div className="mx-4 my-1.5 border-b border-slate-800/80" />

            {/* Grid Layout (Details + Photo) */}
            <div className="px-4 flex gap-3 flex-grow">
              
              {/* Left Side: Text Details */}
              <div className="flex flex-col flex-grow justify-start w-[190px]">
                <h3 className="text-white font-bold text-[13px] tracking-tight uppercase line-clamp-1 mb-1.5">
                  {profile.fullName}
                </h3>
                
                <div className="grid grid-cols-[55px_1fr] gap-x-1 gap-y-1 text-[8px] leading-tight">
                  <span className="text-slate-500 font-medium tracking-wide">ID CODE:</span>
                  <span className="text-orange-400 font-bold tracking-wider">{staffCode}</span>

                  <span className="text-slate-500 font-medium tracking-wide">DISTRICT:</span>
                  <span className="text-slate-200 font-semibold">{profile.district || "-"}</span>

                  <span className="text-slate-500 font-medium tracking-wide">BLOCK:</span>
                  <span className="text-slate-200 font-semibold">{profile.area || "-"}</span>

                  <span className="text-slate-500 font-medium tracking-wide">PHONE:</span>
                  <span className="text-slate-200 font-semibold">{profile.phone || "-"}</span>

                  <span className="text-slate-500 font-medium tracking-wide">EMAIL:</span>
                  <span className="text-slate-200 font-semibold truncate w-[130px]">{profile.email || "-"}</span>
                </div>
              </div>

              {/* Right Side: Photo and Role */}
              <div className="flex flex-col items-center flex-shrink-0 w-[80px]">
                <div className="w-[74px] h-[86px] rounded-md border border-orange-500/60 overflow-hidden bg-slate-900 flex items-center justify-center">
                  {photoUrl ? (
                    <img 
                      src={photoUrl} 
                      alt="Profile" 
                      className="w-full h-full object-cover object-center" 
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80";
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-[7px] text-slate-500 p-1 text-center">
                      <span>NO</span>
                      <span>PHOTO</span>
                    </div>
                  )}
                </div>
                
                {/* Role Ribbon */}
                <div className="w-[74px] mt-1 bg-orange-600 text-white text-[7px] font-extrabold text-center py-0.5 rounded tracking-wider uppercase">
                  {roleLabel}
                </div>
              </div>

            </div>

            {/* Signatory & Divider */}
            <div className="px-4 pb-2.5 flex items-end justify-between">
              <div className="flex flex-col">
                <div className="h-[0.5px] w-[140px] bg-slate-800" />
                <span className="cursive-signature text-[12px] text-sky-400 font-semibold tracking-wide leading-none mt-1">
                  Pankaj Kumar Gupta
                </span>
                <span className="text-[6px] font-bold text-slate-500 tracking-wider leading-none mt-0.5">
                  AUTHORIZED SIGNATORY
                </span>
              </div>
            </div>
          </div>

          {/* BACK SIDE */}
          <div className="card-back bg-[#080b12] border-2 border-orange-500/80 flex flex-col justify-between">
            {/* Header Accent Strip */}
            <div className="h-2 bg-orange-600 w-full" />

            {/* Official Disclaimer */}
            <div className="px-4 pt-3 text-center">
              <p className="text-[7.5px] leading-relaxed text-slate-300 font-medium">
                This card is official property of <span className="text-white font-semibold">PALAMU EXPRESS DIGITAL MEDIA</span>. 
                If found, please return to office or contact administration.
              </p>
            </div>

            {/* Grid Layout (Verifiable QR Code + Barcode) */}
            <div className="px-4 flex gap-4 items-center justify-center flex-grow mt-[-4px]">
              
              {/* QR Code Column */}
              <div className="flex flex-col items-center gap-0.5">
                <div className="w-[48px] h-[48px] bg-white p-0.5 rounded border border-slate-700/50 flex items-center justify-center shadow-md">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(verifyUrl)}&color=0b0f19`}
                    alt="Verification QR Code" 
                    className="w-full h-full"
                  />
                </div>
                <span className="text-[5px] text-orange-400 font-extrabold tracking-widest leading-none mt-0.5">SCAN TO VERIFY</span>
              </div>

              {/* Barcode Column */}
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex items-center justify-center bg-white/95 px-3 py-1 rounded-sm shadow-md h-[30px] w-[110px]">
                  <div className="flex items-stretch h-5 bg-black text-black select-none gap-[1px]">
                    <div className="w-[2px] bg-black"></div>
                    <div className="w-[1px] bg-black"></div>
                    <div className="w-[3px] bg-black"></div>
                    <div className="w-[1px] bg-black"></div>
                    <div className="w-[2px] bg-black"></div>
                    <div className="w-[1px] bg-black"></div>
                    <div className="w-[2px] bg-black"></div>
                    <div className="w-[3px] bg-black"></div>
                    <div className="w-[1px] bg-black"></div>
                    <div className="w-[2px] bg-black"></div>
                    <div className="w-[1px] bg-black"></div>
                    <div className="w-[3px] bg-black"></div>
                    <div className="w-[2px] bg-black"></div>
                    <div className="w-[1px] bg-black"></div>
                  </div>
                </div>
                <span className="text-[7px] font-mono tracking-widest text-slate-400 mt-0.5 uppercase">
                  {staffCode}
                </span>
              </div>
              
            </div>

            {/* Footer Jurisdiction bar */}
            <div className="bg-slate-900 border-t border-slate-800/80 py-1 text-center">
              <span className="text-[7.5px] font-extrabold text-orange-500 tracking-widest">
                JURISDICTION: GARHWA, JHARKHAND
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Card Actions Panel */}
      <div className="w-full flex items-center justify-center gap-3 mt-4">
        <button
          type="button"
          onClick={() => setIsFlipped(!isFlipped)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 transition"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Flip ID Card
        </button>
        
        {blobUrl ? (
          <>
            <a
              href={blobUrl}
              download={`Palamu_Express_ID_Card_${profile.fullName.replace(/\s+/g, "_")}.pdf`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-orange-600 text-white hover:bg-orange-500 transition shadow-lg shadow-orange-950/20"
            >
              <Download className="h-3.5 w-3.5" />
              Download PDF
            </a>
            
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-white text-slate-900 hover:bg-slate-100 transition shadow-md"
            >
              <Printer className="h-3.5 w-3.5" />
              Print Card
            </button>
          </>
        ) : (
          <span className="text-[11px] text-slate-500 italic">Official PDF generating...</span>
        )}
      </div>

      {/* Verification Link Share Section */}
      <div className="w-full mt-6 pt-4 border-t border-white/10 flex flex-col gap-2">
        <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-orange-400 text-center sm:text-left">
          Online Verification Profile
        </span>
        
        <div className="flex items-center gap-2 bg-slate-950/50 border border-white/5 rounded-2xl p-2 pl-3">
          <input 
            type="text" 
            readOnly 
            value={verifyUrl}
            className="flex-grow bg-transparent border-0 p-0 text-[11px] font-mono text-slate-300 focus:ring-0 focus:outline-none select-all"
            onClick={(e) => e.target.select()}
          />
          
          <button
            type="button"
            onClick={handleCopy}
            className={`flex items-center justify-center min-w-[70px] px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition ${
              copied 
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20" 
                : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
            }`}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium px-1">
          <span>Public audit is fully secure.</span>
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent("Verify my Palamu Express digital media accreditation status online here: " + verifyUrl)}`}
            target="_blank"
            rel="noreferrer"
            className="text-orange-400 hover:text-orange-300 font-bold transition flex items-center gap-1"
          >
            Share on WhatsApp →
          </a>
        </div>
      </div>
    </div>
  );
};
