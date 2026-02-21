import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCcw, MapPin, Wind, Droplets, Sun, Activity, CloudRain, CloudLightning, MoveLeft, Eye, Sunrise, Sunset, ShieldAlert, Cloud, Search, Smartphone, AlertTriangle, Cpu, TerminalSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

const fetchWeather = async (lat, lon, unit) => {
    const isImperial = unit === 'imperial';
    const tempUnitStr = isImperial ? '&temperature_unit=fahrenheit' : '';
    const windUnitStr = isImperial ? '&wind_speed_unit=mph' : '';
    const precipUnitStr = isImperial ? '&precipitation_unit=inch' : '';

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility,dew_point_2m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max,sunrise,sunset,sunshine_duration,precipitation_probability_max&timezone=auto${tempUnitStr}${windUnitStr}${precipUnitStr}`;
    const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm10,pm2_5,nitrogen_dioxide,ozone,uv_index,us_aqi&timezone=auto`;

    const [weatherRes, aqiRes] = await Promise.all([fetch(weatherUrl), fetch(aqiUrl)]);

    if (!weatherRes.ok || !aqiRes.ok) throw new Error('Data fetch failed');

    return {
        weather: await weatherRes.json(),
        aqi: await aqiRes.json()
    };
};

const geocodeLocation = async (query) => {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Geocoding failed');
    return response.json();
};

const weatherCodeDesc = (code) => {
    const codes = {
        0: 'CLEAR SKY', 1: 'MAINLY CLEAR', 2: 'PARTLY CLOUDY', 3: 'OVERCAST',
        45: 'FOG', 48: 'DEPOSITING RIME FOG', 51: 'LIGHT DRIZZLE', 53: 'MODERATE DRIZZLE',
        55: 'DENSE DRIZZLE', 61: 'SLIGHT RAIN', 63: 'MODERATE RAIN', 65: 'HEAVY RAIN',
        71: 'SLIGHT SNOW', 73: 'MODERATE SNOW', 75: 'HEAVY SNOW', 77: 'SNOW GRAINS',
        80: 'SLIGHT SHOWERS', 81: 'MODERATE SHOWERS', 82: 'VIOLENT SHOWERS',
        95: 'THUNDERSTORM', 96: 'THUNDERSTORM (SLIGHT HAIL)', 99: 'THUNDERSTORM (HEAVY HAIL)',
    };
    return codes[code] || 'UNKNOWN ANOMALY';
};

const getWeatherIcon = (code, size = 24, className = "text-cyan-400") => {
    const isRain = [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code);
    const isThunder = [95, 96, 99].includes(code);
    const isCloudy = [2, 3, 45, 48].includes(code);
    const isClear = [0, 1].includes(code);

    if (isThunder) return <CloudLightning size={size} className={className} />;
    if (isRain) return <CloudRain size={size} className={className} />;
    if (isCloudy) return <Cloud size={size} className={className} />;
    return <Sun size={size} className={isClear ? `text-yellow-400 ${className}` : className} />;
};

const getAqiStatus = (aqi) => {
    if (aqi <= 50) return { label: 'OPTIMAL', color: 'text-green-400', border: 'border-green-500/50' };
    if (aqi <= 100) return { label: 'ACCEPTABLE', color: 'text-yellow-400', border: 'border-yellow-500/50' };
    if (aqi <= 150) return { label: 'DEGRADED', color: 'text-orange-400', border: 'border-orange-500/50' };
    if (aqi <= 200) return { label: 'UNHEALTHY', color: 'text-red-500', border: 'border-red-500/50' };
    if (aqi <= 300) return { label: 'CRITICAL', color: 'text-purple-500', border: 'border-purple-500/50' };
    return { label: 'LETHAL TOXICITY', color: 'text-rose-600 animate-pulse', border: 'border-rose-600' };
};

const CyberpunkLoadingScreen = ({ status }) => (
    <div className="absolute inset-0 z-[100] bg-gray-950 text-cyan-400 flex flex-col items-center justify-center font-mono overflow-hidden">
        <div className="absolute inset-0 cyberpunk-scanlines mix-blend-screen opacity-50"></div>
        <div className="glitch-wrapper mb-8">
            <h1 className="text-4xl md:text-7xl glitch-text font-black" data-text="SYS.BOOT">SYS.BOOT</h1>
        </div>
        <div className="w-80 max-w-full px-4 relative z-10 border border-cyan-900 bg-gray-900/50 p-6 clip-path-cyberpunk-tl">
            <div className="flex justify-between text-xs mb-2 tracking-widest text-cyan-500 border-b border-cyan-900 pb-2">
                <span>ESTABLISHING UPLINK</span>
                <span className="animate-pulse">{status === 'connecting' ? '[...]' : '[OK]'}</span>
            </div>

            <div className="text-[10px] text-cyan-600 space-y-2 mt-4">
                <p className="flex justify-between"><span>{'>'} OS_KERNEL_LOAD</span> <span>[PASS]</span></p>
                <p className="flex justify-between"><span>{'>'} BYPASS_SECURITY_SYS</span> <span>[PASS]</span></p>
                <p className="flex justify-between"><span>{'>'} SYNC_SENSORS</span> <span className={status === 'connecting' ? 'animate-pulse text-yellow-500' : 'text-cyan-400'}>{status === 'connecting' ? '[WAIT]' : '[OK]'}</span></p>
            </div>
        </div>
    </div>
);

const AnimatedBackground = ({ weatherCode, isDay }) => {
    // Determine effect based on code
    const isRain = [61, 63, 65, 80, 81, 82, 95, 96, 99].includes(weatherCode);
    const isThunder = [95, 96, 99].includes(weatherCode);

    return (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none fixed bg-gray-950">
            {/* Abstract Hex grid */}
            <div className="absolute inset-0" style={{
                backgroundImage: `linear-gradient(rgba(0, 229, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 229, 255, 0.05) 1px, transparent 1px)`,
                backgroundSize: '50px 50px',
                transform: 'perspective(1000px) rotateX(45deg) scale(2) translateY(-20%)',
                transformOrigin: 'top center',
            }}></div>

            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent"></div>

            {isRain && (
                <div className="absolute inset-0 opacity-40 flex flex-wrap" style={{ background: 'url("data:image/svg+xml,%3Csvg width=\'10\' height=\'10\' viewBox=\'0 0 10 10\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cline x1=\'5\' y1=\'0\' x2=\'5\' y2=\'10\' stroke=\'%230ff\' stroke-width=\'1\' stroke-dasharray=\'4 6\'/%3E%3C/svg%3E")', backgroundSize: '10px 50px', animation: 'rain 0.4s linear infinite' }}>
                    <style>{`@keyframes rain { from { background-position: 0 0; } to { background-position: 0 50px; } }`}</style>
                </div>
            )}
            {isThunder && (
                <div className="absolute inset-0 bg-white opacity-0 animate-[lightning_4s_infinite]">
                    <style>{`@keyframes lightning { 0% { opacity: 0; } 5% { opacity: 0.8; } 10% { opacity: 0; } 15% { opacity: 0.3; } 20% { opacity: 0; } 100% { opacity: 0; } }`}</style>
                </div>
            )}

            {/* Glowing Orbs */}
            <div className={`absolute top-[20%] right-[10%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] ${isDay ? 'bg-cyan-900/10' : 'bg-blue-900/10'} rounded-full blur-[100px]`}></div>

            <div className="absolute inset-0 cyberpunk-scanlines mix-blend-overlay opacity-30"></div>
        </div>
    );
};

// Tactical UI Components
const TacticalBox = ({ children, title, subtitle, className = "", corner = "tl" }) => (
    <div className={`relative bg-gray-900/80 border border-cyan-500/30 backdrop-blur-md clip-path-cyberpunk-${corner} p-4 md:p-6 group hover:border-cyan-400 transition-colors ${className}`}>
        {title && (
            <div className="flex justify-between items-end mb-4 border-b border-cyan-500/30 pb-2">
                <h3 className="text-xs font-bold text-cyan-400 tracking-[0.2em] uppercase flex items-center gap-2">
                    <TerminalSquare size={14} /> {title}
                </h3>
                {subtitle && <span className="text-[10px] text-gray-500 font-mono">{subtitle}</span>}
            </div>
        )}
        <div className="relative z-10">
            {children}
        </div>
        {/* Decorative corner markers */}
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-500 opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-500 opacity-50"></div>
    </div>
);

const HexValue = ({ label, value, unit, highlight = false }) => (
    <div className="flex flex-col">
        <span className="text-[10px] text-cyan-700 font-bold tracking-widest uppercase mb-1">{label}</span>
        <div className="flex items-end gap-1">
            <span className={`text-xl font-black font-mono tracking-tighter ${highlight ? 'text-white text-shadow-glow' : 'text-gray-300'}`}>{value}</span>
            <span className="text-[10px] text-cyan-500 mb-1">{unit}</span>
        </div>
    </div>
);

const CyberpunkWeather = () => {
    const [data, setData] = useState(null);
    const [bootPhase, setBootPhase] = useState('connecting');
    const [error, setError] = useState(null);

    // UI State
    const [unitMode, setUnitMode] = useState('metric');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [syncing, setSyncing] = useState(false);

    // Location State
    const [location, setLocation] = useState({
        name: "NIGHT CITY",
        lat: 35.6762,
        lon: 139.6503,
        country: "JP"
    });

    const loadData = async (lat, lon, locName, countryCode, overrideUnit = unitMode) => {
        setSyncing(true);
        try {
            const fetchedData = await fetchWeather(lat, lon, overrideUnit);
            setData(fetchedData);
            setLocation({ lat, lon, name: locName.split(',')[0].toUpperCase(), country: countryCode || "--" });
            setError(null);

            if (bootPhase === 'connecting') {
                setTimeout(() => setBootPhase('loaded'), 1500);
            }
        } catch (err) {
            setError("ERR_CONNECTION_REFUSED // SECURITY FIREWALL DETECTED");
        } finally {
            setSyncing(false);
            if (bootPhase === 'connecting') {
                setTimeout(() => setBootPhase('loaded'), 1500);
            }
        }
    };

    useEffect(() => {
        const fetchLocations = async () => {
            if (!searchQuery.trim()) {
                setSearchResults([]);
                return;
            }
            try {
                const res = await geocodeLocation(searchQuery);
                setSearchResults(res.results || []);
            } catch (err) {
                console.error(err);
            }
        };

        const timeoutId = setTimeout(() => {
            fetchLocations();
        }, 500); // 500ms debounce

        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    const handleSearch = (e) => {
        e.preventDefault();
        // The useEffect will handle the fetching automatically
    };

    const selectLocation = (result) => {
        setSearchQuery('');
        setSearchResults([]);
        loadData(result.latitude, result.longitude, result.name, result.country_code);
    };

    const toggleUnit = () => {
        const newUnit = unitMode === 'metric' ? 'imperial' : 'metric';
        setUnitMode(newUnit);
        loadData(location.lat, location.lon, location.name, location.country, newUnit);
    };

    const requestLocation = () => {
        setBootPhase('connecting');
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    try {
                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
                        const geoData = await res.json();
                        const city = geoData.address.city || geoData.address.town || geoData.address.village || "LOCAL SYS";
                        const cc = geoData.address.country_code?.toUpperCase() || "--";
                        loadData(lat, lon, city, cc, unitMode);
                    } catch {
                        loadData(lat, lon, "LOCAL SYS", "--", unitMode);
                    }
                },
                (err) => loadData(location.lat, location.lon, "NIGHT CITY", "JP", unitMode)
            );
        } else {
            loadData(location.lat, location.lon, "NIGHT CITY", "JP", unitMode);
        }
    };

    useEffect(() => {
        requestLocation();
    }, []);

    useEffect(() => {
        if (bootPhase === 'loaded') {
            setTimeout(() => setBootPhase('complete'), 500);
        }
    }, [bootPhase]);

    // Unit strings
    const tUnit = unitMode === 'metric' ? '°C' : '°F';
    const sUnit = unitMode === 'metric' ? 'km/h' : 'mph';
    const pUnit = unitMode === 'metric' ? 'hPa' : 'inHg';
    const dUnit = unitMode === 'metric' ? 'km' : 'mi';

    if (bootPhase !== 'complete') {
        return <CyberpunkLoadingScreen status={bootPhase} />;
    }

    if (error && !data) {
        return (
            <div className="absolute inset-0 bg-gray-950 flex flex-col items-center justify-center font-mono text-red-500 z-[100]">
                <ShieldAlert size={64} className="mb-4 animate-pulse opacity-50" />
                <p className="text-xl mb-4 text-shadow-glow-red font-bold">{error}</p>
                <button onClick={requestLocation} className="px-6 py-2 border border-[#ff0055] hover:bg-[#ff0055]/10 text-[#ff0055] transition-colors clip-path-cyberpunk font-bold uppercase tracking-widest mt-4">
                    REBOOT SYSTEM
                </button>
            </div>
        );
    }

    const { weather, aqi } = data;
    const current = weather?.current;
    const daily = weather?.daily;
    const currentAqi = aqi?.current;

    const formatTime = (timeStr, showMins = false) => {
        const d = new Date(timeStr);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: showMins ? '2-digit' : undefined, hour12: false });
    };

    const aqiData = getAqiStatus(currentAqi?.us_aqi);
    const isHazardous = currentAqi?.us_aqi > 200 || [95, 96, 99].includes(current?.weather_code);

    return (
        <div className="relative min-h-screen bg-gray-950 text-gray-300 font-sans selection:bg-cyan-500/30 overflow-x-hidden">
            <AnimatedBackground weatherCode={current?.weather_code} isDay={current?.is_day} />

            {/* Top Navigation Matrix */}
            <div className="relative z-50 border-b border-cyan-900/50 bg-gray-950/80 backdrop-blur-sm">
                <div className="max-w-[1600px] mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-6">
                        <Link to="/#webapps" className="flex items-center gap-2 text-cyan-600 hover:text-cyan-400 font-mono text-[10px] tracking-widest uppercase transition-colors px-2 py-1 border border-cyan-900/50 hover:border-cyan-400">
                            <MoveLeft size={12} /> <span className="hidden sm:inline">TERMINATE LINK</span>
                        </Link>
                        <div className="flex gap-4 text-[10px] font-mono font-bold tracking-widest text-gray-500">
                            <span className="text-cyan-500">SYS.VERSION: 2.04</span>
                            <span className="hidden sm:inline">NETWORK: SECURE</span>
                            <span className="flex items-center gap-1 text-green-500"><Activity size={10} /> LIVE</span>
                        </div>
                    </div>

                    <div className="flex w-full md:w-auto items-center gap-2">
                        <form onSubmit={handleSearch} className="relative flex w-full md:w-64">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="TARGET_SECTOR..."
                                className="w-full bg-cyan-950/20 border border-cyan-800 h-8 px-3 text-[10px] uppercase tracking-widest text-cyan-100 focus:outline-none focus:border-cyan-400 font-mono transition-colors clip-path-cyberpunk"
                            />
                            <button type="submit" className="absolute right-0 top-0 h-8 w-8 flex items-center justify-center text-cyan-600 hover:text-cyan-400 bg-cyan-950/40">
                                <MapPin size={12} />
                            </button>
                        </form>

                        <button onClick={toggleUnit} className="h-8 px-4 border border-cyan-800 text-cyan-600 hover:text-cyan-400 hover:border-cyan-400 text-[10px] font-mono tracking-widest bg-cyan-950/20 clip-path-cyberpunk">
                            {unitMode.toUpperCase()}
                        </button>
                        <button onClick={() => loadData(location.lat, location.lon, location.name, location.country)} className="h-8 px-3 border border-cyan-800 text-cyan-600 hover:text-cyan-400 hover:border-cyan-400 bg-cyan-950/20 clip-path-cyberpunk shrink-0">
                            <RefreshCcw size={12} className={syncing ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    {/* Desktop Search Results Absolute Overlay */}
                    {searchResults.length > 0 && (
                        <div className="absolute top-14 right-4 md:right-32 w-full md:w-80 bg-gray-950 border border-cyan-500 z-[100] shadow-[0_0_20px_rgba(0,229,255,0.2)]">
                            <div className="bg-cyan-950/80 px-2 py-1 border-b border-cyan-900 text-[10px] font-bold text-cyan-500 uppercase">Available Sectors</div>
                            {searchResults.map(res => (
                                <div key={res.id} onClick={() => selectLocation(res)} className="p-3 text-xs border-b border-gray-900 hover:bg-cyan-900/40 cursor-pointer text-cyan-100 font-mono hover:text-white flex justify-between group">
                                    <span className="truncate">{res.name}, {res.admin1}</span>
                                    <span className="text-gray-600 group-hover:text-cyan-400">[{res.country_code}]</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Hazard Marquee */}
            {isHazardous && (
                <div className="w-full bg-red-600/20 border-y border-red-500 text-red-500 text-[10px] font-bold uppercase tracking-[0.3em] py-1 flex overflow-hidden whitespace-nowrap shadow-[0_0_15px_rgba(255,0,0,0.3)]">
                    <span className="animate-[marquee_20s_linear_infinite] inline-block">
                        WARNING // HIGH TOXICITY OR EXTREME EVENT DETECTED // SHELTER IN PLACE // WARNING // HIGH TOXICITY OR EXTREME EVENT DETECTED // SHELTER IN PLACE //
                        WARNING // HIGH TOXICITY OR EXTREME EVENT DETECTED // SHELTER IN PLACE // WARNING // HIGH TOXICITY OR EXTREME EVENT DETECTED // SHELTER IN PLACE //
                    </span>
                    <style>{`@keyframes marquee { 0% { transform: translate(0, 0); } 100% { transform: translate(-50%, 0); } }`}</style>
                </div>
            )}

            <main className="relative z-10 p-4 md:p-8 max-w-[1600px] mx-auto min-h-[calc(100vh-100px)] flex flex-col xl:flex-row gap-6">

                {/* Left Column: Primary Readout */}
                <div className="xl:w-1/3 flex flex-col gap-6">
                    {/* Big Hero Card */}
                    <div className="relative border-2 border-cyan-500/50 bg-gray-900/60 p-8 clip-path-cyberpunk-tl group hover:border-cyan-400 transition-colors shadow-[inset_0_0_50px_rgba(0,229,255,0.05)]">
                        {/* Decorative HUD Elements */}
                        <div className="absolute top-0 right-10 w-24 h-2 bg-cyan-500/50"></div>
                        <div className="absolute top-2 right-12 w-16 h-1 bg-cyan-400"></div>

                        <div className="flex justify-between items-start mb-12">
                            <div>
                                <h1 className="text-4xl md:text-5xl font-black text-white tracking-widest font-mono uppercase mb-1 flex items-center gap-2">
                                    {location.name}
                                </h1>
                                <span className="text-sm font-bold text-cyan-600 tracking-[0.3em] font-mono">SECTOR [{location.country}]</span>
                            </div>
                            <div className="text-cyan-400 opacity-60">
                                {current?.is_day ? <Sun size={48} /> : <Eye size={48} />}
                            </div>
                        </div>

                        <div className="mb-8 relative flex items-center justify-center py-4 min-h-[250px]">
                            <div className="flex flex-col items-center relative z-10 text-center">
                                <div className="flex items-start">
                                    <span className={`text-[8rem] leading-none font-black font-mono tracking-tighter ${isHazardous ? 'text-shadow-glow-red text-red-500' : 'text-shadow-glow text-white'}`}>
                                        {Math.round(current?.temperature_2m)}
                                    </span>
                                    <span className="text-3xl text-cyan-600 mt-4 ml-2">{tUnit}</span>
                                </div>
                                <div className="bg-cyan-950/80 border border-cyan-500 px-6 py-2 tracking-[0.2em] text-cyan-400 text-sm font-bold uppercase mt-4">
                                    {weatherCodeDesc(current?.weather_code)}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 border-t border-cyan-900 pt-6">
                            <HexValue label="APPARENT TEMP" value={Math.round(current?.apparent_temperature)} unit={tUnit} />
                            <HexValue label="RELATIVE HUMIDITY" value={current?.relative_humidity_2m} unit="%" />
                        </div>
                    </div>

                    {/* Mobile App Banner (Cyberpunk style ads) */}
                    <div className="border border-cyan-900 bg-black/60 p-1 flex justify-between clip-path-cyberpunk hover:border-cyan-500/50">
                        <div className="flex items-center gap-3 p-3 bg-cyan-950/20 w-full">
                            <Smartphone size={16} className="text-cyan-600 shrink-0" />
                            <div className="flex-1">
                                <div className="text-[10px] text-cyan-500 font-bold tracking-widest uppercase">Take Interface Offline</div>
                                <div className="text-[8px] text-gray-500 font-mono">LINK EXTERNAL APK</div>
                            </div>
                            <div className="flex gap-2">
                                <a href="https://github.com/ShaptakNaskar/WeatherMan/tree/cyberpunk" target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-900 border border-gray-700 hover:border-cyan-500 text-cyan-600 hover:text-cyan-400 transition-colors">
                                    <Cpu size={14} />
                                </a>
                                <a href="https://github.com/ShaptakNaskar/WeatherMan/releases/download/v1.0.8-cyber-ac0cfc1/CyberWeather-v1.0.8.apk" target="_blank" rel="noopener noreferrer" className="p-2 bg-cyan-900/50 border border-cyan-500 hover:bg-cyan-500 hover:text-gray-950 text-cyan-400 transition-colors">
                                    <RefreshCcw size={14} className="rotate-180" />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Area: Tactical Matrices */}
                <div className="xl:w-2/3 flex flex-col gap-6">

                    {/* Top Row: Quick look metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <TacticalBox title="ATMOSPHERE" subtitle="PRES/VIS/COV">
                            <div className="space-y-4">
                                <div className="flex justify-between items-end border-b border-gray-800 pb-1">
                                    <span className="text-[10px] text-gray-500 font-mono">PRESSURE</span>
                                    <span className="text-sm text-cyan-100 font-bold">{Math.round(current?.surface_pressure)} <span className="text-[10px] text-cyan-600 font-normal">{pUnit}</span></span>
                                </div>
                                <div className="flex justify-between items-end border-b border-gray-800 pb-1">
                                    <span className="text-[10px] text-gray-500 font-mono">VISIBILITY</span>
                                    <span className="text-sm text-cyan-100 font-bold">{Math.round(current?.visibility / 1000)} <span className="text-[10px] text-cyan-600 font-normal">{dUnit}</span></span>
                                </div>
                                <div className="flex justify-between items-end border-b border-gray-800 pb-1">
                                    <span className="text-[10px] text-gray-500 font-mono">CLOUD COVER</span>
                                    <span className="text-sm text-cyan-100 font-bold">{current?.cloud_cover} <span className="text-[10px] text-cyan-600 font-normal">%</span></span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <span className="text-[10px] text-gray-500 font-mono">DEW POINT</span>
                                    <span className="text-sm text-cyan-100 font-bold">{Math.round(current?.dew_point_2m)} <span className="text-[10px] text-cyan-600 font-normal">{tUnit}</span></span>
                                </div>
                            </div>
                        </TacticalBox>

                        <TacticalBox title="WIND DYNAMICS" subtitle="VECTOR_MAP" corner="tr">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <span className="block text-[10px] text-cyan-700 font-bold tracking-widest uppercase mb-1">RAW SPEED</span>
                                    <div className="text-3xl font-bold text-white text-shadow-glow">{Math.round(current?.wind_speed_10m)}</div>
                                    <span className="text-[10px] text-cyan-500">{sUnit}</span>
                                </div>
                                <div className="w-16 h-16 border border-cyan-900 rounded-full relative flex items-center justify-center">
                                    <Wind size={20} className="text-gray-600 opacity-30" />
                                    <div
                                        className="absolute w-full h-full border-t border-cyan-400 rounded-full transition-transform duration-1000"
                                        style={{ transform: `rotate(${current?.wind_direction_10m}deg)` }}
                                    >
                                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-cyan-400 rotate-45"></div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-950 p-2 border border-gray-800 flex justify-between items-center text-xs">
                                <span className="text-gray-500 font-mono">GUST_MAX</span>
                                <span className="text-yellow-500 font-bold tracking-widest text-shadow-glow-yellow">{Math.round(current?.wind_gusts_10m)} {sUnit}</span>
                            </div>
                        </TacticalBox>

                        <TacticalBox title="TOXICITY / AQI" subtitle={`LEVEL_${currentAqi?.us_aqi}`} className={`border-b-4 ${aqiData.border.replace('border-', 'border-b-')}`}>
                            <div className="flex justify-between items-end mb-4">
                                <div>
                                    <span className={`block text-xs font-bold tracking-widest uppercase ${aqiData.color}`}>{aqiData.label}</span>
                                </div>
                                <span className={`text-4xl font-bold font-mono tracking-tighter ${aqiData.color} text-shadow-glow`}>{currentAqi?.us_aqi}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono mt-4 border-t border-gray-800 pt-3">
                                <div className="flex justify-between"><span className="text-gray-500">PM2.5:</span> <span className="text-cyan-100">{Math.round(currentAqi?.pm2_5)}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">PM10:</span> <span className="text-cyan-100">{Math.round(currentAqi?.pm10)}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">O3:</span> <span className="text-cyan-100">{Math.round(currentAqi?.ozone)}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">NO2:</span> <span className="text-cyan-100">{Math.round(currentAqi?.nitrogen_dioxide)}</span></div>
                            </div>
                        </TacticalBox>
                    </div>

                    {/* Timeline Analysis Matrix */}
                    <TacticalBox title="TEMPORAL ANALYSIS" subtitle="24H // PREDICTIVE_MODEL" className="flex-1">
                        <div className="flex gap-2 w-full overflow-x-auto cyberpunk-scrollbar pb-6 mt-4">
                            {weather?.hourly?.time?.slice(new Date().getHours(), new Date().getHours() + 24).map((timeStr, i) => {
                                const originalIndex = weather.hourly.time.indexOf(timeStr);
                                const code = weather.hourly.weather_code[originalIndex];
                                const temp = Math.round(weather.hourly.temperature_2m[originalIndex]);

                                return (
                                    <div key={i} className={`flex-shrink-0 w-16 md:w-20 flex flex-col items-center justify-between p-2 border border-cyan-900/30 font-mono ${i === 0 ? 'bg-cyan-900/20 border-cyan-500' : 'bg-gray-950/50 hover:bg-cyan-950/40'} transition-colors gap-3`}>
                                        <span className={`text-[10px] tracking-widest ${i === 0 ? 'text-cyan-400 font-bold' : 'text-gray-500'}`}>
                                            {i === 0 ? 'NOW' : formatTime(timeStr, false)}
                                        </span>
                                        <div className="h-8 flex items-center justify-center">
                                            {getWeatherIcon(code, 20)}
                                        </div>
                                        <div className="text-lg font-bold text-white">
                                            {temp}°
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </TacticalBox>

                    {/* Lower Matrix: 7 Day + Solar */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <TacticalBox title="LONG-TERM PROJECTION" subtitle="7_DAY" corner="bl">
                            <div className="flex flex-col gap-2 font-mono">
                                {daily?.time?.slice(0, 7).map((dateStr, index) => {
                                    const min = Math.round(daily.temperature_2m_min[index]);
                                    const max = Math.round(daily.temperature_2m_max[index]);
                                    const code = daily.weather_code[index];
                                    const precip = daily.precipitation_probability_max?.[index] || 0;

                                    return (
                                        <div key={index} className="flex items-center gap-4 py-2 border-b border-cyan-950 text-xs hover:bg-cyan-950/20 px-2 transition-colors">
                                            <div className="w-10 text-cyan-600 font-bold uppercase tracking-widest">
                                                {index === 0 ? 'TDY' : index === 1 ? 'TMR' : new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' })}
                                            </div>
                                            <div className="flex justify-center w-8">
                                                {getWeatherIcon(code, 16)}
                                            </div>
                                            <div className="w-8 text-cyan-700 text-[10px]">{precip > 0 ? `${precip}%` : '---'}</div>

                                            <div className="flex-1 flex justify-between items-center relative px-2">
                                                <div className="absolute inset-x-2 top-1/2 h-[1px] bg-cyan-900/30 -translate-y-1/2"></div>
                                                <span className="text-gray-400 relative z-10 bg-gray-900/80 px-1">{min}°</span>
                                                <span className="text-white font-bold relative z-10 bg-gray-900/80 px-1">{max}°</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </TacticalBox>

                        <div className="flex flex-col gap-6">
                            <TacticalBox title="SOLAR RADIATION" subtitle="UV_INDEX" corner="br">
                                <div className="flex gap-6 items-center">
                                    <div className="w-24 h-24 border-2 border-dashed border-yellow-500/30 rounded-full flex items-center justify-center relative">
                                        <div className="absolute w-20 h-20 border border-yellow-500/50 rounded-full animate-pulse"></div>
                                        <span className="text-3xl font-bold font-mono text-yellow-500 text-shadow-glow-yellow">{daily?.uv_index_max[0]}</span>
                                    </div>
                                    <div className="flex-1 space-y-3">
                                        <div className="text-[10px] text-gray-500 font-mono">PEAK RADIATION <span className="text-yellow-500 font-bold ml-2">[{daily?.uv_index_max[0] >= 8 ? 'CRITICAL' : daily?.uv_index_max[0] >= 5 ? 'WARN' : 'NOMINAL'}]</span></div>
                                        <div className="h-1 bg-gray-800 w-full relative">
                                            <div
                                                className="absolute top-0 left-0 h-full bg-gradient-to-r from-yellow-600 to-yellow-300"
                                                style={{ width: `${Math.min(daily?.uv_index_max[0] * 10, 100)}%` }}
                                            ></div>
                                        </div>
                                        <div className="flex justify-between items-end border-t border-gray-800 pt-2 mt-4 text-xs font-mono">
                                            <div className="flex flex-col"><span className="text-[10px] text-cyan-700">SUNRISE</span> <span className="text-cyan-100">{formatTime(daily?.sunrise[0], true)}</span></div>
                                            <div className="flex flex-col text-right"><span className="text-[10px] text-cyan-700">SUNSET</span> <span className="text-cyan-100">{formatTime(daily?.sunset[0], true)}</span></div>
                                        </div>
                                    </div>
                                </div>
                            </TacticalBox>

                            <TacticalBox title="SYSTEM STATUS" subtitle="NULL_ROUTING_SECURED">
                                <div className="flex justify-between items-center text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em] mb-4">
                                    <span>CONNECTION</span>
                                    <span className="text-green-500 animate-pulse">[ESTABLISHED]</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-cyan-600">
                                    <div className="p-2 border border-cyan-900 bg-cyan-950/20 text-center hover:bg-cyan-900 hover:text-white transition-colors cursor-default">LAT: {location.lat.toFixed(4)}</div>
                                    <div className="p-2 border border-cyan-900 bg-cyan-950/20 text-center hover:bg-cyan-900 hover:text-white transition-colors cursor-default">LON: {location.lon.toFixed(4)}</div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-cyan-900/50 text-[10px] text-center text-gray-600 font-mono">
                                    {new Date().toISOString()} // ID: {Math.random().toString(36).substring(7).toUpperCase()}
                                </div>
                            </TacticalBox>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default CyberpunkWeather;
