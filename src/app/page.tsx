
"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import ControlsPanel from '@/components/swarm-scape/controls-panel';
import SwarmCanvas from '@/components/swarm-scape/swarm-canvas';
import type { SwarmParams, MapConfig, FirebaseBoidConfig } from '@/components/swarm-scape/types';
import { adjustHeightMap } from '@/ai/flows/adjust-height-map';
import { useToast } from "@/hooks/use-toast";
import { database } from '@/lib/firebase'; // Firebase setup
import { ref, onChildAdded, onChildChanged, onChildRemoved, off } from 'firebase/database';


// utils/api.js

const WS_BASE = "ws://127.0.0.1:8000/";

export const api = {
  // WebSocket-Verbindung herstellen
  socket: (path:any, query:any = {}) => {
    const queryStr = new URLSearchParams(query).toString();
    return new WebSocket("ws://127.0.0.1:8000/sim/run/?user_id=rajtigesomnlhfyqzbvx&env_id=env_bare_rajtigesomnlhfyqzbvx");
  },
};







const initialSwarmParams: Omit<SwarmParams, 'numBoids'> = { // numBoids removed
  cohesion: 1.0,
  separation: 1.5,
  alignment: 1.0,
  speedLimit: 0.15,
  forceLimit: 0.005,
  perceptionRadius: 5,
};

const initialMapConfig: MapConfig = {
  gridSize: 20, // 20x20 grid
  cellSize: 2,  // Each cell is 2x2 world units
};

export default function SwarmScapePage() {
  const [swarmParams, setSwarmParams] = useState<Omit<SwarmParams, 'numBoids'>>(initialSwarmParams);
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
  const [resetCameraFlag, setResetCameraFlag] = useState(0);
  const [simulationStatus, setSimulationStatus] = useState("disconnected");
  const [firebaseBoidConfigs, setFirebaseBoidConfigs] = useState<FirebaseBoidConfig[]>([]);


  const [start, setStart] = useState<boolean>(false);




























  


  

  useEffect(() => {
    if (start === true){
      // URL basierend auf Ihrer routing.py (ohne führenden Schrägstrich)
      const socket = api.socket("sim/run/", {
          user_id: "rajtigesomnlhfyqzbvx", // Ersetzen Sie durch dynamische Werte
          env_id: "env_bare_rajtigesomnlhfyqzbvx", // Ersetzen Sie durch dynamische Werte
      });

      socketRef.current = socket;

      socket.onopen = () => {
          console.log("WebSocket connected!");
          setSimulationStatus("connected");
          setError(null);
          // Eventuell hier Trigger zum Starten der Simulation senden
          // socket.send(JSON.stringify({ command: "start_sim" }));
      };

      socket.onmessage = (event) => {
          try {
              const data = JSON.parse(event.data);
              if (data.type === "initial_data") {
                  console.log("Received initial data.");
                  setSimulationData();
                  setFirebaseBoidConfigs(prev => [...prev, newBoidConfig]);
                  setSimulationStatus("loaded");
              }
              } else if (data.type === "simulation_status_change") {
                setSimulationStatus(data.status);
              }
              // Weitere Nachrichtentypen behandeln (Fehler, Abschluss etc.)

          } catch (e) {
              console.error("Error processing WebSocket message:", e);
              setError("Error receiving data: " + e.message);
          }
      };

      socket.onerror = (err) => {
          console.error("WebSocket error:", err);
          setSimulationStatus("error");
          setError("WebSocket error: " + err.message);
      };

      socket.onclose = (event) => {
          console.log("WebSocket closed.", event.code, event.reason);
          setSimulationStatus("disconnected");
          if (event.code !== 1000) {
              setError(`WebSocket closed with code ${event.code}: ${event.reason}`);
          }
      };

      // Bereinigung bei Komponenten-Unmount
      return () => {
          console.log("Closing WebSocket on component unmount.");
          if (socketRef.current) {
              socketRef.current.close();
          }
      };
    }
  }, [start]); // Leeres Array = Läuft nur einmal nach dem ersten Rendern



































  useEffect(() => {
    if (simulationStatus === "connected") {
      const boidConfigsRef = ref(database, 'boidConfigs');

      const handleChildAdded = (snapshot: any) => {
        const newBoidConfig = { id: snapshot.key, ...snapshot.val() } as FirebaseBoidConfig;
        setFirebaseBoidConfigs(prev => [...prev, newBoidConfig]);
      };

      const handleChildChanged = (snapshot: any) => {
        const changedBoidConfig = { id: snapshot.key, ...snapshot.val() } as FirebaseBoidConfig;
        setFirebaseBoidConfigs(prev => 
          prev.map(boid => boid.id === changedBoidConfig.id ? changedBoidConfig : boid)
        );
      };

      const handleChildRemoved = (snapshot: any) => {
        const removedBoidId = snapshot.key;
        setFirebaseBoidConfigs(prev => prev.filter(boid => boid.id !== removedBoidId));
      };

      onChildAdded(boidConfigsRef, handleChildAdded);
      onChildChanged(boidConfigsRef, handleChildChanged);
      onChildRemoved(boidConfigsRef, handleChildRemoved);

      // Detach listeners on component unmount
      return () => {
        off(boidConfigsRef, 'child_added', handleChildAdded);
        off(boidConfigsRef, 'child_changed', handleChildChanged);
        off(boidConfigsRef, 'child_removed', handleChildRemoved);
      };
  }
  }, [simulationStatus]);


  const handleSwarmParamsChange = useCallback((newParams: Partial<Omit<SwarmParams, 'numBoids'>>) => {
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
        mapHeight: mapConfig.gridSize, 
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
  }, [swarmDensityData, mapHeights, mapConfig.gridSize, toast,]);

  const handleResetCamera = useCallback(() => {
    setResetCameraFlag(prev => prev + 1); 
     toast({ title: "Camera Reset", description: "Camera view has been reset to default."});
  }, [toast]);

  useEffect(() => {
    if (resetCameraFlag > 0) {
      // SwarmCanvas picks this up via its own useEffect on resetCameraTrigger
    }
  }, [resetCameraFlag,]);


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
            numBoids={firebaseBoidConfigs.length} // Display current boid count from Firebase
          />
        </Sidebar>
        <SidebarInset className="flex-1 min-h-0">
          <SwarmCanvas
            swarmParams={swarmParams as SwarmParams} // Cast because SwarmCanvas expects numBoids internally for now, though it's unused if boidConfigs is present
            mapConfig={mapConfig}
            mapHeights={mapHeights}
            onSwarmDensityUpdate={handleSwarmDensityUpdate}
            isLoadingAi={isAiLoading}
            boidConfigs={firebaseBoidConfigs}
            resetCameraTrigger={resetCameraFlag}
          />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
