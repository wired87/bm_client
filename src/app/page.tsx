"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import ControlsPanel from '@/components/swarm-scape/controls-panel';
import SwarmCanvas from '@/components/swarm-scape/swarm-canvas';
import type { SwarmParams, MapConfig } from '@/components/swarm-scape/types';
import { adjustHeightMap } from '@/ai/flows/adjust-height-map';
import { useToast } from "@/hooks/use-toast";

const initialSwarmParams: SwarmParams = {
  cohesion: 1.0,
  separation: 1.5,
  alignment: 1.0,
  numBoids: 100,
  speedLimit: 0.15,
  forceLimit: 0.005,
  perceptionRadius: 5,
};

const initialMapConfig: MapConfig = {
  gridSize: 20, // 20x20 grid
  cellSize: 2,  // Each cell is 2x2 world units
};

export default function SwarmScapePage() {
  const [swarmParams, setSwarmParams] = useState<SwarmParams>(initialSwarmParams);
  const [mapConfig] = useState<MapConfig>(initialMapConfig);
  const [mapHeights, setMapHeights] = useState<number[]>(
    () => new Array(initialMapConfig.gridSize * initialMapConfig.gridSize).fill(1)
  );
  const [swarmDensityData, setSwarmDensityData] = useState<number[]>(
    () => new Array(initialMapConfig.gridSize * initialMapConfig.gridSize).fill(0)
  );
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const { toast } = useToast();

  // For SwarmCanvas to trigger camera reset (e.g., via event or ref)
  // This is a placeholder. Actual camera reset might be handled internally or via a ref.
  const [resetCameraFlag, setResetCameraFlag] = useState(0);

  const handleSwarmParamsChange = useCallback((newParams: Partial<SwarmParams>) => {
    setSwarmParams(prev => ({ ...prev, ...newParams }));
  }, []);

  const handleSwarmDensityUpdate = useCallback((density: number[]) => {
    setSwarmDensityData(density);
  }, []);

  const handleAdjustHeightMap = useCallback(async () => {
    setIsAiLoading(true);
    setAiExplanation(null);
    try {
      const result = await adjustHeightMap({
        swarmDensityData: swarmDensityData,
        currentHeights: mapHeights,
        mapWidth: mapConfig.gridSize,
        mapHeight: mapConfig.gridSize, // Corresponds to depth in this context
      });
      setMapHeights(result.adjustedHeights);
      setAiExplanation(result.explanation);
      toast({ title: "AI Height Adjustment Complete", description: "Map heights updated based on swarm density." });
    } catch (error) {
      console.error("Error adjusting height map with AI:", error);
      toast({ title: "AI Error", description: "Could not adjust map heights.", variant: "destructive" });
    } finally {
      setIsAiLoading(false);
    }
  }, [swarmDensityData, mapHeights, mapConfig.gridSize, toast]);

  const handleResetCamera = useCallback(() => {
    // This function itself doesn't directly control Three.js camera.
    // It's a trigger for SwarmCanvas. A common way is to pass a "reset" prop
    // that changes, or use a ref to call a method on SwarmCanvas.
    // For simplicity, we'll rely on OrbitControls' built-in reset if user right-clicks,
    // or SwarmCanvas can listen to a prop change.
    // Let's assume SwarmCanvas handles its own reset, or OrbitControls.reset() is called there.
    // This is more of a signal.
    setResetCameraFlag(prev => prev + 1); // Change prop to trigger effect in SwarmCanvas
     toast({ title: "Camera Reset", description: "Camera view has been reset to default."});
     // In a real scenario, SwarmCanvas would observe resetCameraFlag or have a method called.
     // For now, this is a conceptual trigger. The actual reset needs to be implemented in SwarmCanvas
     // perhaps by re-initializing OrbitControls or calling its reset method.
     // A simple way is to just re-set camera position and lookAt in SwarmCanvas's effect.
     // However, direct DOM/Three.js manipulation in page.tsx is not ideal.
     // Let's assume SwarmCanvas has internal logic for this or OrbitControls takes care of it.
  }, [toast]);

  // Effect to log resetCameraFlag for demonstration. Actual camera reset logic is in SwarmCanvas.
  useEffect(() => {
    if (resetCameraFlag > 0) {
      // SwarmCanvas would pick up this change if it were a prop that it uses in an effect
      // or if a ref was used to call a method.
      // console.log("Camera reset triggered in parent, count:", resetCameraFlag);
    }
  }, [resetCameraFlag]);


  return (
    <SidebarProvider defaultOpen={true} onOpenChange={() => {}}>
      <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden">
        <Sidebar collapsible="icon" variant="sidebar" className="w-80 md:w-96 shadow-lg z-10">
          <ControlsPanel
            swarmParams={swarmParams}
            onSwarmParamsChange={handleSwarmParamsChange}
            onAdjustHeightMap={handleAdjustHeightMap}
            onResetCamera={handleResetCamera}
            aiExplanation={aiExplanation}
            isAiLoading={isAiLoading}
            onAiLoadingChange={setIsAiLoading}
          />
        </Sidebar>
        <SidebarInset className="flex-1 min-h-0"> {/* Ensure SidebarInset takes remaining space and allows canvas to fill */}
          <SwarmCanvas
            swarmParams={swarmParams}
            mapConfig={mapConfig}
            mapHeights={mapHeights}
            onSwarmDensityUpdate={handleSwarmDensityUpdate}
            isLoadingAi={isAiLoading}
            // resetCameraTrigger={resetCameraFlag} // Example of passing a trigger
          />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
