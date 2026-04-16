const DEFAULT_PRODUCTION_ORIGIN = "https://palamu-express-web.onrender.com";

const stripTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");

const resolveApiOrigin = () => {
  const configuredApiUrl = stripTrailingSlash(import.meta.env.VITE_API_URL);
  if (configuredApiUrl) {
    return configuredApiUrl.replace(/\/api$/, "");
  }

  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:5000";
  }

  return DEFAULT_PRODUCTION_ORIGIN;
};

const apiOrigin = resolveApiOrigin();
const configuredSocketUrl = stripTrailingSlash(import.meta.env.VITE_SOCKET_URL);

export const runtimeConfig = {
  apiOrigin,
  apiBaseUrl: `${apiOrigin}/api`,
  socketUrl: configuredSocketUrl || apiOrigin,
};
