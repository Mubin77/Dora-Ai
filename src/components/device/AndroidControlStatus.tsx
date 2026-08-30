import React, { useState, useEffect } from "react";
import {
  Smartphone,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { deviceControlService } from "../../services/device/DeviceControlService";
import { DevicePermissionStatus } from "../../types/device";

interface AndroidControlStatusProps {
  className?: string;
  onOpenTestApp?: (appName: string) => void;
}

export const AndroidControlStatus: React.FC<AndroidControlStatusProps> = ({
  className = "",
  onOpenTestApp,
}) => {
  const [status, setStatus] = useState<DevicePermissionStatus>({
    accessibilityEnabled: false,
    bridgeConnected: false,
    deviceModel: "Checking...",
    androidVersion: "",
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const refreshStatus = async () => {
    setIsLoading(true);
    setActionFeedback(null);
    try {
      const summary = await deviceControlService.getStatus();
      setStatus(summary.androidStatus);
    } catch (err: any) {
      console.warn("[AndroidControlStatus] Error fetching status:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const handleTestOpen = async (appName: string) => {
    setIsLoading(true);
    setActionFeedback(null);
    try {
      const result = await deviceControlService.openApplication(appName);
      if (result.success) {
        setActionFeedback(`✓ ${result.message}`);
      } else {
        setActionFeedback(`ℹ ${result.error?.details || result.message}`);
      }
      if (onOpenTestApp) {
        onOpenTestApp(appName);
      }
    } catch (err: any) {
      setActionFeedback(`Error: ${err.message || String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="android-control-status-panel"
      className={`rounded-2xl bg-white/[0.03] border border-white/[0.07] p-4 text-white/90 ${className}`}
    >
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#38BDF8]/10 text-[#38BDF8]">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-white tracking-tight">
              Android Phone Control
            </h3>
            <p className="text-xs text-white/45">
              Native Companion Bridge & Accessibility Foundation
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={refreshStatus}
          disabled={isLoading}
          className="p-1.5 rounded-lg hover:bg-white/[0.08] text-white/50 hover:text-white transition-colors disabled:opacity-40"
          title="Refresh device connection status"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="mt-3.5 grid grid-cols-2 gap-2 text-xs">
        {/* Bridge Connection State */}
        <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <span className="text-white/45 font-medium">Native Bridge</span>
          <div className="flex items-center gap-1.5">
            {status.bridgeConnected ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-emerald-400 font-medium">Connected</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                <span className="text-white/70">Web Sandbox</span>
              </>
            )}
          </div>
        </div>

        {/* Accessibility Permission State */}
        <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <span className="text-white/45 font-medium">Accessibility</span>
          <div className="flex items-center gap-1.5">
            {status.accessibilityEnabled ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-emerald-400 font-medium">Enabled</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-white/40 shrink-0" />
                <span className="text-white/50">Disabled / Phase 2</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Device Info */}
      <div className="mt-2.5 px-3 py-2 rounded-xl bg-black/40 border border-white/[0.04] text-[11px] text-white/55 flex items-center justify-between">
        <span>Device Environment:</span>
        <span className="text-white/80 font-mono">
          {status.deviceModel || "Browser"} {status.androidVersion ? `(${status.androidVersion})` : ""}
        </span>
      </div>

      {/* Quick Test Actions */}
      <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
        <span className="text-[11px] text-white/40">Safe Milestone 1 Action:</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleTestOpen("YouTube")}
            disabled={isLoading}
            className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white/80 text-[11px] font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Zap className="w-3 h-3 text-[#38BDF8]" />
            Test "Open YouTube"
          </button>
        </div>
      </div>

      {/* Feedback Message */}
      {actionFeedback && (
        <div className="mt-2.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[11px] text-white/80 animate-in fade-in duration-150">
          {actionFeedback}
        </div>
      )}
    </div>
  );
};
