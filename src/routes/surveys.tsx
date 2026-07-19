// --- IMPORTS ---
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FolderOpen, FolderPlus, Folder, Plus, Trash2, Eye, Settings, Calendar, ChevronRight, ArrowLeft, Sun, Moon } from "lucide-react";
import { supabase } from "@/lib/supabase"; // 🔌 THE NEW CONNECTION!

export const Route = createFileRoute("/surveys")({
  component: SurveysPage,
});

// --- CONSTANTS ---
// Default starting template for a new court survey (Removed static IDs so Supabase can generate true UUIDs)
const INITIAL_SLOTS = [
  { name: "Camera 0", position_x: 45, position_y: 7, position_z: 1, rotation_y: Math.PI/2, model_file: null },
  { name: "Camera 1", position_x: 44, position_y: 9.3, position_z: -1.5, rotation_y: -Math.PI / 2, model_file: "fr7.glb" },
  { name: "Camera 3", position_x: 8, position_y: 0, position_z: -11, rotation_y: -Math.PI, model_file: null },
  { name: "Camera 4", position_x: -8, position_y: 0, position_z: -11, rotation_y: -Math.PI, model_file: null },
  { name: "Camera 2", position_x: 26, position_y: 1, position_z: 0, rotation_y: Math.PI/2, model_file: null },
];

function SurveysPage() {
  // --- STATE MANAGEMENT ---
  const [data, setData] = useState<any>({ folders: [], surveys: [] });
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const navigate = useNavigate();

  const [isDark, setIsDark] = useState(() => localStorage.getItem("tennis-theme") !== "light");

  // Save theme on toggle
  useEffect(() => {
    localStorage.setItem("tennis-theme", isDark ? "dark" : "light");
  }, [isDark]);

  // --- DATABASE SYNC ---
  async function loadDatabase() {
    // 1. Fetch all relational tables
    const { data: tData } = await supabase.from('tournaments').select('*');
    const { data: yData } = await supabase.from('years').select('*');
    // We grab the counts of cameras and free objects purely for the UI display!
    const { data: cData } = await supabase.from('courts').select(`
      id, name, court_type, created_at, year_id,
      camera_slots(id, model_file),
      free_objects(id)
    `);

    // 2. Map Tournaments and Years into the generic "Folders" UI
    const mappedFolders: any[] = [];
    tData?.forEach(t => mappedFolders.push({ id: t.id, name: t.name, date: new Date(t.created_at).getTime(), parentId: null }));
    yData?.forEach(y => mappedFolders.push({ id: y.id, name: y.year.toString(), date: new Date(y.created_at).getTime(), parentId: y.tournament_id }));

    // 3. Map Courts into the generic "Surveys" UI
    const mappedSurveys: any[] = [];
    cData?.forEach(c => mappedSurveys.push({
      id: c.id,
      name: c.name,
      date: new Date(c.created_at).getTime(),
      courtType: c.court_type,
      folderId: c.year_id,
      slots: c.camera_slots || [],
      freeObjects: c.free_objects || []
    }));

    setData({ folders: mappedFolders, surveys: mappedSurveys });
  }

  // Load database on mount
  useEffect(() => {
    loadDatabase();
  }, []);

  // --- HIERARCHY LOGIC ---
  // These enforce the strict Tournament -> Year -> Court database structure
  const isRoot = currentFolderId === null;
  const isTournament = currentFolderId && data.folders.find((f: any) => f.id === currentFolderId)?.parentId === null;
  const isYear = currentFolderId && !isRoot && !isTournament;

  // --- EVENT HANDLERS ---
  
  async function handleCreateFolder() {
    if (isYear) return alert("You cannot create folders inside a Year. Please create a Court Survey instead.");
    
    const name = prompt(isRoot ? "Enter Tournament Name (e.g. Indian Wells):" : "Enter Year (e.g. 2024):");
    if (!name) return;

    // Writes directly to Supabase
    if (isRoot) {
      await supabase.from('tournaments').insert({ name });
    } else {
      await supabase.from('years').insert({ tournament_id: currentFolderId, year: parseInt(name) || new Date().getFullYear() });
    }
    loadDatabase();
  }

  async function handleCreateSurvey() {
    if (!isYear) return alert("Please select a Year first before creating a Court Survey.");
    
    const name = prompt("Enter Court Name (e.g. Center Court):");
    if (!name) return;

    // 1. Create the Court in Supabase and get its new ID
    const { data: court } = await supabase.from('courts')
      .insert({ year_id: currentFolderId, name, court_type: 'left' })
      .select().single();
    
    if (court) {
      // 2. Insert the default cameras, explicitly linking them to the new court ID
      const slotsToInsert = INITIAL_SLOTS.map(slot => ({
        court_id: court.id,
        name: slot.name,
        position_x: slot.position_x,
        position_y: slot.position_y,
        position_z: slot.position_z,
        rotation_y: slot.rotation_y,
        model_file: slot.model_file
      }));
      await supabase.from('camera_slots').insert(slotsToInsert);
      
      loadDatabase();
      localStorage.setItem("active-survey-id", court.id); // Used by your viewer to know what to load
      navigate({ to: "/edit" });
    }
  }

  async function handleDeleteFolder(id: string) {
    if (confirm("Delete this folder AND everything inside it?")) {
      const isT = data.folders.find((f: any) => f.id === id)?.parentId === null;
      // Because we used ON DELETE CASCADE in our SQL, deleting the parent deletes everything instantly!
      if (isT) {
        await supabase.from('tournaments').delete().eq('id', id);
      } else {
        await supabase.from('years').delete().eq('id', id);
      }
      loadDatabase();
    }
  }

  async function handleDeleteSurvey(id: string) {
    if (confirm("Are you sure you want to delete this court?")) {
      await supabase.from('courts').delete().eq('id', id);
      loadDatabase();
      if (localStorage.getItem("active-survey-id") === id) localStorage.removeItem("active-survey-id");
    }
  }

  function handleNavigate(id: string, path: "/" | "/edit") {
    localStorage.setItem("active-survey-id", id);
    navigate({ to: path });
  }

  function handleBack() {
    if (!currentFolderId) return;
    const current = data.folders.find((f: any) => f.id === currentFolderId);
    setCurrentFolderId(current?.parentId || null);
  }

  // --- COMPUTED UI VARIABLES ---
  const currentFolder = currentFolderId ? data.folders.find((f: any) => f.id === currentFolderId) : null;
  const visibleFolders = data.folders.filter((f: any) => f.parentId === currentFolderId);
  const visibleSurveys = data.surveys.filter((s: any) => s.folderId === currentFolderId);

  // --- COMPONENT RENDER ---
  return (
    <div className={`min-h-screen p-8 transition-colors ${isDark ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-900'}`}>
      <div className="max-w-4xl mx-auto">
        
        {/* HEADER */}
        <header className={`flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8 pb-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>
          <div className="flex items-center gap-3">
            {currentFolderId ? (
              <button onClick={handleBack} className={`transition flex items-center gap-2 mr-2 ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>
                <ArrowLeft size={20} /> Back
              </button>
            ) : (
              <FolderOpen className="text-emerald-500" size={28} />
            )}
            <h1 className="text-2xl font-bold">
              {currentFolder ? currentFolder.name : "All Tournaments"}
            </h1>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setIsDark(!isDark)} className={`p-2 rounded-full transition mr-2 ${isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-200 text-slate-600'}`}>
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Smart UI: Only show "New Folder" at Tournament or Year levels, only show "New Survey" inside a Year */}
            {(isRoot || isTournament) && (
              <button onClick={handleCreateFolder} className={`flex items-center gap-2 px-3 py-2 rounded-lg font-bold transition shadow-sm border text-sm ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'}`}>
                <FolderPlus size={16} /> New Folder
              </button>
            )}
            {isYear && (
              <button onClick={handleCreateSurvey} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg font-bold transition shadow-sm text-sm">
                <Plus size={16} /> New Survey
              </button>
            )}
          </div>
        </header>

        {/* FOLDERS GRID */}
        {visibleFolders.length > 0 && (
          <div className="mb-8">
            <h2 className={`text-xs font-bold uppercase tracking-wider mb-3 px-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {currentFolderId ? "Sub-Folders" : "Tournaments"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleFolders.map((folder: any) => (
                <div key={folder.id} className={`flex items-center justify-between border p-4 rounded-xl transition cursor-pointer group shadow-sm ${isDark ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'}`} onClick={() => setCurrentFolderId(folder.id)}>
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg text-emerald-500 group-hover:scale-110 transition-transform ${isDark ? 'bg-slate-800' : 'bg-emerald-50'}`}>
                      <Folder size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{folder.name}</h3>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }} className={`p-2 transition mr-2 opacity-0 group-hover:opacity-100 ${isDark ? 'text-slate-600 hover:text-red-400' : 'text-slate-400 hover:text-red-500'}`}>
                      <Trash2 size={16} />
                    </button>
                    <ChevronRight className={`transition ${isDark ? 'text-slate-600 group-hover:text-white' : 'text-slate-400 group-hover:text-slate-900'}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SURVEYS LIST */}
        <h2 className={`text-xs font-bold uppercase tracking-wider mb-3 px-1 mt-6 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          {currentFolderId ? `Courts in ${currentFolder?.name}` : "Uncategorized Courts"}
        </h2>
        
        {visibleSurveys.length === 0 ? (
          <div className={`text-center py-12 border border-dashed rounded-xl ${isDark ? 'bg-slate-900/30 border-slate-800' : 'bg-slate-100 border-slate-300'}`}>
            <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>No surveys found here.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {visibleSurveys.map((survey: any) => {
              const displayCount = survey.courtType === 'streaming' 
                ? survey.slots.filter((s: any) => s.id === 'cam-1' && s.model_file).length
                : survey.slots.filter((s: any) => s.model_file).length;
              const freeObjCount = survey.freeObjects?.length || 0;

              return (
                <div key={survey.id} className={`flex flex-col md:flex-row md:items-center justify-between border p-4 rounded-xl transition gap-4 shadow-sm ${isDark ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'}`}>
                  <div>
                    <h3 className="font-bold mb-1">{survey.name}</h3>
                    <div className={`flex flex-wrap items-center gap-3 text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                      <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(survey.date).toLocaleDateString()}</span>
                      <span>{survey.courtType === 'streaming' ? 'Court: Streaming' : survey.courtType === 'left' ? 'Umpire: Left' : 'Umpire: Right'}</span>
                      <span className="text-emerald-500 font-bold">{displayCount} Cameras</span>
                      {freeObjCount > 0 && <span className="text-blue-500 font-bold">{freeObjCount} Utilities</span>}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => handleNavigate(survey.id, "/")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-bold transition ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                      <Eye size={14} /> View
                    </button>
                    <button onClick={() => handleNavigate(survey.id, "/edit")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-bold transition ${isDark ? 'bg-blue-600/20 hover:bg-blue-600/40 text-blue-400' : 'bg-blue-50 hover:bg-blue-100 text-blue-600'}`}>
                      <Settings size={14} /> Edit
                    </button>
                    <button onClick={() => handleDeleteSurvey(survey.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-bold transition ml-2 md:ml-0 ${isDark ? 'bg-red-900/20 hover:bg-red-900/40 text-red-400' : 'bg-red-50 hover:bg-red-100 text-red-600'}`}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}