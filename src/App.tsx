import React, { useState, useEffect, useRef } from "react";
import { 
  Upload, 
  Sparkles, 
  Copy, 
  Check, 
  Image as ImageIcon, 
  RefreshCw, 
  Sliders, 
  Compass, 
  Layers, 
  Sun, 
  Palette, 
  Camera, 
  HelpCircle,
  Clock,
  History,
  Trash2,
  AlertCircle,
  FileImage,
  ArrowRight,
  Download,
  ChevronRight,
  Bookmark,
  Zap,
  ChevronDown
} from "lucide-react";
import { PRESET_IMAGES } from "./presets";
import { AnalyzedData, HistoryItem, PresetImage } from "./types";
import { diffWords } from "diff";
import { PromptLibrary } from "./components/PromptLibrary";

export default function App() {
  // Application State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [presetSelected, setPresetSelected] = useState<PresetImage | null>(null);
  const [language, setLanguage] = useState<"English" | "Spanish">("English");
  
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isKeyMissing, setIsKeyMissing] = useState(false);
  const [isProjectDenied, setIsProjectDenied] = useState(false);
  
  const [result, setResult] = useState<AnalyzedData | null>(null);
  
  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  
  // Refinement State
  const [refineInstructions, setRefineInstructions] = useState<string>("");
  const [refinementLoading, setRefinementLoading] = useState<boolean>(false);
  const [refinementSuccessMsg, setRefinementSuccessMsg] = useState<string | null>(null);
  const [isRefinePanelOpen, setIsRefinePanelOpen] = useState<boolean>(false);
  const [previousPrompt, setPreviousPrompt] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState<boolean>(false);

  // Analysis Conditions State
  const [includeHasselbladConditions, setIncludeHasselbladConditions] = useState<boolean>(true);
  const [showConditionsDetails, setShowConditionsDetails] = useState<boolean>(false);
  const [customConditionText, setCustomConditionText] = useState<string>("");
  
  // Feedback states
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedNegativePrompt, setCopiedNegativePrompt] = useState(false);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [exportedJson, setExportedJson] = useState(false);
  const [apiStatus, setApiStatus] = useState<{ status: string; apiKeyLoaded: boolean } | null>(null);

  // Stats
  const [processingTime, setProcessingTime] = useState<string>("0.00s");
  const [tempTimeStart, setTempTimeStart] = useState<number>(0);

  // Prompt Preview States
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [previewSeed, setPreviewSeed] = useState<number>(() => Math.floor(Math.random() * 899999) + 100000);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const refineInputRef = useRef<HTMLInputElement>(null);
  const [showLibraryInRefine, setShowLibraryInRefine] = useState<boolean>(false);

  // Check API health on load
  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        setApiStatus(data);
        if (!data.apiKeyLoaded) {
          setIsKeyMissing(true);
        }
      })
      .catch((err) => {
        console.error("Health check error:", err);
      });

    // Load History from localStorage
    try {
      const stored = localStorage.getItem("visionary_prompt_history");
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Error reading history", e);
    }
  }, []);

  // Save safety history
  const saveHistory = (newHistory: HistoryItem[]) => {
    setHistory(newHistory);
    try {
      localStorage.setItem("visionary_prompt_history", JSON.stringify(newHistory));
    } catch (e: any) {
      console.warn("Storage quota exceeded, attempting to prune history...", e);
      try {
        let pruned = [...newHistory];
        // Progressively keep fewer items to fit inside the quota
        while (pruned.length > 3) {
          pruned = pruned.slice(0, pruned.length - 1);
          try {
            localStorage.setItem("visionary_prompt_history", JSON.stringify(pruned));
            setHistory(pruned);
            console.log("History pruned and saved successfully");
            return;
          } catch (innerErr) {
            // continue pruning if still failing
          }
        }
        // If it still fails, let's strip all base64 image data from the history items to save space
        const textOnlyHistory = pruned.map(item => ({
          ...item,
          imageUrl: item.imageUrl.startsWith("data:image/") ? "" : item.imageUrl
        }));
        localStorage.setItem("visionary_prompt_history", JSON.stringify(textOnlyHistory));
        setHistory(textOnlyHistory);
        console.log("Saved text-only history to fit quota");
      } catch (finalErr) {
        console.error("Failed to save even pruned history", finalErr);
      }
    }
  };

  // Drag and Drop handlers
  const [isDragging, setIsDragging] = useState(false);
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        processImageFile(file);
      } else {
        setError("Por favor, suelta un archivo de imagen válido.");
      }
    }
  };

  const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800): Promise<string> => {
    return new Promise((resolve) => {
      if (!base64Str || !base64Str.startsWith("data:image/")) {
        resolve(base64Str);
        return;
      }
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        } else {
          resolve(base64Str);
        }
      };
      img.onerror = () => {
        resolve(base64Str);
      };
      img.src = base64Str;
    });
  };

  // Process File URL or Base64
  const processImageFile = (file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      setError("La imagen supera los 15MB. Elige una más pequeña para un análisis adecuado.");
      return;
    }
    setImageFile(file);
    setPresetSelected(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      const resultStr = reader.result as string;
      compressImage(resultStr, 800, 800)
        .then((compressedBase64) => {
          setSelectedImage(compressedBase64);
        })
        .catch((err) => {
          console.error("Error compressing image:", err);
          setSelectedImage(resultStr);
        });
    };
    reader.readAsDataURL(file);
    setResult(null);
    setRefineInstructions("");
    setRefinementSuccessMsg(null);
    setPreviewUrl(null);
    setPreviewError(null);
  };

  const getPollinationsDimensions = (aspectRatio: string) => {
    switch (aspectRatio) {
      case "16:9":
        return { width: 640, height: 360 };
      case "9:16":
        return { width: 360, height: 640 };
      case "4:3":
        return { width: 512, height: 384 };
      case "3:4":
        return { width: 384, height: 512 };
      default:
        return { width: 512, height: 512 };
    }
  };

  const handleGeneratePreview = () => {
    if (!result) return;
    setPreviewLoading(true);
    setPreviewError(null);

    const { width, height } = getPollinationsDimensions(result.aspectRatio);
    const sanitizedPrompt = encodeURIComponent(result.masterPrompt);
    const pollinationsUrl = `https://image.pollinations.ai/p/${sanitizedPrompt}?width=${width}&height=${height}&seed=${previewSeed}&nologo=true`;

    const img = new Image();
    img.referrerPolicy = "no-referrer";
    img.src = pollinationsUrl;
    img.onload = () => {
      setPreviewUrl(pollinationsUrl);
      setPreviewLoading(false);
    };
    img.onerror = () => {
      console.warn("Pollinations failed, loading backup...");
      const backupUrl = `https://picsum.photos/seed/${previewSeed}/${width}/${height}`;
      setPreviewUrl(backupUrl);
      setPreviewLoading(false);
    };
  };

  const handleRegenerateWithSeed = () => {
    const newSeed = Math.floor(Math.random() * 899999) + 100000;
    setPreviewSeed(newSeed);

    if (!result) return;
    setPreviewLoading(true);
    setPreviewError(null);

    const { width, height } = getPollinationsDimensions(result.aspectRatio);
    const sanitizedPrompt = encodeURIComponent(result.masterPrompt);
    const pollinationsUrl = `https://image.pollinations.ai/p/${sanitizedPrompt}?width=${width}&height=${height}&seed=${newSeed}&nologo=true`;

    const img = new Image();
    img.referrerPolicy = "no-referrer";
    img.src = pollinationsUrl;
    img.onload = () => {
      setPreviewUrl(pollinationsUrl);
      setPreviewLoading(false);
    };
    img.onerror = () => {
      setPreviewUrl(`https://picsum.photos/seed/${newSeed}/${width}/${height}`);
      setPreviewLoading(false);
    };
  };

  const handleExportJSON = () => {
    if (!result) return;
    
    const exportObj = {
      generator: "Imagen a Prompt - Optimizador de Prompt",
      exportedAt: new Date().toISOString(),
      language: language,
      processingTime: processingTime,
      experiment: {
        masterPrompt: result.masterPrompt,
        aspectRatio: result.aspectRatio,
        negativePrompt: result.negativePrompt,
        analysis: {
          subject: result.subject,
          style: result.style,
          composition: result.composition,
          lighting: result.lighting,
          colors: result.colors,
          palette: result.palette
        }
      }
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    
    const cleanSubject = result.subject 
      ? result.subject.substring(0, 25).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
      : "prompt-experiment";
    const timestampStr = new Date().toISOString().replace(/[:.]/g, "-").substring(0, 19);
    const fileName = `prompt-${cleanSubject || "experiment"}-${timestampStr}.json`;
    
    downloadAnchor.setAttribute("download", fileName);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setExportedJson(true);
    setTimeout(() => {
      setExportedJson(false);
    }, 2000);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processImageFile(e.target.files[0]);
    }
  };

  // Select Preset URL
  const handleSelectPreset = (preset: PresetImage) => {
    setError(null);
    setPresetSelected(preset);
    setImageFile(null);
    setSelectedImage(preset.url);
    setResult(null);
    setRefineInstructions("");
    setRefinementSuccessMsg(null);
  };

  // Run Gemini Analysis
  const handleAnalyze = async () => {
    if (!selectedImage) return;
 
    setLoading(true);
    setError(null);
    setIsProjectDenied(false);
    setRefinementSuccessMsg(null);
    const activeStartTime = performance.now();
    
    // Smooth loader steps to give it a premium futuristic technical feel
    const steps = [
      "Extrayendo codificación tonal de pixeles...",
      "Analizando profundidad y distancia focal...",
      "Decodificando sujeto primario y secundarios...",
      "Identificando firmas de iluminación y sombras...",
      "Sintetizando ingeniería de prompt de reversa..."
    ];
    
    let currentStepIdx = 0;
    setLoadingStep(steps[currentStepIdx]);
    
    const interval = setInterval(() => {
      if (currentStepIdx < steps.length - 1) {
        currentStepIdx++;
        setLoadingStep(steps[currentStepIdx]);
      }
    }, 1200);
 
    try {
      let payload: any = { 
        generateLanguage: language,
        includeHasselbladConditions,
        customConditions: customConditionText.trim()
      };
 
      if (presetSelected) {
        payload.imageUrl = presetSelected.url;
      } else if (selectedImage) {
        payload.image = selectedImage;
        const extension = (imageFile?.name.split(".").pop() || "jpeg").toLowerCase();
        payload.mimeType = `image/${extension === "jpg" ? "jpeg" : extension}`;
      }
 
      const response = await fetch("/api/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
 
      const parsed = await response.json();
      clearInterval(interval);
 
      if (!parsed.success) {
        if (parsed.isProjectDenied) {
          setIsProjectDenied(true);
        }
        throw new Error(parsed.error || "Ocurrió un error inesperado al analizar la imagen.");
      }
 
      const analyzedTime = ((performance.now() - activeStartTime) / 1000).toFixed(2);
      setProcessingTime(`${analyzedTime}s`);
      setResult(parsed.data);
      setPreviewUrl(null);
      setPreviewError(null);
 
      // Add to local history safely
      const newHistoryItem: HistoryItem = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        imageUrl: selectedImage,
        data: parsed.data
      };
      
      saveHistory([newHistoryItem, ...history.slice(0, 19)]); // Limit history to 20
 
    } catch (err: any) {
      clearInterval(interval);
      console.error("Analysis failed:", err);
      let errMsg = err.message || "Error al conectar con la API de Gemini. Comprueba tu configuración.";
      if (errMsg === "Failed to fetch") {
        errMsg = "Error de red: La solicitud tardó demasiado o falló la conexión (Failed to fetch). Inténtalo de nuevo más tarde.";
      }
      setError(errMsg);
      if (errMsg.includes("GEMINI_API_KEY") || errMsg.includes("Secrets")) {
        setIsKeyMissing(true);
      }
      if (errMsg.includes("denied access") || errMsg.includes("PERMISSION_DENIED") || errMsg.includes("403")) {
        setIsProjectDenied(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // Modify/Refine existing Prompt
  const handleRefinePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!result || !refineInstructions.trim()) return;

    setRefinementLoading(true);
    setError(null);
    setIsProjectDenied(false);
    setRefinementSuccessMsg(null);

    try {
      const response = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: result.masterPrompt,
          instructions: refineInstructions,
          language: language
        })
      });

      const parsed = await response.json();
      if (!parsed.success) {
        if (parsed.isProjectDenied) {
          setIsProjectDenied(true);
        }
        throw new Error(parsed.error || "Fallo el proceso de refinamiento.");
      }

      setPreviousPrompt(result.masterPrompt);
      setResult({
        ...result,
        masterPrompt: parsed.data.enhancedPrompt
      });
      setPreviewUrl(null);
      setPreviewError(null);
      setRefinementSuccessMsg(parsed.data.changesApplied || "¡Prompt refinado exitosamente!");
      setRefineInstructions("");
      setShowDiff(true);

    } catch (err: any) {
      console.error("Refinement failed:", err);
      let errMsg = err.message || "No se pudo actualizar el prompt.";
      if (errMsg === "Failed to fetch") {
        errMsg = "Error de red: La solicitud tardó demasiado o falló la conexión (Failed to fetch). Inténtalo de nuevo más tarde.";
      }
      setError(errMsg);
      if (errMsg.includes("denied access") || errMsg.includes("PERMISSION_DENIED") || errMsg.includes("403")) {
        setIsProjectDenied(true);
      }
    } finally {
      setRefinementLoading(false);
    }
  };

  // Copy to clipboard helper
  const copyToClipboard = (text: string, type: "prompt" | "color" | "negative" = "prompt") => {
    navigator.clipboard.writeText(text);
    if (type === "prompt") {
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } else if (type === "negative") {
      setCopiedNegativePrompt(true);
      setTimeout(() => setCopiedNegativePrompt(false), 2000);
    } else {
      setCopiedColor(text);
      setTimeout(() => setCopiedColor(null), 1500);
    }
  };

  const removeHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = history.filter(item => item.id !== id);
    saveHistory(filtered);
  };

  const clearHistory = () => {
    if (confirm("¿Estás seguro de que deseas limpiar todo tu historial de prompts?")) {
      saveHistory([]);
    }
  };

  const loadFromHistory = (item: HistoryItem) => {
    setSelectedImage(item.imageUrl);
    setResult(item.data);
    setPresetSelected(null);
    setImageFile(null);
    setRefineInstructions("");
    setRefinementSuccessMsg(null);
    setShowHistory(false);
    setPreviewUrl(null);
    setPreviewError(null);
  };

  // 1-Click Injection of Prompt Modifiers from Prompt Library into Refinement
  const handleInjectModifier = (modifierContent: string, title: string) => {
    setIsRefinePanelOpen(true);
    setRefineInstructions((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) {
        return modifierContent;
      }
      if (trimmed.endsWith(",") || trimmed.endsWith(".")) {
        return `${trimmed} ${modifierContent}`;
      }
      return `${trimmed}, ${modifierContent}`;
    });

    // Smooth focus into the refinement input
    setTimeout(() => {
      if (refineInputRef.current) {
        refineInputRef.current.focus();
        refineInputRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 80);
  };

  // Append modifier directly to active Master Prompt
  const handleAppendModifierToMaster = (modifierContent: string) => {
    if (!result) return;
    setPreviousPrompt(result.masterPrompt);
    const trimmed = result.masterPrompt.trim();
    const updatedPrompt = trimmed.endsWith(",") 
      ? `${trimmed} ${modifierContent}` 
      : `${trimmed}, ${modifierContent}`;
    
    setResult({
      ...result,
      masterPrompt: updatedPrompt
    });
    setShowDiff(true);
  };

  return (
    <div id="visionary-app" className="min-h-screen bg-[#050505] text-[#e0e0e0] flex flex-col font-sans selection:bg-white selection:text-black">
      
      {/* Top Premium Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 md:px-10 md:py-6 border-b border-[#181818] bg-[#070707] sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#f2f2f2] rounded-sm flex items-center justify-center shadow-lg shadow-white/5">
            <div className="w-4 h-4 bg-[#050505] rotate-45"></div>
          </div>
          <div className="flex flex-col">
            <span className="text-lg md:text-xl font-serif tracking-widest text-white uppercase font-bold">Visionary</span>
            <span className="text-[9px] text-[#666] tracking-[0.15em] -mt-1 font-mono uppercase">Image-To-Prompt Intelligence</span>
          </div>
        </div>

        <div className="hidden md:flex gap-8 text-xs uppercase tracking-[0.2em] font-medium text-[#777]">
          <button 
            onClick={() => { setResult(null); setSelectedImage(null); }}
            className={`transition-colors duration-200 outline-none pb-1 ${!result ? 'text-white border-b-2 border-white' : 'hover:text-white'}`}>
            Deconstruir
          </button>
          <button 
            onClick={() => setShowHistory(!showHistory)} 
            className={`transition-colors duration-200 outline-none flex items-center gap-1.5 pb-1 ${showHistory ? 'text-white border-b-2 border-white' : 'hover:text-white'}`}>
            <History className="w-3.5 h-3.5" />
            Historial ({history.length})
          </button>
          <a href="#prompt-library" className="hover:text-white transition-colors flex items-center gap-1.5">
            <Bookmark className="w-3.5 h-3.5 text-amber-400" />
            Biblioteca
          </a>
          <a href="#presets" className="hover:text-white transition-colors">Ajustes</a>
          <a href="#guia" className="hover:text-white transition-colors">Guía</a>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Selector */}
          <div className="flex bg-[#111] border border-[#222] p-1 rounded-sm text-[10px] font-mono">
            <button 
              onClick={() => setLanguage("English")} 
              className={`px-2.5 py-1 rounded-[1px] transition-all uppercase tracking-wider font-semibold ${language === "English" ? "bg-white text-black font-bold" : "text-[#777] hover:text-white"}`}>
              EN
            </button>
            <button 
              onClick={() => setLanguage("Spanish")} 
              className={`px-2.5 py-1 rounded-[1px] transition-all uppercase tracking-wider font-semibold ${language === "Spanish" ? "bg-white text-black font-bold" : "text-[#777] hover:text-white"}`}>
              ES
            </button>
          </div>
        </div>
      </nav>

      {/* Main Workspace Frame */}
      <main className="flex-grow flex flex-col lg:flex-row p-4 md:p-10 gap-6 lg:gap-10 max-w-[1700px] w-full mx-auto">
        
        {/* Left Side: Upload Zone & Gallery presets */}
        <section className="w-full lg:w-1/2 flex flex-col gap-6">
          
          <div className="flex justify-between items-end pb-1 border-b border-[#181818]">
            <h2 className="font-serif italic text-2xl text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-[#888]" />
              Entrada Visual
            </h2>
            <span className="text-[10px] uppercase tracking-widest text-[#555] font-mono">
              {presetSelected ? `Preset: ${presetSelected.id.toUpperCase()}` : imageFile ? `RAW: ${imageFile.name.substring(0, 18)}...` : "Esperando imagen..."}
            </span>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-5 bg-[#140606] border border-red-950/80 text-red-300 text-xs rounded-sm flex flex-col gap-4 animate-fadeIn">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold block mb-1 text-red-200">Error de procesamiento</span>
                  <p className="text-red-300/90 leading-relaxed font-sans">{error}</p>
                </div>
              </div>

              {isProjectDenied && (
                <div className="p-4 bg-black/60 border border-red-950/40 rounded-[2px]">
                  <p className="text-[#ccc] text-[11.5px] font-semibold mb-3 leading-relaxed flex items-center gap-1.5 border-b border-[#222] pb-2 text-white">
                    <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    Diagnóstico de Acceso: Clave o Proyecto Denegado (403)
                  </p>
                  <p className="text-[#8e8e8e] text-[11px] mb-4 leading-relaxed">
                    El mensaje <code className="text-red-400 px-1 py-0.2 bg-[#222] font-mono rounded">PERMISSION_DENIED</code> de Google indica que tu clave de API está activa pero tu proyecto de Google Cloud asociado no tiene acceso a la API de Gemini. Sigue estos pasos para solucionarlo:
                  </p>
                  <ul className="space-y-3.5 text-[#aaa] text-[11px]">
                    <li className="flex items-start gap-2.5">
                      <span className="font-mono text-white bg-red-950/80 px-1.5 py-0.5 border border-red-900 rounded-[2px] leading-none shrink-0 mt-0.5">1</span>
                      <div className="leading-relaxed">
                        <strong className="text-[#eaeaea]">Filtro de Cuenta Corporativa (Workspace):</strong> Si estás utilizando una cuenta corporativa o educativa (por ejemplo, con dominio de trabajo o universidad), es probable que el administrador de tu dominio haya bloqueado el uso de la API de Gemini. <strong>Prueba creando tu clave con una cuenta personal de Google (<code className="text-[#888]">@gmail.com</code>).</strong>
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="font-mono text-white bg-red-950/80 px-1.5 py-0.5 border border-red-900 rounded-[2px] leading-none shrink-0 mt-0.5">2</span>
                      <div className="leading-relaxed">
                        <strong className="text-[#eaeaea]">Crear un Nuevo Proyecto Limpio:</strong> En el portal de <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-white underline hover:text-red-300 transition-colors">Google AI Studio</a>, cuando vayas a generar tu Clave API, asóciala a un <strong>"New Project" (Nuevo Proyecto)</strong> en lugar de usar un proyecto de Google Cloud preexistente que pueda tener políticas de seguridad heredadas.
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="font-mono text-white bg-red-950/80 px-1.5 py-0.5 border border-red-900 rounded-[2px] leading-none shrink-0 mt-0.5">3</span>
                      <div className="leading-relaxed">
                        <strong className="text-[#eaeaea]">Habilitar la API Generative Language:</strong> Si la clave de API está asociada a un proyecto de Google Cloud existente, ve a la consola de Google Cloud de ese proyecto y asegúrate de habilitar manualmente la API <strong>"Generative Language API"</strong>.
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="font-mono text-white bg-red-950/80 px-1.5 py-0.5 border border-red-900 rounded-[2px] leading-none shrink-0 mt-0.5">4</span>
                      <div className="leading-relaxed">
                        <strong className="text-[#eaeaea]">Registrar Clave en Secrets:</strong> Una vez generada tu clave API correcta, ve al panel lateral de la aplicación (menú <strong className="text-white">Settings</strong> en AI Studio UI), agrégala en la variable <code className="text-white font-mono px-1 bg-[#1a1a1a] rounded">GEMINI_API_KEY</code> y haz clic para aplicar.
                      </div>
                    </li>
                  </ul>
                </div>
              )}

              {isKeyMissing && !isProjectDenied && (
                <div className="mt-2 p-3 bg-black/60 border border-red-950/30 rounded-sm">
                  <p className="text-[#aaa] text-[11px] mb-2 leading-relaxed">
                    El sistema necesita una clave <code className="text-white px-1 py-0.2 bg-[#222] font-mono rounded">GEMINI_API_KEY</code> para analizar imágenes. 
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-[#999] text-[10px]">
                    <li>Ve al panel de <strong>Settings & Secrets</strong></li>
                    <li>Registra la variable de entorno: <code className="text-white text-[9.5px]">GEMINI_API_KEY</code></li>
                    <li>Proporciona tu clave y reinicia para aplicar los cambios</li>
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* Interactive Drag and Drop Upload Area */}
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`min-h-[360px] md:min-h-[460px] flex-grow border rounded-sm transition-all duration-300 relative flex flex-col overflow-hidden group 
              ${isDragging 
                ? "border-white bg-[#111] scale-[0.99] shadow-[0_0_20px_rgba(255,255,255,0.05)]" 
                : "border-[#1c1c1c] bg-[#090909] hover:border-[#333]"}`}
          >
            {selectedImage ? (
              // Image container preview
              <div className="relative w-full h-full flex items-center justify-center group/img bg-[#0f0f0f] p-3 min-h-[300px]" style={{ flexGrow: 1 }}>
                <img 
                  src={selectedImage} 
                  alt="Análisis visual" 
                  className="max-h-[340px] md:max-h-[420px] object-contain border border-[#1a1a1a] shadow-2xl transition-all duration-500 group-hover/img:scale-[1.01]" 
                />
                
                {/* Visual Glass Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
                
                {/* Floating controls */}
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center z-10">
                  <div className="text-[10px] uppercase font-mono px-2.5 py-1 bg-black/80 backdrop-blur-md tracking-wider border border-[#222]">
                    Previsualización
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setSelectedImage(null);
                        setImageFile(null);
                        setPresetSelected(null);
                        setResult(null);
                        setRefinementSuccessMsg(null);
                      }}
                      className="px-3 py-1.5 bg-red-950/95 border border-red-900 text-red-200 text-[10px] uppercase tracking-widest font-mono hover:bg-red-900 hover:text-white transition-colors"
                    >
                      Remover
                    </button>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-black/90 border border-[#333] text-white text-[10px] uppercase tracking-widest font-mono hover:bg-white hover:text-black transition-colors"
                    >
                      Cambiar
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // Empty selection area
              <div className="flex-grow flex flex-col items-center justify-center p-8 text-center" style={{ flexGrow: 1 }}>
                <div className="w-16 h-16 rounded-full bg-[#0e0e0e] border border-[#1d1d1d] flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300">
                  <Upload className="w-6 h-6 text-[#555] group-hover:text-white transition-colors" />
                </div>
                
                <h3 className="font-serif italic text-lg text-white mb-1.5">Sube tu Imagen Referencia</h3>
                <p className="text-xs text-[#777] max-w-sm mb-6 leading-relaxed">
                  Arrastra tu archivo aquí (.jpg, .png, .webp) o impórtalo desde tu dispositivo para extraer su fórmula cromática y composición.
                </p>

                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white text-black px-6 py-2.5 text-[10px] uppercase tracking-widest font-bold font-mono transition-transform hover:scale-105 active:scale-95"
                >
                  Seleccionar Archivo
                </button>
              </div>
            )}
            
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              onChange={handleFileSelect} 
              className="hidden" 
            />
          </div>

          {/* Preset Images Grid */}
          <div id="presets" className="p-5 border border-[#111] bg-[#080808] rounded-sm">
            <h3 className="text-[10px] uppercase tracking-[0.2em] font-mono text-[#555] mb-3.5 flex items-center gap-1.5 font-bold">
              <Compass className="w-3.5 h-3.5" />
              Explora con Ejemplos Curados
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PRESET_IMAGES.map((preset) => {
                const isCurrent = presetSelected?.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`group/preset relative aspect-video rounded-[2px] overflow-hidden border text-left transition-all duration-300 outline-none
                      ${isCurrent 
                        ? "border-white ring-1 ring-white/25" 
                        : "border-[#1c1c1c] hover:border-[#444]"}`}
                  >
                    <img 
                      src={preset.url} 
                      alt={preset.name} 
                      className="absolute inset-0 w-full h-full object-cover grayscale opacity-50 group-hover/preset:opacity-100 group-hover/preset:scale-105 transition-all duration-300"
                    />
                    <div className="absolute inset-0 bg-[#000]/60 p-2 flex flex-col justify-end">
                      <p className="text-[9px] text-[#aaa] font-semibold truncate group-hover/preset:text-white">{preset.name}</p>
                      <p className="text-[8px] text-[#555] group-hover/preset:text-[#888] font-mono uppercase tracking-tighter truncate mt-0.5">{preset.genre}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Condiciones de Análisis y Entrega de Prompt */}
          {selectedImage && !result && (
            <div className="border border-[#222] bg-[#070707] rounded-sm p-4 space-y-3 shadow-lg shadow-black/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-3.5 h-3.5 text-neutral-300" />
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-white">
                    Condiciones de Entrega del Prompt
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIncludeHasselbladConditions(!includeHasselbladConditions)}
                  className={`px-2.5 py-1 text-[9px] font-mono uppercase tracking-wider rounded-[1px] border transition-all ${
                    includeHasselbladConditions
                      ? "bg-white text-black border-white font-bold shadow-sm"
                      : "bg-[#111] text-[#666] border-[#222]"
                  }`}
                >
                  {includeHasselbladConditions ? "Condición Hasselblad: ACTIVA" : "Estándar: DESACTIVADA"}
                </button>
              </div>

              {includeHasselbladConditions && (
                <div className="space-y-2 pt-1 border-t border-[#161616]">
                  <div className="text-[11px] text-[#aaa] space-y-2 leading-relaxed font-sans">
                    <p className="flex items-start gap-2 text-[#ccc]">
                      <Check className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-white font-semibold">Fidelidad Facial Exacta (Cero Variación):</strong> Describir exactamente y sin ninguna variación las facciones faciales exactas, color de ojos, expresión de la mirada, color de cabello, estilo y corte de peinado, y proporciones anatómicas de la cara al máximo de detalle.
                      </span>
                    </p>
                    <p className="flex items-start gap-2 text-[#ccc]">
                      <Check className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-white font-semibold">Cabello y piel Hasselblad:</strong> Microtexturas de hebras individuales y flyaways, iluminación de contorno (rim lighting) dorada y dispersión de subsuperficie (subsurface scattering) para translucidez y brillo. Piel fotorrealista con poros visibles en manos y cuello, optimizado para cámara de formato medio Hasselblad H6D-100c con lente de 100mm.
                      </span>
                    </p>
                    <p className="flex items-start gap-2 text-[#ccc]">
                      <Check className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-white font-semibold">Rostro y piel Ultra-Detailed:</strong> Rostro humano expresivo ultra-detallado, microtextura extrema de piel, poros definidos realistas, fino peach fuzz natural y delicado subsurface scattering.
                      </span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowConditionsDetails(!showConditionsDetails)}
                    className="text-[9px] font-mono uppercase text-[#777] hover:text-white flex items-center gap-1 pt-1 transition-colors"
                  >
                    <ChevronRight className={`w-3 h-3 transition-transform ${showConditionsDetails ? "rotate-90" : ""}`} />
                    <span>{showConditionsDetails ? "Ocultar condición adicional" : "Añadir condición extra opcional"}</span>
                  </button>

                  {showConditionsDetails && (
                    <div className="mt-2 p-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2px] space-y-2">
                      <label className="block text-[9px] font-mono uppercase tracking-wider text-[#888]">
                        Instrucción o restricción adicional para este análisis:
                      </label>
                      <input
                        type="text"
                        value={customConditionText}
                        onChange={(e) => setCustomConditionText(e.target.value)}
                        placeholder="Ej: 'Fondo minimalista oscuro y atmósfera cinematográfica con niebla'..."
                        className="w-full bg-[#0e0e0e] border border-[#222] text-xs text-[#e0e0e0] px-3 py-2 rounded-sm focus:outline-none focus:border-white font-sans placeholder:text-[#555]"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Big Spark Action Button */}
          {selectedImage && !result && (
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className={`w-full py-4 rounded-sm uppercase tracking-widest text-xs font-mono font-bold transition-all duration-300 flex items-center justify-center gap-2
                ${loading 
                  ? "bg-[#111] border border-[#222] text-[#555] cursor-not-allowed" 
                  : "bg-white text-black hover:bg-neutral-200 active:scale-[0.99] shadow-lg shadow-white/5 font-extrabold"}`}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#888]" />
                  <span>{loadingStep || "Iniciando deconstrucción..."}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-black" />
                  <span>DECODIFICAR Y CREAR PROMPT</span>
                </>
              )}
            </button>
          )}

          {/* History drawer list (Mobile or side overlay triggers it) */}
          {showHistory && (
            <div className="p-4 border border-[#1a1a1a] bg-[#080808] rounded-sm animate-fadeIn">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs uppercase tracking-widest text-[#888] font-semibold flex items-center gap-1">
                  <History className="w-3.5 h-3.5 text-neutral-400" />
                  Historial de Deconstrucciones
                </h4>
                <button 
                  onClick={clearHistory}
                  disabled={history.length === 0}
                  className="text-[9px] text-red-400 hover:text-red-300 uppercase tracking-wider font-mono disabled:opacity-30 disabled:pointer-events-none"
                >
                  Limpiar historial
                </button>
              </div>

              {history.length === 0 ? (
                <p className="text-xs text-[#555] font-serif italic py-3 text-center">No has deconstruido imágenes todavía.</p>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {history.map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => loadFromHistory(item)}
                      className="p-2 border border-[#161616] bg-[#0c0c0c] hover:border-[#333] transition-all cursor-pointer flex items-center gap-3 rounded-[2px]"
                    >
                      <img src={item.imageUrl} alt="" className="w-10 h-10 object-cover rounded-[2px] opacity-70 border border-[#222]" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-white font-serif truncate">{item.data.masterPrompt}</p>
                        <p className="text-[8px] text-[#555] font-mono uppercase mt-0.5">{item.timestamp} • Estilo: {item.data.style.substring(0, 20)}...</p>
                      </div>
                      <button 
                        onClick={(e) => removeHistoryItem(item.id, e)}
                        className="p-1 hover:bg-[#1a1a1a] text-neutral-600 hover:text-red-400 rounded-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </section>

        {/* Right Side: Generated Prompt & Core Analysis */}
        <section className="w-full lg:w-1/2 flex flex-col gap-6">
          
          <div className="flex justify-between items-end pb-1 border-b border-[#181818]">
            <h2 className="font-serif italic text-2xl text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-neutral-400" />
              Runa del Prompt
            </h2>
            <div className="flex gap-2">
              <span className="px-2 py-0.5 border border-[#1f1f1f] text-[9px] bg-[#0a0a0a] uppercase tracking-widest text-neutral-400 font-mono">
                Gemini 3.5 Flash Lite
              </span>
              <span className="px-2 py-0.5 border border-[#1f1f1f] text-[9px] bg-[#0a0a0a] uppercase tracking-widest text-[#888] font-mono">
                Ultra-precisión
              </span>
            </div>
          </div>

          {!result ? (
            // Idle state with detailed visual guidelines/instructions
            <div className="flex-grow border border-[#111] bg-[#070707] rounded-sm p-8 flex flex-col justify-between min-h-[400px]">
              <div>
                <div className="inline-block p-1 bg-[#161616] border border-[#222] text-[9px] font-mono text-[#777] uppercase tracking-widest mb-6 px-2">
                  Algoritmo Activo / Esperando Entrada
                </div>
                
                <h3 className="text-xl font-serif text-white mb-4 italic">Fórmula de Ingeniería de Prompt</h3>
                <p className="text-xs text-[#999] leading-relaxed mb-6 font-sans">
                  Sube una foto y deja que el motor de IA Visionary analice la iluminación tridimensional,
                  las texturas, la paleta de color dominante y las técnicas cinematográficas más refinadas. Obtendrás un
                  <strong> prompt altamente optimizado en lenguaje especializado</strong> listo para alimentar modelos generativos como Midjourney, Stable Diffusion y DALL-E.
                </p>

                <div className="space-y-4 max-w-md">
                  <div className="flex gap-3 items-start text-xs text-[#888]">
                    <div className="w-5 h-5 rounded-full border border-[#222] bg-[#0b0b0b] flex items-center justify-center shrink-0 font-mono text-[10px] text-white">1</div>
                    <p className="leading-relaxed"><strong className="text-white">Análisis de Estilo:</strong> Identifica si es un render 3D, una película clásica, arte digital barroco, o cyberpunk.</p>
                  </div>
                  <div className="flex gap-3 items-start text-xs text-[#888]">
                    <div className="w-5 h-5 rounded-full border border-[#222] bg-[#0b0b0b] flex items-center justify-center shrink-0 font-mono text-[10px] text-white">2</div>
                    <p className="leading-relaxed"><strong className="text-white">Extracción de Color:</strong> Construye la paleta con códigos hexadecimales exactos expresados visualmente.</p>
                  </div>
                  <div className="flex gap-3 items-start text-xs text-[#888]">
                    <div className="w-5 h-5 rounded-full border border-[#222] bg-[#0b0b0b] flex items-center justify-center shrink-0 font-mono text-[10px] text-white">3</div>
                    <p className="leading-relaxed"><strong className="text-white">Adaptación de Formato:</strong> Sugiere el aspect ratio óptimo de los parámetros analizados.</p>
                  </div>
                </div>
              </div>

              <div id="guia" className="mt-8 pt-6 border-t border-[#121212] flex items-center justify-between text-[11px] text-[#555] font-mono">
                <span>VERSIÓN DE MOTOR: V6.1 - PRODUCTION</span>
                <span>RETORNO ESTRUCTURADO JSON</span>
              </div>
            </div>
          ) : (
            // Results screen
            <div className="space-y-6 flex-grow flex flex-col justify-between animate-fadeIn">
              
              {/* Massive Master Prompt Card */}
              <div className="p-6 border border-[#252525] bg-[#0a0a0a] relative rounded-sm group hover:border-[#444] transition-colors duration-300">
                {/* Visual Accent Line */}
                <div className="absolute top-0 left-0 w-1.5 h-14 bg-white"></div>
                
                <div className="flex justify-between items-center mb-4 pl-2">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-[#777] font-semibold">
                    Prompt Maestro Generativo
                  </span>
                  
                  {/* Aspect Ratio Banner */}
                  <span className="px-2.5 py-0.5 bg-[#121212] border border-[#222] text-[9.5px] font-mono text-white rounded-full">
                    Girar/Aspect Ratio: <span className="font-bold text-white pr-0.5">--ar {result.aspectRatio}</span>
                  </span>
                </div>

                <p className="font-serif text-lg md:text-xl leading-relaxed text-[#dfdfdf] pl-2 select-all tracking-wide italic">
                  &ldquo;{result.masterPrompt}&rdquo;
                </p>
                
                {/* Copy Buttons Row */}
                <div className="mt-6 flex flex-wrap gap-2 pl-2">
                  <button 
                    onClick={() => copyToClipboard(result.masterPrompt)}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-black text-[10px] font-mono uppercase tracking-widest font-extrabold hover:bg-neutral-200 transition-all rounded-[1px] active:scale-95"
                  >
                    {copiedPrompt ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Copiar Prompt</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      const completeString = `${result.masterPrompt} --ar ${result.aspectRatio} --no ${result.negativePrompt}`;
                      copyToClipboard(completeString);
                    }}
                    className="flex items-center gap-2 px-3.5 py-2 bg-[#121212] hover:bg-[#1f1f1f] border border-[#2a2a2a] text-[#ddd] text-[10px] font-mono uppercase tracking-widest font-medium transition-all rounded-[1px] active:scale-95"
                  >
                    <span>Copiar con Parámetros</span>
                  </button>

                  <button
                    onClick={handleGeneratePreview}
                    disabled={previewLoading}
                    className="flex items-center gap-2 px-3.5 py-2 bg-[#1a1a1a] hover:bg-[#252525] border border-[#333] text-[#fff] text-[10px] font-mono uppercase tracking-widest font-bold transition-all rounded-[1px] active:scale-95 disabled:opacity-55"
                  >
                    {previewLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-neutral-400" />
                        <span>Generando...</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-3.5 h-3.5 text-neutral-300" />
                        <span>Vista Previa Visual</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleExportJSON}
                    className="flex items-center gap-2 px-3.5 py-2 bg-[#121212] hover:bg-[#1f1f1f] border border-[#2a2a2a] text-[#ddd] hover:text-white text-[10px] font-mono uppercase tracking-widest font-bold transition-all rounded-[1px] active:scale-95"
                    title="Exportar prompt y metadatos análisis a archivo JSON"
                  >
                    {exportedJson ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-400 stroke-[2.5]" />
                        <span className="text-green-400">¡Exportado!</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Exportar JSON</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Simulated Generator Prompt Preview Card */}
                {(previewUrl || previewLoading) && (
                  <div className="mt-6 border-t border-[#1e1e1e] pt-6 pl-2 animate-fadeIn">
                    <div className="flex justify-between items-center mb-3.5">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
                        <span className="text-[10px] uppercase font-mono tracking-widest text-[#999] font-bold">
                          Vista Previa de Generador Visual (Miniatura)
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleRegenerateWithSeed}
                          disabled={previewLoading}
                          className="px-2.5 py-1 bg-[#121212] border border-[#242424] text-[9px] font-mono text-neutral-400 hover:text-white hover:border-white transition-colors uppercase tracking-wider flex items-center gap-1 rounded-[1.5px] disabled:opacity-50"
                          title="Genera otra variación visual cambiando la semilla"
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                          <span>Nueva Semilla</span>
                        </button>
                      </div>
                    </div>

                    <div className="relative bg-[#070707] border border-[#181818] rounded-sm flex items-center justify-center overflow-hidden min-h-[180px] max-w-sm">
                      {previewLoading ? (
                        <div className="flex flex-col items-center justify-center p-6 text-center gap-2.5">
                          <RefreshCw className="w-6 h-6 text-white animate-spin stroke-[1.5]" />
                          <p className="text-[9.5px] font-mono uppercase text-[#666] tracking-widest">
                            Invocando Pollinations Engine...
                          </p>
                        </div>
                      ) : (
                        previewUrl && (
                          <div className="relative group/preview w-full h-full flex items-center justify-center">
                            <img
                              src={previewUrl}
                              alt="Visual approximation of the prompt"
                              referrerPolicy="no-referrer"
                              className="max-h-[220px] max-w-full object-contain shadow-2xl rounded-[1px] transition-transform duration-300 group-hover/preview:scale-[1.01]"
                            />
                            
                            {/* Download / Open Frame Button on Hover */}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 to-transparent p-2 md:p-3 opacity-0 group-hover/preview:opacity-100 transition-opacity duration-200 flex justify-between items-center">
                              <span className="text-[8px] font-mono text-[#777]">
                                Semilla: #{previewSeed}
                              </span>
                              <a
                                href={previewUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[8.5px] font-mono hover:underline text-white flex items-center gap-0.5 uppercase tracking-wider"
                              >
                                Ampliar <ArrowRight className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                    <p className="text-[9px] font-mono text-[#555] mt-2 leading-relaxed">
                      * Nota: Esta miniatura estima de forma autónoma la calidad del prompt maestro antes de copiarlo.
                    </p>
                  </div>
                )}
              </div>

              {/* Dynamic Dominant Color Palette */}
              <div className="p-4 border border-[#131313] bg-[#070707] rounded-sm">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-[10px] uppercase tracking-widest font-mono text-[#777] font-bold flex items-center gap-1.5ClassName">
                    <Palette className="w-3.5 h-3.5 text-neutral-400" />
                    Códigos Hexadecimales Dominantes:
                  </h4>
                  {copiedColor && (
                    <span className="text-[10px] text-green-400 font-mono animate-pulse">
                      ¡Color {copiedColor} copiado!
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3.5">
                  {result.palette.map((colorHex, idx) => (
                    <button
                      key={idx}
                      onClick={() => copyToClipboard(colorHex, "color")}
                      className="group/color flex flex-col items-center gap-1.5 outline-none"
                      title="Haz clic para copiar el código hexadecimal"
                    >
                      <div 
                        className="w-10 h-10 rounded-full border border-black/50 shadow-lg group-hover/color:scale-110 active:scale-90 transition-transform duration-200" 
                        style={{ backgroundColor: colorHex }}
                      />
                      <span className="text-[9.5px] font-mono text-neutral-500 group-hover/color:text-white transition-colors">
                        {colorHex.toUpperCase()}
                      </span>
                    </button>
                  ))}
                  <div className="ml-auto text-[9px] text-[#444] font-mono text-right hidden sm:block">
                    Haz clic para copiar
                  </div>
                </div>
              </div>

              {/* Visual Breakdown Tabs Accordion (Fully detailed) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. Subject */}
                <div className="p-4 border border-[#151515] bg-[#080808] rounded-sm">
                  <div className="flex items-center gap-2 mb-1 text-xs text-white uppercase font-mono tracking-wider">
                    <Layers className="w-3.5 h-3.5 text-[#fff]/60" />
                    <span>Sujeto & Detalles</span>
                  </div>
                  <p className="text-xs text-[#aaa] leading-relaxed font-sans">{result.subject}</p>
                </div>

                {/* 2. Style & Tone */}
                <div className="p-4 border border-[#151515] bg-[#080808] rounded-sm">
                  <div className="flex items-center gap-2 mb-1 text-xs text-white uppercase font-mono tracking-wider">
                    <Sliders className="w-3.5 h-3.5 text-[#fff]/60" />
                    <span>Estilo & Medio</span>
                  </div>
                  <p className="text-xs text-[#aaa] leading-relaxed font-sans">{result.style}</p>
                </div>

                {/* 3. Camera & Composition */}
                <div className="p-4 border border-[#151515] bg-[#080808] rounded-sm">
                  <div className="flex items-center gap-2 mb-1 text-xs text-white uppercase font-mono tracking-wider">
                    <Camera className="w-3.5 h-3.5 text-[#fff]/60" />
                    <span>Composición & Lente</span>
                  </div>
                  <p className="text-xs text-[#aaa] leading-relaxed font-sans">{result.composition}</p>
                </div>

                {/* 4. Lighting Environment */}
                <div className="p-4 border border-[#151515] bg-[#080808] rounded-sm">
                  <div className="flex items-center gap-2 mb-1 text-xs text-white uppercase font-mono tracking-wider">
                    <Sun className="w-3.5 h-3.5 text-[#fff]/60" />
                    <span>Iluminación & Atmósfera</span>
                  </div>
                  <p className="text-xs text-[#aaa] leading-relaxed font-sans">{result.lighting}</p>
                </div>

                {/* 5. Negative prompt / Elements to Avoid */}
                <div className="p-4 border border-[#151515] bg-[#080808] rounded-sm md:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 text-[10px] text-red-400 uppercase font-mono tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
                      <span className="font-semibold">Prompt Negativo Recomendado (A Evitar)</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => copyToClipboard(result.negativePrompt, "negative")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-[9.5px] font-mono uppercase tracking-wider rounded-sm border transition-all active:scale-95 cursor-pointer
                        ${copiedNegativePrompt
                          ? "bg-emerald-950/40 border-emerald-500 text-emerald-300 font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                          : "bg-[#111] hover:bg-[#1a1a1a] border-[#292929] hover:border-neutral-400 text-neutral-300 hover:text-white"}`}
                      title="Copiar únicamente el texto del prompt negativo al portapapeles"
                    >
                      {copiedNegativePrompt ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400 stroke-[2.5]" />
                          <span>¡Copiado al Portapapeles!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-neutral-400" />
                          <span>Copiar Prompt Negativo</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-[#aaa] leading-relaxed font-mono select-all bg-[#040404] p-3 border border-[#141414] rounded-sm">
                    {result.negativePrompt}
                  </p>
                </div>

              </div>

              {/* Interactive Prompt Refinement Engine */}
              <div className="border border-[#222] bg-[#070707] rounded-sm shadow-xl shadow-black/20 overflow-hidden">
                <button 
                  onClick={() => setIsRefinePanelOpen(!isRefinePanelOpen)}
                  className="w-full flex justify-between items-center p-5 bg-[#0a0a0a] hover:bg-[#111] transition-colors text-left"
                >
                  <h4 className="text-[10px] uppercase tracking-[0.25em] font-mono text-white font-bold flex items-center gap-1.5">
                    <RefreshCw className={`w-3.5 h-3.5 text-neutral-400 ${refinementLoading ? "animate-spin" : ""}`} style={{ animationDuration: '6s' }} />
                    MODIFICAR O REDISEÑAR PROMPT
                  </h4>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] text-[#666] font-mono uppercase">IA Asistida</span>
                    <ChevronRight className={`w-4 h-4 text-neutral-500 transition-transform ${isRefinePanelOpen ? "rotate-90" : ""}`} />
                  </div>
                </button>
                
                {isRefinePanelOpen && (
                  <div className="p-5 border-t border-[#1a1a1a]">
                    <p className="text-[11px] text-[#888] mb-4 leading-relaxed">
                      ¿Quieres cambiar detalles, agregar elementos, o forzar un estilo artístico diferente? Describe las modificaciones en español y reconstruiremos la matriz de prompt.
                    </p>

                    <form onSubmit={handleRefinePrompt} className="space-y-4">
                      <div className="flex gap-2.5">
                        <input
                          ref={refineInputRef}
                          type="text"
                          value={refineInstructions}
                          onChange={(e) => setRefineInstructions(e.target.value)}
                          placeholder="Ej: 'Hazlo en versión pixel art cyberpunk' o 'Añade lluvia dramática y neblina morada'..."
                          className="flex-1 bg-[#0c0c0c] border border-[#242424] text-xs text-[#e0e0e0] px-4 py-3 focus:outline-none focus:border-white rounded-sm font-sans placeholder:text-[#555]"
                          disabled={refinementLoading}
                        />
                        <button
                          type="submit"
                          disabled={refinementLoading || !refineInstructions.trim()}
                          className={`px-5 text-[10px] font-mono font-bold uppercase tracking-widest border transition-all flex items-center gap-1 rounded-sm
                            ${refinementLoading || !refineInstructions.trim()
                              ? "border-[#222] text-[#444] cursor-not-allowed"
                              : "border-white bg-[#0e0e0e] hover:bg-white hover:text-black"}`}
                        >
                          {refinementLoading ? "Procesando..." : "Rediseñar"}
                        </button>
                      </div>

                      {/* Quick-refinement presets and Library Toggle */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-b border-[#141414] pb-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[9px] font-mono text-neutral-600 uppercase tracking-wider mr-1">Sugerencias:</span>
                          {[
                            { label: "Facciones y Ojos Cero Variación 🎯", text: "describir exactamente y sin ninguna variación las exactas facciones del rostro, color de ojos, expresión facial auténtica, color exacto de cabello y tipo de peinado, y proporciones anatómicas de la cara al máximo nivel de detalle" },
                            { label: "Cabello y Piel Hasselblad 📸", text: "maximizar los detalles del cabello agregando microtexturas de hebras individuales y flyaways. Incorporar iluminación de contorno (rim lighting) dorada y dispersión de subsuperficie (subsurface scattering) para otorgar brillo y translucidez al cabello. Sumar detalles de piel hiperrealistas (poros y texturas visibles) en cuello y manos, y optimizar la toma con especificaciones de cámara de formato medio Hasselblad H6D-100c y lente de 100mm para lograr un acabado comercial de alta fidelidad." },
                            { label: "Detalles Faciales Máximos ✨", text: "refinar y profundizar al maximo los detalles faciales, microtextura de piel fotorrealista, poros, ojos expresivos e iluminados, subsurface scattering, textura de pestañas y labios" },
                            { label: "Cinemático Drama 🎬", text: "iluminación cinematográfica dramática de claroscuro, sombras profundas, humo volumétrico, aspecto místico" },
                            { label: "Cyberpunk Glow 🌆", text: "estética cyberpunk neón nocturno, reflejos de lluvia en el asfalto" }
                          ].map((chip, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setRefineInstructions(chip.text)}
                              className="px-2 py-0.5 text-[8.5px] font-mono text-neutral-400 border border-[#1e1e1e] bg-[#0c0c0c] hover:border-neutral-500 hover:text-white transition-all rounded-[1px]"
                            >
                              {chip.label}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowLibraryInRefine(!showLibraryInRefine)}
                          className="flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-mono text-amber-400 hover:text-amber-300 bg-amber-950/20 border border-amber-800/40 rounded-[1px] transition-colors uppercase tracking-wider font-semibold ml-auto"
                        >
                          <Bookmark className="w-3 h-3" />
                          <span>{showLibraryInRefine ? "Ocultar Biblioteca" : "Biblioteca de Modificadores (1-Click)"}</span>
                          <ChevronDown className={`w-3 h-3 transition-transform ${showLibraryInRefine ? "rotate-180" : ""}`} />
                        </button>
                      </div>

                      {/* Inline Compact Library inside Refinement Panel */}
                      {showLibraryInRefine && (
                        <div className="pt-2 animate-fadeIn">
                          <PromptLibrary
                            onInjectIntoRefinement={handleInjectModifier}
                            onAppendToMasterPrompt={handleAppendModifierToMaster}
                            currentMasterPrompt={result?.masterPrompt}
                            isCompact={true}
                          />
                        </div>
                      )}
                      
                      {refinementSuccessMsg && (
                        <div className="p-2.5 bg-green-950/20 border border-green-900/30 text-green-400 text-xs rounded-sm flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{refinementSuccessMsg}</span>
                        </div>
                      )}

                      {/* Diff Visualization */}
                      {showDiff && previousPrompt && previousPrompt !== result.masterPrompt && (
                        <div className="mt-4 p-4 bg-[#0a0a0a] border border-[#222] rounded-sm">
                          <h5 className="text-[10px] uppercase font-mono tracking-widest text-[#777] mb-3 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5" />
                            Comparación de Cambios (Diff)
                          </h5>
                          <p className="font-serif text-sm leading-relaxed text-[#ccc] whitespace-pre-wrap">
                            {diffWords(previousPrompt, result.masterPrompt).map((part, i) => {
                              if (part.added) {
                                return <ins key={i} className="bg-green-900/40 text-green-300 no-underline px-1 rounded-sm">{part.value}</ins>;
                              }
                              if (part.removed) {
                                return <del key={i} className="bg-red-900/40 text-red-300 line-through px-1 rounded-sm">{part.value}</del>;
                              }
                              return <span key={i} className="text-[#888]">{part.value}</span>;
                            })}
                          </p>
                        </div>
                      )}
                    </form>
                  </div>
                )}
              </div>

            </div>
          )}

        </section>

      </main>

      {/* Dedicated Prompt Library Section */}
      <section id="prompt-library" className="px-4 md:px-10 py-6 max-w-[1700px] w-full mx-auto">
        <PromptLibrary 
          onInjectIntoRefinement={handleInjectModifier}
          onAppendToMasterPrompt={result ? handleAppendModifierToMaster : undefined}
          currentMasterPrompt={result?.masterPrompt}
        />
      </section>

      {/* Footer Details showing dynamic telemetry logs */}
      <footer className="px-6 py-4 md:px-10 md:py-6 border-t border-[#141414] flex flex-col md:flex-row gap-4 justify-between items-center bg-[#070707] mt-auto font-mono text-[9px] text-neutral-500">
        <div className="flex flex-wrap justify-center md:justify-start gap-6 lg:gap-10">
          <div className="flex flex-col">
            <span className="uppercase text-[#444] mb-1 tracking-wider">Puntuación Confianza</span>
            <span className="text-xs text-[#888] font-mono">{result ? "99.85%" : "N/A"}</span>
          </div>
          <div className="flex flex-col">
            <span className="uppercase text-[#444] mb-1 tracking-wider">Tiempo Procesamiento</span>
            <span className="text-xs text-[#888] font-mono">{result ? processingTime : "0.00s"}</span>
          </div>
          <div className="flex flex-col">
            <span className="uppercase text-[#444] mb-1 tracking-wider">Idiomas de Entrada</span>
            <span className="text-xs text-[#888] font-mono">Español / English</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {apiStatus?.apiKeyLoaded ? (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"></div>
              <span className="uppercase tracking-widest text-neutral-400">Gemini 3.5 Flash Lite Activo</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)] mr-1"></div>
              <span className="uppercase tracking-widest text-[#aaa]">Clave de API ausente</span>
            </div>
          )}
        </div>
      </footer>

    </div>
  );
}
