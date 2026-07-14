import { useGLTF } from "@react-three/drei";

export function TennisCourtModel() {
  // This tells Vite to load your custom model from the public folder
  const { scene } = useGLTF("/court.glb");

  return (
    <group>
      {/* This renders your exact Blender model into the scene */}
      <primitive object={scene} />
    </group>
  );
}

// Pre-load the model so it renders faster when the page opens
useGLTF.preload("/court.glb");