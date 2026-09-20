import React, { useState, useEffect, useMemo } from "react";
import { 
  Bookmark, 
  Sparkles, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  Search, 
  Filter, 
  Camera, 
  Sun, 
  Layers, 
  Palette, 
  Eye, 
  Sliders, 
  Upload, 
  Download, 
  RotateCcw,
  Zap,
  Tag,
  ChevronDown,
  X
} from "lucide-react";
import { PromptModifier } from "../types";
import { DEFAULT_PROMPT_MODIFIERS, DEFAULT_MODIFIER_CATEGORIES } from "../data/defaultModifiers";

interface PromptLibraryProps {
  onInjectIntoRefinement: (modifierContent: string, title: string) => void;
  onAppendToMasterPrompt?: (modifierContent: string) => void;
  currentMasterPrompt?: string;
  isCompact?: boolean;
}

const STORAGE_KEY = "ais_prompt_library_modifiers_v1";

export const PromptLibrary: React.FC<PromptLibraryProps> = ({
  onInjectIntoRefinement,
  onAppendToMasterPrompt,
  currentMasterPrompt,
  isCompact = false
}) => {
  const [modifiers, setModifiers] = useState<PromptModifier[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Error loading prompt library from localStorage:", e);
    }
    return DEFAULT_PROMPT_MODIFIERS;
  });

  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [injectedId, setInjectedId] = useState<string | null>(null);
  const [appendedId, setAppendedId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingModifier, setEditingModifier] = useState<PromptModifier | null>(null);
  const [showQuickAddNotice, setShowQuickAddNotice] = useState<string | null>(null);

  // Form State for creating/editing
  const [formTitle, setFormTitle] = useState<string>("");
  const [formCategory, setFormCategory] = useState<string>("Lighting Styles");
  const [formCustomCategory, setFormCustomCategory] = useState<string>("");
  const [formContent, setFormContent] = useState<string>("");
  const [formDescription, setFormDescription] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(modifiers));
    } catch (e) {
      console.error("Error saving prompt library to localStorage:", e);
    }
  }, [modifiers]);

  // Extract all unique categories
  const categories = useMemo(() => {
    const set = new Set<string>(DEFAULT_MODIFIER_CATEGORIES);
    modifiers.forEach((m) => {
      if (m.category?.trim()) {
        set.add(m.category.trim());
      }
    });
    return Array.from(set);
  }, [modifiers]);

  // Filtered modifiers
  const filteredModifiers = useMemo(() => {
    return modifiers.filter((m) => {
      const matchesCat = activeCategory === "All" || m.category.toLowerCase() === activeCategory.toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q || 
        m.title.toLowerCase().includes(q) || 
        m.category.toLowerCase().includes(q) || 
        m.content.toLowerCase().includes(q) ||
        (m.description && m.description.toLowerCase().includes(q));

      return matchesCat && matchesSearch;
    });
  }, [modifiers, activeCategory, searchQuery]);

  // Helper for category badge styling and icons
  const getCategoryTheme = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes("light") || cat.includes("ilumin")) {
      return {
        badgeBg: "bg-amber-950/30 text-amber-300 border-amber-800/40",
        icon: Sun,
        color: "#f59e0b"
      };
    }
    if (cat.includes("camera") || cat.includes("cámara") || cat.includes("optic")) {
      return {
        badgeBg: "bg-sky-950/30 text-sky-300 border-sky-800/40",
        icon: Camera,
        color: "#0ea5e9"
      };
    }
    if (cat.includes("skin") || cat.includes("face") || cat.includes("piel") || cat.includes("rostro")) {
      return {
        badgeBg: "bg-rose-950/30 text-rose-300 border-rose-800/40",
        icon: Eye,
        color: "#f43f5e"
      };
    }
    if (cat.includes("atmosphere") || cat.includes("mood") || cat.includes("atmós")) {
      return {
        badgeBg: "bg-purple-950/30 text-purple-300 border-purple-800/40",
        icon: Sparkles,
        color: "#a855f7"
      };
    }
    if (cat.includes("composition") || cat.includes("lens") || cat.includes("comp")) {
      return {
        badgeBg: "bg-emerald-950/30 text-emerald-300 border-emerald-800/40",
        icon: Sliders,
        color: "#10b981"
      };
    }
    if (cat.includes("art") || cat.includes("medium")) {
      return {
        badgeBg: "bg-orange-950/30 text-orange-300 border-orange-800/40",
        icon: Palette,
        color: "#f97316"
      };
    }
    return {
      badgeBg: "bg-neutral-900 text-neutral-300 border-neutral-700",
      icon: Tag,
      color: "#9ca3af"
    };
  };

  // Actions
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInject = (modifier: PromptModifier) => {
    onInjectIntoRefinement(modifier.content, modifier.title);
    setInjectedId(modifier.id);
    setShowQuickAddNotice(`"${modifier.title}" inyectado al refinador.`);
    setTimeout(() => {
      setInjectedId(null);
      setShowQuickAddNotice(null);
    }, 2500);
  };

  const handleAppend = (modifier: PromptModifier) => {
    if (onAppendToMasterPrompt) {
      onAppendToMasterPrompt(modifier.content);
      setAppendedId(modifier.id);
      setShowQuickAddNotice(`"${modifier.title}" anexado al prompt maestro.`);
      setTimeout(() => {
        setAppendedId(null);
        setShowQuickAddNotice(null);
      }, 2500);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("¿Eliminar este modificador de tu biblioteca?")) {
      setModifiers((prev) => prev.filter((m) => m.id !== id));
    }
  };

  const openCreateModal = () => {
    setEditingModifier(null);
    setFormTitle("");
    setFormCategory(categories[0] || "Lighting Styles");
    setFormCustomCategory("");
    setFormContent("");
    setFormDescription("");
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (mod: PromptModifier, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingModifier(mod);
    setFormTitle(mod.title);
    if (categories.includes(mod.category)) {
      setFormCategory(mod.category);
      setFormCustomCategory("");
    } else {
      setFormCategory("custom");
      setFormCustomCategory(mod.category);
    }
    setFormContent(mod.content);
    setFormDescription(mod.description || "");
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const handleSaveModifier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError("Ingresa un título para el modificador.");
      return;
    }
    if (!formContent.trim()) {
      setFormError("Ingresa las palabras clave o contenido del modificador.");
      return;
    }

    const finalCategory = 
      formCategory === "custom" 
        ? formCustomCategory.trim() || "General" 
        : formCategory;

    if (editingModifier) {
      // Update existing
      setModifiers((prev) =>
        prev.map((m) =>
          m.id === editingModifier.id
            ? {
                ...m,
                title: formTitle.trim(),
                category: finalCategory,
                content: formContent.trim(),
                description: formDescription.trim() || undefined
              }
            : m
        )
      );
    } else {
      // Create new
      const newMod: PromptModifier = {
        id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: formTitle.trim(),
        category: finalCategory,
        content: formContent.trim(),
        description: formDescription.trim() || undefined,
        isCustom: true,
        createdAt: Date.now()
      };
      setModifiers((prev) => [newMod, ...prev]);
    }

    setIsCreateModalOpen(false);
  };

  const handleResetToDefaults = () => {
    if (window.confirm("¿Restablecer la biblioteca a los modificadores originales por defecto? Se mantendrán tus modificadores personalizados.")) {
      const customOnes = modifiers.filter((m) => m.isCustom);
      setModifiers([...customOnes, ...DEFAULT_PROMPT_MODIFIERS]);
    }
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(modifiers, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `prompt_library_modifiers_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          // Merge avoiding ID duplication
          const currentIds = new Set(modifiers.map((m) => m.id));
          const newItems: PromptModifier[] = [];
          parsed.forEach((item) => {
            if (item && item.title && item.content) {
              const id = currentIds.has(item.id) 
                ? `imported-${Date.now()}-${Math.random().toString(36).substring(2, 6)}` 
                : (item.id || `imported-${Date.now()}`);
              newItems.push({
                ...item,
                id,
                isCustom: true
              });
            }
          });
          setModifiers((prev) => [...newItems, ...prev]);
          setShowQuickAddNotice(`¡Se importaron ${newItems.length} modificadores con éxito!`);
          setTimeout(() => setShowQuickAddNotice(null), 3000);
        }
      } catch (err) {
        alert("El archivo no contiene un formato JSON válido de modificadores.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="border border-[#1f1f1f] bg-[#070707] rounded-sm overflow-hidden shadow-2xl">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 border-b border-[#181818] bg-[#0a0a0a] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bookmark className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs uppercase tracking-[0.25em] font-mono text-white font-bold">
              Biblioteca de Modificadores (Prompt Library)
            </h3>
            <span className="px-2 py-0.5 bg-[#161616] border border-[#2a2a2a] text-[9px] font-mono text-neutral-400 rounded-full">
              {modifiers.length} disponibles
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 font-sans leading-relaxed">
            Inyecta estilos de iluminación, especificaciones de cámara Hasselblad/Leica, texturas de piel o atmósferas con un solo clic en el refinador.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 text-black hover:bg-white text-[10px] font-mono font-bold uppercase tracking-wider rounded-[1px] transition-all active:scale-95 shadow-md shadow-white/5"
            title="Crear un modificador de prompt personalizado"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Nuevo Modificador</span>
          </button>

          <label 
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#121212] hover:bg-[#1a1a1a] border border-[#262626] text-[9.5px] font-mono text-neutral-400 hover:text-white rounded-[1px] cursor-pointer transition-colors"
            title="Importar modificadores desde archivo JSON"
          >
            <Upload className="w-3 h-3 text-neutral-400" />
            <span className="hidden sm:inline">Importar</span>
            <input 
              type="file" 
              accept=".json" 
              className="hidden" 
              onChange={handleImportJson} 
            />
          </label>

          <button
            onClick={handleExportJson}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#121212] hover:bg-[#1a1a1a] border border-[#262626] text-[9.5px] font-mono text-neutral-400 hover:text-white rounded-[1px] transition-colors"
            title="Exportar tu colección de modificadores a JSON"
          >
            <Download className="w-3 h-3 text-neutral-400" />
            <span className="hidden sm:inline">Exportar</span>
          </button>

          <button
            onClick={handleResetToDefaults}
            className="p-1.5 bg-[#121212] hover:bg-[#1a1a1a] border border-[#262626] text-neutral-500 hover:text-neutral-300 rounded-[1px] transition-colors"
            title="Restaurar valores por defecto"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Floating quick alert message */}
      {showQuickAddNotice && (
        <div className="bg-emerald-950/40 border-b border-emerald-800/40 text-emerald-300 text-xs px-4 py-2 flex items-center justify-between animate-fadeIn font-mono">
          <div className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5" />
            <span>{showQuickAddNotice}</span>
          </div>
          <span className="text-[10px] text-emerald-400/70">Listo para rediseñar</span>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="p-3.5 sm:p-4 bg-[#080808] border-b border-[#161616] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por término (ej: 'Hasselblad', 'neón', 'poros', '35mm')..."
            className="w-full bg-[#0d0d0d] border border-[#222] text-xs text-[#eaeaea] pl-8 pr-7 py-2 rounded-[1px] focus:outline-none focus:border-neutral-500 font-sans placeholder:text-neutral-600"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Categories Scroller */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setActiveCategory("All")}
            className={`px-2.5 py-1 text-[9.5px] font-mono uppercase tracking-wider rounded-[1px] border transition-all whitespace-nowrap
              ${activeCategory === "All"
                ? "bg-white text-black border-white font-bold"
                : "bg-[#0f0f0f] text-neutral-400 border-[#222] hover:text-white hover:border-neutral-600"}`}
          >
            Todos ({modifiers.length})
          </button>

          {categories.map((cat) => {
            const count = modifiers.filter((m) => m.category.toLowerCase() === cat.toLowerCase()).length;
            const isSelected = activeCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 text-[9.5px] font-mono uppercase tracking-wider rounded-[1px] border transition-all whitespace-nowrap flex items-center gap-1.5
                  ${isSelected
                    ? "bg-neutral-200 text-black border-neutral-200 font-bold shadow-sm"
                    : "bg-[#0f0f0f] text-neutral-400 border-[#202020] hover:text-white hover:border-neutral-600"}`}
              >
                <span>{cat}</span>
                <span className={`text-[8.5px] px-1 rounded-sm ${isSelected ? "bg-black/20 text-black" : "bg-[#181818] text-neutral-500"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Modifiers Grid */}
      <div className={`p-4 sm:p-5 grid gap-3.5 ${isCompact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"} max-h-[560px] overflow-y-auto`}>
        {filteredModifiers.length === 0 ? (
          <div className="col-span-full p-8 text-center border border-dashed border-[#222] bg-[#090909] rounded-sm">
            <Bookmark className="w-6 h-6 text-neutral-600 mx-auto mb-2 opacity-50" />
            <p className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
              No se encontraron modificadores
            </p>
            <p className="text-[11px] text-neutral-600 mt-1">
              Prueba cambiando la categoría seleccionada o el término de búsqueda, o añade un modificador personalizado.
            </p>
            <button
              onClick={openCreateModal}
              className="mt-3 px-3 py-1.5 bg-[#141414] hover:bg-[#202020] border border-[#2b2b2b] text-[10px] font-mono text-neutral-300 uppercase tracking-widest rounded-[1px]"
            >
              + Crear nuevo modificador
            </button>
          </div>
        ) : (
          filteredModifiers.map((mod) => {
            const theme = getCategoryTheme(mod.category);
            const IconComponent = theme.icon;
            const isInjected = injectedId === mod.id;
            const isCopied = copiedId === mod.id;
            const isAppended = appendedId === mod.id;

            return (
              <div
                key={mod.id}
                className={`group/mod relative p-3.5 bg-[#090909] hover:bg-[#0c0c0c] border transition-all rounded-sm flex flex-col justify-between
                  ${isInjected 
                    ? "border-emerald-500/60 bg-emerald-950/10 shadow-lg shadow-emerald-500/5" 
                    : "border-[#1b1b1b] hover:border-[#333]"}`}
              >
                <div>
                  {/* Category Pill and Custom Tag */}
                  <div className="flex items-center justify-between mb-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[8.5px] font-mono uppercase tracking-wider border rounded-full ${theme.badgeBg}`}>
                      <IconComponent className="w-2.5 h-2.5" />
                      {mod.category}
                    </span>

                    <div className="flex items-center gap-1">
                      {mod.isCustom && (
                        <span className="text-[8px] font-mono px-1.5 py-0.2 bg-[#1c1c1c] text-neutral-400 border border-[#2b2b2b] rounded-sm uppercase tracking-widest">
                          Personalizado
                        </span>
                      )}

                      {/* Edit / Delete on hover for custom items */}
                      {mod.isCustom && (
                        <div className="flex items-center gap-0.5 ml-1 opacity-80 group-hover/mod:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => openEditModal(mod, e)}
                            className="p-1 text-neutral-500 hover:text-white transition-colors"
                            title="Editar modificador"
                          >
                            <Sliders className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(mod.id, e)}
                            className="p-1 text-neutral-500 hover:text-red-400 transition-colors"
                            title="Eliminar modificador"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h4 className="text-xs font-semibold text-neutral-100 mb-1 group-hover/mod:text-white transition-colors font-sans">
                    {mod.title}
                  </h4>

                  {mod.description && (
                    <p className="text-[10px] text-neutral-500 mb-2.5 line-clamp-2 leading-relaxed font-sans">
                      {mod.description}
                    </p>
                  )}

                  {/* Content snippet preview */}
                  <div className="p-2 bg-[#050505] border border-[#161616] rounded-sm mb-3">
                    <p className="text-[10px] font-mono text-neutral-300 leading-relaxed line-clamp-3 select-all">
                      "{mod.content}"
                    </p>
                  </div>
                </div>

                {/* Bottom Action Strip */}
                <div className="pt-2 border-t border-[#141414] flex items-center justify-between gap-1.5">
                  {/* Primary 1-Click Action: Inject into Refinement */}
                  <button
                    onClick={() => handleInject(mod)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[9.5px] font-mono uppercase tracking-wider font-bold rounded-[1px] transition-all border
                      ${isInjected
                        ? "bg-emerald-600 text-white border-emerald-500"
                        : "bg-[#111] hover:bg-white hover:text-black text-neutral-300 border-[#262626] active:scale-95"}`}
                    title="Inyectar al campo de instrucciones de rediseño de prompt"
                  >
                    {isInjected ? (
                      <>
                        <Check className="w-3 h-3 stroke-[2.5]" />
                        <span>¡Inyectado!</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3 h-3 text-amber-400 group-hover/mod:text-black" />
                        <span>Inyectar en Refinador</span>
                      </>
                    )}
                  </button>

                  {/* Quick Append to Master Prompt (if prompt exists) */}
                  {onAppendToMasterPrompt && currentMasterPrompt && (
                    <button
                      onClick={() => handleAppend(mod)}
                      className={`p-1.5 text-[9px] font-mono rounded-[1px] border transition-all flex items-center justify-center
                        ${isAppended 
                          ? "bg-sky-900/50 text-sky-300 border-sky-600" 
                          : "bg-[#0d0d0d] hover:bg-[#181818] text-neutral-400 hover:text-sky-300 border-[#222]"}`}
                      title="Anexar directamente al final del prompt maestro actual"
                    >
                      {isAppended ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                    </button>
                  )}

                  {/* Copy Button */}
                  <button
                    onClick={() => handleCopy(mod.id, mod.content)}
                    className={`p-1.5 text-[9px] font-mono rounded-[1px] border transition-all flex items-center justify-center
                      ${isCopied 
                        ? "bg-green-950/40 text-green-400 border-green-800" 
                        : "bg-[#0d0d0d] hover:bg-[#181818] text-neutral-400 hover:text-white border-[#222]"}`}
                    title="Copiar texto del modificador al portapapeles"
                  >
                    {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal / Form: Create / Edit Modifier */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0a0a0a] border border-[#2b2b2b] rounded-sm p-6 shadow-2xl animate-scaleUp">
            <div className="flex justify-between items-center pb-3 border-b border-[#1c1c1c] mb-4">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs uppercase font-mono tracking-widest text-white font-bold">
                  {editingModifier ? "Editar Modificador de Prompt" : "Nuevo Modificador de Prompt"}
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-neutral-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-2.5 bg-red-950/30 border border-red-800/40 text-red-300 text-xs rounded-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveModifier} className="space-y-4 text-xs font-sans">
              {/* Title */}
              <div>
                <label className="block uppercase font-mono text-[9px] tracking-wider text-neutral-400 mb-1.5 font-bold">
                  Título del Modificador *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ej: Hasselblad 100mm f/2.8 Macro Studio..."
                  className="w-full bg-[#111] border border-[#282828] text-white px-3 py-2 rounded-sm focus:outline-none focus:border-neutral-400 font-sans"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label className="block uppercase font-mono text-[9px] tracking-wider text-neutral-400 mb-1.5 font-bold">
                  Categoría
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="bg-[#111] border border-[#282828] text-neutral-200 px-3 py-2 rounded-sm focus:outline-none focus:border-neutral-400 font-mono text-[11px]"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="custom">+ Otra Categoría Nueva...</option>
                  </select>

                  {formCategory === "custom" && (
                    <input
                      type="text"
                      value={formCustomCategory}
                      onChange={(e) => setFormCustomCategory(e.target.value)}
                      placeholder="Nombre de la nueva categoría..."
                      className="bg-[#111] border border-[#282828] text-white px-3 py-2 rounded-sm focus:outline-none focus:border-neutral-400 font-sans"
                      required
                    />
                  )}
                </div>
              </div>

              {/* Content / Prompt Words */}
              <div>
                <label className="block uppercase font-mono text-[9px] tracking-wider text-neutral-400 mb-1.5 font-bold">
                  Texto del Modificador (Palabras Clave para Inyectar) *
                </label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  rows={3}
                  placeholder="Ej: shot on Hasselblad H6D-100c with 100mm lens, extreme detail on skin microtexture, fine peach fuzz, golden rim lighting..."
                  className="w-full bg-[#111] border border-[#282828] text-white px-3 py-2 rounded-sm focus:outline-none focus:border-neutral-400 font-mono text-[11px] leading-relaxed"
                  required
                />
                <p className="text-[10px] text-neutral-500 mt-1 font-mono">
                  * Este texto exacto se inyectará al refinador con un solo clic.
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block uppercase font-mono text-[9px] tracking-wider text-neutral-400 mb-1.5 font-bold">
                  Descripción Corta (Opcional)
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Ej: Enfoque comercial hiperdetallado para retratos y moda..."
                  className="w-full bg-[#111] border border-[#282828] text-neutral-300 px-3 py-2 rounded-sm focus:outline-none focus:border-neutral-400 font-sans"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#1a1a1a] flex justify-end gap-2 font-mono">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-[#121212] hover:bg-[#1a1a1a] border border-[#262626] text-neutral-400 rounded-sm uppercase tracking-wider text-[10px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-white hover:bg-neutral-200 text-black font-bold rounded-sm uppercase tracking-wider text-[10px] shadow-lg shadow-white/10"
                >
                  {editingModifier ? "Actualizar Modificador" : "Guardar en Mi Biblioteca"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
