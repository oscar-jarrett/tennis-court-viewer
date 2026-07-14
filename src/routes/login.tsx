import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { verifyPassword } from "@/lib/api/viewer.functions";
import { setSession } from "@/lib/session"; 
import { Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginComponent,
});

function LoginComponent() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setLoading(true);
    setError(null);

    try {
      const res = await verifyPassword({ data: { password } });
      
      if (res.role === "admin") {
        // THE FIX: Use the custom session wrapper instead of localStorage!
        setSession({ role: "admin", password });
        navigate({ to: "/admin" });
      } else {
        setError("Invalid password. Please try again.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || String(err) || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f172a] px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-[#1e293b] p-6 shadow-2xl">
        <div className="text-center">
          <div className="mx-auto h-3 w-3 rounded-full bg-amber-500 mb-2 animate-pulse" />
          <h1 className="text-xl font-bold text-white tracking-tight">COURT CAMERA TRAINER</h1>
          <p className="mt-1 text-sm text-slate-400">Restricted Access</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Admin Password
            </label>
            <div className="relative mt-2">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password..."
                className="w-full rounded-lg border border-slate-700 bg-[#0f172a] py-2.5 pl-3 pr-10 text-sm text-white placeholder-slate-500 outline-none transition focus:border-blue-500"
                disabled={loading}
              />
              
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs font-medium text-red-400 bg-red-950/30 border border-red-900/50 p-2.5 rounded-lg text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#1e293b] disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Enter Admin Mode"}
          </button>
        </form>

        <button
          onClick={() => navigate({ to: "/" })}
          className="mt-4 w-full text-center text-xs text-slate-400 hover:text-white transition"
        >
          &larr; Back to Public Viewer
        </button>
      </div>
    </div>
  );
}