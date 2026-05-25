export const ImagePicker = ({ label, value, onChange, helpText, accept = "image/*" }) => {
  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      if (!file.type.startsWith("image/")) {
        onChange(readerEvent.target.result);
        return;
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
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
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.75);
        onChange(compressedBase64);
      };
      img.src = readerEvent.target.result;
    };
    reader.readAsDataURL(file);
  };


  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.04]">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-xs font-bold text-slate-200">{label}</p>
          <p className="text-[10px] text-slate-500 leading-normal">{helpText}</p>
        </div>
        <label className="cursor-pointer rounded-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 transition-all duration-300 px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-orange-950/20 shrink-0">
          Upload
          <input type="file" accept={accept} className="hidden" onChange={handleFileChange} />
        </label>
      </div>
      {value ? (
        <div className="mt-4 flex h-36 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-slate-950/40 p-1.5 shadow-inner group">
          <img src={value} alt={label} className="h-full w-full rounded-lg object-contain transition-transform duration-500 group-hover:scale-105" />
        </div>
      ) : (
        <div className="mt-4 flex h-36 items-center justify-center rounded-xl border border-dashed border-white/10 text-xs text-slate-500 bg-slate-950/20">
          No document selected
        </div>
      )}
    </div>
  );
};

