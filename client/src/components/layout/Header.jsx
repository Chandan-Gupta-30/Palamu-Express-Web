import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, Moon, Sun, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const navLinkClassName = ({ isActive }) =>
  [
    "relative pb-1 transition",
    isActive ? "font-semibold text-white underline decoration-2 underline-offset-8 decoration-orange-400" : "text-slate-400 hover:text-white",
  ].join(" ");

const canAccessDashboard = (user) =>
  ["super_admin", "chief_editor", "reporter"].includes(user?.role);

export const Header = ({ darkMode, onToggleDarkMode }) => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/85 backdrop-blur supports-[backdrop-filter]:bg-slate-950/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="rounded-2xl bg-orange-500 px-3 py-2 text-sm font-bold text-white">PE</div>
          <div>
            <p className="font-display text-lg text-white sm:text-xl">Palamu Express</p>
            <p className="hidden text-xs text-slate-500 sm:block">District-first digital newsroom</p>
          </div>
        </Link>

        <nav className="hidden gap-6 text-sm md:flex">
          <NavLink to="/" end className={navLinkClassName}>Home</NavLink>
          <NavLink to="/search" className={navLinkClassName}>Search</NavLink>
          <NavLink to="/advertise-with-us" className={navLinkClassName}>Advertise</NavLink>
          {user ? <NavLink to="/saved" className={navLinkClassName}>Saved</NavLink> : null}
          {canAccessDashboard(user) ? <NavLink to="/dashboard" className={navLinkClassName}>Dashboard</NavLink> : null}
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-full border border-white/10 p-2 text-slate-300"
            onClick={onToggleDarkMode}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            type="button"
            className="rounded-full border border-white/10 p-2 text-slate-300 md:hidden"
            onClick={() => setMobileMenuOpen((value) => !value)}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          {user ? (
            <>
              <span className="hidden text-sm text-slate-300 md:inline">{user.fullName}</span>
              <button onClick={logout} className="hidden rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 md:inline-flex">
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="hidden rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white md:inline-flex">
              Login
            </Link>
          )}
        </div>
      </div>

      {mobileMenuOpen ? (
        <div className="border-t border-white/10 bg-slate-950/95 md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4">
            <nav className="grid gap-3 text-sm">
              <NavLink to="/" end className={navLinkClassName} onClick={closeMobileMenu}>Home</NavLink>
              <NavLink to="/search" className={navLinkClassName} onClick={closeMobileMenu}>Search</NavLink>
              <NavLink to="/advertise-with-us" className={navLinkClassName} onClick={closeMobileMenu}>Advertise</NavLink>
              {user ? <NavLink to="/saved" className={navLinkClassName} onClick={closeMobileMenu}>Saved</NavLink> : null}
              {canAccessDashboard(user) ? <NavLink to="/dashboard" className={navLinkClassName} onClick={closeMobileMenu}>Dashboard</NavLink> : null}
            </nav>
            <div className="flex flex-col gap-3 border-t border-white/10 pt-4">
              {user ? (
                <>
                  <p className="text-sm text-slate-500">{user.fullName}</p>
                  <button
                    onClick={() => {
                      closeMobileMenu();
                      logout();
                    }}
                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={closeMobileMenu}
                  className="inline-flex justify-center rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
};
