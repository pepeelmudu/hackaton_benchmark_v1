"use client";

// Vídeo de YouTube a pantalla completa (cover), pixelado y en modo de fusión
// "difference". Silenciado, en loop, sin título ni controles. No captura clicks.
const VIDEO_ID = "qzl2t2p7AYc";

export function YoutubeBg() {
  const src =
    `https://www.youtube.com/embed/${VIDEO_ID}` +
    `?autoplay=1&mute=1&controls=0&loop=1&playlist=${VIDEO_ID}` +
    `&playsinline=1&modestbranding=1&rel=0&showinfo=0&disablekb=1&iv_load_policy=3&fs=0`;
  return (
    <div className="yt-bg" aria-hidden>
      {/* Filtro SVG de pixelado */}
      <svg className="absolute h-0 w-0">
        <filter id="pixelate-fire" x="0" y="0">
          <feFlood x="4" y="4" height="2" width="2" />
          <feComposite width="9" height="9" />
          <feTile result="a" />
          <feComposite in="SourceGraphic" in2="a" operator="in" />
          <feMorphology operator="dilate" radius="4.5" />
        </filter>
      </svg>
      <iframe src={src} title="fire background" frameBorder={0} allow="autoplay; encrypted-media" />
    </div>
  );
}
