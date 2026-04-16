import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { http } from "../api/http";
import { useAuth } from "../context/AuthContext";

export const LoginPage = () => {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [form, setForm] = useState({ phone: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canAccessDashboard = (user) =>
    ["super_admin", "chief_editor", "reporter"].includes(user?.role);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await http.post("/auth/login", form);
      setSession(data);
      navigate(canAccessDashboard(data.user) ? "/dashboard" : "/");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <form onSubmit={handleSubmit} className="panel space-y-5 p-8">
        <h1 className="font-display text-3xl text-white">Login</h1>
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        <input
          autoFocus
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
          placeholder="Phone number"
          value={form.phone}
          onChange={(event) => setForm({ ...form, phone: event.target.value })}
        />
        <input
          type="password"
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
          placeholder="Password"
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
        />
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
