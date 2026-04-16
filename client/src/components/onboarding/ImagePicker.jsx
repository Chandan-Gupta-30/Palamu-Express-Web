export const ImagePicker = ({ label, value, onChange, helpText, accept = "image/*" }) => {
  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => onChange(reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className="mt-1 text-xs text-slate-500">{helpText}</p>
        </div>
        <label className="cursor-pointer rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white">
          Choose Image
          <input type="file" accept={accept} className="hidden" onChange={handleFileChange} />
        </label>
      </div>
      {value ? (
        <div className="mt-4 flex h-44 items-center justify-center overflow-hidden rounded-2xl bg-slate-950/40">
          <img src={value} alt={label} className="h-full w-full object-contain" />
        </div>
      ) : (
        <div className="mt-4 flex h-44 items-center justify-center rounded-2xl border border-dashed border-white/15 text-sm text-slate-400">
          No image selected yet
        </div>
      )}
    </div>
  );
};
