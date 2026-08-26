import React, { useId } from "react";
import { motion } from "motion/react";
import { ConversationState } from "../types";

interface DoraSparkleProps {
  size?: number;
  className?: string;
  state?: ConversationState;
  isCallActive?: boolean;
  volumeLevel?: number; // 0 to 1
  onClick?: () => void;
}

/**
 * Dora's signature 4-pointed radiant star / voice emblem.
 * Clearly visible, centered, crisp, vibrant cyan-to-electric-blue gradient with 3D light facets.
 * Smoothly animates during active listening/speaking according to voice activity.
 */
export const DoraSparkle: React.FC<DoraSparkleProps> = ({
  size = 40,
  className = "",
  state = "idle",
  isCallActive = false,
  volumeLevel = 0,
  onClick,
}) => {
  const uniqueId = useId().replace(/:/g, "_");

  // Determine dynamic scale based on conversation state & voice volume
  const getDynamicScale = () => {
    if (!isCallActive && state === "idle") return 1;
    if (state === "speaking") {
      return 1.04 + Math.min(volumeLevel * 0.18, 0.22);
    }
    if (state === "listening") {
      return 1.02 + Math.min(volumeLevel * 0.1, 0.14);
    }
    if (state === "thinking") {
      return 1.05;
    }
    return 1;
  };

  const isVoiceActive = isCallActive || state === "speaking" || state === "listening" || state === "thinking";

  return (
    <motion.div
      className={`relative flex items-center justify-center select-none ${onClick ? "cursor-pointer" : ""} ${className}`}
      style={{ width: size, height: size }}
      onClick={onClick}
      animate={{
        scale: getDynamicScale(),
      }}
      transition={{
        type: "spring",
        stiffness: 340,
        damping: 22,
      }}
    >
      {/* Soft ambient background glow for depth */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: size * 1.5,
          height: size * 1.5,
          background:
            state === "thinking"
              ? "radial-gradient(circle, rgba(168, 85, 247, 0.45) 0%, rgba(56, 189, 248, 0.2) 50%, transparent 70%)"
              : "radial-gradient(circle, rgba(56, 189, 248, 0.5) 0%, rgba(29, 114, 254, 0.25) 50%, transparent 70%)",
          filter: "blur(10px)",
        }}
        animate={{
          opacity: isVoiceActive ? (state === "speaking" ? 0.9 : 0.65) : 0.35,
          scale: isVoiceActive ? (state === "speaking" ? 1.25 : 1.1) : 1,
        }}
        transition={{
          duration: state === "listening" ? 1.6 : 0.6,
          repeat: state === "listening" ? Infinity : 0,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
      />

      {/* Dora's 4-Pointed Radiant Voice Star SVG */}
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full relative z-10 overflow-visible drop-shadow-[0_0_12px_rgba(56,189,248,0.4)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Main Vibrant Body Gradient */}
          <linearGradient id={`starGrad_${uniqueId}`} x1="15%" y1="5%" x2="85%" y2="95%">
            <stop offset="0%" stopColor="#93C5FD" />
            <stop offset="25%" stopColor="#38BDF8" />
            <stop offset="65%" stopColor="#1D72FE" />
            <stop offset="100%" stopColor="#0B4FFF" />
          </linearGradient>

          {/* Core Light Reflection Facet Gradient */}
          <linearGradient id={`coreFacet_${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="40%" stopColor="#BAE6FD" stopOpacity="0.8" />
            <stop offset="80%" stopColor="#38BDF8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#1D72FE" stopOpacity="0.1" />
          </linearGradient>

          {/* Upper-Left Radiant Sheen */}
          <linearGradient id={`sheenGrad_${uniqueId}`} x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* 1. Main 4-pointed radiant star body */}
        <path
          d="M 50 2 C 50 26, 74 50, 98 50 C 74 50, 50 74, 50 98 C 50 74, 26 50, 2 50 C 26 50, 50 26, 50 2 Z"
          fill={`url(#starGrad_${uniqueId})`}
        />

        {/* 2. Left and Upper 3D Facet Shading */}
        <path
          d="M 50 2 C 50 26, 26 50, 2 50 C 26 50, 50 50, 50 50 Z"
          fill="#FFFFFF"
          fillOpacity="0.28"
        />
        <path
          d="M 50 50 C 50 50, 26 50, 2 50 C 26 50, 50 74, 50 98 Z"
          fill="#0B4FFF"
          fillOpacity="0.25"
        />

        {/* 3. Luminous Inner Star / Core Prism */}
        <path
          d="M 50 16 C 50 35, 65 50, 84 50 C 65 50, 50 65, 50 84 C 50 65, 35 50, 16 50 C 35 50, 50 35, 50 16 Z"
          fill={`url(#coreFacet_${uniqueId})`}
        />

        {/* 4. Center Radiant Cross Light Beams */}
        <path
          d="M 50 22 L 50 78 M 22 50 L 78 50"
          stroke={`url(#sheenGrad_${uniqueId})`}
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* 5. Center Diamond Spark Core */}
        <polygon
          points="50,42 56,50 50,58 44,50"
          fill="#FFFFFF"
          fillOpacity="0.95"
        />
      </svg>
    </motion.div>
  );
};

