// --- IMPORTS ---
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { Settings, X, FolderOpen, PanelLeftClose, PanelLeftOpen, Sun, Moon, PanelRightClose, PanelRightOpen, Cable } from "lucide-react";
import { STORAGE_KEY, type CameraSlot, FreeObject, Survey, StorageData } from "./surveys";

// Lazy loading the WebGL context
const ViewerScene = lazy(() =>
  import("@/components/scene/ViewerScene").then((m) => ({ default: m.ViewerScene }))
);

export const Route = createFileRoute("/")({
  component: ViewerPage,
});

function ViewerPage() {
  const navigate = useNavigate();
  
  // --- STATE ---
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(true);
  
  const [showCableModal, setShowCableModal] = useState(false); // Controls the visibility of the Cable Aggregation Summary table

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
    
    // Mount Data
    if (activeId && savedData) {
      const parsedData: StorageData = JSON.parse(savedData);
      const found = parsedData.surveys.find((s: Survey) => s.id === activeId);
      if (found) setActiveSurvey(found);
    }
  }, []);

  useEffect(() => {
    if (selectedId) setIsInfoPanelOpen(true);
  }, [selectedId]);

  // --- COMPUTED DATA ---
  const visibleSlots = activeSurvey?.courtType === 'streaming' 
    ? activeSurvey.slots.filter((s: CameraSlot) => s.id === 'cam-1') 
    : activeSurvey?.slots || [];

  const selectedSlot = useMemo(() => visibleSlots.find((s: CameraSlot) => s.id === selectedId) ?? null, [visibleSlots, selectedId]);
  const selectedFreeObj = useMemo(() => activeSurvey?.freeObjects?.find((o: FreeObject) => o.id === selectedId) ?? null, [activeSurvey, selectedId]);
  const activeItem = selectedSlot || selectedFreeObj;

  // Render a fallback layout if no data is found (e.g., direct navigation to / without a selected survey)
  if (!activeSurvey) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-screen ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'}`}>
        <FolderOpen size={48} className={`mb-4 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
        <h2 className="text-2xl font-bold mb-2">No Survey Selected</h2>
        <p className={`mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Please select a site survey from the dashboard to view it.</p>
        <Link to="/surveys" className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-bold transition">
          Go to Site Surveys
        </Link>
      </div>
    );
  }

  // --- RENDER ---
  return (
    <div className={`app-shell flex flex-col min-h-screen ${isDark ? 'bg-slate-950 text-slate-200' : 'bg-slate-100 text-slate-900'}`}>
      
      {/* 1. CABLE SUMMARY MODAL (Sits in front of the page at z-100) */}
      {showCableModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden ${isDark ? 'bg-slate-900 border border-slate-700' : 'bg-white border border-slate-200'}`}>
            
            <div className={`flex justify-between items-center p-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <h2 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <Cable size={20} className="text-blue-500" /> Cable Routing Summary
              </h2>
              <button onClick={() => setShowCableModal(false)} className={`p-1.5 rounded transition ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}>
                <X size={18} />
              </button>
            </div>
            
            {/* Table aggregating all entered lengths from slots and free objects */}
            <div className="p-4 overflow-x-auto max-h-[70vh]">
              <table className={`w-full text-left text-sm whitespace-nowrap ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <thead className={`text-xs uppercase tracking-wider ${isDark ? 'bg-slate-800/50 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                  <tr>
                    <th className="p-3 rounded-tl-lg font-bold">Equipment</th>
                    <th className="p-3 font-bold">SDI</th>
                    <th className="p-3 font-bold">CAT-6</th>
                    <th className="p-3 font-bold">XLR</th>
                    <th className="p-3 rounded-tr-lg font-bold">Fibre Length</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                  {visibleSlots.filter(s => s.model_file).map(slot => (
                    <tr key={slot.id} className={`transition ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                      <td className="p-3 font-bold">{slot.name}</td>
                      <td className="p-3 text-orange-500 font-bold">{slot.cable_sdi || "-"}</td>
                      <td className="p-3 text-blue-500 font-bold">{slot.cable_cat6 || "-"}</td>
                      <td className="p-3 text-green-500 font-bold">{slot.cable_xlr || "-"}</td>
                      <td className={`p-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>-</td>
                    </tr>
                  ))}
                  
                  {activeSurvey.freeObjects?.filter(o => o.model_file === 'fibre_box.glb').map(fb => (
                    <tr key={fb.id} className={`transition ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                      <td className="p-3 font-bold">{fb.name}</td>
                      <td className={`p-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>-</td>
                      <td className={`p-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>-</td>
                      <td className={`p-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>-</td>
                      <td className="p-3 text-yellow-500 font-bold">{fb.fibre_length || "-"}</td>
                    </tr>
                  ))}

                  {visibleSlots.filter(s => s.model_file).length === 0 && (activeSurvey.freeObjects?.filter(o => o.model_file === 'fibre_box.glb').length || 0) === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center italic text-slate-500">No equipment configured yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
          </div>
        </div>
      )}

      {/* 2. TOP HEADER */}
      <header className={`app-header relative z-50 flex items-center justify-between p-4 border-b ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300 shadow-sm'}`}>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className={`p-1.5 rounded transition ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
          >
            {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
          </button>
          
          <div className="app-brand flex items-center gap-2">
            <span className="app-dot bg-emerald-500 w-3 h-3 rounded-full" />
            <span className="font-bold px-2 py-1">{activeSurvey.name} <span className={`font-normal ml-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>(Viewer)</span></span>
          </div>
        </div>
        
        <nav className="flex items-center gap-2">
          {/* Modal Trigger Button */}
          <button 
            onClick={() => setShowCableModal(true)} 
            className={`flex items-center gap-1.5 text-sm font-bold transition mr-2 px-3 py-1.5 rounded-lg ${isDark ? 'text-blue-400 bg-blue-900/20 hover:bg-blue-900/40' : 'text-blue-600 bg-blue-50 hover:bg-blue-100'}`}
          >
            <Cable size={14} /> Cable Summary
          </button>
          
          <button onClick={() => setIsDark(!isDark)} className={`p-2 rounded-full transition ${isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-200 text-slate-600'}`}>
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className={`h-6 w-px mx-2 ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`}></div>
          <Link to="/surveys" className={`flex items-center gap-1.5 text-sm font-bold transition ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}><FolderOpen size={14} /> All Surveys</Link>
          <Link to="/edit" className={`flex items-center gap-1.5 text-sm font-bold ml-4 transition ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}><Settings size={14} /> Edit Mode</Link>
        </nav>
      </header>

      <div className="scene-wrap flex flex-1 overflow-hidden relative">
        {/* 3. LEFT SIDEBAR */}
        {isSidebarOpen && (
          <div className={`w-64 flex flex-col border-r shrink-0 overflow-hidden relative z-40 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-lg'}`}>
            <div className={`text-xs font-bold uppercase tracking-wider p-4 pb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Configured Cameras</div>
            <div className="overflow-y-auto max-h-[50%]">
              <ul className="p-2 space-y-1">
                {visibleSlots.filter((s: CameraSlot) => s.model_file).map((s: CameraSlot) => (
                  <li key={s.id}>
                    <button 
                      className={`w-full text-left px-3 py-2 rounded flex justify-between items-center text-sm transition ${selectedId === s.id ? (isDark ? 'bg-slate-800 text-white border-l-2 border-emerald-500' : 'bg-emerald-50 text-emerald-900 border-l-2 border-emerald-500 font-bold') : (isDark ? 'hover:bg-slate-800/50 text-slate-300' : 'hover:bg-slate-100 text-slate-700')}`} 
                      onClick={() => setSelectedId(s.id)}
                    >
                      <span>{s.name}</span>
                    </button>
                  </li>
                ))}
                {visibleSlots.filter((s: CameraSlot) => s.model_file).length === 0 && (
                  <li className={`px-4 py-3 text-xs italic ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>No cameras configured yet.</li>
                )}
              </ul>
            </div>
            
            {(activeSurvey.freeObjects || []).length > 0 && (
              <>
                <div className={`text-xs font-bold uppercase tracking-wider p-4 pb-2 border-t mt-2 ${isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'}`}>Utilities</div>
                <div className="overflow-y-auto flex-1 pb-10">
                  <ul className="p-2 space-y-1">
                    {activeSurvey.freeObjects!.map((o: FreeObject) => (
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
              </>
            )}
          </div>
        )}

        {/* 4. MAIN CANVAS WRAPPER */}
        <div className="flex-1 relative min-w-0 h-full overflow-hidden">
          <Suspense fallback={<div className="p-8 font-bold">Loading Assets...</div>}>
            <ViewerScene
              courtType={activeSurvey.courtType}
              slots={visibleSlots}
              freeObjects={activeSurvey.freeObjects || []}
              selectedId={selectedId}
              isEditing={false} // View Only Context
              isDark={isDark}
              onSelect={(id: string | null) => setSelectedId(id)}
            />
          </Suspense>

          {/* 5. RIGHT PROPERTIES PANEL */}
          {activeItem && (
            <>
              {!isInfoPanelOpen && (
                <button 
                  onClick={() => setIsInfoPanelOpen(true)}
                  className={`absolute top-20 right-4 z-40 p-2.5 rounded-xl border shadow-xl transition backdrop-blur-md flex items-center gap-2 font-bold text-sm
                    ${isDark ? 'bg-slate-900/95 border-slate-700 text-slate-200 hover:bg-slate-800' : 'bg-white/95 border-slate-200 text-slate-800 hover:bg-slate-100'}`}
                  title="Expand Info Panel"
                >
                  <PanelRightOpen size={18} />
                  {activeItem.name}
                </button>
              )}

              {isInfoPanelOpen && (
                <aside className={`absolute top-4 right-4 bottom-4 w-[340px] rounded-xl border p-5 shadow-2xl overflow-y-auto flex flex-col z-40 ${isDark ? 'bg-slate-900/95 border-slate-700 backdrop-blur-md' : 'bg-white/95 border-slate-200 backdrop-blur-md'}`}>
                  
                  <div className="flex justify-between items-center mb-6">
                    <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{activeItem.name}</h2>
                    <div className="flex items-center gap-1 -mr-2">
                      <button className={`p-1.5 rounded-md transition ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`} onClick={() => setIsInfoPanelOpen(false)} title="Minimize Panel"><PanelRightClose size={18} /></button>
                      <button className={`p-1.5 rounded-md transition ${isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-red-400' : 'hover:bg-slate-100 text-slate-600 hover:text-red-500'}`} onClick={() => setSelectedId(null)} title="Deselect Item"><X size={18} /></button>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    {/* READ-ONLY RENDER OF EQUIPMENT DATA */}
                    {selectedSlot && (
                      <>
                        <div>
                          <span className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Equipment</span>
                          <div className={`text-sm font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{activeItem.model_file || activeItem.name}</div>
                        </div>
                        
                        {((activeItem as CameraSlot).cable_sdi || (activeItem as CameraSlot).cable_cat6 || (activeItem as CameraSlot).cable_xlr) && (
                          <div>
                            <span className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Cable Routes</span>
                            <div className={`text-xs space-y-1.5 p-3 rounded border ${isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                              {(activeItem as CameraSlot).cable_sdi && <div><span className="font-bold text-orange-500 mr-2">SDI:</span> {(activeItem as CameraSlot).cable_sdi}</div>}
                              {(activeItem as CameraSlot).cable_cat6 && <div><span className="font-bold text-blue-500 mr-2">CAT-6:</span> {(activeItem as CameraSlot).cable_cat6}</div>}
                              {(activeItem as CameraSlot).cable_xlr && <div><span className="font-bold text-green-500 mr-2">XLR:</span> {(activeItem as CameraSlot).cable_xlr}</div>}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {selectedFreeObj?.model_file === 'fibre_box.glb' && (
                      <div>
                        <span className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Fibre Specific Details</span>
                        <div className={`text-xs space-y-2 p-3 rounded border ${isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                          <div><span className="font-bold mr-2">Length:</span> {(activeItem as FreeObject).fibre_length || "N/A"}</div>
                          <div><span className="font-bold mr-2">Ports:</span> {(activeItem as FreeObject).fibre_ports || "N/A"}</div>
                          <div><span className="font-bold mr-2">Serial Number:</span> {(activeItem as FreeObject).fibre_serial || "N/A"}</div>
                        </div>
                      </div>
                    )}

                    {activeItem.description && (
                      <div>
                        <span className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Description</span>
                        <p className={`text-sm whitespace-pre-wrap leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{activeItem.description}</p>
                      </div>
                    )}

                    {activeItem.photos && activeItem.photos.length > 0 && (
                      <div className={`border-t pt-5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                        <span className={`block text-[10px] font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Reference Photos</span>
                        <div className="flex flex-col gap-3">
                          {activeItem.photos.map((photo: string, i: number) => (
                            <img key={i} src={photo} alt={`Reference ${i + 1}`} className={`w-full rounded border shadow-md ${isDark ? 'border-slate-700' : 'border-slate-200'}`} />
                          ))}
                        </div>
                      </div>
                    )}
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