import React, { useEffect, useRef } from "react";
import { ConversationState, DoraEmotion } from "../types";

interface VoiceOrbProps {
  state: ConversationState;
  volumeLevel: number;
  emotion?: DoraEmotion;
  isMuted?: boolean;
  isCallActive?: boolean;
  onClick?: () => void;
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({
  state,
  volumeLevel,
  emotion = "warm",
  isMuted = false,
  isCallActive = false,
  onClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Smooth animation interpolation values
  const smoothedVolumeRef = useRef<number>(0);
  const phaseRef = useRef<number>(0);
  const pulseScaleRef = useRef<number>(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = 440);
    let height = (canvas.height = 440);

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const size = Math.max(rect.width || 320, 260);
      width = canvas.width = size * dpr;
      height = canvas.height = size * dpr;
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    const render = () => {
      // Smooth volume transitions (only when call is active and not muted)
      const targetVol = !isCallActive || isMuted ? 0 : Math.min(Math.max(volumeLevel, 0), 1);
      smoothedVolumeRef.current += (targetVol - smoothedVolumeRef.current) * 0.15;
      const vol = smoothedVolumeRef.current;

      // Advance animation phase based on state
      const speed = !isCallActive
        ? 0.008
        : state === "speaking"
        ? 0.035 + vol * 0.04
        : state === "thinking"
        ? 0.025
        : state === "listening"
        ? 0.018 + vol * 0.03
        : 0.012;
      phaseRef.current += speed;
      const phase = phaseRef.current;

      // Target scale calculation
      let targetScale = 1;
      if (isCallActive) {
        if (state === "speaking") {
          targetScale = 1 + vol * 0.18 + Math.sin(phase * 2) * 0.04;
        } else if (state === "listening") {
          targetScale = 1 + vol * 0.12 + Math.sin(phase * 1.5) * 0.02;
        } else if (state === "thinking") {
          targetScale = 0.96 + Math.sin(phase * 3) * 0.03;
        } else {
          targetScale = 1 + Math.sin(phase) * 0.02;
        }
      } else {
        targetScale = 1 + Math.sin(phase * 0.8) * 0.015;
      }
      pulseScaleRef.current += (targetScale - pulseScaleRef.current) * 0.1;
      const scale = pulseScaleRef.current;

      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const baseRadius = Math.min(width, height) * 0.36 * scale;

      // -------------------------------------------------------------
      // 1. Soft Outer Atmospheric Ambient Glow
      // -------------------------------------------------------------
      const glowGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        baseRadius * 0.5,
        centerX,
        centerY,
        baseRadius * 1.45
      );

      if (!isCallActive) {
        glowGrad.addColorStop(0, "rgba(56, 189, 248, 0.18)");
        glowGrad.addColorStop(0.5, "rgba(29, 114, 254, 0.08)");
        glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      } else if (state === "speaking") {
        glowGrad.addColorStop(0, "rgba(56, 189, 248, 0.45)");
        glowGrad.addColorStop(0.5, "rgba(29, 114, 254, 0.2)");
        glowGrad.addColorStop(1, "rgba(29, 114, 254, 0)");
      } else if (state === "thinking") {
        glowGrad.addColorStop(0, "rgba(168, 85, 247, 0.35)");
        glowGrad.addColorStop(0.5, "rgba(29, 114, 254, 0.15)");
        glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      } else if (state === "listening") {
        glowGrad.addColorStop(0, "rgba(56, 189, 248, 0.3)");
        glowGrad.addColorStop(0.5, "rgba(29, 114, 254, 0.15)");
        glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      } else {
        glowGrad.addColorStop(0, "rgba(29, 114, 254, 0.2)");
        glowGrad.addColorStop(0.6, "rgba(29, 114, 254, 0.08)");
        glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      }

      ctx.save();
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 1.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // -------------------------------------------------------------
      // 2. Base Sphere Circle Clipping
      // -------------------------------------------------------------
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
      ctx.clip();

      // Deep celestial blue base background inside sphere
      const sphereBgGrad = ctx.createLinearGradient(
        centerX,
        centerY - baseRadius,
        centerX,
        centerY + baseRadius
      );
      sphereBgGrad.addColorStop(0, "#7EA5FD");
      sphereBgGrad.addColorStop(0.4, "#9BB8FD");
      sphereBgGrad.addColorStop(0.7, "#AEC7FE");
      sphereBgGrad.addColorStop(1, "#86A6FC");

      ctx.fillStyle = sphereBgGrad;
      ctx.fillRect(centerX - baseRadius, centerY - baseRadius, baseRadius * 2, baseRadius * 2);

      // -------------------------------------------------------------
      // 3. Ethereal Cloud & Plasma Waves
      // -------------------------------------------------------------
      // Layer 1: Top Soft Deep Blue Arc
      const topArcGrad = ctx.createLinearGradient(
        centerX,
        centerY - baseRadius,
        centerX,
        centerY - baseRadius * 0.2
      );
      topArcGrad.addColorStop(0, "#6389EE");
      topArcGrad.addColorStop(0.6, "#799CF4");
      topArcGrad.addColorStop(1, "rgba(121, 156, 244, 0)");

      ctx.fillStyle = topArcGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius, Math.PI * 1.05, Math.PI * 1.95, false);
      ctx.fill();

      // Layer 2: Organic Cloud Strata (Soft White Ethereal Flow)
      ctx.save();
      ctx.globalCompositeOperation = "screen";

      const waveCount = isCallActive ? 4 : 2;
      for (let i = 0; i < waveCount; i++) {
        const offsetPhase = phase + i * 1.3;
        const waveY =
          centerY -
          baseRadius * 0.25 +
          i * (baseRadius * 0.22) +
          Math.sin(offsetPhase * 0.8) * (isCallActive ? 10 + vol * 15 : 4);

        const cloudGrad = ctx.createRadialGradient(
          centerX + Math.cos(offsetPhase) * (baseRadius * 0.35),
          waveY,
          baseRadius * 0.1,
          centerX,
          waveY,
          baseRadius * 0.85
        );

        cloudGrad.addColorStop(0, "rgba(255, 255, 255, 0.75)");
        cloudGrad.addColorStop(0.4, "rgba(235, 245, 255, 0.45)");
        cloudGrad.addColorStop(0.75, "rgba(180, 215, 255, 0.15)");
        cloudGrad.addColorStop(1, "rgba(180, 215, 255, 0)");

        ctx.fillStyle = cloudGrad;
        ctx.beginPath();

        // Draw organic wavy contour
        ctx.moveTo(centerX - baseRadius, centerY + baseRadius);
        for (let x = centerX - baseRadius; x <= centerX + baseRadius; x += 15) {
          const normX = (x - centerX) / baseRadius;
          const dy = isCallActive
            ? Math.sin(normX * 3.5 + offsetPhase) * (14 + vol * 22) +
              Math.cos(normX * 2.1 - offsetPhase * 0.7) * (8 + vol * 12)
            : Math.sin(normX * 2.5 + offsetPhase) * 5;
          ctx.lineTo(x, waveY + dy);
        }
        ctx.lineTo(centerX + baseRadius, centerY + baseRadius);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();

      // Layer 3: Central Ambient Light Core (Gives 3D depth and luminance)
      const coreLightGrad = ctx.createRadialGradient(
        centerX,
        centerY + baseRadius * 0.05,
        baseRadius * 0.05,
        centerX,
        centerY,
        baseRadius * 0.95
      );
      coreLightGrad.addColorStop(0, "rgba(255, 255, 255, 0.8)");
      coreLightGrad.addColorStop(0.35, "rgba(230, 240, 255, 0.4)");
      coreLightGrad.addColorStop(0.7, "rgba(160, 195, 255, 0.1)");
      coreLightGrad.addColorStop(1, "rgba(100, 150, 255, 0)");

      ctx.save();
      ctx.globalCompositeOperation = "overlay";
      ctx.fillStyle = coreLightGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Layer 4: Soft Bottom Fog/Shadow Falloff
      const bottomShadowGrad = ctx.createLinearGradient(
        centerX,
        centerY + baseRadius * 0.4,
        centerX,
        centerY + baseRadius
      );
      bottomShadowGrad.addColorStop(0, "rgba(120, 155, 245, 0)");
      bottomShadowGrad.addColorStop(1, "rgba(90, 125, 230, 0.35)");

      ctx.fillStyle = bottomShadowGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius, 0, Math.PI, false);
      ctx.fill();

      ctx.restore(); // Restore sphere clipping

      // -------------------------------------------------------------
      // 4. Subtle Outer Horizon Edge Ring
      // -------------------------------------------------------------
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [state, isMuted, isCallActive, emotion]);

  return (
    <div
      onClick={onClick}
      className="relative flex items-center justify-center cursor-pointer select-none group"
      style={{ touchAction: "none" }}
      title={isCallActive ? "Tap to end voice session" : "Tap to start voice session"}
    >
      <canvas
        ref={canvasRef}
        className="w-[clamp(260px,min(74vw,42vh),420px)] h-[clamp(260px,min(74vw,42vh),420px)] aspect-square transition-transform duration-300 group-hover:scale-[1.02] active:scale-[0.98]"
      />
    </div>
  );
};
