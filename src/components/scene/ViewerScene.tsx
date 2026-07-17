// --- IMPORTS ---
// We import React Suspense for loading states, Fiber for the React-Three.js bridge, 
// Drei for useful 3D helpers (Html, Controls, Lines), and generic Three.js for math/vectors.
import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF, Html, TransformControls, CatmullRomLine } from "@react-three/drei";
import * as THREE from "three";
import type { CameraSlot, FreeObject } from "@/routes/surveys";

// --- CUSTOM MODEL LOADER ---
// A reusable component that takes a filename and loads the associated GLTF/GLB model from the /public/models/ folder.
function CustomModel({ filename }: { filename: string }) {
  // ✅ Dynamically injects the base URL so models load correctly on both Localhost and GitHub Pages!
  const { scene } = useGLTF(`${import.meta.env.BASE_URL}models/${filename}`);
  return <primitive object={scene.clone()} />;
}

// --- CAMERA RIG ANIMATOR ---
// This invisible component runs on every frame (60fps). It calculates where the 3D viewing camera is,
// and mathematically interpolates (lerps) the view to smoothly fly over and "zoom in" on the currently selected item.
function CameraRig({ selectedPos, selectedId }: { selectedPos: THREE.Vector3 | null, selectedId: string | null }) {
  const controls = useRef<any>(null);
  const targetCamPos = useRef(new THREE.Vector3());
  const lookAtPos = useRef(new THREE.Vector3());
  const previousId = useRef<string | null>(null);
  const isZooming = useRef(false);
  const isReturning = useRef(false);

  useFrame((state, delta) => {
    if (controls.current) {
      // Detect if selection changed
      if (selectedId !== previousId.current) {
        previousId.current = selectedId;
        if (selectedId) {
          isZooming.current = true;
          isReturning.current = false;
        } else {
          isReturning.current = true;
          isZooming.current = false;
        }
      }

      // If an object is selected, smoothly pan the camera target to look at it, and move the camera position nearby
      if (selectedPos) {
        lookAtPos.current.copy(selectedPos).add(new THREE.Vector3(0, 1.5, 0)); // Look slightly above the base
        controls.current.target.lerp(lookAtPos.current, 5 * delta);
        
        if (isZooming.current) {
          targetCamPos.current.copy(selectedPos).add(new THREE.Vector3(5, 8, 6)); // Offset the camera backwards and up
          state.camera.position.lerp(targetCamPos.current, 5 * delta);
          if (state.camera.position.distanceTo(targetCamPos.current) < 0.2) isZooming.current = false;
        }
        controls.current.update();
      } 
      // If deselected, zoom back out to the master "Wide View"
      else if (isReturning.current) {
        lookAtPos.current.set(0, 0, 0); 
        controls.current.target.lerp(lookAtPos.current, 5 * delta);
        targetCamPos.current.set(40, 30, 40); 
        state.camera.position.lerp(targetCamPos.current, 5 * delta);
        if (state.camera.position.distanceTo(targetCamPos.current) < 0.2) isReturning.current = false;
        controls.current.update();
      }
    }
  });
  return <OrbitControls ref={controls} makeDefault />;
}

// --- MAIN VIEWER COMPONENT ---
export function ViewerScene({ 
  courtType, 
  slots, 
  freeObjects = [],
  selectedId, 
  isEditing = false,
  isDark = true,
  drawingRouteFor,
  onSelect,
  onUpdateFreeObject,
  onUpdateCableNode,
  onDrawWaypoint,
  onFinishDrawing
}: { 
  // Prop Definitions
  courtType: 'left' | 'right' | 'streaming', 
  slots: CameraSlot[], 
  freeObjects?: FreeObject[],
  selectedId: string | null, 
  isEditing?: boolean,
  isDark?: boolean,
  drawingRouteFor?: string | null,
  onSelect: (id: string | null) => void,
  onUpdateFreeObject?: (id: string, pos: [number, number, number]) => void,
  onUpdateCableNode?: (itemId: string, nodeIndex: number, pos: [number, number, number]) => void,
  onDrawWaypoint?: (id: string, pos: [number, number, number]) => void,
  onFinishDrawing?: () => void
}) {
  
  // 1. CALCULATE SELECTED ITEM DATA
  const selectedSlot = slots.find((s: CameraSlot) => s.id === selectedId);
  const selectedFreeObj = freeObjects.find((o: FreeObject) => o.id === selectedId);
  
  let selectedPos = null;
  if (selectedSlot) selectedPos = new THREE.Vector3(selectedSlot.position_x, selectedSlot.position_y, selectedSlot.position_z);
  else if (selectedFreeObj) selectedPos = new THREE.Vector3(selectedFreeObj.position_x, selectedFreeObj.position_y, selectedFreeObj.position_z);

  // Load the correct stadium model
  const modelFile = courtType === 'streaming' ? 'court-left.glb' : `court-${courtType}.glb`;
  const handlePointerOver = () => document.body.style.cursor = 'pointer';
  const handlePointerOut = () => document.body.style.cursor = 'auto';

  // Locates the Gigabob if it exists, used as the termination point for all cable lines
  const gigabob = freeObjects.find((o) => o.model_file === 'gigabob.glb');

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }} className={isDark ? "bg-slate-950" : "bg-slate-200"}>
      
      {/* Absolute UI button for resetting the camera zoom */}
      <button 
        onClick={() => onSelect(null)}
        className={`absolute top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-lg shadow-xl font-bold text-sm transition border
          ${isDark ? 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-slate-600' : 'bg-white/90 hover:bg-slate-50 text-slate-800 border-slate-300'}`}
      >
        🔍 Wide View
      </button>

      {/* 2. THE 3D CANVAS */}
      <Canvas camera={{ position: [40, 30, 40], fov: 45 }}>
        {/* Lights */}
        <ambientLight intensity={isDark ? 0.5 : 0.8} />
        <directionalLight position={[10, 20, 10]} intensity={isDark ? 1 : 1.2} />
        
        {/* The Main Court Model with click-to-draw waypoint events attached */}
        <group
          onClick={(e: any) => {
            // Triggered if "Draw Route" is active
            if (drawingRouteFor && onDrawWaypoint) {
              e.stopPropagation();
              onDrawWaypoint(drawingRouteFor, [e.point.x, e.point.y + 0.1, e.point.z]);
            }
          }}
          onDoubleClick={(e: any) => {
            // Finishes drawing mode
            if (drawingRouteFor && onFinishDrawing) {
              e.stopPropagation();
              onFinishDrawing();
            }
          }}
          onPointerOver={(e: any) => {
            if (drawingRouteFor) {
              e.stopPropagation();
              document.body.style.cursor = 'crosshair';
            }
          }}
          onPointerOut={() => document.body.style.cursor = 'auto'}
        >
          <Suspense fallback={null}>
            <CustomModel filename={modelFile} />
          </Suspense>
        </group>

        {/* 3. CAMERA CABLE ROUTING SYSTEM */}
        {/* Automatically draws dashed CatmullRom lines from configured cameras -> custom waypoints -> Gigabob */}
        {gigabob && slots.filter(s => s.model_file).map((slot) => {
          const start = new THREE.Vector3(slot.position_x, slot.position_y - 0.5, slot.position_z);
          const end = new THREE.Vector3(gigabob.position_x, gigabob.position_y, gigabob.position_z);
          
          let basePoints = [start];
          if (slot.cable_nodes && slot.cable_nodes.length > 0) {
            slot.cable_nodes.forEach(n => basePoints.push(new THREE.Vector3(n[0], n[1], n[2])));
          } else {
            // Default drop-to-floor point if no custom waypoints exist
            basePoints.push(new THREE.Vector3((start.x + end.x) / 2, 0.2, (start.z + end.z) / 2));
          }
          basePoints.push(end);

          const isDrawing = drawingRouteFor === slot.id;
          // Render Draggable nodes (TransformControls) if in edit mode and NOT currently click-drawing
          const renderNodes = isEditing && selectedId === slot.id && !isDrawing && slot.cable_nodes?.map((node, i) => (
             <TransformControls
                key={`node-${slot.id}-${i}`}
                mode="translate"
                position={new THREE.Vector3(node[0], node[1], node[2])}
                onMouseUp={(e: any) => {
                  if (e?.target?.object && onUpdateCableNode) {
                    const pos = e.target.object.position;
                    onUpdateCableNode(slot.id, i, [pos.x, pos.y, pos.z]);
                  }
                }}
             >
                <mesh><sphereGeometry args={[0.3, 16, 16]} /><meshStandardMaterial color="yellow" emissive="yellow" /></mesh>
             </TransformControls>
          ));
          
          return (
            <group key={`route-${slot.id}`}>
              <CatmullRomLine points={basePoints} color="#F97316" lineWidth={2} dashed={true} dashScale={10} dashSize={1} gapSize={0.5} />
              <CatmullRomLine points={basePoints.map(p => new THREE.Vector3(p.x + 0.2, p.y, p.z + 0.2))} color="#3B82F6" lineWidth={2} dashed={true} dashScale={10} dashSize={1} gapSize={0.5} />
              {renderNodes}
            </group>
          );
        })}

        {/* 4. FIBRE BOX CABLE ROUTING SYSTEM */}
        {/* Same as above, but creates a single Yellow line connecting Fibre Boxes to the Gigabob */}
        {gigabob && freeObjects.filter(o => o.model_file === 'fibre_box.glb').map((fibreBox) => {
          const start = new THREE.Vector3(fibreBox.position_x, fibreBox.position_y, fibreBox.position_z);
          const end = new THREE.Vector3(gigabob.position_x, gigabob.position_y, gigabob.position_z);
          
          let basePoints = [start];
          if (fibreBox.cable_nodes && fibreBox.cable_nodes.length > 0) {
            fibreBox.cable_nodes.forEach(n => basePoints.push(new THREE.Vector3(n[0], n[1], n[2])));
          } else {
            basePoints.push(new THREE.Vector3((start.x + end.x) / 2, 0.2, (start.z + end.z) / 2));
          }
          basePoints.push(end);

          const isDrawing = drawingRouteFor === fibreBox.id;
          const renderNodes = isEditing && selectedId === fibreBox.id && !isDrawing && fibreBox.cable_nodes?.map((node, i) => (
             <TransformControls
                key={`node-${fibreBox.id}-${i}`}
                mode="translate"
                position={new THREE.Vector3(node[0], node[1], node[2])}
                onMouseUp={(e: any) => {
                  if (e?.target?.object && onUpdateCableNode) {
                    const pos = e.target.object.position;
                    onUpdateCableNode(fibreBox.id, i, [pos.x, pos.y, pos.z]);
                  }
                }}
             >
                <mesh><sphereGeometry args={[0.3, 16, 16]} /><meshStandardMaterial color="yellow" emissive="yellow" /></mesh>
             </TransformControls>
          ));
          
          return (
            <group key={`route-${fibreBox.id}`}>
              <CatmullRomLine points={basePoints} color="#EAB308" lineWidth={3} dashed={true} dashScale={10} dashSize={1} gapSize={0.5} />
              {renderNodes}
            </group>
          );
        })}

        {/* 5. RENDER CAMERA SLOTS */}
        {/* Places fixed camera slots, models, and UI floating labels */}
        {slots.map((slot: CameraSlot) => {
          const isSelected = slot.id === selectedId;
          const position = new THREE.Vector3(slot.position_x, slot.position_y, slot.position_z);
          const rotation = new THREE.Euler(0, slot.rotation_y, 0);

          const content = slot.model_file ? (
            <Suspense fallback={<mesh><boxGeometry args={[0.5, 0.5, 0.5]}/><meshStandardMaterial color="gray"/></mesh>}>
              <CustomModel filename={slot.model_file} />
            </Suspense>
          ) : (
            <mesh>
              <sphereGeometry args={[0.4, 16, 16]} />
              <meshStandardMaterial color={isSelected ? "orange" : "white"} transparent opacity={0.4} />
            </mesh>
          );

          return (
            <group key={slot.id} position={position} rotation={rotation} onClick={(e: any) => { e.stopPropagation(); onSelect(slot.id); }} onPointerOver={handlePointerOver} onPointerOut={handlePointerOut}>
              {content}
              <Html position={[0, 1.5, 0]} center zIndexRange={[30, 0]}>
                <div onClick={(e) => { e.stopPropagation(); onSelect(slot.id); }} className={`px-2.5 py-1 rounded text-xs font-bold whitespace-nowrap shadow-lg cursor-pointer transition-all border ${isSelected ? "bg-emerald-600 text-white border-emerald-400 scale-110" : (isDark ? "bg-slate-800/90 text-slate-300 border-slate-600 hover:bg-slate-700" : "bg-white/90 text-slate-700 border-slate-300 hover:bg-slate-50")}`}>
                  {slot.name}
                </div>
              </Html>
            </group>
          );
        })}

        {/* 6. RENDER FREE OBJECTS */}
        {/* Places freely movable objects, floating UI labels, and attaches Drag controls if editing */}
        {freeObjects.map((obj: FreeObject) => {
          const isSelected = obj.id === selectedId;
          const position: [number, number, number] = [obj.position_x, obj.position_y, obj.position_z];

          const content = (
            <group onClick={(e: any) => { e.stopPropagation(); onSelect(obj.id); }} onPointerOver={handlePointerOver} onPointerOut={handlePointerOut}>
              <Suspense fallback={<mesh><boxGeometry args={[0.5, 0.5, 0.5]}/><meshStandardMaterial color="blue"/></mesh>}>
                <CustomModel filename={obj.model_file} />
              </Suspense>
              <Html position={[0, 1.5, 0]} center zIndexRange={[30, 0]}>
                <div onClick={(e) => { e.stopPropagation(); onSelect(obj.id); }} className={`px-2.5 py-1 rounded text-xs font-bold whitespace-nowrap shadow-lg cursor-pointer transition-all border ${isSelected ? "bg-blue-600 text-white border-blue-400 scale-110" : (isDark ? "bg-slate-800/90 text-slate-300 border-slate-600 hover:bg-slate-700" : "bg-white/90 text-slate-700 border-slate-300 hover:bg-slate-50")}`}>
                  {obj.name}
                </div>
              </Html>
            </group>
          );

          if (isEditing && isSelected && drawingRouteFor !== obj.id) {
            return (
              <TransformControls key={obj.id} mode="translate" position={position} onMouseUp={(e: any) => {
                  if (e?.target?.object && onUpdateFreeObject) {
                    const pos = e.target.object.position;
                    onUpdateFreeObject(obj.id, [pos.x, pos.y, pos.z]);
                  }
                }}
              >
                {content}
              </TransformControls>
            );
          }

          return <group key={obj.id} position={position}>{content}</group>;
        })}
        
        {/* 7. INITIALIZE CAMERA RIG */}
        <CameraRig selectedPos={selectedPos} selectedId={selectedId} />
      </Canvas>
    </div>
  );
}