"use client";

import { useRef } from "react";
import { useLiveState } from "./use-live-state";

/** Overlay de rolagem para o OBS (equivalente a obs.html / obs.js do projeto de rolagem). */
export default function ObsRoll({ sheetId }: { sheetId: string }) {
  const wrapper = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const count = useRef<HTMLDivElement>(null);
  const dots = useRef<HTMLDivElement>(null);
  const lastId = useRef<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLiveState(sheetId, (state, initial) => {
    const roll = state.last_roll;
    if (!roll) return;
    if (roll.id === lastId.current) return;
    lastId.current = roll.id;
    // Ao abrir/atualizar a fonte do navegador no OBS, não reexibe uma rolagem antiga.
    if (initial) return;

    const w = wrapper.current, v = video.current, c = count.current, d = dots.current;
    if (!w || !v || !c || !d) return;

    if (hideTimer.current) clearTimeout(hideTimer.current);
    w.classList.remove("show");
    v.pause();
    v.currentTime = 0;
    void w.offsetWidth; // força reflow para reiniciar a transição

    c.textContent = String(roll.successes);
    d.innerHTML = "";
    roll.results.forEach(r => {
      if (r === 12 || r === 1) {
        const dot = document.createElement("span");
        dot.className = r === 12 ? "order-dot" : "chaos-dot";
        d.appendChild(dot);
      }
    });

    w.classList.add("show");
    v.play().catch(() => {});

    hideTimer.current = setTimeout(() => {
      w.classList.remove("show");
      v.pause();
      v.currentTime = 0;
    }, 7000);
  });

  return (
    <div className="obs-stage">
      <div className="dice-wrapper" ref={wrapper}>
        <video className="obs-dice-video" ref={video} src="/obs/dice_animation.webm" muted playsInline preload="auto" />
        <div className="obs-result">
          <div className="obs-success-count" ref={count} />
          <div className="alignment-dots" ref={dots} />
        </div>
      </div>
    </div>
  );
}
