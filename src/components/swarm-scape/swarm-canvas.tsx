"use client";

import type { OrbitControls as OrbitControlsType } from 'three-stdlib';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { SwarmParams, MapConfig, Bounds } from './types';
import { Boid } from '@/lib/swarm-logic';

interface SwarmCanvasProps {
  swarmParams: SwarmParams;
  mapConfig: MapConfig;
  mapHeights: number[]; // Heights for each grid cell
  onSwarmDensityUpdate: (density: number[]) => void;
  isLoadingAi: boolean;
}

const SwarmCanvas: React.FC<SwarmCanvasProps> = ({
  swarmParams,
  mapConfig,
  mapHeights,
  onSwarmDensityUpdate,
  isLoadingAi,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [scene] = useState(() => new THREE.Scene());
  const [camera] = useState(() => new THREE.PerspectiveCamera(75, 1, 0.1, 1000));
  const [renderer, setRenderer] = useState<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControlsType | null>(null);
  
  const boidsRef = useRef<Boid[]>([]);
  const mapRectsRef = useRef<THREE.Mesh[]>([]);

  const mapDimension = mapConfig.gridSize * mapConfig.cellSize;
  const bounds: Bounds = {
    xMin: -mapDimension / 2, xMax: mapDimension / 2,
    yMin: 0, yMax: mapDimension / 4, // Boids fly above map
    zMin: -mapDimension / 2, zMax: mapDimension / 2,
  };

  const initScene = useCallback(() => {
    if (!mountRef.current) return;

    const currentMount = mountRef.current;

    // Renderer
    const newRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    newRenderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    newRenderer.setPixelRatio(window.devicePixelRatio);
    currentMount.appendChild(newRenderer.domElement);
    setRenderer(newRenderer);

    // Camera
    camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
    camera.updateProjectionMatrix();
    camera.position.set(mapDimension / 2, mapDimension / 2, mapDimension / 2);
    camera.lookAt(0,0,0);

    // Controls
    const newControls = new OrbitControls(camera, newRenderer.domElement);
    newControls.enableDamping = true;
    newControls.dampingFactor = 0.05;
    newControls.screenSpacePanning = false;
    newControls.minDistance = 5;
    newControls.maxDistance = mapDimension * 2;
    newControls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent camera going below ground
    controlsRef.current = newControls;
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(mapDimension, mapDimension, mapDimension);
    directionalLight.castShadow = true; // Optional: for shadows
    scene.add(directionalLight);

    // Ground plane (optional, for visual reference)
    // const groundGeo = new THREE.PlaneGeometry(mapDimension, mapDimension);
    // const groundMat = new THREE.MeshStandardMaterial({ color: 0x444444, side: THREE.DoubleSide });
    // const ground = new THREE.Mesh(groundGeo, groundMat);
    // ground.rotation.x = -Math.PI / 2;
    // scene.add(ground);

    // Initial map rectangles
    mapRectsRef.current = [];
    const rectGeo = new THREE.BoxGeometry(mapConfig.cellSize * 0.9, 1, mapConfig.cellSize * 0.9); // 0.9 for spacing
    for (let i = 0; i < mapConfig.gridSize; i++) {
      for (let j = 0; j < mapConfig.gridSize; j++) {
        const material = new THREE.MeshStandardMaterial({ color: 0x555555 });
        const rect = new THREE.Mesh(rectGeo, material);
        rect.position.x = (j - mapConfig.gridSize / 2 + 0.5) * mapConfig.cellSize;
        rect.position.z = (i - mapConfig.gridSize / 2 + 0.5) * mapConfig.cellSize;
        rect.position.y = 0.5; // Base position
        scene.add(rect);
        mapRectsRef.current.push(rect);
      }
    }
    
    return () => {
      newControls.dispose();
      if (currentMount && newRenderer.domElement) {
         currentMount.removeChild(newRenderer.domElement);
      }
      newRenderer.dispose();
      // Dispose geometries and materials if they are not reused
      scene.traverse(object => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach(mat => mat.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      while(scene.children.length > 0){ 
        scene.remove(scene.children[0]); 
      }
    };
  }, [camera, mapConfig, mapDimension, scene]);

  useEffect(() => {
    const cleanup = initScene();
    return cleanup;
  }, [initScene]);


  // Handle swarm parameters changes (reinitialize boids)
  useEffect(() => {
    boidsRef.current.forEach(boid => scene.remove(boid.mesh));
    boidsRef.current = [];
    for (let i = 0; i < swarmParams.numBoids; i++) {
      const boid = new Boid(
        Math.random() * mapDimension - mapDimension / 2,
        Math.random() * (bounds.yMax - bounds.yMin) + bounds.yMin,
        Math.random() * mapDimension - mapDimension / 2,
        swarmParams,
        bounds
      );
      boidsRef.current.push(boid);
      scene.add(boid.mesh);
    }
  }, [swarmParams, scene, mapDimension, bounds]);

  // Update map heights when mapHeights prop changes
  useEffect(() => {
    mapRectsRef.current.forEach((rect, index) => {
      const height = Math.max(0.1, mapHeights[index] || 1); // Ensure minimum height
      rect.scale.y = height;
      rect.position.y = height / 2;
      // Color based on height (example)
      const hue = THREE.MathUtils.mapLinear(height, 0.1, 10, 0.6, 0.0); // Blue to Red
      (rect.material as THREE.MeshStandardMaterial).color.setHSL(hue, 0.8, 0.5);
    });
  }, [mapHeights]);

  // Animation loop and density calculation
  useEffect(() => {
    if (!renderer) return;

    let animationFrameId: number;
    let lastDensityUpdateTime = 0;
    const densityUpdateInterval = 1000; // ms, update density every second

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

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [renderer, scene, camera, mapConfig, onSwarmDensityUpdate, mapDimension]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (mountRef.current && renderer) {
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderer, camera]);


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
