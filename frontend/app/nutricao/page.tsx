"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { apiService } from "@/lib/api";
import PortionModal from "@/components/PortionModal";
import MealSummaryModal from "@/components/MealSummaryModal";
import { motion } from "framer-motion";
import { Camera, Search, Save } from "lucide-react";
import { detectFoodFromDataUrl } from "@/lib/foodVision";
import LayoutBase from "@/components/layout/LayoutBase";
import ProtectedRoute from "@/components/ProtectedRoute";

interface AnalysisFoodItem {
  id: string;
  name: string;
  carbs: number; // g por porção estimada
  source: string;
}

interface MealLogEntry {
  id: string;
  items: AnalysisFoodItem[];
  carbsTotal: number;
  insulinSuggested: number;
  createdAt: string;
  imgUrl?: string;
}

const NutricaoPage = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [capturedImg, setCapturedImg] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisFoodItem[] | null>(null);
  const [portionModalOpen, setPortionModalOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AnalysisFoodItem | null>(null);
  const [saving, setSaving] = useState(false);
  // Busca manual
  const [manualTerm, setManualTerm] = useState<string>("");
  const [manualResults, setManualResults] = useState<any[]>([]);
  const [isSearchingManual, setIsSearchingManual] = useState(false);
  const [activeTab, setActiveTab] = useState<"manual" | "camera" | "itens">("manual");
  // Refeição (tipo e horário)
  const [mealType, setMealType] = useState<string>("Almoço");
  const [mealTime, setMealTime] = useState<string>(() => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  });

  const searchManual = async () => {
    if (!manualTerm.trim()) return;
    setIsSearchingManual(true);
    try {
      const { data } = await apiService.searchNutritionUnified(manualTerm.trim(), 10);
      setManualResults(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      console.error("Erro na busca manual:", err);
      alert("Erro na busca. Tente outra palavra.");
    } finally {
      setIsSearchingManual(false);
    }
  };

  const addManualFood = (food: any) => {
    const item: AnalysisFoodItem = {
      id: crypto.randomUUID(),
      name: food.name,
      carbs: food?.nutrients_per_100g?.carbohydrates ?? 0,
      source: food?.source || "taco_db",
    };
    setAnalysis((prev) => (prev ? [...prev, item] : [item]));
    setManualResults([]);
    setManualTerm("");
    setActiveTab("itens");
  };

  const insulinRatio = parseFloat(
    typeof window !== "undefined" ? localStorage.getItem("insulin_ratio") || "15" : "15"
  );

  // Câmera sob demanda
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch (err) {
      console.error("Camera error", err);
      alert("Não foi possível acessar a câmera. Verifique as permissões.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream)
        .getTracks()
        .forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  };

  useEffect(() => {
    // Cleanup ao desmontar
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, []);

  const handleCapture = () => {
    if (!canvasRef.current || !videoRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvasRef.current.toDataURL("image/jpeg");
    setCapturedImg(dataUrl);
    analyzeImage(dataUrl);
  };

  // Helper to convert DataURL to Blob
  const dataURLtoBlob = (dataUrl: string) => {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const analyzeImage = async (base64Img: string) => {
    try {
      setAnalysis(null);
      // Executa detecção local de alimentos
      const detections = await detectFoodFromDataUrl(base64Img);

      if (detections.length === 0) {
        alert("Nenhum alimento foi detectado. Tente novamente ou ajuste manualmente.");
        return;
      }

      // Para cada classe detectada buscamos a nutrição no backend (v2 unified)
      const items: AnalysisFoodItem[] = [];
      for (const det of detections) {
        try {
          const { data } = await apiService.searchNutritionUnified(det.class, 1);
          const results = Array.isArray(data?.items) ? data.items : [];
          if (results.length > 0) {
            const food = results[0];
            items.push({
              id: crypto.randomUUID(),
              name: food.name || det.class,
              carbs: food?.nutrients_per_100g?.carbohydrates ?? 0,
              source: food?.source || "taco_db",
            });
          } else {
            // fallback sem dados de nutrição
            items.push({ id: crypto.randomUUID(), name: det.class, carbs: 0, source: "unknown" });
          }
        } catch (err) {
          console.error("Erro buscando nutrição:", err);
          items.push({ id: crypto.randomUUID(), name: det.class, carbs: 0, source: "error" });
        }
      }
      setAnalysis(items);
      setActiveTab("itens");
    } catch (err) {
      console.error(err);
      alert("Erro ao analisar imagem. Tente novamente ou ajuste manualmente.");
    }
  };

  const openPortionAdjust = (item: AnalysisFoodItem) => {
    setSelectedItem(item);
    setPortionModalOpen(true);
  };

  const adjustPortion = (grams: number, portionName?: string) => {
    if (!selectedItem || !analysis) return;
    // Para simplificar, assumimos relação carbo=gr (ajuste futuro com fator carb por 100g)
    const carbs = grams; 
    const updated = analysis.map((i) => (i.id === selectedItem.id ? { ...i, carbs, name: `${i.name} (${portionName || 'Porção'})` } : i));
    setAnalysis(updated);
    setPortionModalOpen(false);
  };

  // Ajuste rápido de porção em ±10g (clamp em 0)
  const quickAdjust = (id: string, delta: number) => {
    setAnalysis((prev) => {
      if (!prev) return prev;
      return prev.map((i) =>
        i.id === id
          ? { ...i, carbs: Math.max(0, parseFloat((i.carbs + delta).toFixed(1))) }
          : i
      );
    });
  };

  const carbsTotal = analysis?.reduce((sum, i) => sum + i.carbs, 0) || 0;
  const insulinSuggested = carbsTotal && insulinRatio ? parseFloat((carbsTotal / insulinRatio).toFixed(1)) : 0;

  const saveMeal = async () => {
    if (!analysis) return;
    setSaving(true);
    const mealPayload = {
      items: analysis.map((i) => ({
        name: i.name,
        grams: i.carbs, // TODO: substituir quando grams disponível corretamente
        carbs_g: i.carbs,
      })),
      carbs_total: carbsTotal,
      insulin_suggested: insulinSuggested,
      img_url: capturedImg || undefined,
    };
    try {
      await apiService.createMealLog(mealPayload);
    } catch (err) {
      console.error("Falha ao salvar no backend, salvando localmente", err);
    }
    const log: MealLogEntry = {
      id: crypto.randomUUID(),
      items: analysis,
      carbsTotal,
      insulinSuggested,
      createdAt: new Date().toISOString(),
      imgUrl: capturedImg || undefined,
    };
    const existing = JSON.parse(localStorage.getItem("meal_logs") || "[]");
    localStorage.setItem("meal_logs", JSON.stringify([log, ...existing]));
    setSaving(false);
    alert("Refeição salva com sucesso!");
    // reset
    setCapturedImg(null);
    setAnalysis(null);
    setActiveTab("manual");
  };

  const handleConfirmSummary = async () => {
    await saveMeal();
    try {
      if (insulinSuggested && insulinSuggested > 0) {
        const [hh, mm] = mealTime.split(":").map((v) => parseInt(v, 10));
        const d = new Date();
        d.setHours(hh || 0, mm || 0, 0, 0);
        const measuredAtIso = d.toISOString();
        await apiService.createInsulinReading({
          units: insulinSuggested,
          notes: `Dose pré-refeição: ${mealType} — ${carbsTotal.toFixed(1)}g carbs (razão 1u:${insulinRatio}g)`,
          measured_at: measuredAtIso,
        });
      }
    } catch (err) {
      console.error("Falha ao registrar dose de insulina", err);
    }
    setSummaryOpen(false);
  };

  // Badge simples para origem do item
  const SourceBadge = ({ source }: { source: string }) => {
    const label = source === "taco_db" ? "TACO" : source?.toUpperCase?.() || "DESCONHECIDO";
    const base = "text-xs px-2 py-0.5 rounded-full border";
    const cls =
      source === "taco_db"
        ? `${base} bg-orange-100 border-orange-300 text-orange-700`
        : source === "openfoodfacts"
        ? `${base} bg-blue-100 border-blue-300 text-blue-700`
        : source === "usda"
        ? `${base} bg-green-100 border-green-300 text-green-700`
        : `${base} bg-gray-100 border-gray-300 text-gray-700`;
    return <span className={cls}>{label}</span>;
  };

  return (
    <ProtectedRoute>
      <LayoutBase title="Nutrição Inteligente" showDaySelector={false}>
        <div className="px-4 py-6 space-y-5">
          {/* Abas premium */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between gap-2 rounded-2xl backdrop-blur-[10px] bg-white/25 border border-white/30 p-2"
          >
            <button
              onClick={() => setActiveTab("manual")}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl transition-all ${
                activeTab === "manual"
                  ? "bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow"
                  : "bg-white/20 text-[#1C1C1C]"
              }`}
            >
              <Search className="w-4 h-4" />
              <span className="text-sm font-semibold">Busca</span>
            </button>
            <button
              onClick={() => setActiveTab("camera")}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl transition-all ${
                activeTab === "camera"
                  ? "bg-gradient-to-br from-green-400 to-green-600 text-white shadow"
                  : "bg-white/20 text-[#1C1C1C]"
              }`}
            >
              <Camera className="w-4 h-4" />
              <span className="text-sm font-semibold">Câmera</span>
            </button>
            <button
              onClick={() => setActiveTab("itens")}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl transition-all ${
                activeTab === "itens"
                  ? "bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow"
                  : "bg-white/20 text-[#1C1C1C]"
              }`}
            >
              <Save className="w-4 h-4" />
              <span className="text-sm font-semibold">Itens</span>
            </button>
          </motion.div>

          {/* Conteúdo por aba */}
          {activeTab === "manual" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full rounded-2xl backdrop-blur-[10px] bg-white/25 border border-white/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-[#1C1C1C]">Buscar alimento</h3>
                <span className="text-xs text-[#1C1C1C] opacity-60">Base TACO + fontes públicas</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualTerm}
                  onChange={(e) => setManualTerm(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") searchManual(); }}
                  placeholder="Ex.: arroz integral, frango..."
                  className="flex-1 px-3 py-2 rounded-lg bg-white/50 border border-white/40 placeholder:text-[#1C1C1C]/60 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                  onClick={searchManual}
                  disabled={isSearchingManual}
                  className="px-4 py-2 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 text-white font-semibold disabled:opacity-50"
                >
                  {isSearchingManual ? "..." : "Buscar"}
                </button>
              </div>
              {manualResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto mt-2 divide-y divide-white/20 rounded-lg border border-white/20">
                  {manualResults.map((res: any) => {
                    const carbs = res?.nutrients_per_100g?.carbohydrates ?? 0;
                    return (
                      <button
                        key={res.id || res.name}
                        onClick={() => addManualFood(res)}
                        className="w-full text-left px-3 py-2 hover:bg-white/30 flex items-center justify-between"
                      >
                        <span className="text-[#1C1C1C] font-medium truncate">{res.name}</span>
                        <span className="text-xs text-[#1C1C1C] opacity-70">{typeof carbs === "number" ? carbs.toFixed(1) : carbs}g carbs</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "camera" && (
            <>
              {!capturedImg && (
                cameraReady ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative w-full rounded-2xl overflow-hidden">
                    <video
                      ref={videoRef}
                      className="w-full h-auto"
                      playsInline
                      autoPlay
                      muted
                    />
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                      <button
                        onClick={handleCapture}
                        className="bg-white/90 text-[#1C1C1C] font-semibold px-4 py-2 rounded-full shadow-lg backdrop-blur-md"
                      >
                        Capturar
                      </button>
                      <button
                        onClick={stopCamera}
                        className="bg-red-600/90 text-white font-semibold px-4 py-2 rounded-full shadow-lg backdrop-blur-md"
                      >
                        Fechar
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full rounded-2xl backdrop-blur-[10px] bg-white/25 border border-white/30 p-4 text-center">
                    <p className="text-sm text-[#1C1C1C] opacity-80">A câmera está desativada. Use a busca ou ative a câmera quando quiser.</p>
                    <button
                      onClick={startCamera}
                      className="mt-3 px-4 py-2 rounded-lg bg-gradient-to-br from-green-400 to-green-600 text-white font-semibold"
                    >
                      Abrir Câmera
                    </button>
                  </motion.div>
                )
              )}

              {capturedImg && (
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full rounded-2xl backdrop-blur-[8px] bg-white/20 border border-white/25 p-4">
                  <Image src={capturedImg} alt="captura" width={400} height={300} className="rounded-lg mx-auto" />
                  <button
                    onClick={() => {
                      setCapturedImg(null);
                      setAnalysis(null);
                    }}
                    className="mt-3 text-sm font-semibold text-blue-600"
                  >
                    Nova captura
                  </button>
                </motion.div>
              )}
            </>
          )}

          {activeTab === "itens" && analysis && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full rounded-2xl backdrop-blur-[10px] bg-white/25 border border-white/30 p-4 space-y-3">
              <h3 className="text-base font-semibold text-[#1C1C1C]">Itens reconhecidos</h3>
              {/* Adicionar alimentos inline (busca + câmera) */}
              <div className="space-y-2">
                <p className="text-xs text-[#1C1C1C] opacity-70">Adicionar alimentos</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualTerm}
                    onChange={(e) => setManualTerm(e.target.value)}
                    placeholder="Ex.: Arroz, frango, salada..."
                    className="flex-1 px-3 py-2 rounded-lg bg-white/50 border border-white/40 text-sm"
                  />
                  <button
                    onClick={searchManual}
                    className="px-3 py-2 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 text-white text-sm font-semibold"
                  >
                    Buscar
                  </button>
                  <button
                    onClick={cameraReady ? handleCapture : startCamera}
                    className="px-3 py-2 rounded-lg bg-gradient-to-br from-green-400 to-green-600 text-white text-sm font-semibold"
                  >
                    {cameraReady ? "Capturar" : "Câmera"}
                  </button>
                  {cameraReady && (
                    <button
                      onClick={stopCamera}
                      className="px-3 py-2 rounded-lg bg-white/30 border border-white/40 text-[#1C1C1C] text-sm"
                    >
                      Parar
                    </button>
                  )}
                </div>

                {cameraReady && (
                  <video ref={videoRef} className="w-full rounded-xl border border-white/30" />
                )}

                {isSearchingManual && (
                  <p className="text-xs text-[#1C1C1C] opacity-70">Buscando...</p>
                )}
                {manualResults.length > 0 && (
                  <div className="space-y-1">
                    {manualResults.map((food: any) => (
                      <button
                        key={food.id || food.name}
                        onClick={() => addManualFood(food)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/30 border border-white/40 text-left"
                      >
                        <span className="text-sm font-medium text-[#1C1C1C]">{food.name}</span>
                        <span className="text-xs text-[#1C1C1C] opacity-70">{((food?.nutrients_per_100g?.carbohydrates ?? 0)).toFixed(1)}g carbs</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Seleção de refeição e horário */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <p className="text-xs text-[#1C1C1C] opacity-70">Tipo de refeição</p>
                  <div className="flex gap-2">
                    {(["Café da manhã", "Almoço", "Jantar", "Lanche"] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setMealType(type)}
                        className={`px-2 py-1 rounded-lg text-xs font-semibold border transition-all ${
                          mealType === type
                            ? "bg-gradient-to-br from-purple-400 to-purple-600 text-white border-purple-400"
                            : "bg-white/20 text-[#1C1C1C] border-white/30"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-[#1C1C1C] opacity-70">Horário</p>
                  <input
                    type="time"
                    value={mealTime}
                    onChange={(e) => setMealTime(e.target.value)}
                    className="w-full px-2 py-1 rounded-lg bg-white/50 border border-white/40 text-sm"
                  />
                </div>
              </div>
              {analysis.map((item) => (
                <div key={item.id} className="flex justify-between items-center py-2 border-b border-white/20">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="font-medium text-[#1C1C1C] truncate">{item.name}</p>
                    <SourceBadge source={item.source} />
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-[#1C1C1C] opacity-70">{item.carbs.toFixed(1)}g carbs</p>
                    <div className="flex items-center gap-1">
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => quickAdjust(item.id, -10)} className="px-2 py-1 rounded-md bg-white/30 border border-white/40 text-xs font-semibold text-[#1C1C1C]">-10g</motion.button>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => quickAdjust(item.id, 10)} className="px-2 py-1 rounded-md bg-white/30 border border-white/40 text-xs font-semibold text-[#1C1C1C]">+10g</motion.button>
                    </div>
                    <button onClick={() => openPortionAdjust(item)} className="text-sm font-semibold text-blue-600">Ajustar</button>
                  </div>
                </div>
              ))}
              <div className="flex justify-between font-semibold pt-1 text-[#1C1C1C]">
                <span>Total Carbs</span>
                <span>{carbsTotal.toFixed(1)}g</span>
              </div>
              <div className="flex justify-between font-semibold pb-2 text-[#1C1C1C]">
                <span>Sugestão de Insulina</span>
                <span>{insulinSuggested}u</span>
              </div>
              {/* Botão removido em favor da barra fixa inferior */}
            </motion.div>
          )}

          {/* Canvas oculto */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Barra fixa inferior de resumo e confirmar */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="fixed bottom-4 left-1/2 right-4 z-[110] rounded-2xl backdrop-blur-xl bg-white/30 border border-white/40 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-xs text-[#1C1C1C] opacity-70">Carboidratos</p>
                  <p className="text-base font-semibold text-[#1C1C1C]">{carbsTotal.toFixed(1)}g</p>
                </div>
                <div>
                  <p className="text-xs text-[#1C1C1C] opacity-70">Insulina sugerida</p>
                  <p className="text-base font-semibold text-[#1C1C1C]">{insulinSuggested}u</p>
                </div>
              </div>
              <button
                onClick={() => setSummaryOpen(true)}
                disabled={!analysis || saving}
                className="px-4 py-2 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-white font-semibold disabled:opacity-50"
              >
                {analysis ? "Confirmar" : "Adicionar itens"}
              </button>
            </div>
          </motion.div>

          {/* Modais */}
          {portionModalOpen && selectedItem && (
            <PortionModal
              isOpen={portionModalOpen}
              onClose={() => setPortionModalOpen(false)}
              onConfirm={(grams, portionName) => adjustPortion(grams, portionName)}
              foodName={selectedItem.name}
              defaultGrams={100}
            />
          )}
          {analysis && (
            <MealSummaryModal
              isOpen={summaryOpen}
              items={analysis}
              carbsTotal={carbsTotal}
              insulinSuggested={insulinSuggested}
              summaryMessage={`Refeição: ${mealType} às ${mealTime}. Carboidratos totais: ${carbsTotal.toFixed(1)}g. Insulina sugerida: ${insulinSuggested}u (razão 1u:${insulinRatio}g).`}
              onClose={() => setSummaryOpen(false)}
              onConfirm={handleConfirmSummary}
            />
          )}
        </div>
      </LayoutBase>
    </ProtectedRoute>
  );
};

export default NutricaoPage;