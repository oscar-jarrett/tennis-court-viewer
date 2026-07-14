// --- IMPORTS ---
// We import routing functionality, React hooks for state, and UI icons.
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FolderOpen, FolderPlus, Folder, Plus, Trash2, Eye, Settings, Calendar, ChevronRight, ArrowLeft, Copy, ClipboardPaste, Sun, Moon } from "lucide-react";

export const Route = createFileRoute("/surveys")({
  component: SurveysPage,
});

// --- DATA INTERFACES ---
// These define the exact shape of our data. 

// CameraSlot: Represents a fixed camera position on the court (e.g., Cam 1, Cam 2)
export interface CameraSlot {
  id: string;
  name: string;
  position_x: number;
  position_y: number;
  position_z: number;
  rotation_y: number;
  model_file: string | null;
  description?: string;
  photos?: string[];
  cable_sdi?: string;
  cable_cat6?: string;
  cable_xlr?: string;
  cable_nodes?: [number, number, number][]; // Stores the physical 3D route path
}

// FreeObject: Represents freely placed utilities (like Fibre Boxes, Gigabobs, Mics)
export interface FreeObject {
  id: string;
  name: string;
  model_file: string;
  position_x: number;
  position_y: number;
  position_z: number;
  rotation_y: number;
  description?: string;
  photos?: string[];
  fibre_length?: string;
  fibre_ports?: string;
  fibre_serial?: string;
  cable_nodes?: [number, number, number][];
}

// FolderType: Used to organize surveys into Tournaments/Years
export interface FolderType {
  id: string;
  name: string;
  date: number;
  parentId: string | null; 
}

// Survey: A single court's complete configuration
export interface Survey {
  id: string;
  name: string;
  date: number;
  courtType: 'left' | 'right' | 'streaming';
  slots: CameraSlot[];
  freeObjects?: FreeObject[];
  folderId: string | null;
}

// StorageData: The master object saved to LocalStorage
export interface StorageData {
  folders: FolderType[];
  surveys: Survey[];
}

// --- CONSTANTS ---
// Default starting template for a new court survey
const INITIAL_SLOTS: CameraSlot[] = [
  { id: "cam-0", name: "Camera 0", position_x: 45, position_y: 7, position_z: 1, rotation_y: Math.PI/2, model_file: null },
  { id: "cam-1", name: "Camera 1", position_x: 44, position_y: 9.3, position_z: -1.5, rotation_y: -Math.PI / 2, model_file: "fr7.glb" },
  { id: "cam-3", name: "Camera 3", position_x: 8, position_y: 0, position_z: -11, rotation_y: -Math.PI, model_file: null },
  { id: "cam-4", name: "Camera 4", position_x: -8, position_y: 0, position_z: -11, rotation_y: -Math.PI, model_file: null },
  { id: "cam-2", name: "Camera 2", position_x: 26, position_y: 1, position_z: 0, rotation_y: Math.PI/2, model_file: null },
];

// The current database key. Bump this when data models change to avoid crashes.
export const STORAGE_KEY = "tennis-surveys-v20";

function SurveysPage() {
  // --- STATE MANAGEMENT ---
  const [data, setData] = useState<StorageData>({ folders: [], surveys: [] }); // Holds all local DB info
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null); // Tracks folder navigation
  const [hasCopiedSurvey, setHasCopiedSurvey] = useState(false);               // Toggles the "Paste" button UI
  const navigate = useNavigate();

  // Load Theme Preference
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("tennis-theme") !== "light";
  });

  // --- EFFECTS ---
  // Save theme on toggle
  useEffect(() => {
    localStorage.setItem("tennis-theme", isDark ? "dark" : "light");
  }, [isDark]);

  // Load entire database on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setData(JSON.parse(saved)); } 
      catch (e) { console.error("Failed to parse storage"); }
    }
    // Check if the user currently has a copied survey in their clipboard
    setHasCopiedSurvey(!!localStorage.getItem("clipboard-survey"));
  }, []);

  // --- EVENT HANDLERS ---
  
  // Creates a new folder directory
  function handleCreateFolder() {
    const isRoot = currentFolderId === null;
    const name = prompt(isRoot ? "Enter Tournament Name (e.g. Indian Wells):" : "Enter Year/Sub-folder Name (e.g. 2024):");
    if (!name) return;

    const newFolder: FolderType = { id: "folder-" + Date.now(), name, date: Date.now(), parentId: currentFolderId };
    const updatedData = { ...data, folders: [...data.folders, newFolder] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
    setData(updatedData);
  }

  // Creates a new Court Survey from the INITIAL_SLOTS template
  function handleCreateSurvey() {
    const name = prompt("Enter Court Name (e.g. Court 1):");
    if (!name) return;

    const newSurvey: Survey = { id: "survey-" + Date.now(), name, date: Date.now(), courtType: 'left', slots: INITIAL_SLOTS, freeObjects: [], folderId: currentFolderId };
    const updatedData = { ...data, surveys: [...data.surveys, newSurvey] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
    setData(updatedData);
    
    // Set this survey as active and launch the editor
    localStorage.setItem("active-survey-id", newSurvey.id);
    navigate({ to: "/edit" });
  }

  // Clipboard: Copy a survey
  function handleCopySurvey(survey: Survey) {
    localStorage.setItem("clipboard-survey", JSON.stringify(survey));
    setHasCopiedSurvey(true);
    alert(`Copied "${survey.name}" to clipboard. Navigate to any folder and click Paste!`);
  }

  // Clipboard: Paste a copied survey into the current folder
  function handlePasteSurvey() {
    const clipboardStr = localStorage.getItem("clipboard-survey");
    if (!clipboardStr) return;
    const copiedSurvey: Survey = JSON.parse(clipboardStr);
    const newSurvey: Survey = { ...copiedSurvey, id: "survey-" + Date.now(), name: copiedSurvey.name + " (Copy)", date: Date.now(), folderId: currentFolderId };
    const updatedData = { ...data, surveys: [...data.surveys, newSurvey] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
    setData(updatedData);
  }

  // Deep Delete: Removes a folder AND all surveys/sub-folders inside it
  function handleDeleteFolder(id: string) {
    if (confirm("Delete this folder AND all sub-folders and surveys inside it?")) {
      const subFolderIds = data.folders.filter((f: FolderType) => f.parentId === id).map((f: FolderType) => f.id);
      const allIdsToDelete = [id, ...subFolderIds];
      const updatedData = {
        folders: data.folders.filter((f: FolderType) => !allIdsToDelete.includes(f.id)),
        surveys: data.surveys.filter((s: Survey) => !allIdsToDelete.includes(s.folderId || ""))
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
      setData(updatedData);
    }
  }

  // Standard survey deletion
  function handleDeleteSurvey(id: string) {
    if (confirm("Are you sure you want to delete this survey?")) {
      const updatedData = { ...data, surveys: data.surveys.filter((s: Survey) => s.id !== id) };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
      setData(updatedData);
      if (localStorage.getItem("active-survey-id") === id) localStorage.removeItem("active-survey-id");
    }
  }

  // Navigates to Editor or Viewer mode
  function handleNavigate(id: string, path: "/" | "/edit") {
    localStorage.setItem("active-survey-id", id);
    navigate({ to: path });
  }

  // Navigates UP one directory level
  function handleBack() {
    if (!currentFolderId) return;
    const current = data.folders.find((f: FolderType) => f.id === currentFolderId);
    setCurrentFolderId(current?.parentId || null);
  }

  // --- COMPUTED UI VARIABLES ---
  const currentFolder = currentFolderId ? data.folders.find((f: FolderType) => f.id === currentFolderId) : null;
  const visibleFolders = data.folders.filter((f: FolderType) => f.parentId === currentFolderId);
  const visibleSurveys = data.surveys.filter((s: Survey) => s.folderId === currentFolderId);

  // --- COMPONENT RENDER ---
  return (
    <div className={`min-h-screen p-8 transition-colors ${isDark ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-900'}`}>
      <div className="max-w-4xl mx-auto">
        
        {/* HEADER: Title, Breadcrumbs, Action Buttons (New Folder, New Survey, Theme) */}
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

            {hasCopiedSurvey && (
              <button onClick={handlePasteSurvey} className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-500 border border-blue-600/50 px-3 py-2 rounded-lg font-bold transition shadow-sm text-sm">
                <ClipboardPaste size={16} /> Paste Survey
              </button>
            )}
            <button onClick={handleCreateFolder} className={`flex items-center gap-2 px-3 py-2 rounded-lg font-bold transition shadow-sm border text-sm ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'}`}>
              <FolderPlus size={16} /> New Folder
            </button>
            <button onClick={handleCreateSurvey} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg font-bold transition shadow-sm text-sm">
              <Plus size={16} /> New Survey
            </button>
          </div>
        </header>

        {/* FOLDERS GRID: Renders sub-directories */}
        {visibleFolders.length > 0 && (
          <div className="mb-8">
            <h2 className={`text-xs font-bold uppercase tracking-wider mb-3 px-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {currentFolderId ? "Sub-Folders" : "Tournaments"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleFolders.map((folder: FolderType) => (
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

        {/* SURVEYS LIST: Renders individual courts/files */}
        <h2 className={`text-xs font-bold uppercase tracking-wider mb-3 px-1 mt-6 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          {currentFolderId ? `Courts in ${currentFolder?.name}` : "Uncategorized Courts"}
        </h2>
        
        {visibleSurveys.length === 0 ? (
          <div className={`text-center py-12 border border-dashed rounded-xl ${isDark ? 'bg-slate-900/30 border-slate-800' : 'bg-slate-100 border-slate-300'}`}>
            <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>No surveys found here.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {visibleSurveys.map((survey: Survey) => {
              // Calculate metadata for the quick summary display
              const displayCount = survey.courtType === 'streaming' 
                ? survey.slots.filter((s: CameraSlot) => s.id === 'cam-1' && s.model_file).length
                : survey.slots.filter((s: CameraSlot) => s.model_file).length;
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
                    <button onClick={() => handleCopySurvey(survey)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-bold transition ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`} title="Copy to Clipboard">
                      <Copy size={14} /> Copy
                    </button>
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