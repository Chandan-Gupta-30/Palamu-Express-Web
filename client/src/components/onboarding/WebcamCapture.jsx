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

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    onCapture(canvas.toDataURL("image/png"));
    stopCamera();
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Live Photo Capture</p>
          <p className="mt-1 text-xs text-slate-500">Required for chief editor enrollment.</p>
        </div>
        <div className="flex gap-2">
          {!streamActive ? (
            <button type="button" onClick={startCamera} className="rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white">
              Start Camera
            </button>
          ) : (
            <>
              <button type="button" onClick={capture} className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white">
                Capture
              </button>
              <button type="button" onClick={stopCamera} className="rounded-full border border-white/10 px-4 py-2 text-sm text-white">
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      <video ref={videoRef} autoPlay playsInline muted className={`mt-4 w-full rounded-2xl ${streamActive ? "block" : "hidden"}`} />
      <canvas ref={canvasRef} className="hidden" />

      {value ? (
        <div className="mt-4 flex h-52 items-center justify-center overflow-hidden rounded-2xl bg-slate-950/40">
          <img src={value} alt="Live capture" className="h-full w-full object-contain" />
        </div>
      ) : (
        !streamActive && (
          <div className="mt-4 flex h-52 items-center justify-center rounded-2xl border border-dashed border-white/15 text-sm text-slate-400">
            No live photo captured yet
          </div>
        )
      )}
    </div>
  );
};
