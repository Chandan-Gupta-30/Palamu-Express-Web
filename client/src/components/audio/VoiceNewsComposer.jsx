import { useEffect, useMemo, useRef, useState } from "react";
import { Languages, Mic, Radio, RotateCcw, Square, Volume2, Waves, X } from "lucide-react";
import { http } from "../../api/http";
import { jharkhandBlocksByDistrict, jharkhandDistricts } from "../../data/districts";
import { ImagePicker } from "../onboarding/ImagePicker";
import { AudioWaveform } from "./AudioWaveform";
import { formatAudioDuration, normalizeWaveformBars } from "../../utils/audio";

const initialVoiceForm = {
  title: "",
  excerpt: "",
  district: "",
  area: "",
  content: "",
  breaking: false,
  coverImageUrl: "",
};

const dictationLanguages = [
  { value: "en-IN", label: "English" },
  { value: "hi-IN", label: "Hindi" },
];

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const compressLevels = (levels, targetSize = 48) => {
  if (!levels.length) {
    return normalizeWaveformBars([], targetSize);
  }

  return normalizeWaveformBars(levels, targetSize);
};

const mergeRecognizedText = (baseValue, transcript) => {
  const cleanBase = String(baseValue || "").trim();
  const cleanTranscript = String(transcript || "").replace(/\s+/g, " ").trim();

  if (!cleanBase) return cleanTranscript;
  if (!cleanTranscript) return cleanBase;
  return `${cleanBase} ${cleanTranscript}`.replace(/\s+/g, " ").trim();
};

const DictationButton = ({ active, disabled, onClick }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition ${
      active
        ? "border-red-400/70 bg-red-500/20 text-red-100"
        : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:text-white"
    } disabled:cursor-not-allowed disabled:opacity-40`}
    aria-label={active ? "Stop browser dictation" : "Start browser dictation"}
    title={active ? "Stop browser dictation" : "Start browser dictation"}
  >
    <Mic size={16} />
  </button>
);

export const VoiceNewsComposer = ({
  open,
  onClose,
  userRole,
  canSubmit,
  defaultDistrict = "",
  defaultArea = "",
  onSubmitted,
}) => {
  const [form, setForm] = useState(initialVoiceForm);
  const [recording, setRecording] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [waveform, setWaveform] = useState([]);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState("");
  const [audioPayload, setAudioPayload] = useState("");
  const [error, setError] = useState("");
  const [dictationLanguage, setDictationLanguage] = useState("en-IN");
  const [activeDictationField, setActiveDictationField] = useState("");
  const [browserTranscriptAvailable, setBrowserTranscriptAvailable] = useState(false);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const chunksRef = useRef([]);
  const animationFrameRef = useRef(0);
  const recordingStartRef = useRef(0);
  const timerRef = useRef(0);
  const sampledLevelsRef = useRef([]);
  const recordingRecognitionRef = useRef(null);
  const fieldRecognitionRef = useRef(null);
  const fieldBaseValueRef = useRef("");
  const transcriptRef = useRef("");

  const browserSpeechSupported = typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  const blockOptions = useMemo(
    () => (form.district ? jharkhandBlocksByDistrict[form.district] || [] : []),
    [form.district]
  );

  const updateFieldValue = (fieldName, value) => {
    setForm((current) => ({
      ...current,
      [fieldName]: value,
    }));
  };

  const stopFieldDictation = () => {
    if (!fieldRecognitionRef.current) {
      setActiveDictationField("");
      return;
    }

    try {
      fieldRecognitionRef.current.onresult = null;
      fieldRecognitionRef.current.onerror = null;
      fieldRecognitionRef.current.onend = null;
      fieldRecognitionRef.current.stop();
    } catch (_) {}

    fieldRecognitionRef.current = null;
    setActiveDictationField("");
  };

  const resetComposer = () => {
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
    }

    stopFieldDictation();
    setForm({
      ...initialVoiceForm,
      district: defaultDistrict || "",
      area: defaultArea || "",
    });
    setRecording(false);
    setSubmitting(false);
    setRecordingTime(0);
    setWaveform([]);
    setAudioPreviewUrl("");
    setAudioPayload("");
    setError("");
    setDictationLanguage("en-IN");
    setBrowserTranscriptAvailable(false);
    chunksRef.current = [];
    sampledLevelsRef.current = [];
    transcriptRef.current = "";
    fieldBaseValueRef.current = "";
  };

  const stopMonitoring = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }

    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = 0;
    }

    sourceRef.current?.disconnect();
    analyserRef.current?.disconnect();
    sourceRef.current = null;
    analyserRef.current = null;

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
    }

    audioContextRef.current = null;
  };

  const cleanupRecordingRecognition = () => {
    if (!recordingRecognitionRef.current) return;

    try {
      recordingRecognitionRef.current.onresult = null;
      recordingRecognitionRef.current.onerror = null;
      recordingRecognitionRef.current.onend = null;
      recordingRecognitionRef.current.stop();
    } catch (_) {}

    recordingRecognitionRef.current = null;
  };

  const cleanupMedia = () => {
    stopMonitoring();
    cleanupRecordingRecognition();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
  };

  useEffect(() => {
    if (!open) {
      cleanupMedia();
      stopFieldDictation();
      resetComposer();
      return;
    }

    setForm((current) => ({
      ...current,
      district: current.district || defaultDistrict || "",
      area: current.area || defaultArea || "",
    }));

    return () => {
      cleanupMedia();
      stopFieldDictation();
    };
  }, [open, defaultDistrict, defaultArea]);

  const beginMonitoring = (stream) => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);

    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.75;
    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    sourceRef.current = source;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const sample = () => {
      analyser.getByteFrequencyData(dataArray);
      const sliceSize = Math.max(1, Math.floor(dataArray.length / 36));
      const nextWaveform = Array.from({ length: 36 }, (_, index) => {
        const start = index * sliceSize;
        const chunk = dataArray.slice(start, start + sliceSize);
        const average = chunk.reduce((sum, value) => sum + value, 0) / Math.max(chunk.length, 1);
        return Math.max(0.08, average / 255);
      });

      setWaveform(nextWaveform);
      sampledLevelsRef.current.push(nextWaveform.reduce((sum, value) => sum + value, 0) / nextWaveform.length);
      if (sampledLevelsRef.current.length > 240) {
        sampledLevelsRef.current = sampledLevelsRef.current.slice(-240);
      }
      animationFrameRef.current = requestAnimationFrame(sample);
    };

    sample();
  };

  const beginRecordingSpeechRecognition = () => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.lang = dictationLanguage;
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0]?.transcript || "")
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        transcriptRef.current = transcript;
        setBrowserTranscriptAvailable(Boolean(transcript));
      };

      recognition.onerror = () => {};
      recognition.onend = () => {
        if (recordingStartRef.current && mediaRecorderRef.current?.state === "recording") {
          try {
            recognition.start();
          } catch (_) {}
        }
      };

      recognition.start();
      recordingRecognitionRef.current = recognition;
    } catch (_) {
      recordingRecognitionRef.current = null;
    }
  };

  const startFieldDictation = (fieldName) => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setError("Browser speech dictation is not available here. Try Chrome or Edge.");
      return;
    }

    if (activeDictationField === fieldName) {
      stopFieldDictation();
      return;
    }

    stopFieldDictation();
    setError("");
    fieldBaseValueRef.current = String(form[fieldName] || "").trim();

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.lang = dictationLanguage;
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0]?.transcript || "")
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        updateFieldValue(fieldName, mergeRecognizedText(fieldBaseValueRef.current, transcript));
      };

      recognition.onerror = () => {
        setActiveDictationField("");
      };

      recognition.onend = () => {
        setActiveDictationField("");
        fieldRecognitionRef.current = null;
      };

      recognition.start();
      fieldRecognitionRef.current = recognition;
      setActiveDictationField(fieldName);
    } catch (_) {
      setError("Browser speech dictation could not start. Check microphone permission and try again.");
    }
  };

  const startRecording = async () => {
    setError("");

    if (!canSubmit) {
      setError("This dashboard can record voice news only after approval and phone verification.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("This browser does not support voice recording.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const mediaRecorder = new MediaRecorder(stream, preferredMimeType ? { mimeType: preferredMimeType } : undefined);

      streamRef.current = stream;
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      sampledLevelsRef.current = [];
      transcriptRef.current = "";
      setWaveform(normalizeWaveformBars([], 36));
      setAudioPayload("");
      setBrowserTranscriptAvailable(false);

      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
        setAudioPreviewUrl("");
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, {
          type: preferredMimeType || "audio/webm",
        });
        const previewUrl = URL.createObjectURL(blob);
        const dataUrl = await blobToDataUrl(blob);
        const duration = (Date.now() - recordingStartRef.current) / 1000;

        setAudioPreviewUrl(previewUrl);
        setAudioPayload(dataUrl);
        setWaveform(compressLevels(sampledLevelsRef.current, 48));
        setRecordingTime(duration);
        cleanupMedia();
      };

      mediaRecorder.start(250);
      setRecording(true);
      setRecordingTime(0);
      recordingStartRef.current = Date.now();
      timerRef.current = window.setInterval(() => {
        setRecordingTime((Date.now() - recordingStartRef.current) / 1000);
      }, 200);
      beginMonitoring(stream);
      beginRecordingSpeechRecognition();
    } catch (_) {
      setError("Microphone access was denied. Allow the mic and try again.");
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;
    cleanupRecordingRecognition();
    mediaRecorderRef.current.stop();
    setRecording(false);
    setRecordingTime((Date.now() - recordingStartRef.current) / 1000);
  };

  const resetRecording = () => {
    cleanupMedia();
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
    }
    setRecording(false);
    setRecordingTime(0);
    setWaveform([]);
    setAudioPreviewUrl("");
    setAudioPayload("");
    setError("");
    setBrowserTranscriptAvailable(false);
    chunksRef.current = [];
    sampledLevelsRef.current = [];
    transcriptRef.current = "";
    setForm((current) => ({
      ...current,
      title: "",
      excerpt: "",
      content: "",
    }));
  };

  const submitVoiceNews = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await http.post("/articles", {
        ...form,
        coverImageUrl: form.coverImageUrl,
        audioUrl: audioPayload,
        audioDuration: recordingTime,
        audioWaveform: waveform,
        audioTranscript: form.content,
      });

      onSubmitted?.();
      onClose?.();
      resetComposer();
    } catch (requestError) {
      const rawMessage = requestError.response?.data?.message || "Voice news could not be saved.";
      setError(
        rawMessage.includes("Unsupported source URL")
          ? "Voice recording upload failed. Please record again and then publish once more."
          : rawMessage
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-950/80 px-4 py-6 pt-24 backdrop-blur sm:px-6 sm:py-8 sm:pt-24">
      <div className="mx-auto flex min-h-full w-full max-w-4xl items-start justify-center">
        <div className="voice-desk-scroll w-full overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/95 shadow-[0_32px_90px_rgba(15,23,42,0.5)]">
          <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top,rgba(52,211,153,0.25),transparent_45%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))] p-6 lg:border-b-0 lg:border-r">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">Voice Desk</p>
                  <h2 className="mt-3 text-3xl font-semibold text-white">Record a voice bulletin</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    Record the bulletin once, then use browser dictation on each field to refine the written copy in Hindi or English.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-white/20 hover:text-white"
                  aria-label="Close voice recorder"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-8 rounded-[28px] border border-emerald-300/25 bg-emerald-500/10 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${recording ? "bg-red-600 text-white" : "bg-white/10 text-emerald-300"}`}>
                      {recording ? <Radio size={18} /> : <Mic size={18} />}
                    </span>
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-emerald-200">Recorder</p>
                      <p className="text-lg font-semibold text-white">
                        {recording ? "Recording live" : audioPayload ? "Preview ready" : "Ready to record"}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-white">
                    {formatAudioDuration(recordingTime)}
                  </span>
                </div>

                <AudioWaveform waveform={waveform} active={recording} className="mt-5 h-24" />

                <div className="mt-5 flex flex-wrap gap-3">
                  {!recording ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
                    >
                      <Mic size={16} />
                      {audioPayload ? "Record Again" : "Start Recording"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-500"
                    >
                      <Square size={16} />
                      Stop
                    </button>
                  )}

                  {audioPayload ? (
                    <button
                      type="button"
                      onClick={resetRecording}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/5"
                    >
                      <RotateCcw size={16} />
                      Reset
                    </button>
                  ) : null}
                </div>

                {audioPreviewUrl ? (
                  <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm text-slate-300">
                      <Volume2 size={16} className="text-emerald-300" />
                      Recorded preview
                    </div>
                    <audio controls src={audioPreviewUrl} className="w-full" />
                  </div>
                ) : null}

                {audioPayload ? (
                  <p className="mt-4 text-sm leading-6 text-emerald-200">
                    Recording saved for preview. Fill in the headline, excerpt, and story notes manually before publishing.
                  </p>
                ) : null}

                {!canSubmit ? (
                  <p className="mt-4 text-sm leading-6 text-orange-200">
                    This voice desk unlocks after super admin approval and phone verification. Super admin can publish directly.
                  </p>
                ) : null}
              </div>

              <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-center gap-3">
                  <Waves size={18} className="text-orange-300" />
                  <p className="text-sm leading-6 text-slate-300">
                    Reporter submissions enter the approval queue. Chief editor and super admin submissions go live immediately.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={submitVoiceNews} className="p-6">
              <div className="mb-4 rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Browser Dictation</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Use the mic button on each field, speak in Hindi or English, then edit the grammar before publishing.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-900 px-4 py-2 text-sm text-white">
                    <Languages size={16} className="text-orange-300" />
                    <select
                      className="bg-transparent text-sm text-white outline-none"
                      value={dictationLanguage}
                      onChange={(event) => setDictationLanguage(event.target.value)}
                    >
                      {dictationLanguages.map((language) => (
                        <option key={language.value} value={language.value} className="bg-slate-950">
                          {language.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {!browserSpeechSupported ? (
                  <p className="mt-3 text-sm leading-6 text-orange-200">
                    Browser dictation is not available here. Chrome or Edge on desktop usually works best.
                  </p>
                ) : null}
                {browserTranscriptAvailable ? (
                  <p className="mt-3 text-sm leading-6 text-emerald-200">
                    A local browser transcript was captured during recording. Use the mic buttons on each field if you want help dictating text manually.
                  </p>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <div className="flex items-start gap-3">
                    <input
                      className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
                      placeholder="Voice bulletin headline"
                      value={form.title}
                      onChange={(event) => updateFieldValue("title", event.target.value)}
                    />
                    <DictationButton
                      active={activeDictationField === "title"}
                      disabled={!browserSpeechSupported}
                      onClick={() => startFieldDictation("title")}
                    />
                  </div>
                </div>

                <select
                  className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white"
                  value={form.district}
                  onChange={(event) => setForm({ ...form, district: event.target.value, area: "" })}
                >
                  <option value="">Select district</option>
                  {jharkhandDistricts.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>

                <select
                  className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white"
                  value={form.area}
                  onChange={(event) => setForm({ ...form, area: event.target.value })}
                >
                  <option value="">Select block</option>
                  {blockOptions.map((block) => (
                    <option key={block} value={block}>
                      {block}
                    </option>
                  ))}
                </select>

                <div className="md:col-span-2">
                  <div className="flex items-start gap-3">
                    <textarea
                      className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
                      rows="3"
                      placeholder="Short excerpt for homepage cards"
                      value={form.excerpt}
                      onChange={(event) => updateFieldValue("excerpt", event.target.value)}
                    />
                    <DictationButton
                      active={activeDictationField === "excerpt"}
                      disabled={!browserSpeechSupported}
                      onClick={() => startFieldDictation("excerpt")}
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-start gap-3">
                    <textarea
                      className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
                      rows="5"
                      placeholder="Written story notes for readers. Use browser dictation, then correct the grammar manually."
                      value={form.content}
                      onChange={(event) => updateFieldValue("content", event.target.value)}
                    />
                    <DictationButton
                      active={activeDictationField === "content"}
                      disabled={!browserSpeechSupported}
                      onClick={() => startFieldDictation("content")}
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <ImagePicker
                    label="Voice News Cover Image"
                    helpText="Upload a cover image for the voice bulletin, or use the direct image URL field below if the image is already hosted."
                    value={form.coverImageUrl}
                    onChange={(value) => setForm({ ...form, coverImageUrl: value })}
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-start gap-3">
                    <input
                      type="url"
                      className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
                      placeholder="Optional direct image URL, for example https://example.com/voice-news-cover.jpg"
                      value={String(form.coverImageUrl || "").startsWith("data:") ? "" : form.coverImageUrl}
                      onChange={(event) => setForm({ ...form, coverImageUrl: event.target.value })}
                    />
                    <DictationButton
                      active={activeDictationField === "coverImageUrl"}
                      disabled={!browserSpeechSupported}
                      onClick={() => startFieldDictation("coverImageUrl")}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Use this only when you do not want to upload an image file. District and block still need manual selection.
                  </p>
                </div>

                <label className="flex items-center gap-3 text-sm text-slate-400 md:col-span-2">
                  <input
                    type="checkbox"
                    checked={form.breaking}
                    onChange={(event) => setForm({ ...form, breaking: event.target.checked })}
                  />
                  Mark this voice bulletin as breaking news
                </label>
              </div>

              {error ? (
                <div className="mt-4 break-words rounded-2xl border border-rose-400/40 bg-rose-500/15 px-4 py-3 text-sm leading-6 text-rose-100">
                  {error}
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !audioPayload || !canSubmit}
                  className="rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Publishing..." : userRole === "reporter" ? "Send For Approval" : "Publish Voice News"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
