import { 
  FileText, 
  ShieldCheck, 
  IdCard, 
  Clock, 
  Users, 
  UserCheck, 
  Megaphone, 
  HelpCircle, 
  Mail 
} from "lucide-react";

const getIconConfig = (label) => {
  const normalized = String(label).toLowerCase();
  
  if (normalized.includes("stori") || normalized.includes("news") || normalized.includes("publish")) {
    if (normalized.includes("pending")) {
      return { Icon: Clock, bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400" };
    }
    return { Icon: FileText, bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400" };
  }
  
  if (normalized.includes("verif")) {
    return { Icon: ShieldCheck, bg: "bg-green-500/10", border: "border-green-500/20", text: "text-green-400" };
  }
  
  if (normalized.includes("card")) {
    return { Icon: IdCard, bg: "bg-indigo-500/10", border: "border-indigo-500/20", text: "text-indigo-400" };
  }
  
  if (normalized.includes("user")) {
    if (normalized.includes("pending")) {
      return { Icon: UserCheck, bg: "bg-orange-500/10", border: "border-orange-500/20", text: "text-orange-400" };
    }
    return { Icon: Users, bg: "bg-sky-500/10", border: "border-sky-500/20", text: "text-sky-400" };
  }
  
  if (normalized.includes("ad")) {
    return { Icon: Megaphone, bg: "bg-rose-500/10", border: "border-rose-500/20", text: "text-rose-400" };
  }
  
  if (normalized.includes("message") || normalized.includes("contact") || normalized.includes("request")) {
    return { Icon: Mail, bg: "bg-purple-500/10", border: "border-purple-500/20", text: "text-purple-400" };
  }
  
  return { Icon: HelpCircle, bg: "bg-slate-500/10", border: "border-slate-500/20", text: "text-slate-400" };
};

export const MetricCard = ({ label, value, hint }) => {
  const { Icon, bg, border, text } = getIconConfig(label);
  
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/25 p-5 transition-all duration-300 hover:border-orange-500/30 hover:bg-slate-900/40 hover:shadow-xl hover:shadow-orange-500/[0.02]">
      {/* Background soft glow accent */}
      <div className="absolute -right-12 -top-12 h-24 w-24 rounded-full bg-orange-500/5 blur-2xl transition-opacity duration-300 group-hover:opacity-100 opacity-50" />
      
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 transition-colors group-hover:text-slate-400">
            {label}
          </p>
          <p className="text-3xl font-bold tracking-tight text-white mt-2 transition-transform duration-300 group-hover:scale-[1.02]">
            {value}
          </p>
        </div>
        
        {/* Premium Icon Badge */}
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} ${border} border ${text} transition-all duration-300 group-hover:scale-110 group-hover:-rotate-3 group-hover:bg-orange-600 group-hover:text-white group-hover:border-orange-500/30 shadow-inner`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      
      <p className="mt-4 text-[11px] leading-relaxed text-slate-500 transition-colors group-hover:text-slate-400 pr-2">
        {hint}
      </p>
    </div>
  );
};
