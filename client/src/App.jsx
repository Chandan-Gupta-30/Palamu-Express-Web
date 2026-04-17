import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Header } from "./components/layout/Header";
import { Footer } from "./components/layout/Footer";
import { WhatsAppChannelButton } from "./components/layout/WhatsAppChannelButton";
import { HomePage } from "./pages/HomePage";
import { ArticlePage } from "./pages/ArticlePage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { SearchPage } from "./pages/SearchPage";
import { DashboardPage } from "./pages/DashboardPage";
import { SavedPage } from "./pages/SavedPage";
import { PrivacyPolicyPage } from "./pages/PrivacyPolicyPage";
import { TermsPage } from "./pages/TermsPage";
import { ContactPage } from "./pages/ContactPage";
import { AdvertisePage } from "./pages/AdvertisePage";
import { useAuth } from "./context/AuthContext";

const canAccessDashboard = (user) =>
  ["super_admin", "chief_editor", "reporter"].includes(user?.role);

const ProtectedRoute = ({ children, allow }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (allow && !allow(user)) return <Navigate to="/" replace />;
  return children;
};

const ScrollToTop = () => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname]);

  return null;
};

export default function App() {
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem("portal_theme");
    return stored ? stored === "dark" : true;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    document.documentElement.classList.toggle("light", !darkMode);
    localStorage.setItem("portal_theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  return (
    <div className="min-h-screen">
      <ScrollToTop />
      <Header darkMode={darkMode} onToggleDarkMode={() => setDarkMode((value) => !value)} />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/article/:slug" element={<ArticlePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms-and-conditions" element={<TermsPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/advertise-with-us" element={<AdvertisePage />} />
        <Route
          path="/saved"
          element={
            <ProtectedRoute>
              <SavedPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allow={canAccessDashboard}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
      </Routes>
      {location.pathname === "/" ? <WhatsAppChannelButton /> : null}
      <Footer />
    </div>
  );
}
