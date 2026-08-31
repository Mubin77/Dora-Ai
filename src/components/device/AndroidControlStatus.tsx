import React, { useState, useEffect } from "react";
import {
  Smartphone,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  QrCode,
  Copy,
  Check,
  ShieldCheck,
  ChevronRight,
  X,
  ExternalLink,
  Power,
} from "lucide-react";
import { deviceControlService } from "../../services/device/DeviceControlService";
import { devicePairingService } from "../../services/device/DevicePairingService";
import { DeviceDeploymentStatus, DevicePairingSession, DevicePermissionStatus } from "../../types/device";

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
    deploymentStatus: "NOT_CONFIGURED",
    deviceModel: "Checking...",
    androidVersion: "",
    isRealDevice: false,
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [showSetupModal, setShowSetupModal] = useState<boolean>(false);
  const [pairingSession, setPairingSession] = useState<DevicePairingSession | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const refreshStatus = async () => {
    setIsLoading(true);
    setActionFeedback(null);
    try {
      // First check local pairing service
      const localDeployment = devicePairingService.getDeploymentStatus();
      // Also query device control service for live bridge check
      const summary = await deviceControlService.getStatus();
      
      setStatus({
        ...summary.androidStatus,
        deploymentStatus: localDeployment.deploymentStatus,
        isRealDevice: localDeployment.isRealDevice || summary.androidStatus.isRealDevice,
        deviceModel: localDeployment.deviceModel || summary.androidStatus.deviceModel,
        androidVersion: localDeployment.androidVersion || summary.androidStatus.androidVersion,
      });
    } catch (err: any) {
      console.warn("[AndroidControlStatus] Error fetching status:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const handleStartSetup = () => {
    const session = devicePairingService.generatePairingSession(window.location.origin);
    setPairingSession(session);
    setShowSetupModal(true);
  };

  const handleCopyCode = () => {
    if (pairingSession?.pairingCode) {
      navigator.clipboard.writeText(pairingSession.pairingCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleUnpair = () => {
    const active = devicePairingService.getActiveDevice();
    if (active) {
      devicePairingService.unpairDevice(active.deviceId);
      refreshStatus();
      setShowSetupModal(false);
      setActionFeedback("Device unpaired successfully.");
    }
  };

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

  // Determine visual badge and labels based on DeploymentStatus
  const getStatusBadge = () => {
    const depStatus = status.deploymentStatus || "NOT_CONFIGURED";
    switch (depStatus) {
      case "CONNECTED":
        return (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Connected</span>
          </div>
        );
      case "READY":
        return (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Ready</span>
          </div>
        );
      case "ACCESSIBILITY_DISABLED":
        return (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Accessibility Disabled</span>
          </div>
        );
      case "ERROR":
        return (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Connection Error</span>
          </div>
        );
      case "NOT_CONFIGURED":
      default:
        return (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50 text-xs font-medium">
            <Smartphone className="w-3.5 h-3.5" />
            <span>Not Connected</span>
          </div>
        );
    }
  };

  const isConnectedOrReady = status.deploymentStatus === "CONNECTED" || status.deploymentStatus === "READY";

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
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-white tracking-tight">
                Android Control
              </h3>
              {getStatusBadge()}
            </div>
            <p className="text-xs text-white/45 mt-0.5">
              Dora Android Companion & Autonomous Device Control
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={refreshStatus}
          disabled={isLoading}
          className="p-1.5 rounded-lg hover:bg-white/[0.08] text-white/50 hover:text-white transition-colors disabled:opacity-40"
          title="Refresh connection status"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Main Status & Setup CTA */}
      <div className="mt-3.5 flex items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-white/50">Device Status</span>
          <span className="text-xs font-medium text-white">
            {status.deploymentStatus === "CONNECTED" && `Connected: ${status.deviceModel || "Android Phone"}`}
            {status.deploymentStatus === "READY" && `Ready: ${status.deviceModel || "Android Phone"}`}
            {status.deploymentStatus === "ACCESSIBILITY_DISABLED" && "Accessibility Permission Required"}
            {status.deploymentStatus === "NOT_CONFIGURED" && "No Phone Connected"}
            {status.deploymentStatus === "ERROR" && "Bridge Interrupted"}
          </span>
        </div>

        <div>
          {!isConnectedOrReady && status.deploymentStatus !== "ACCESSIBILITY_DISABLED" ? (
            <button
              type="button"
              onClick={handleStartSetup}
              className="px-3 py-1.5 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-medium transition-colors shadow-sm"
            >
              Enable Android Control
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartSetup}
              className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-white/90 text-xs font-medium transition-colors border border-white/10"
            >
              Manage Connection
            </button>
          )}
        </div>
      </div>

      {/* Accessibility Warning Banner if Accessibility is disabled */}
      {status.deploymentStatus === "ACCESSIBILITY_DISABLED" && (
        <div className="mt-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold text-amber-300">Accessibility Required:</span>
            <p className="mt-0.5 text-amber-200/80 leading-relaxed">
              Open Android Settings &rarr; Accessibility &rarr; Enable <strong>Dora</strong> to allow UI interaction.
            </p>
          </div>
        </div>
      )}

      {/* Quick Test Actions */}
      <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
        <span className="text-[11px] text-white/40">Verified Action Test:</span>
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

      {/* Setup / Manage Connection Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-[#0F172A] border border-white/15 p-5 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#38BDF8]" />
                <h3 className="font-semibold text-base text-white">Android Control Setup</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSetupModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Pairing Code Card */}
            {pairingSession && (
              <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10 space-y-3">
                <div className="text-xs text-white/60">Pairing Code (valid for 10 min):</div>
                <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-black/50 border border-white/10">
                  <span className="font-mono text-xl font-bold tracking-widest text-[#38BDF8]">
                    {pairingSession.pairingCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="p-2 rounded-md bg-white/10 hover:bg-white/15 text-white/90 transition-colors flex items-center gap-1.5 text-xs"
                  >
                    {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedCode ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step-by-Step Setup Guide */}
            <div className="space-y-2.5 text-xs text-white/80">
              <div className="font-semibold text-white/90 mb-1">Setup Instructions:</div>
              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-white/[0.02]">
                <span className="w-5 h-5 rounded-full bg-[#0284C7]/20 text-[#38BDF8] flex items-center justify-center font-bold shrink-0">1</span>
                <div>
                  <strong className="text-white">Install & Open Dora APK</strong> on your Android phone (built via GitHub Actions or cloud build).
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-white/[0.02]">
                <span className="w-5 h-5 rounded-full bg-[#0284C7]/20 text-[#38BDF8] flex items-center justify-center font-bold shrink-0">2</span>
                <div>
                  <strong className="text-white">Enable Accessibility:</strong> Tap <em>"Open Accessibility Settings"</em> inside Dora and switch <strong>Dora</strong> ON.
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-white/[0.02]">
                <span className="w-5 h-5 rounded-full bg-[#0284C7]/20 text-[#38BDF8] flex items-center justify-center font-bold shrink-0">3</span>
                <div>
                  <strong className="text-white">Enter Pairing Code:</strong> Enter the code above in your Dora phone app to connect securely.
                </div>
              </div>
            </div>

            {/* Active Device Management Options */}
            {isConnectedOrReady && (
              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleUnpair}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium border border-rose-500/20 transition-colors flex items-center gap-1.5"
                >
                  <Power className="w-3.5 h-3.5" />
                  Unpair Device
                </button>
                <button
                  type="button"
                  onClick={() => {
                    refreshStatus();
                    setShowSetupModal(false);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-medium transition-colors"
                >
                  Done
                </button>
              </div>
            )}

            {!isConnectedOrReady && (
              <div className="pt-2 border-t border-white/10 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    refreshStatus();
                    setShowSetupModal(false);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-medium transition-colors"
                >
                  Close & Check Status
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
