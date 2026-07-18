// Hanamimi (花耳) — the Flutter web build of the base music player,
// embedded fullscreen as a self-contained iframe (same-origin under
// /hanamimi/, so no CSP/cross-origin friction). Local files only,
// nothing uploaded. Mirrors the CyberWeather standalone pattern.
export default function Hanamimi() {
  return (
    <div className="absolute inset-0 z-[100] bg-[#12101a]">
      <iframe
        src="/hanamimi/index.html"
        title="Hanamimi"
        className="w-full h-full border-0"
        allow="autoplay; fullscreen"
      />
    </div>
  );
}
