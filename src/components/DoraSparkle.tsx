import React from "react";
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
 * Dora's signature 4-pointed radiant star / emblem.
 * Cute, elegant, soft, futuristic, and premium with subtle cyan-blue gradient.
 * Supports smooth, restrained breathing and voice-reactive states without jarring shifts.
 */
export const DoraSparkle: React.FC<DoraSparkleProps> = ({
  size = 52,
  className = "",
  state = "idle",
  isCallActive = false,
  volumeLevel = 0,
  onClick,
}) => {
  // Determine scale based on conversation state & voice volume
  const getDynamicScale = () => {
    if (!isCallActive && state === "idle") return 1;
    if (state === "speaking") {
      return 1.04 + Math.min(volumeLevel * 0.14, 0.18);
    }
    if (state === "listening") {
      return 1.02 + Math.min(volumeLevel * 0.08, 0.1);
    }
    if (state === "thinking") {
      return 1.04;
    }
    return 1;
  };

  // Glow opacity and scale based on state
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
        stiffness: 300,
        damping: 24,
      }}
    >
      {/* Soft ambient background blue glow */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: size * 1.6,
          height: size * 1.6,
          background:
            state === "thinking"
              ? "radial-gradient(circle, rgba(168, 85, 247, 0.35) 0%, rgba(56, 189, 248, 0.15) 50%, transparent 70%)"
              : "radial-gradient(circle, rgba(29, 114, 254, 0.4) 0%, rgba(56, 189, 248, 0.18) 50%, transparent 70%)",
          filter: "blur(14px)",
        }}
        animate={{
          opacity: isVoiceActive ? (state === "speaking" ? 0.85 : 0.6) : 0.35,
          scale: isVoiceActive ? (state === "speaking" ? 1.25 : 1.1) : 1,
        }}
        transition={{
          duration: state === "listening" ? 1.8 : 0.6,
          repeat: state === "listening" ? Infinity : 0,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
      />

      {/* Subtle outer breathing ring (only during listening/speaking) */}
      {isVoiceActive && (
        <motion.div
          className="absolute inset-0 rounded-full border border-[#38BDF8]/30 pointer-events-none"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.7, 0.3],
          }}
          transition={{
            duration: state === "thinking" ? 1.2 : 2.4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      {/* Dora 4-pointed radiant star SVG */}
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full relative z-10 overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="doraSparkleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="35%" stopColor="#38BDF8" />
            <stop offset="70%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#818CF8" />
          </linearGradient>
          <linearGradient id="doraSparkleInner" x1="20%" y1="20%" x2="80%" y2="80%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#93C5FD" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.3" />
          </linearGradient>
          <filter id="doraSparkleFilter" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 4-pointed radiant star shape */}
        <path
          d="M 50 2 C 50 28, 72 50, 98 50 C 72 50, 50 72, 50 98 C 50 72, 28 50, 2 50 C 28 50, 50 28, 50 2 Z"
          fill="url(#doraSparkleGrad)"
          filter="url(#doraSparkleFilter)"
        />

        {/* Inner highlight core */}
        <path
          d="M 50 16 C 50 36, 64 50, 84 50 C 64 50, 50 64, 50 84 C 50 64, 36 50, 16 50 C 36 50, 50 36, 50 16 Z"
          fill="url(#doraSparkleInner)"
        />

        {/* Center bright dot */}
        <circle cx="50" cy="50" r="4.5" fill="#FFFFFF" />
      </svg>
    </motion.div>
  );
};
