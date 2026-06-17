"use client";

// Vídeo de YouTube a pantalla completa (cover), en modo de fusión "difference"
// para un look psicodélico. Silenciado y en loop. No captura clicks.
const VIDEO_ID = "qzl2t2p7AYc";

export function YoutubeBg() {
  const src =
    `https://www.youtube.com/embed/${VIDEO_ID}` +
    `?autoplay=1&mute=1&controls=0&loop=1&playlist=${VIDEO_ID}` +
    `&playsinline=1&modestbranding=1&rel=0&showinfo=0&disablekb=1`;
  return (
    <div className="yt-bg" aria-hidden>
      <iframe
        src={src}
        title="fire background"
        frameBorder={0}
        allow="autoplay; encrypted-media"
      />
    </div>
  );
}
