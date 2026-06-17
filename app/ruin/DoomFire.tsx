"use client";

import { useEffect, useRef } from "react";

// Fuego ASCII (algoritmo "doom fire"): una rejilla de intensidades que se
// propaga de abajo a arriba con decaimiento aleatorio, renderizada como texto.

const W = 110;
const H = 18;

// intensidad 0..36 -> { char, color }
function cell(v: number): [string, string] {
  if (v <= 0) return [" ", ""];
  if (v < 5) return [".", "#3a0a00"];
  if (v < 9) return [":", "#6b1500"];
  if (v < 13) return ["^", "#9c2200"];
  if (v < 17) return ["*", "#d23600"];
  if (v < 21) return ["x", "#f2560a"];
  if (v < 25) return ["X", "#ff8c00"];
  if (v < 29) return ["#", "#ffb000"];
  if (v < 33) return ["%", "#ffd24a"];
  return ["@", "#fff3b0"];
}

export function DoomFire() {
  const ref = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const N = W * H;
    const px = new Uint8Array(N);
    // fila inferior al máximo (la fuente del fuego)
    for (let x = 0; x < W; x++) px[(H - 1) * W + x] = 36;

    function spread(src: number) {
      const v = px[src];
      if (v === 0) {
        if (src - W >= 0) px[src - W] = 0;
        return;
      }
      const rnd = Math.floor(Math.random() * 3) & 3;
      const dst = src - rnd + 1;
      const tgt = dst - W;
      if (tgt >= 0 && tgt < N) px[tgt] = Math.max(0, v - (rnd & 1));
    }

    function tick() {
      for (let x = 0; x < W; x++) {
        for (let y = 1; y < H; y++) spread(y * W + x);
      }
      let html = "";
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const [ch, color] = cell(px[y * W + x]);
          html += ch === " " ? " " : `<span style="color:${color}">${ch}</span>`;
        }
        html += "\n";
      }
      if (ref.current) ref.current.innerHTML = html;
    }

    if (reduce) {
      tick();
      return;
    }
    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      if (t - last > 45) {
        tick();
        last = t;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <pre
      ref={ref}
      aria-hidden
      className="pointer-events-none select-none overflow-hidden whitespace-pre text-center leading-[0.78] opacity-80"
      style={{ fontSize: "11px", textShadow: "0 0 6px rgba(255,90,0,0.5)" }}
    />
  );
}
