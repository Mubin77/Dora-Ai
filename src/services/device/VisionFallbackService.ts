/**
 * Dora Vision Fallback Service (Phase 2 Abstraction)
 * 
 * Provides an extensible fallback interface for applications with custom graphics
 * or incomplete accessibility trees. Integrates screenshots with vision models
 * to identify candidate UI elements when semantic accessibility inspection fails.
 * 
 * Note: Accessibility remains the primary mechanism; vision fallback is secondary.
 */

import { RectBounds, UIElement } from "./DeviceActionTypes";

export interface VisionElementCandidate {
  description: string;
  confidence: number;
  bounds: RectBounds;
  suggestedAction: "tap" | "type_text" | "scroll";
}

export interface VisionFallbackResult {
  success: boolean;
  candidates: VisionElementCandidate[];
  screenshotId?: string;
  latencyMs?: number;
  message?: string;
}

export class VisionFallbackService {
  private static instance: VisionFallbackService;

  private constructor() {}

  public static getInstance(): VisionFallbackService {
    if (!VisionFallbackService.instance) {
      VisionFallbackService.instance = new VisionFallbackService();
    }
    return VisionFallbackService.instance;
  }

  /**
   * Analyzes a screenshot frame to identify visual elements when accessibility tree is unavailable
   */
  public async analyzeVisualElements(
    _screenshotBase64: string,
    _query?: string
  ): Promise<VisionFallbackResult> {
    // Phase 2 Abstraction: Prepares the contract for future Vision API integration
    return {
      success: false,
      candidates: [],
      message: "Vision fallback is structured for Phase 3 vision model integration. Accessibility tree is primary.",
    };
  }

  /**
   * Converts a vision candidate into a normalized UIElement representation
   */
  public convertCandidateToUIElement(
    candidate: VisionElementCandidate,
    observationId: string,
    index: number
  ): UIElement {
    return {
      elementId: `${observationId}_vis_${index}`,
      className: "android.view.View.VisionFallback",
      contentDescription: candidate.description,
      clickable: candidate.suggestedAction === "tap",
      editable: candidate.suggestedAction === "type_text",
      enabled: true,
      bounds: candidate.bounds,
    };
  }
}

export const visionFallbackService = VisionFallbackService.getInstance();
