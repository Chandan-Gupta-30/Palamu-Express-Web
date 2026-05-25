import { useEffect, useRef, useState } from "react";

export const WebcamCapture = ({ value, onCapture }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [streamActive, setStreamActive] = useState(false);

  useEffect(() => {
    return () => {
      const stream = videoRef.current?.srcObject;
      stream?.getTracks()?.forEach((track) => track.stop());
    };
  }, []);

  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      setStreamActive(true);
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject;
    stream?.getTracks()?.forEach((track) => track.stop());
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
  };

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    let width = video.videoWidth;
    let height = video.videoHeight;
    const maxDim = 1000;

    if (width > height) {
      if (width > maxDim) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      }
    } else {
      if (height > maxDim) {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, width, height);

    const compressedBase64 = canvas.toDataURL("image/jpeg", 0.75);
    onCapture(compressedBase64);
    stopCamera();
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.04]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-xs font-bold text-slate-200">Live Photo Capture</p>
          <p className="text-[10px] text-slate-500 leading-normal">Required for chief editor enrollment.</p>
        </div>
        <div className="flex gap-2">
          {!streamActive ? (
            <button type="button" onClick={startCamera} className="rounded-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 transition-all duration-300 px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-orange-950/20 shrink-0">
              Start Camera
            </button>
          ) : (
            <>
              <button type="button" onClick={capture} className="rounded-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 transition-all duration-300 px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-green-950/20 shrink-0">
                Capture
              </button>
              <button type="button" onClick={stopCamera} className="rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-300 px-4 py-2 text-xs font-semibold text-slate-300">
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      <video ref={videoRef} autoPlay playsInline muted className={`mt-4 w-full max-h-56 rounded-xl border border-white/10 shadow-inner ${streamActive ? "block animate-fadeIn" : "hidden"}`} />
      <canvas ref={canvasRef} className="hidden" />

      {value ? (
        <div className="mt-4 flex h-40 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-slate-950/40 p-1.5 shadow-inner group">
          <img src={value} alt="Live capture headshot" className="h-full w-full rounded-lg object-contain transition-transform duration-500 group-hover:scale-105" />
        </div>
      ) : (
        !streamActive && (
          <div className="mt-4 flex h-40 items-center justify-center rounded-xl border border-dashed border-white/10 text-xs text-slate-500 bg-slate-950/20">
            No live photo captured yet
          </div>
        )
      )}
    </div>
  );
};

