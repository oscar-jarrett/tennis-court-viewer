import { Html } from "@react-three/drei";

interface CameraHotspotProps {
  position: [number, number, number];
  label: string;
  index: number;
  selected: boolean;
  onClick: () => void;
}

export function CameraHotspot({ position, label, index, selected, onClick }: CameraHotspotProps) {
  return (
    <group 
      position={position} 
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {/* The 3D dot on the court */}
      <mesh>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshStandardMaterial 
          color={selected ? "#3b82f6" : "#ef4444"} 
          emissive={selected ? "#3b82f6" : "#ef4444"}
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* The floating text label */}
      <Html position={[0, 2, 0]} center zIndexRange={[100, 0]}>
        <div
          style={{
            background: selected ? "#2563eb" : "#0f172a",
            color: "white",
            padding: "4px 8px",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: "bold",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            border: selected ? "2px solid white" : "1px solid #334155",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.5)"
          }}
        >
          {index + 1}. {label}
        </div>
      </Html>
    </group>
  );
}