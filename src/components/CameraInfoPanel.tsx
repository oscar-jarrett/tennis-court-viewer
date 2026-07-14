import { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface Camera {
  id: string;
  name: string;
  description: string;
  photoUrls: string[];
}

export function CameraInfoPanel({
  camera,
  onClose,
}: {
  camera: Camera;
  onClose: () => void;
}) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const photos = camera.photoUrls ?? [];
  const hasPhotos = photos.length > 0;

  return (
    <aside className="info-panel">
      <button className="info-panel-close" onClick={onClose} aria-label="Close">
        <X size={18} />
      </button>
      <h2 className="info-panel-title">{camera.name}</h2>
      <p className="info-panel-desc">{camera.description || "No description provided."}</p>

      {hasPhotos && (
        <div className="info-panel-slideshow">
          <div className="slide-wrap">
            <img src={photos[photoIdx]} alt={`Mounting ${photoIdx + 1}`} />
          </div>
          {photos.length > 1 && (
            <div className="slide-controls">
              <button
                onClick={() => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)}
                aria-label="Previous"
              >
                <ChevronLeft size={16} />
              </button>
              <span>
                {photoIdx + 1} / {photos.length}
              </span>
              <button
                onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)}
                aria-label="Next"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}
      {!hasPhotos && <p className="info-panel-empty">No mounting photos uploaded yet.</p>}
    </aside>
  );
}
