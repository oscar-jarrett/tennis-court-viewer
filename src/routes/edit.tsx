// --- IMPORTS ---
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, lazy, Suspense, useRef } from "react";
import { Save, ArrowLeft, X, LayoutTemplate, ImagePlus, PenLine, Trash2, PanelLeftClose, PanelLeftOpen, Sun, Moon, PanelRightClose, PanelRightOpen } from "lucide-react";
import { supabase } from "@/lib/supabase"; 
import type { CameraSlot, FreeObject, Survey } from "./index"; 

const ViewerScene = lazy(() =>
  import("../components/scene/ViewerScene").then((m) => ({ default: m.ViewerScene }))
);

export const Route = createFileRoute("/edit")({
  component: EditPage,
});

const AVAILABLE_MODELS = [
  { name: "Tripod Camera", file: "tripod.glb" },
  { name: "Flatback Camera", file: "flatback.glb" },
  { name: "FR7 PTZ Camera", file: "fr7.glb" }
];

// --- LOCALIZED SUB-COMPONENTS TO PREVENT CRASHES ---
// This keeps typing calculations isolated away from massive image data array strings.
function LocalTextArea({ label, placeholder, initialValue, onCommit }: { label: string, placeholder: string, initialValue: string, onCommit: (val: string) => void }) {
  const [localVal, setLocalVal] = useState(initialValue);
  useEffect(() => { setLocalVal(initialValue); }, [initialValue]);
  return (
    <div className="mb-5">
      <label className="block text-xs font-bold uppercase tracking-wider mb-2">{label}</label>
      <textarea 
        className="w-full border rounded p-3 text-sm outline-none resize-none bg-transparent"
        rows={4} 
        placeholder={placeholder}
        value={localVal}
        onChange={(e) => setLocalVal(e.target.value)}
        onBlur={() => onCommit(localVal)}
      />
    </div>
  );
}

function LocalInput({ label, placeholder, initialValue, labelColor = "", onCommit }: { label: string, placeholder: string, initialValue: string, labelColor?: string, onCommit: (val: string) => void }) {
  const [localVal, setLocalVal] = useState(initialValue);
  useEffect(() => { setLocalVal(initialValue); }, [initialValue]);
  return (
    <div className="flex items-center gap-3">
      <span className={`w-16 text-xs font-bold ${labelColor}`}>{label}</span>
      <input 
        type="text" 
        placeholder={placeholder} 
        value={localVal} 
        onChange={(e) => setLocalVal(e.target.value)}
        onBlur={() => onCommit(localVal)}
        className="flex-1 border rounded p-1.5 text-xs outline-none bg-transparent" 
      />
    </div>
  );
}

// --- MAIN EDIT PAGE ---
function EditPage() {
  const navigate = useNavigate();
  
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(true);
  const [drawingRouteFor, setDrawingRouteFor] = useState<string | null>(null);
  
  const [isDark, setIsDark] = useState(() => localStorage.getItem("tennis-theme") !== "light");

  useEffect(() => {
    localStorage.setItem("tennis-theme", isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    async function loadSurvey() {
      const activeId = localStorage.getItem("active-survey-id");
      if (!activeId) {
        navigate({ to: "/surveys" });
        return;
      }

      const { data: court } = await supabase.from('courts').select('*').eq('id', activeId).single();
      if (!court) {
        navigate({ to: "/surveys" });
        return;
      }

      const { data: slots } = await supabase.from('camera_slots').select('*').eq('court_id', activeId);
      const { data: freeObjects } = await supabase.from('free_objects').select('*').eq('court_id', activeId);

      setActiveSurvey({
        id: court.id,
        name: court.name,
        courtType: court.court_type,
        slots: slots || [],
        freeObjects: freeObjects || []
      });
    }

    loadSurvey();
  }, [navigate]);

  useEffect(() => {
    if (selectedId) setIsInfoPanelOpen(true);
    setDrawingRouteFor(null); 
  }, [selectedId]);

  const visibleSlots = activeSurvey?.courtType === 'streaming' 
    ? activeSurvey.slots.filter((s: CameraSlot) => s.name === 'Camera 1') 
    : activeSurvey?.slots || [];

  const selectedSlot = useMemo(() => visibleSlots.find((s: CameraSlot) => s.id === selectedId) ?? null, [visibleSlots, selectedId]);
  const selectedFreeObj = useMemo(() => activeSurvey?.freeObjects?.find((o: FreeObject) => o.id === selectedId) ?? null, [activeSurvey, selectedId]);
  const activeItem = selectedSlot || selectedFreeObj;

  function updateActiveSurvey(updates: Partial<Survey>) {
    setActiveSurvey((prev: Survey | null) => prev ? { ...prev, ...updates } : null);
    setIsSaved(false); 
  }

  function updateItem(itemId: string, updates: Partial<CameraSlot | FreeObject>) {
    if (!activeSurvey) return;
    if (activeSurvey.slots.some((s: CameraSlot) => s.id === itemId)) {
      updateActiveSurvey({ slots: activeSurvey.slots.map((s: CameraSlot) => s.id === itemId ? { ...s, ...updates } as CameraSlot : s) });
    } else if (activeSurvey.freeObjects?.some((o: FreeObject) => o.id === itemId)) {
      updateActiveSurvey({ freeObjects: activeSurvey.freeObjects.map((o: FreeObject) => o.id === itemId ? { ...o, ...updates } as FreeObject : o) });
    }
  }

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

  function handleCourtChange(type: 'left' | 'right' | 'streaming') {
    if (!activeSurvey) return;
    const newSlots = activeSurvey.slots.map((slot: CameraSlot) => {
      const isLeft = type === 'left' || type === 'streaming';
      if (slot.name === "Camera 3") return { ...slot, position_x: isLeft ? 8 : -8, position_z: isLeft ? -11 : 11, rotation_y: isLeft ? Math.PI : 0 };
      if (slot.name === "Camera 4") return { ...slot, position_x: isLeft ? -8 : 8, position_z: isLeft ? -11 : 11, rotation_y: isLeft ? Math.PI : 0 };
      return slot;
    });
    updateActiveSurvey({ courtType: type, slots: newSlots });
    if (type === 'streaming' && selectedId !== 'cam-1' && !selectedFreeObj) setSelectedId(null);
  }

  async function handleAddFreeObject(modelFile: string, name: string) {
    if (!activeSurvey) return;
    
    const { data } = await supabase.from('free_objects').insert({
      court_id: activeSurvey.id,
      name,
      model_file: modelFile,
      position_x: 0, position_y: 0, position_z: 0, rotation_y: 0
    }).select().single();

    if (data) {
      updateActiveSurvey({ freeObjects: [...(activeSurvey.freeObjects || []), data] });
      setSelectedId(data.id);
    }
  }

  async function handleDeleteFreeObject(id: string) {
    if (!activeSurvey) return;
    await supabase.from('free_objects').delete().eq('id', id);
    updateActiveSurvey({ freeObjects: (activeSurvey.freeObjects || []).filter((o: FreeObject) => o.id !== id) });
    if (selectedId === id) setSelectedId(null);
  }

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

  async function handleSaveToCloud() {
    if (!activeSurvey) return;
    try {
      await supabase.from('courts').update({ name: activeSurvey.name, court_type: activeSurvey.courtType }).eq('id', activeSurvey.id);

      for (const slot of activeSurvey.slots) {
        await supabase.from('camera_slots').update({
          position_x: slot.position_x, position_y: slot.position_y, position_z: slot.position_z, rotation_y: slot.rotation_y,
          model_file: slot.model_file, description: slot.description, photos: slot.photos,
          cable_sdi: slot.cable_sdi, cable_cat6: slot.cable_cat6, cable_xlr: slot.cable_xlr, cable_nodes: slot.cable_nodes
        }).eq('id', slot.id);
      }

      if (activeSurvey.freeObjects) {
        for (const obj of activeSurvey.freeObjects) {
          await supabase.from('free_objects').update({
            position_x: obj.position_x, position_y: obj.position_y, position_z: obj.position_z, rotation_y: obj.rotation_y,
            description: obj.description, photos: obj.photos, fibre_length: obj.fibre_length, fibre_ports: obj.fibre_ports,
            fibre_serial: obj.fibre_serial, cable_nodes: obj.cable_nodes
          }).eq('id', obj.id);
        }
      }
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (e) {
      alert("Error saving to cloud.");
    }
  }

  if (!activeSurvey) return null;

  return (
    <div className={`app-shell flex flex-col min-h-screen ${isDark ? 'bg-slate-950 text-slate-200' : 'bg-slate-100 text-slate-900'}`}>
      <header className={`app-header relative z-50 flex items-center justify-between p-4 border-b ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300 shadow-sm'}`}>
        <div className="flex items-center gap-4">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`p-1.5 rounded transition ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}>
            {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
          </button>
          <div className="app-brand flex items-center gap-2">
            <span className="app-dot bg-blue-500 w-3 h-3 rounded-full" />
            <button onClick={handleRename} className={`flex items-center gap-2 px-2 py-1 rounded transition ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
              <span className="font-bold">{activeSurvey.name}</span>
              <PenLine size={12} />
            </button>
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <div className={`flex items-center border rounded overflow-hidden px-3 py-1.5 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}>
            <LayoutTemplate size={14} className="mr-2" />
            <select className="bg-transparent text-sm outline-none cursor-pointer" value={activeSurvey.courtType} onChange={(e) => handleCourtChange(e.target.value as any)}>
              <option value="left">Umpire Chair - Left</option>
              <option value="right">Umpire Chair - Right</option>
              <option value="streaming">Streaming Mode</option>
            </select>
          </div>
          <button onClick={handleSaveToCloud} className={`flex items-center gap-2 px-4 py-1.5 rounded text-sm font-bold transition ${isSaved ? 'bg-blue-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}>
            <Save size={14} /> {isSaved ? "Saved!" : "Save Layout"}
          </button>
        </div>
        <nav className="flex items-center gap-2">
          <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-full">{isDark ? <Sun size={18} /> : <Moon size={18} />}</button>
          <div className="h-6 w-px mx-2 bg-slate-700"></div>
          <Link to="/surveys" className="flex items-center gap-1.5 text-sm font-bold"><ArrowLeft size={14} /> All Surveys</Link>
          <Link to="/" className="flex items-center gap-1.5 text-sm font-bold ml-4">Viewer <ArrowLeft size={14} className="rotate-180" /></Link>
        </nav>
      </header>

      <div className="scene-wrap flex flex-1 overflow-hidden relative">
        {isSidebarOpen && (
          <div className={`w-64 flex flex-col border-r shrink-0 overflow-hidden relative z-50 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-lg'}`}>
            <div className="text-xs font-bold uppercase tracking-wider p-4 pb-2">Camera Slots</div>
            <div className="overflow-y-auto max-h-[40%]">
              <ul className="p-2 space-y-1">
                {visibleSlots.map((s: CameraSlot) => (
                  <li key={s.id}>
                    <button className={`w-full text-left px-3 py-2 rounded flex justify-between items-center text-sm ${selectedId === s.id ? 'bg-emerald-600 text-white font-bold' : ''}`} onClick={() => setSelectedId(s.id)}>
                      <span>{s.name}</span>
                      {s.model_file && <span className="text-[10px] text-emerald-400 font-bold">Configured</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="text-xs font-bold uppercase tracking-wider p-4 pb-2 border-t mt-2">Utilities</div>
            <div className="px-4 py-2">
              <select className="w-full border rounded p-1.5 text-xs outline-none cursor-pointer bg-transparent" onChange={(e) => { if(e.target.value) { handleAddFreeObject(e.target.value, e.target.options[e.target.selectedIndex].text); e.target.value = ""; } }}>
                <option value="">-- Spawn Box on Court --</option>
                <option value="gigabob.glb">Gigabob</option>
                <option value="fibre_box.glb">Fibre Box</option>
              </select>
            </div>
            <div className="overflow-y-auto flex-1 pb-10">
              <ul className="p-2 space-y-1">
                {(activeSurvey.freeObjects || []).map((o: FreeObject) => (
                  <li key={o.id}>
                    <button className={`w-full text-left px-3 py-2 rounded flex justify-between items-center text-sm ${selectedId === o.id ? 'bg-blue-600 text-white font-bold' : ''}`} onClick={() => setSelectedId(o.id)}>{o.name}</button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="flex-1 relative min-w-0 h-full overflow-hidden">
          <Suspense fallback={<div className="p-8 font-bold">Loading Assets...</div>}>
            <ViewerScene
              courtType={activeSurvey.courtType} slots={visibleSlots} freeObjects={activeSurvey.freeObjects || []} selectedId={selectedId} isEditing={true} isDark={isDark} drawingRouteFor={drawingRouteFor}
              onSelect={(id: string | null) => setSelectedId(id)}
              onUpdateFreeObject={(id: string, [x, y, z]: [number, number, number]) => updateItem(id, { position_x: x, position_y: y, position_z: z })}
              onUpdateCableNode={handleUpdateCableNode} onDrawWaypoint={handleDrawWaypoint} onFinishDrawing={() => setDrawingRouteFor(null)}
            />
          </Suspense>

          {activeItem && (
            <>
              {!isInfoPanelOpen && (
                <button onClick={() => setIsInfoPanelOpen(true)} className="absolute top-20 right-4 z-50 p-2.5 rounded-xl border shadow-xl backdrop-blur-md flex items-center gap-2 font-bold text-sm bg-slate-900/95 border-slate-700 text-slate-200">
                  <PanelRightOpen size={18} /> {activeItem.name}
                </button>
              )}

              {isInfoPanelOpen && (
                <aside className="absolute top-4 right-4 bottom-4 w-[340px] rounded-xl border p-5 shadow-2xl overflow-y-auto flex flex-col z-50 bg-slate-900/95 border-slate-700 backdrop-blur-md">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold">{activeItem.name}</h2>
                    <div className="flex items-center gap-1 -mr-2">
                      <button className="p-1.5 rounded-md" onClick={() => setIsInfoPanelOpen(false)}><PanelRightClose size={18} /></button>
                      <button className="p-1.5 rounded-md" onClick={() => setSelectedId(null)}><X size={18} /></button>
                    </div>
                  </div>
                  
                  {selectedFreeObj && (
                    <button onClick={() => handleDeleteFreeObject(activeItem.id)} className="mb-6 text-xs w-fit px-3 py-1.5 rounded font-bold transition flex items-center bg-red-900/40 text-red-400">
                      <Trash2 size={12} className="mr-1.5"/> Delete Utility
                    </button>
                  )}

                  {selectedSlot && (
                    <div className="mb-5">
                      <label className="block text-xs font-bold uppercase tracking-wider mb-2">Equipment Model</label>
                      <select className="w-full border rounded p-3 text-sm outline-none bg-transparent" value={activeItem.model_file || ""} onChange={(e) => updateItem(activeItem.id, { model_file: e.target.value || null })}>
                        <option value="">-- Empty Slot --</option>
                        {AVAILABLE_MODELS.map((m) => <option key={m.file} value={m.file}>{m.name}</option>)}
                      </select>
                    </div>
                  )}

                  {(selectedSlot || selectedFreeObj?.model_file === 'fibre_box.glb') && (
                    <div className="mb-5 space-y-3">
                      <label className="block text-xs font-bold uppercase tracking-wider mb-2 border-b pb-1 border-slate-800 text-slate-400">Cable Details</label>
                      <div className="flex gap-2">
                        <button onClick={() => setDrawingRouteFor(drawingRouteFor === activeItem.id ? null : activeItem.id)} className={`flex-1 border rounded px-2 py-1.5 text-xs font-bold ${drawingRouteFor === activeItem.id ? 'bg-emerald-600 text-white' : 'bg-slate-800'}`}>
                          {drawingRouteFor === activeItem.id ? "Done Drawing" : "✏️ Draw Route"}
                        </button>
                        {((activeItem as any).cable_nodes?.length ?? 0) > 0 && (
                          <button onClick={() => updateItem(activeItem.id, { cable_nodes: [] })} className="border rounded px-2 py-1.5 text-xs font-bold bg-red-900/20 text-red-400">Clear</button>
                        )}
                      </div>
                      
                      {drawingRouteFor === activeItem.id ? (
                        <div className="text-[10px] leading-tight text-emerald-400 font-bold animate-pulse">Click court to drop waypoints. Double-click to finish.</div>
                      ) : (
                        <div className="text-[10px] leading-tight text-slate-500">Click "Draw Route" to map cables on the 3D scene.</div>
                      )}

                      {selectedSlot && (
                        <div className="pt-2 space-y-3">
                          <LocalInput key={`sdi-${activeItem.id}`} label="SDI" placeholder="e.g. 20m" initialValue={(activeItem as CameraSlot).cable_sdi || ""} labelColor="text-orange-500" onCommit={(val) => updateItem(activeItem.id, { cable_sdi: val })} />
                          <LocalInput key={`cat-${activeItem.id}`} label="CAT-6" placeholder="e.g. 20m" initialValue={(activeItem as CameraSlot).cable_cat6 || ""} labelColor="text-blue-500" onCommit={(val) => updateItem(activeItem.id, { cable_cat6: val })} />
                          <LocalInput key={`xlr-${activeItem.id}`} label="XLR" placeholder="e.g. 10m" initialValue={(activeItem as CameraSlot).cable_xlr || ""} labelColor="text-green-500" onCommit={(val) => updateItem(activeItem.id, { cable_xlr: val })} />
                        </div>
                      )}
                    </div>
                  )}

                  {selectedFreeObj?.model_file === 'fibre_box.glb' && (
                    <div className="mb-5 space-y-3">
                      <label className="block text-xs font-bold uppercase tracking-wider mb-2 border-b pb-1 border-slate-800 text-slate-400">Fibre Specific Details</label>
                      <LocalInput key={`len-${activeItem.id}`} label="Length" placeholder="e.g. 50m" initialValue={(activeItem as FreeObject).fibre_length || ""} onCommit={(val) => updateItem(activeItem.id, { fibre_length: val })} />
                      <LocalInput key={`port-${activeItem.id}`} label="Ports" placeholder="e.g. Ports 1-4" initialValue={(activeItem as FreeObject).fibre_ports || ""} onCommit={(val) => updateItem(activeItem.id, { fibre_ports: val })} />
                      <LocalInput key={`serial-${activeItem.id}`} label="Serial" placeholder="e.g. SN-10294" initialValue={(activeItem as FreeObject).fibre_serial || ""} onCommit={(val) => updateItem(activeItem.id, { fibre_serial: val })} />
                    </div>
                  )}

                  <LocalTextArea 
                    key={`desc-${activeItem.id}`}
                    label="Description & Notes" 
                    placeholder="Add details here..." 
                    initialValue={activeItem.description || ""} 
                    onCommit={(val) => updateItem(activeItem.id, { description: val })} 
                  />

                  <div className="mt-auto border-t pt-5 border-slate-800">
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Reference Photos</label>
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
                        <div key={index} className="relative group rounded border overflow-hidden aspect-square bg-black border-slate-700">
                          <img src={photoData} alt="Reference" className="w-full h-full object-cover opacity-90 transition" />
                          <button onClick={() => handleDeletePhoto(activeItem.id, index)} className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition shadow-lg">
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