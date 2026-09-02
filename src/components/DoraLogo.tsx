import React from "react";
import { motion } from "motion/react";
import { ConversationState } from "../types";

interface DoraLogoProps {
  size?: number;
  className?: string;
  state?: ConversationState;
  isCallActive?: boolean;
  volumeLevel?: number;
  variant?: "dark" | "light" | "dynamic";
}

export const DoraLogo: React.FC<DoraLogoProps> = ({
  size = 42,
  className = "",
  state = "idle",
  isCallActive = false,
  volumeLevel = 0,
  variant = "dynamic",
}) => {
  // Determine dynamic scale based on conversation state & voice volume
  const getDynamicScale = () => {
    if (!isCallActive && state === "idle") return 1;
    if (state === "speaking") {
      return 1.04 + Math.min(volumeLevel * 0.15, 0.18);
    }
    if (state === "listening") {
      return 1.02 + Math.min(volumeLevel * 0.08, 0.1);
    }
    if (state === "thinking") {
      return 1.03;
    }
    return 1;
  };

  const isVoiceActive = isCallActive || state === "speaking" || state === "listening" || state === "thinking";

  const strokeColor =
    variant === "light"
      ? "#0F172A"
      : variant === "dark"
      ? "#FFFFFF"
      : state === "speaking"
      ? "#38BDF8"
      : state === "thinking"
      ? "#C084FC"
      : state === "listening"
      ? "#60A5FA"
      : "#F8FAFC";

  return (
    <motion.div
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
      animate={{
        scale: getDynamicScale(),
      }}
      transition={{
        type: "spring",
        stiffness: 320,
        damping: 24,
      }}
    >
      {/* Outer ambient glow for voice mode */}
      {isVoiceActive && (
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background:
              state === "thinking"
                ? "radial-gradient(circle, rgba(168, 85, 247, 0.4) 0%, rgba(56, 189, 248, 0.15) 60%, transparent 80%)"
                : "radial-gradient(circle, rgba(56, 189, 248, 0.4) 0%, rgba(14, 165, 233, 0.15) 60%, transparent 80%)",
            filter: "blur(8px)",
          }}
          animate={{
            opacity: state === "speaking" ? 0.9 : 0.6,
            scale: state === "speaking" ? 1.25 : 1.1,
          }}
          transition={{
            duration: state === "listening" ? 1.6 : 0.4,
            repeat: state === "listening" ? Infinity : 0,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
        />
      )}

      {/* Official Dora Minimalist Logo */}
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full relative z-10"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g
          stroke={strokeColor}
          strokeWidth="8.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Left vertical pill */}
          <path d="M 36 41 L 36 69" />
          {/* Right curved D loop */}
          <path d="M 36 29 L 51 29 C 68 29 73 39 73 55 C 73 71 68 81 51 81 L 46 81" />
        </g>
      </svg>
    </motion.div>
  );
};

