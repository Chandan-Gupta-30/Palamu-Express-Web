import { useEffect, useState } from "react";
import { Sun, Cloud, CloudRain, CloudLightning, CloudFog, CloudSun, Wind, Droplet, MapPin, Loader2 } from "lucide-react";

export const WeatherWidget = () => {
  const [weather, setWeather] = useState(null);
  const [location, setLocation] = useState("Garhwa, Jharkhand");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unit, setUnit] = useState("C"); // "C" or "F"

  const fetchWeather = async (lat, lon, cityName = null) => {
    try {
      setLoading(true);
      const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;

      if (apiKey && apiKey.trim() !== "") {
        // Fetch from OpenWeatherMap
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
        const res = await fetch(weatherUrl);
        if (!res.ok) throw new Error("OpenWeatherMap service offline");
        const data = await res.json();
        
        // Extract details
        const temp = data.main.temp;
        const humidity = data.main.humidity;
        const code = data.weather[0].id;
        const windSpeedMs = data.wind.speed; // in m/s
        const wind = (windSpeedMs * 3.6).toFixed(1); // convert to km/h
        
        // Prioritize precise client-side geocoded cityName over generic weather station name
        const finalCityName = cityName || data.name || "Local Region";
        
        setWeather({
          temp,
          humidity,
          code,
          wind,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        setLocation(finalCityName);
      } else {
        // Fallback: Fetch from Open-Meteo
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`;
        const res = await fetch(weatherUrl);
        if (!res.ok) throw new Error("Open-Meteo service offline");
        const data = await res.json();
        
        const current = data.current;
        setWeather({
          temp: current.temperature_2m,
          humidity: current.relative_humidity_2m,
          code: current.weather_code,
          wind: current.wind_speed_10m,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        if (cityName) {
          setLocation(cityName);
        }
      }
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Weather service offline");
    } finally {
      setLoading(false);
    }
  };

  const fetchIPLocation = async () => {
    try {
      const ipRes = await fetch("https://ipapi.co/json/");
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        const lat = ipData.latitude;
        const lon = ipData.longitude;
        let cityName = "Garhwa, Jharkhand";
        if (ipData.city) {
          cityName = ipData.city;
          if (ipData.region) {
            cityName += `, ${ipData.region}`;
          }
        }
        if (lat && lon) {
          console.log(`IP Geolocation successful: ${cityName} (${lat}, ${lon})`);
          fetchWeather(lat, lon, cityName);
          return;
        }
      }
      throw new Error("IP geolocation failed or returned empty coordinates");
    } catch (e) {
      console.warn("IP Geolocation failed. Defaulting to Garhwa, Jharkhand.", e);
      // Default to Garhwa, Jharkhand coordinates
      fetchWeather(24.1627, 83.8055, "Garhwa, Jharkhand");
    }
  };

  const getGeoLocation = () => {
    if (!navigator.geolocation) {
      console.warn("Geolocation not supported by this browser. Trying IP Geolocation.");
      fetchIPLocation();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Use BigDataCloud's highly accurate keyless reverse geocoder first
          const geoRes = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          let cityName = "";
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            
            let district = "";
            let block = "";
            const state = geoData.principalSubdivision || "";

            if (geoData.localityInfo && Array.isArray(geoData.localityInfo.administrative)) {
              // OSM level 6 is District, OSM level 8 is Sub-District / Block in India
              const distObj = geoData.localityInfo.administrative.find(item => item.adminLevel === 6);
              const blockObj = geoData.localityInfo.administrative.find(item => item.adminLevel === 8);
              
              if (distObj) district = distObj.name;
              if (blockObj) block = blockObj.name;
            }

            // Fallback to top-level attributes if adminLevels not found
            if (!district) {
              district = geoData.city || "";
            }
            if (!block) {
              block = geoData.locality || geoData.village || geoData.town || "";
            }

            let nameParts = [];
            if (block) nameParts.push(block);
            if (district && district !== block) nameParts.push(district);
            if (state) nameParts.push(state);
            cityName = nameParts.join(", ");
          }

          // Fallback to Nominatim if BigDataCloud returns empty or fails
          if (!cityName) {
            const nomiRes = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`
            );
            if (nomiRes.ok) {
              const geoData = await nomiRes.json();
              const addr = geoData.address;
              
              // Extract block (subdistrict) and district (city/county)
              const district = addr.city || addr.district || addr.county || "";
              const block = addr.subdistrict || addr.town || addr.village || "";
              const state = addr.state || "";
              
              let nameParts = [];
              if (block) nameParts.push(block);
              if (district && district !== block) nameParts.push(district);
              if (state) nameParts.push(state);
              cityName = nameParts.join(", ");
            }
          }

          fetchWeather(latitude, longitude, cityName || "Local Region");
        } catch (e) {
          console.warn("High-accuracy reverse-geocoding failed. Trying simple region.", e);
          fetchWeather(latitude, longitude, "Local Region");
        }
      },
      (err) => {
        console.warn("HTML5 Geolocation failed or denied. Trying IP Geolocation...", err);
        fetchIPLocation();
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    getGeoLocation();
  }, []);

  const getWeatherConfig = (code) => {
    // Check if it is an OpenWeatherMap code (3 digits, e.g. 200 to 804)
    if (code >= 200) {
      if (code === 800) {
        return {
          Icon: Sun,
          emotion: "Radiant & Clear Skies",
          kicker: "Warm Golden Day",
          color: "text-amber-500",
          bgGlow: "shadow-[0_8px_40px_rgba(245,158,11,0.08)] border-amber-500/10",
          iconClass: "animate-[spin_30s_linear_infinite]"
        };
      }
      if ([801, 802].includes(code)) {
        return {
          Icon: CloudSun,
          emotion: "Partly Golden Skies",
          kicker: "Pleasant & Calm",
          color: "text-orange-400",
          bgGlow: "shadow-[0_8px_40px_rgba(251,146,60,0.08)] border-orange-500/10",
          iconClass: "animate-pulse"
        };
      }
      if ([803, 804].includes(code)) {
        return {
          Icon: Cloud,
          emotion: "Dreamy & Overcast",
          kicker: "Quietly Cozy",
          color: "text-slate-400",
          bgGlow: "shadow-[0_8px_40px_rgba(203,213,225,0.08)] border-slate-500/10",
          iconClass: ""
        };
      }
      if (code >= 700 && code <= 781) {
        return {
          Icon: CloudFog,
          emotion: "Mystical Foggy Winds",
          kicker: "Muted Whispers",
          color: "text-slate-400",
          bgGlow: "shadow-[0_8px_40px_rgba(148,163,184,0.08)] border-slate-500/10",
          iconClass: ""
        };
      }
      if (code >= 500 && code <= 599) {
        return {
          Icon: CloudRain,
          emotion: "Melodious Rain Showers",
          kicker: "Cool Soothing Rain",
          color: "text-sky-400",
          bgGlow: "shadow-[0_8px_40px_rgba(56,189,248,0.08)] border-sky-500/10",
          iconClass: "animate-bounce"
        };
      }
      if (code >= 300 && code <= 399) {
        return {
          Icon: CloudRain,
          emotion: "Subtle Soothing Drizzle",
          kicker: "Soft Refreshing Mist",
          color: "text-sky-300",
          bgGlow: "shadow-[0_8px_40px_rgba(125,211,252,0.08)] border-sky-400/10",
          iconClass: "animate-bounce"
        };
      }
      if (code >= 200 && code <= 299) {
        return {
          Icon: CloudLightning,
          emotion: "Electric Thunderstorms",
          kicker: "Symphony of Storms",
          color: "text-purple-400",
          bgGlow: "shadow-[0_8px_40px_rgba(192,132,252,0.08)] border-purple-500/10",
          iconClass: "animate-pulse"
        };
      }
      if (code >= 600 && code <= 699) {
        return {
          Icon: CloudFog,
          emotion: "Serene Snow Flurries",
          kicker: "Crisp & Wintery",
          color: "text-blue-200",
          bgGlow: "shadow-[0_8px_40px_rgba(191,219,254,0.08)] border-blue-300/10",
          iconClass: ""
        };
      }
    }

    // Default Open-Meteo mapping
    if (code === 0) {
      return {
        Icon: Sun,
        emotion: "Radiant & Clear Skies",
        kicker: "Warm Golden Day",
        color: "text-amber-500",
        bgGlow: "shadow-[0_8px_40px_rgba(245,158,11,0.08)] border-amber-500/10",
        iconClass: "animate-[spin_30s_linear_infinite]"
      };
    }
    if ([1, 2, 3].includes(code)) {
      return {
        Icon: CloudSun,
        emotion: "Partly Golden Skies",
        kicker: "Pleasant & Calm",
        color: "text-orange-400",
        bgGlow: "shadow-[0_8px_40px_rgba(251,146,60,0.08)] border-orange-500/10",
        iconClass: "animate-pulse"
      };
    }
    if ([45, 48].includes(code)) {
      return {
        Icon: CloudFog,
        emotion: "Mystical Foggy Winds",
        kicker: "Muted Whispers",
        color: "text-slate-400",
        bgGlow: "shadow-[0_8px_40px_rgba(148,163,184,0.08)] border-slate-500/10",
        iconClass: ""
      };
    }
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) {
      return {
        Icon: CloudRain,
        emotion: "Melodious Rain Showers",
        kicker: "Cool Soothing Rain",
        color: "text-sky-400",
        bgGlow: "shadow-[0_8px_40px_rgba(56,189,248,0.08)] border-sky-500/10",
        iconClass: "animate-bounce"
      };
    }
    if ([95, 96, 99].includes(code)) {
      return {
        Icon: CloudLightning,
        emotion: "Electric Thunderstorms",
        kicker: "Symphony of Storms",
        color: "text-purple-400",
        bgGlow: "shadow-[0_8px_40px_rgba(192,132,252,0.08)] border-purple-500/10",
        iconClass: "animate-pulse"
      };
    }
    return {
      Icon: Cloud,
      emotion: "Dreamy & Overcast",
      kicker: "Quietly Cozy",
      color: "text-slate-400",
      bgGlow: "shadow-[0_8px_40px_rgba(203,213,225,0.08)] border-slate-500/10",
      iconClass: ""
    };
  };

  if (loading) {
    return (
      <div className="w-full max-w-[360px] mx-auto rounded-[28px] border border-white/10 border-t-white/20 border-l-white/20 bg-slate-900/10 backdrop-blur-2xl flex items-center justify-center gap-3 p-5 shadow-[0_20px_40px_rgba(0,0,0,0.25)]">
        <Loader2 className="h-5 w-5 text-orange-500 animate-spin" />
        <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Checking Skies...</span>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="w-full max-w-[360px] mx-auto rounded-[28px] border border-rose-500/10 border-t-rose-500/20 border-l-rose-500/20 bg-rose-950/5 backdrop-blur-2xl flex items-center justify-center p-5 shadow-[0_20px_40px_rgba(0,0,0,0.25)]">
        <span className="text-xs text-rose-400 font-semibold tracking-wider">Skies temporarily offline</span>
      </div>
    );
  }

  const { Icon, emotion, kicker, color, bgGlow, iconClass } = getWeatherConfig(weather.code);
  const tempVal = unit === "C" ? weather.temp : ((weather.temp * 9/5) + 32).toFixed(0);

  return (
    <div 
      className={`group relative overflow-hidden rounded-[28px] border border-white/10 border-t-white/25 border-l-white/25 bg-slate-900/25 p-5 backdrop-blur-3xl transition-all duration-500 hover:-translate-y-1.5 hover:rotate-1 hover:scale-[1.03] flex items-center justify-between gap-4 w-full max-w-[360px] mx-auto shadow-[0_20px_40px_rgba(0,0,0,0.3)] hover:shadow-[0_30px_60px_rgba(0,0,0,0.45)] ${bgGlow}`}
    >
      <div className="space-y-1.5 min-w-0 flex-1">
        {/* Location */}
        <div className="flex items-center gap-1.5 text-slate-400">
          <MapPin size={12} className="text-orange-500 flex-shrink-0 animate-bounce" />
          <span className="text-[10px] font-black uppercase tracking-[0.16em] truncate text-slate-300" title={location}>
            {location}
          </span>
        </div>

        {/* Emotion status details */}
        <div className="space-y-0.5">
          <p className={`text-xs font-black uppercase tracking-wider ${color}`}>
            {emotion}
          </p>
          <p className="text-[9px] text-slate-500 font-semibold italic">
            {kicker} • {weather.time}
          </p>
        </div>

        {/* Metrics details */}
        <div className="flex items-center gap-3 pt-0.5 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1">
            <Wind size={10} className="text-slate-500" />
            {weather.wind} km/h
          </span>
          <span className="flex items-center gap-1">
            <Droplet size={10} className="text-slate-500" />
            {weather.humidity}% rH
          </span>
        </div>
      </div>

      {/* Temperature & Dynamic Icon */}
      <div className="flex flex-col items-center justify-center flex-shrink-0 border-l border-white/10 pl-4 gap-0.5">
        <div className="relative cursor-pointer group/temp select-none" onClick={() => setUnit(u => u === "C" ? "F" : "C")} title="Click to toggle Celsius/Fahrenheit">
          <span className="text-2xl font-extrabold text-white tracking-tighter transition-transform duration-300 inline-block group-hover/temp:scale-105">
            {Math.round(tempVal)}°
          </span>
          <span className="text-[9px] font-black text-orange-400 ml-0.5 align-top group-hover/temp:text-orange-300">
            {unit}
          </span>
        </div>
        <div className="h-10 w-10 flex items-center justify-center mt-1">
          <Icon className={`h-8 w-8 ${color} ${iconClass} transition-transform duration-500 group-hover:scale-125 group-hover:-translate-y-1.5 group-hover:drop-shadow-[0_8px_16px_rgba(0,0,0,0.4)]`} />
        </div>
      </div>
    </div>
  );
};

