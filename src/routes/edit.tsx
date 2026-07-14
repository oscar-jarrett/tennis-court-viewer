// --- IMPORTS ---
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { Save, ArrowLeft, X, LayoutTemplate, ImagePlus, PenLine, Trash2, PanelLeftClose, PanelLeftOpen, Sun, Moon, PanelRightClose, PanelRightOpen } from "lucide-react";
import { type CameraSlot, FreeObject, Survey, StorageData } from "./surveys"; // <-- Removed STORAGE_KEY from here!

// Lazy load the 3D scene to keep the main bundle light
const ViewerScene = lazy(() =>
  import("@/components/scene/ViewerScene").then((m) => ({ default: m.ViewerScene }))
);

export const Route = createFileRoute("/edit")({
  component: EditPage,
});

// Dropdown options for slot equipment
const AVAILABLE_MODELS = [
  { name: "Tripod Camera", file: "tripod.glb" },
  { name: "Flatback Camera", file: "flatback.glb" },
  { name: "FR7 PTZ Camera", file: "fr7.glb" }
];

const STORAGE_KEY = "tennis-surveys-v20";

function EditPage() {
  const navigate = useNavigate();
  
  // --- STATE ---
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null); // Contains the active DB object
  const [selectedId, setSelectedId] = useState<string | null>(null);     // ID of the clicked element in the scene
  const [isSaved, setIsSaved] = useState(false);                         // Triggers the green "Saved!" flash effect
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);              // Toggles left menu
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(true);          // Toggles right properties panel
  const [drawingRouteFor, setDrawingRouteFor] = useState<string | null>(null); // Indicates which element is in waypoint drawing mode
  
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("tennis-theme") !== "light";
  });

  // --- EFFECTS ---
  useEffect(() => {
    localStorage.setItem("tennis-theme", isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    const activeId = localStorage.getItem("active-survey-id");
    const savedData = localStorage.getItem(STORAGE_KEY);
    
    // Redirect back to dashboard if we lost data context
    if (!activeId || !savedData) {
      navigate({ to: "/surveys" }); 
      return; 
    }

    const parsedData: StorageData = JSON.parse(savedData);
    const found = parsedData.surveys.find((s: Survey) => s.id === activeId);
    
    if (found) {
      setActiveSurvey(found);
    } else {
      navigate({ to: "/surveys" });
    }
  }, [navigate]);

  useEffect(() => {
    // Automatically re-open the info panel when selecting a new element
    if (selectedId) setIsInfoPanelOpen(true);
    // Cancel drawing mode if selection changes
    setDrawingRouteFor(null); 
  }, [selectedId]);

  // --- COMPUTED DATA ---
  // If streaming court, only show cam-1. Otherwise, show all.
  const visibleSlots = activeSurvey?.courtType === 'streaming' 
    ? activeSurvey.slots.filter((s: CameraSlot) => s.id === 'cam-1') 
    : activeSurvey?.slots || [];

  const selectedSlot = useMemo(() => visibleSlots.find((s: CameraSlot) => s.id === selectedId) ?? null, [visibleSlots, selectedId]);
  const selectedFreeObj = useMemo(() => activeSurvey?.freeObjects?.find((o: FreeObject) => o.id === selectedId) ?? null, [activeSurvey, selectedId]);
  const activeItem = selectedSlot || selectedFreeObj;

  // --- DATA UPDATE HANDLERS ---
  
  // High-level update for Survey metadata (like court type or name)
  function updateActiveSurvey(updates: Partial<Survey>) {
    setActiveSurvey((prev: Survey | null) => prev ? { ...prev, ...updates } : null);
    setIsSaved(false); // Forces the Save button to turn green to warn user of unsaved changes
  }

  // Element-level update (merges changes into the specific camera or utility object)
  function updateItem(itemId: string, updates: Partial<CameraSlot | FreeObject>) {
    if (!activeSurvey) return;
    if (activeSurvey.slots.some((s: CameraSlot) => s.id === itemId)) {
      updateActiveSurvey({ slots: activeSurvey.slots.map((s: CameraSlot) => s.id === itemId ? { ...s, ...updates } as CameraSlot : s) });
    } else if (activeSurvey.freeObjects?.some((o: FreeObject) => o.id === itemId)) {
      updateActiveSurvey({ freeObjects: activeSurvey.freeObjects.map((o: FreeObject) => o.id === itemId ? { ...o, ...updates } as FreeObject : o) });
    }
  }

  // Tracks waypoint drags
  function handleUpdateCableNode(itemId: string, nodeIndex: number, pos: [number, number, number]) {
    if (!activeSurvey) return;
    const slot = activeSurvey.slots.find(s => s.id === itemId);
    const freeObj = activeSurvey.freeObjects?.find(o => o.id === itemId);
    const item = slot || freeObj;
    if (!item || !item.cable_nodes) return;

    const newNodes = [...item.cable_nodes];
    newNodes[nodeIndex] = pos;
    updateItem(itemId, { cable_nodes: newNodes });
  }

  // Appends a new waypoint from a canvas click
  function handleDrawWaypoint(itemId: string, pos: [number, number, number]) {
    if (!activeSurvey) return;
    const slot = activeSurvey.slots.find(s => s.id === itemId);
    const freeObj = activeSurvey.freeObjects?.find(o => o.id === itemId);
    const item = slot || freeObj;
    if (!item) return;

    const newNodes: [number, number, number][] = [...(item.cable_nodes || [])];
    newNodes.push(pos);
    updateItem(itemId, { cable_nodes: newNodes });
  }

  // Swaps stadium GLTF models and repositions Cameras 3/4 based on umpire side
  function handleCourtChange(type: 'left' | 'right' | 'streaming') {
    if (!activeSurvey) return;
    const newSlots = activeSurvey.slots.map((slot: CameraSlot) => {
      const isLeft = type === 'left' || type === 'streaming';
      if (slot.id === "cam-3") return { ...slot, position_x: isLeft ? 8 : -8, position_z: isLeft ? -11 : 11, rotation_y: isLeft ? Math.PI : 0 };
      if (slot.id === "cam-4") return { ...slot, position_x: isLeft ? -8 : 8, position_z: isLeft ? -11 : 11, rotation_y: isLeft ? Math.PI : 0 };
      return slot;
    });
    updateActiveSurvey({ courtType: type, slots: newSlots });
    if (type === 'streaming' && selectedId !== 'cam-1' && !selectedFreeObj) setSelectedId(null);
  }

  // Utility spawning
  function handleAddFreeObject(modelFile: string, name: string) {
    if (!activeSurvey) return;
    const newObj: FreeObject = { id: "free-" + Date.now(), name, model_file: modelFile, position_x: 0, position_y: 0, position_z: 0, rotation_y: 0, photos: [] };
    updateActiveSurvey({ freeObjects: [...(activeSurvey.freeObjects || []), newObj] });
    setSelectedId(newObj.id);
  }

  // Utility deletion
  function handleDeleteFreeObject(id: string) {
    if (!activeSurvey) return;
    updateActiveSurvey({ freeObjects: (activeSurvey.freeObjects || []).filter((o: FreeObject) => o.id !== id) });
    if (selectedId === id) setSelectedId(null);
  }

  // Photo to Base64 Image Conversion
  function handlePhotoUpload(slotId: string, file: File) {
    const reader = new FileReader();
    reader.onload = () => activeItem && updateItem(slotId, { photos: [...(activeItem.photos || []), reader.result as string] });
    reader.readAsDataURL(file);
  }

  function handleDeletePhoto(slotId: string, photoIndex: number) {
    if (!activeItem) return;
    const newPhotos = [...(activeItem.photos || [])];
    newPhotos.splice(photoIndex, 1);
    updateItem(slotId, { photos: newPhotos });
  }

  function handleRename() {
    const newName = prompt("Rename Survey:", activeSurvey?.name);
    if (newName) updateActiveSurvey({ name: newName });
  }

  // Commits activeSurvey data back to LocalStorage
  function handleSaveLocally() {
    if (!activeSurvey) return;
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      let parsedData: StorageData = savedData ? JSON.parse(savedData) : { folders: [], surveys: [] };
      parsedData.surveys = parsedData.surveys.map((s: Survey) => s.id === activeSurvey.id ? activeSurvey : s);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsedData));
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (e) {
      alert("Storage Full! You have uploaded too many photos. Delete some to save.");
    }
  }

  if (!activeSurvey) return null;

  // --- RENDER ---
  return (
    <div className={`app-shell flex flex-col min-h-screen ${isDark ? 'bg-slate-950 text-slate-200' : 'bg-slate-100 text-slate-900'}`}>
      
      {/* 1. TOP HEADER (Navigation & Saves) */}
      <header className={`app-header relative z-50 flex items-center justify-between p-4 border-b ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300 shadow-sm'}`}>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className={`p-1.5 rounded transition ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
          >
            {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
          </button>
          
          <div className="app-brand flex items-center gap-2">
            <span className="app-dot bg-blue-500 w-3 h-3 rounded-full" />
            <button onClick={handleRename} className={`flex items-center gap-2 px-2 py-1 rounded transition ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
              <span className="font-bold">{activeSurvey.name}</span>
              <PenLine size={12} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
            </button>
          </div>
        </div>
        
        <div className="flex gap-3 items-center">
          <div className={`flex items-center border rounded overflow-hidden px-3 py-1.5 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}>
            <LayoutTemplate size={14} className={isDark ? 'text-slate-400 mr-2' : 'text-slate-500 mr-2'} />
            <select 
              className={`bg-transparent text-sm outline-none cursor-pointer ${isDark ? 'text-white' : 'text-slate-900'}`}
              value={activeSurvey.courtType}
              onChange={(e) => handleCourtChange(e.target.value as 'left' | 'right' | 'streaming')}
            >
              <option value="left" className={isDark ? "bg-slate-800 text-white" : "bg-white text-slate-900"}>Umpire Chair - Left</option>
              <option value="right" className={isDark ? "bg-slate-800 text-white" : "bg-white text-slate-900"}>Umpire Chair - Right</option>
              <option value="streaming" className={isDark ? "bg-slate-800 text-white" : "bg-white text-slate-900"}>Streaming Mode</option>
            </select>
          </div>

          <button onClick={handleSaveLocally} className={`flex items-center gap-2 px-4 py-1.5 rounded text-sm font-bold transition ${isSaved ? 'bg-blue-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}>
            <Save size={14} /> {isSaved ? "Saved!" : "Save Layout"}
          </button>
        </div>

        <nav className="flex items-center gap-2">
          <button onClick={() => setIsDark(!isDark)} className={`p-2 rounded-full transition ${isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-200 text-slate-600'}`}>
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className={`h-6 w-px mx-2 ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`}></div>
          <Link to="/surveys" className={`flex items-center gap-1.5 text-sm font-bold transition ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}><ArrowLeft size={14} /> All Surveys</Link>
          <Link to="/" className={`flex items-center gap-1.5 text-sm font-bold ml-4 transition ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>Viewer <ArrowLeft size={14} className="rotate-180" /></Link>
        </nav>
      </header>

      <div className="scene-wrap flex flex-1 overflow-hidden relative">
        
        {/* 2. LEFT SIDEBAR (Selection Menu) */}
        {isSidebarOpen && (
          <div className={`w-64 flex flex-col border-r shrink-0 overflow-hidden relative z-50 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-lg'}`}>
            <div className={`text-xs font-bold uppercase tracking-wider p-4 pb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Camera Slots</div>
            <div className="overflow-y-auto max-h-[40%]">
              <ul className="p-2 space-y-1">
                {visibleSlots.map((s: CameraSlot) => (
                  <li key={s.id}>
                    <button 
                      className={`w-full text-left px-3 py-2 rounded flex justify-between items-center text-sm transition ${selectedId === s.id ? (isDark ? 'bg-slate-800 text-white border-l-2 border-emerald-500' : 'bg-emerald-50 text-emerald-900 border-l-2 border-emerald-500 font-bold') : (isDark ? 'hover:bg-slate-800/50 text-slate-300' : 'hover:bg-slate-100 text-slate-700')}`} 
                      onClick={() => setSelectedId(s.id)}
                    >
                      <span>{s.name}</span>
                      {s.model_file && <span className="text-[10px] text-emerald-500 font-bold">Configured</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className={`text-xs font-bold uppercase tracking-wider p-4 pb-2 border-t mt-2 ${isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'}`}>Utilities</div>
            <div className="px-4 py-2">
              <select 
                className={`w-full border rounded p-1.5 text-xs outline-none cursor-pointer ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                onChange={(e) => { if(e.target.value) { handleAddFreeObject(e.target.value, e.target.options[e.target.selectedIndex].text); e.target.value = ""; } }}
              >
                <option value="" className={isDark ? "bg-slate-900 text-slate-400" : "bg-white text-slate-500"}>-- Spawn Box on Court --</option>
                <option value="gigabob.glb" className={isDark ? "bg-slate-900" : "bg-white"}>Gigabob</option>
                <option value="fibre_box.glb" className={isDark ? "bg-slate-900" : "bg-white"}>Fibre Box</option>
              </select>
            </div>
            <div className="overflow-y-auto flex-1 pb-10">
              <ul className="p-2 space-y-1">
                {(activeSurvey.freeObjects || []).map((o: FreeObject) => (
                  <li key={o.id}>
                    <button 
                      className={`w-full text-left px-3 py-2 rounded flex justify-between items-center text-sm transition ${selectedId === o.id ? (isDark ? 'bg-blue-900/40 text-blue-200 border-l-2 border-blue-500' : 'bg-blue-50 text-blue-900 border-l-2 border-blue-500 font-bold') : (isDark ? 'hover:bg-slate-800/50 text-blue-300/80' : 'hover:bg-slate-100 text-slate-700')}`} 
                      onClick={() => setSelectedId(o.id)}
                    >
                      <span>{o.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="flex-1 relative min-w-0 h-full overflow-hidden">
          {/* 3. 3D CANVAS INJECTION */}
          <Suspense fallback={<div className="p-8 font-bold">Loading Assets...</div>}>
            <ViewerScene
              courtType={activeSurvey.courtType}
              slots={visibleSlots}
              freeObjects={activeSurvey.freeObjects || []}
              selectedId={selectedId}
              isEditing={true}      // Turns on dragging events inside the 3D scene
              isDark={isDark}
              drawingRouteFor={drawingRouteFor}
              onSelect={(id: string | null) => setSelectedId(id)}
              onUpdateFreeObject={(id: string, [x, y, z]: [number, number, number]) => updateItem(id, { position_x: x, position_y: y, position_z: z })}
              onUpdateCableNode={handleUpdateCableNode}
              onDrawWaypoint={handleDrawWaypoint}
              onFinishDrawing={() => setDrawingRouteFor(null)}
            />
          </Suspense>

          {/* 4. RIGHT PROPERTIES PANEL */}
          {activeItem && (
            <>
              {/* Floating button when minimized */}
              {!isInfoPanelOpen && (
                <button 
                  onClick={() => setIsInfoPanelOpen(true)}
                  className={`absolute top-20 right-4 z-50 p-2.5 rounded-xl border shadow-xl transition backdrop-blur-md flex items-center gap-2 font-bold text-sm
                    ${isDark ? 'bg-slate-900/95 border-slate-700 text-slate-200 hover:bg-slate-800' : 'bg-white/95 border-slate-200 text-slate-800 hover:bg-slate-100'}`}
                  title="Expand Info Panel"
                >
                  <PanelRightOpen size={18} />
                  {activeItem.name}
                </button>
              )}

              {/* Main Panel Content */}
              {isInfoPanelOpen && (
                <aside className={`absolute top-4 right-4 bottom-4 w-[340px] rounded-xl border p-5 shadow-2xl overflow-y-auto flex flex-col z-50 ${isDark ? 'bg-slate-900/95 border-slate-700 backdrop-blur-md' : 'bg-white/95 border-slate-200 backdrop-blur-md'}`}>
                  
                  <div className="flex justify-between items-center mb-6">
                    <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{activeItem.name}</h2>
                    <div className="flex items-center gap-1 -mr-2">
                      <button className={`p-1.5 rounded-md transition ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`} onClick={() => setIsInfoPanelOpen(false)} title="Minimize Panel"><PanelRightClose size={18} /></button>
                      <button className={`p-1.5 rounded-md transition ${isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-red-400' : 'hover:bg-slate-100 text-slate-600 hover:text-red-500'}`} onClick={() => setSelectedId(null)} title="Deselect Item"><X size={18} /></button>
                    </div>
                  </div>
                  
                  {/* Delete button (only applies to user-spawned utilities, not fixed slots) */}
                  {selectedFreeObj && (
                    <button onClick={() => handleDeleteFreeObject(activeItem.id)} className={`mb-6 text-xs w-fit px-3 py-1.5 rounded font-bold transition flex items-center ${isDark ? 'bg-red-900/40 hover:bg-red-900/60 text-red-400' : 'bg-red-100 hover:bg-red-200 text-red-700'}`}>
                      <Trash2 size={12} className="mr-1.5"/> Delete Utility
                    </button>
                  )}

                  {/* Slot Model Selection */}
                  {selectedSlot && (
                    <div className="mb-5">
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Equipment Model</label>
                      <select
                        className={`w-full border rounded p-3 text-sm outline-none cursor-pointer ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                        value={activeItem.model_file || ""}
                        onChange={(e) => updateItem(activeItem.id, { model_file: e.target.value || null })}
                      >
                        <option value="" className={isDark ? "bg-slate-900" : "bg-white"}>-- Empty Slot --</option>
                        {AVAILABLE_MODELS.map((m) => (
                          <option key={m.file} value={m.file} className={isDark ? "bg-slate-900" : "bg-white"}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Cable Routing & Measurement Interface */}
                  {(selectedSlot || selectedFreeObj?.model_file === 'fibre_box.glb') && (
                    <div className="mb-5 space-y-3">
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-2 border-b pb-1 ${isDark ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-200'}`}>Cable Details</label>
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setDrawingRouteFor(drawingRouteFor === activeItem.id ? null : activeItem.id)} 
                          className={`flex-1 border rounded px-2 py-1.5 text-xs font-bold transition ${drawingRouteFor === activeItem.id ? 'bg-emerald-600 border-emerald-500 text-white' : (isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-slate-300 hover:bg-slate-50')}`}
                        >
                          {drawingRouteFor === activeItem.id ? "Done Drawing" : "✏️ Draw Route"}
                        </button>
                        {((activeItem as CameraSlot|FreeObject).cable_nodes?.length ?? 0) > 0 && (
                          <button onClick={() => updateItem(activeItem.id, { cable_nodes: [] })} className={`border rounded px-2 py-1.5 text-xs font-bold transition ${isDark ? 'bg-red-900/20 border-red-900/50 text-red-400 hover:bg-red-900/40' : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'}`}>Clear</button>
                        )}
                      </div>
                      
                      {/* Dynamic instruction text based on drawing state */}
                      {drawingRouteFor === activeItem.id ? (
                        <div className="text-[10px] leading-tight text-emerald-400 font-bold animate-pulse">Click anywhere on the 3D court to drop waypoints. Double-click the court to finish.</div>
                      ) : (
                        <div className={`text-[10px] leading-tight ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Click "Draw Route" to map cables directly onto the 3D scene.</div>
                      )}

                      {selectedSlot && (
                        <div className="pt-2 space-y-3">
                          <div className="flex items-center gap-3">
                            <span className="w-16 text-xs font-bold text-orange-500">SDI</span>
                            <input type="text" placeholder="e.g. 20m" value={(activeItem as CameraSlot).cable_sdi || ""} onChange={(e) => updateItem(activeItem.id, { cable_sdi: e.target.value })} className={`flex-1 border rounded p-1.5 text-xs outline-none ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300'}`} />
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="w-16 text-xs font-bold text-blue-500">CAT-6</span>
                            <input type="text" placeholder="e.g. 20m" value={(activeItem as CameraSlot).cable_cat6 || ""} onChange={(e) => updateItem(activeItem.id, { cable_cat6: e.target.value })} className={`flex-1 border rounded p-1.5 text-xs outline-none ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300'}`} />
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="w-16 text-xs font-bold text-green-500">XLR</span>
                            <input type="text" placeholder="e.g. 10m" value={(activeItem as CameraSlot).cable_xlr || ""} onChange={(e) => updateItem(activeItem.id, { cable_xlr: e.target.value })} className={`flex-1 border rounded p-1.5 text-xs outline-none ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300'}`} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Fibre Specific Input Fields */}
                  {selectedFreeObj?.model_file === 'fibre_box.glb' && (
                    <div className="mb-5 space-y-3">
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-2 border-b pb-1 ${isDark ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-200'}`}>Fibre Specific Details</label>
                      <div>
                        <span className={`block text-[10px] uppercase mb-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Length</span>
                        <input type="text" placeholder="e.g. 50m" value={(activeItem as FreeObject).fibre_length || ""} onChange={(e) => updateItem(activeItem.id, { fibre_length: e.target.value })} className={`w-full border rounded p-2 text-xs outline-none ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300'}`} />
                      </div>
                      <div>
                        <span className={`block text-[10px] uppercase mb-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Port Numbers</span>
                        <input type="text" placeholder="e.g. Ports 1-4" value={(activeItem as FreeObject).fibre_ports || ""} onChange={(e) => updateItem(activeItem.id, { fibre_ports: e.target.value })} className={`w-full border rounded p-2 text-xs outline-none ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300'}`} />
                      </div>
                      <div>
                        <span className={`block text-[10px] uppercase mb-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Reel Serial Number</span>
                        <input type="text" placeholder="e.g. SN-10294" value={(activeItem as FreeObject).fibre_serial || ""} onChange={(e) => updateItem(activeItem.id, { fibre_serial: e.target.value })} className={`w-full border rounded p-2 text-xs outline-none ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300'}`} />
                      </div>
                    </div>
                  )}

                  {/* Notes Area */}
                  <div className="mb-5">
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Description & Notes</label>
                    <textarea 
                      className={`w-full border rounded p-3 text-sm outline-none resize-none ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} 
                      rows={4} 
                      placeholder="Add details here..."
                      value={activeItem.description || ""} 
                      onChange={(e) => updateItem(activeItem.id, { description: e.target.value })} 
                    />
                  </div>

                  {/* Photo Upload Grid */}
                  <div className={`mt-auto border-t pt-5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Reference Photos</label>
                      <label className="cursor-pointer text-emerald-500 hover:text-emerald-400 flex items-center gap-1 text-xs font-bold transition">
                        <ImagePlus size={14} /> Add Photo
                        <input type="file" accept="image/*" hidden onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handlePhotoUpload(activeItem.id, f);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {activeItem.photos?.map((photoData: string, index: number) => (
                        <div key={index} className={`relative group rounded border overflow-hidden aspect-square ${isDark ? 'bg-black border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                          <img src={photoData} alt="Reference" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition" />
                          <button 
                            onClick={() => handleDeletePhoto(activeItem.id, index)}
                            className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition shadow-lg"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </aside>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}