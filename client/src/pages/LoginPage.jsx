import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { http } from "../api/http";
import { ActionPopup } from "../components/ui/ActionPopup";
import { useAuth } from "../context/AuthContext";

export const LoginPage = () => {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [form, setForm] = useState({ phone: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const canAccessDashboard = (user) =>
    ["super_admin", "chief_editor", "reporter"].includes(user?.role);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!/^\d{10}$/.test(String(form.phone || ""))) {
      setPopup({
        type: "error",
        title: "Invalid mobile number",
        message: "Please enter a valid 10-digit mobile number to sign in.",
      });
      return;
    }
    setLoading(true);
    setPopup({
      type: "loading",
      title: "Signing you in",
      message: "We are verifying your login and preparing your newsroom workspace.",
      persistent: true,
    });
    try {
      const { data } = await http.post("/auth/login", form);
      setSession(data);
      setPopup({
        type: "success",
        title: "Login successful",
        message: `Welcome back, ${data.user?.fullName || "newsroom member"}. Redirecting you now.`,
      });
      setTimeout(() => navigate(canAccessDashboard(data.user) ? "/dashboard" : "/"), 900);
    } catch (requestError) {
      setPopup({
        type: "error",
        title: "Login failed",
        message: requestError.response?.data?.message || "We could not sign you in with those credentials.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <ActionPopup
        open={Boolean(popup)}
        type={popup?.type}
        title={popup?.title}
        message={popup?.message}
        persistent={popup?.persistent}
        onClose={popup?.persistent ? undefined : () => setPopup(null)}
      />
      <form onSubmit={handleSubmit} className="panel space-y-5 p-8">
        <h1 className="font-display text-3xl text-white">Login</h1>
        <input
          autoFocus
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
          placeholder="Phone number"
          inputMode="numeric"
          maxLength={10}
          value={form.phone}
          onChange={(event) => setForm({ ...form, phone: event.target.value.replace(/\D/g, "").slice(0, 10) })}
        />
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-white"
            placeholder="Password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-slate-400 transition hover:text-white"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <button disabled={loading} className="w-full rounded-2xl bg-orange-500 px-4 py-3 font-semibold text-white disabled:opacity-60">
          {loading ? "Signing In..." : "Sign In"}
        </button>
        <p className="text-sm text-slate-500">
          New reporter, editor, or advertiser? <Link to="/register" className="text-orange-300">Start onboarding</Link>
        </p>
      </form>
    </div>
  );
};
