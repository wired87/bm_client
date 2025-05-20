
"use client";

import type { OrbitControls as OrbitControlsType } from 'three-stdlib';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { SwarmParams, MapConfig, Bounds, FirebaseBoidConfig } from './types';
import { Boid } from '@/lib/swarm-logic';

interface SwarmCanvasProps {
  swarmParams: SwarmParams; // Keep SwarmParams here, numBoids might be used if boidConfigs is empty or for default boid properties
  mapConfig: MapConfig;
  mapHeights: number[];
  onSwarmDensityUpdate: (density: number[]) => void;
  isLoadingAi: boolean;
  boidConfigs?: FirebaseBoidConfig[]; // Boid configurations from Firebase
  resetCameraTrigger?: number;
}

const SwarmCanvas: React.FC<SwarmCanvasProps> = ({
  swarmParams,
  mapConfig,
  mapHeights,
  onSwarmDensityUpdate,
  isLoadingAi,
  boidConfigs = [], // Default to empty array
  resetCameraTrigger,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>(new THREE.Scene());
  const cameraRef = useRef<THREE.PerspectiveCamera>(new THREE.PerspectiveCamera(75, 1, 0.1, 1000));
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControlsType | null>(null);
  
  const boidsRef = useRef<Boid[]>([]);
  const mapRectsRef = useRef<THREE.Mesh[]>([]);

  const mapDimension = mapConfig.gridSize * mapConfig.cellSize;
  const bounds: Bounds = {
    xMin: -mapDimension / 2, xMax: mapDimension / 2,
    yMin: 0, yMax: mapDimension / 4,
    zMin: -mapDimension / 2, zMax: mapDimension / 2,
  };

  const resetCamera = useCallback(() => {
    if (controlsRef.current && cameraRef.current) {
      cameraRef.current.position.set(mapDimension / 2, mapDimension / 2, mapDimension / 2);
      cameraRef.current.lookAt(0,0,0);
      controlsRef.current.target.set(0,0,0);
      controlsRef.current.update();
    }
  }, [mapDimension]);

  useEffect(() => {
    if (resetCameraTrigger && resetCameraTrigger > 0) {
      resetCamera();
    }
  }, [resetCameraTrigger, resetCamera]);

  const initScene = useCallback(() => {
    if (!mountRef.current) return;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const currentMount = mountRef.current;

    const newRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    newRenderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    newRenderer.setPixelRatio(window.devicePixelRatio);
    currentMount.appendChild(newRenderer.domElement);
    rendererRef.current = newRenderer;

    camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
    camera.updateProjectionMatrix();
    resetCamera(); // Initial camera position

    const newControls = new OrbitControls(camera, newRenderer.domElement);
    newControls.enableDamping = true;
    newControls.dampingFactor = 0.05;
    newControls.screenSpacePanning = false;
    newControls.minDistance = 5;
    newControls.maxDistance = mapDimension * 2;
    newControls.maxPolarAngle = Math.PI / 2 - 0.05;
    controlsRef.current = newControls;
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(mapDimension, mapDimension, mapDimension);
    scene.add(directionalLight);

    mapRectsRef.current = [];
    const rectGeo = new THREE.BoxGeometry(mapConfig.cellSize * 0.9, 1, mapConfig.cellSize * 0.9);
    for (let i = 0; i < mapConfig.gridSize; i++) {
      for (let j = 0; j < mapConfig.gridSize; j++) {
        const material = new THREE.MeshStandardMaterial({ color: 0x555555 });
        const rect = new THREE.Mesh(rectGeo.clone(), material); // Clone geometry
        rect.position.x = (j - mapConfig.gridSize / 2 + 0.5) * mapConfig.cellSize;
        rect.position.z = (i - mapConfig.gridSize / 2 + 0.5) * mapConfig.cellSize;
        rect.position.y = 0.5;
        scene.add(rect);
        mapRectsRef.current.push(rect);
      }
    }
    
    return () => {
      newControls.dispose();
      if (currentMount && newRenderer.domElement && currentMount.contains(newRenderer.domElement)) {
         currentMount.removeChild(newRenderer.domElement);
      }
      newRenderer.dispose();
      rectGeo.dispose(); // Dispose shared geometry
      // scene.clear(); // More aggressive cleanup might be needed if re-init is frequent
       while(scene.children.length > 0){ 
        const child = scene.children[0];
        scene.remove(child); 
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
      mapRectsRef.current = [];
      boidsRef.current = []; // Clear boids on scene cleanup as well
    };
  }, [mapConfig, mapDimension, resetCamera]);

  useEffect(() => {
    const cleanup = initScene();
    return cleanup;
  }, [initScene]);

  // Manage boids based on boidConfigs from Firebase or fallback to swarmParams.numBoids
  useEffect(() => {
    const scene = sceneRef.current;
    // Clear existing boids
    boidsRef.current.forEach(boid => scene.remove(boid.mesh));
    boidsRef.current = [];

    const activeBoidParams = { ...swarmParams, numBoids: boidConfigs.length > 0 ? boidConfigs.length : (swarmParams.numBoids || 100) };


    if (boidConfigs && boidConfigs.length > 0) {
      boidConfigs.forEach(config => {
        const boid = new Boid(
          config.initialX ?? (Math.random() * mapDimension - mapDimension / 2),
          config.initialY ?? (Math.random() * (bounds.yMax - bounds.yMin) + bounds.yMin),
          config.initialZ ?? (Math.random() * mapDimension - mapDimension / 2),
          activeBoidParams, // Pass all swarmParams
          bounds,
          config.color,
          config.id
        );
        boidsRef.current.push(boid);
        scene.add(boid.mesh);
      });
    } else {
      // Fallback to local generation if no Firebase configs
      // This part might be removed if Firebase is the sole source of truth
      for (let i = 0; i < activeBoidParams.numBoids; i++) {
        const boid = new Boid(
          Math.random() * mapDimension - mapDimension / 2,
          Math.random() * (bounds.yMax - bounds.yMin) + bounds.yMin,
          Math.random() * mapDimension - mapDimension / 2,
          activeBoidParams,
          bounds,
          undefined, // No specific color
          `local-${i}` // Generate a local ID
        );
        boidsRef.current.push(boid);
        scene.add(boid.mesh);
      }
    }
  }, [boidConfigs, swarmParams, sceneRef, mapDimension, bounds]);


  useEffect(() => {
    mapRectsRef.current.forEach((rect, index) => {
      const height = Math.max(0.1, mapHeights[index] || 1);
      rect.scale.y = height;
      rect.position.y = height / 2;
      const hue = THREE.MathUtils.mapLinear(height, 0.1, 10, 0.6, 0.0); // Blue to Red
      if (rect.material instanceof THREE.MeshStandardMaterial) {
        rect.material.color.setHSL(hue, 0.8, 0.5);
      }
    });
  }, [mapHeights]);

  useEffect(() => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!renderer) return;

    let animationFrameId: number;
    let lastDensityUpdateTime = 0;
    const densityUpdateInterval = 1000;

    const animate = (time: number) => {
      animationFrameId = requestAnimationFrame(animate);
      controlsRef.current?.update();
      boidsRef.current.forEach(boid => boid.update(boidsRef.current));

      if (time - lastDensityUpdateTime > densityUpdateInterval) {
        const density = new Array(mapConfig.gridSize * mapConfig.gridSize).fill(0);
        boidsRef.current.forEach(boid => {
          const gridX = Math.floor((boid.position.x + mapDimension / 2) / mapConfig.cellSize);
          const gridZ = Math.floor((boid.position.z + mapDimension / 2) / mapConfig.cellSize);
          if (gridX >= 0 && gridX < mapConfig.gridSize && gridZ >= 0 && gridZ < mapConfig.gridSize) {
            const index = gridZ * mapConfig.gridSize + gridX;
            density[index]++;
          }
        });
        onSwarmDensityUpdate(density);
        lastDensityUpdateTime = time;
      }
      renderer.render(scene, camera);
    };
    animate(0);
    return () => cancelAnimationFrame(animationFrameId);
  }, [onSwarmDensityUpdate, mapConfig, mapDimension]);

  useEffect(() => {
    const handleResize = () => {
      const renderer = rendererRef.current;
      const camera = cameraRef.current;
      if (mountRef.current && renderer && camera) {
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }
    };
    window.addEventListener('resize', handleResize);
    // Initial size update
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div ref={mountRef} className="w-full h-full relative">
      {isLoadingAi && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="text-white text-xl p-4 bg-background/80 rounded-lg shadow-xl">
            AI is thinking...
            <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-primary mt-4 mx-auto"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SwarmCanvas;
