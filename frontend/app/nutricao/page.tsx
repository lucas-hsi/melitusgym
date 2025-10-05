"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import LayoutBase from "@/components/layout/LayoutBase";
import { useDaySelector } from "@/hooks/useDaySelector";
import { useHealth } from "@/contexts/HealthContext";
import PortionModal from "@/components/PortionModal";
import { 
  Camera, 
  Search, 
  Plus, 
  Save,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  Trash2
} from "lucide-react";

// TensorFlow.js imports
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

interface FoodItem {
  id: string;
  name: string;
  grams: number;
  source: 'camera' | 'manual';
  barcode?: string;
  nutrition?: {
    kcal: number;
    carbs_g: number;
    sodium_mg: number;
  };
}

interface OpenFoodFactsProduct {
  code: string;
  product_name: string;
  brands?: string;
  nutriments: {
    'energy-kcal_100g'?: number;
    'carbohydrates_100g'?: number;
    'sodium_100g'?: number;
  };
}

type TabType = 'camera' | 'manual';

const FOOD_CLASSES = [
  'apple', 'banana', 'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog',
  'pizza', 'donut', 'cake', 'chair', 'couch', 'potted plant', 'bed',
  'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote', 'keyboard',
  'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator',
  'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
];

const FOOD_RELATED_CLASSES = [
  'apple', 'banana', 'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog',
  'pizza', 'donut', 'cake', 'dining table', 'microwave', 'oven', 'toaster',
  'refrigerator'
];

export default function NutricaoPage() {
  const { selectedDate, getDayLabel } = useDaySelector();
  const { state } = useHealth();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('camera');
  
  // Current dish state
  const [currentDish, setCurrentDish] = useState<FoodItem[]>([]);
  
  // Camera states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
  const [detections, setDetections] = useState<any[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [currentCameraId, setCurrentCameraId] = useState<string | null>(null);
  
  // Manual search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<OpenFoodFactsProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [dishTotals, setDishTotals] = useState({ carbs_g: 0, sodium_mg: 0, kcal: 0 });
  const [customPortion, setCustomPortion] = useState('');
  
  // Portion modal states
  const [showPortionModal, setShowPortionModal] = useState(false);
  const [selectedFoodForPortion, setSelectedFoodForPortion] = useState<{
    name: string;
    source: 'camera' | 'manual';
    product?: OpenFoodFactsProduct;
  } | null>(null);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Load TensorFlow.js model
  useEffect(() => {
    const loadModel = async () => {
      try {
        setIsModelLoading(true);
        await tf.ready();
        const loadedModel = await cocoSsd.load();
        setModel(loadedModel);
      } catch (error) {
        console.error('Error loading COCO-SSD model:', error);
      } finally {
        setIsModelLoading(false);
      }
    };
    
    loadModel();
  }, []);
  
  // Enumerate available cameras
  const enumerateCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setAvailableCameras(videoDevices);
      return videoDevices;
    } catch (error) {
      console.error('Error enumerating cameras:', error);
      return [];
    }
  };

  // Start camera with iOS compatibility and fallback
  const startCamera = async (deviceId?: string) => {
    try {
      // Enumerate cameras first if not done yet
      if (availableCameras.length === 0) {
        await enumerateCameras();
      }

      // Try environment camera first with proper constraints
      let stream;
      try {
        const constraints: MediaStreamConstraints = {
          video: deviceId ? {
            deviceId: { exact: deviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } : {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        };
        
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (envError: any) {
        console.warn('Environment camera failed:', envError.name, envError.message);
        
        // Specific retry for OverconstrainedError and NotReadableError
        if (envError.name === 'OverconstrainedError' || envError.name === 'NotReadableError') {
          console.log('Retrying with user camera due to constraint/hardware error');
        }
        
        // Fallback to front camera
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: false
          });
        } catch (fallbackError) {
          console.error('Both cameras failed:', fallbackError);
          throw fallbackError;
        }
      }
      
      if (videoRef.current && stream) {
        const video = videoRef.current;
        video.srcObject = stream;
        streamRef.current = stream;
        
        // iOS compatibility settings
        video.setAttribute('playsinline', 'true');
        video.muted = true;
        video.autoplay = true;
        
        // Wait for 'canplay' event instead of 'loadedmetadata'
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Video canplay timeout'));
          }, 10000); // 10 second timeout
          
          video.oncanplay = () => {
            clearTimeout(timeout);
            console.log('Video canplay event fired, readyState:', video.readyState);
            resolve(undefined);
          };
          
          video.onerror = (error) => {
            clearTimeout(timeout);
            reject(error);
          };
        });
        
        // Play video after canplay event
        try {
          await video.play();
          console.log('Video play() successful');
        } catch (playError) {
          console.error('Video play() failed:', playError);
          throw playError;
        }
        
        // Log video and track state for debugging
        console.log('Final video readyState:', video.readyState);
        console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);
        
        if (stream.getVideoTracks().length > 0) {
          const track = stream.getVideoTracks()[0];
          console.log('Track readyState:', track.readyState);
          console.log('Track settings:', track.getSettings());
          setCurrentCameraId(track.getSettings().deviceId || null);
        }
        
        setIsCameraActive(true);
      }
    } catch (error: any) {
      console.error('Error accessing camera:', error.name, error.message);
      alert(`Erro ao acessar a câmera: ${error.message}. Verifique as permissões.`);
    }
  };

  // Switch camera
  const switchCamera = async (deviceId: string) => {
    if (isCameraActive) {
      stopCamera();
      setTimeout(() => startCamera(deviceId), 100);
    }
  };
  
  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setDetections([]);
  };
  
  // Detect objects in video
  const detectObjects = useCallback(async () => {
    if (!model || !videoRef.current || !canvasRef.current || isDetecting) return;
    
    setIsDetecting(true);
    
    try {
      const predictions = await model.detect(videoRef.current);
      
      // Filter for food-related objects
      const foodDetections = predictions.filter(prediction => 
        FOOD_RELATED_CLASSES.includes(prediction.class) && prediction.score > 0.5
      );
      
      setDetections(foodDetections);
      
      // Draw bounding boxes
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx && videoRef.current) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        foodDetections.forEach(detection => {
          const [x, y, width, height] = detection.bbox;
          
          // Draw bounding box
          ctx.strokeStyle = '#00ff00';
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, width, height);
          
          // Draw label
          ctx.fillStyle = '#00ff00';
          ctx.font = '16px Arial';
          ctx.fillText(
            `${detection.class} (${Math.round(detection.score * 100)}%)`,
            x,
            y > 20 ? y - 5 : y + 20
          );
        });
      }
    } catch (error) {
      console.error('Error detecting objects:', error);
    } finally {
      setIsDetecting(false);
    }
  }, [model, isDetecting]);
  
  // Auto-detect when camera is active
  useEffect(() => {
    if (isCameraActive && model) {
      const interval = setInterval(detectObjects, 1000); // Detect every second
      return () => clearInterval(interval);
    }
  }, [isCameraActive, model, detectObjects]);
  
  // Search OpenFoodFacts with debounce
  const searchFoods = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://127.0.0.1:8000/nutrition/foods?q=${encodeURIComponent(query)}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.products || []);
      } else {
        console.error('Erro na busca:', response.statusText);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Erro na busca:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);
  
  // Handle search input with debounce
  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }
    
    const timer = setTimeout(() => {
      searchFoods(value);
    }, 500);
    
    setSearchDebounceTimer(timer);
  };
  
  // Add food from camera detection
  const addFoodFromCamera = (detection: any) => {
    setSelectedFoodForPortion({
      name: detection.class,
      source: 'camera'
    });
    setShowPortionModal(true);
  };
  
  // Add food from manual search
  const addFoodFromSearch = (product: OpenFoodFactsProduct) => {
    setSelectedFoodForPortion({
      name: product.product_name,
      source: 'manual',
      product
    });
    setShowPortionModal(true);
  };
  
  // Handle portion confirmation
  const handlePortionConfirm = (grams: number) => {
    if (!selectedFoodForPortion) return;
    
    const newFood: FoodItem = {
      id: Date.now().toString(),
      name: selectedFoodForPortion.name,
      grams,
      source: selectedFoodForPortion.source,
      barcode: selectedFoodForPortion.product?.code
    };
    
    setCurrentDish(prev => [...prev, newFood]);
    setShowPortionModal(false);
    setSelectedFoodForPortion(null);
  };
  
  const calculateLocalTotals = (items: any[]) => {
    const totals = { carbs_g: 0, sodium_mg: 0, kcal: 0 };
    
    items.forEach(item => {
      const nutriments = item.nutriments || {};
      const factor = item.grams / 100;
      
      totals.carbs_g += (nutriments.carbohydrates_100g || 0) * factor;
      totals.sodium_mg += (nutriments.sodium_100g || 0) * factor;
      
      // Handle energy conversion
      if (nutriments['energy-kcal_100g']) {
        totals.kcal += nutriments['energy-kcal_100g'] * factor;
      } else if (nutriments.energy_100g) {
        totals.kcal += (nutriments.energy_100g / 4.184) * factor;
      }
    });
    
    return {
      carbs_g: Math.round(totals.carbs_g * 10) / 10,
      sodium_mg: Math.round(totals.sodium_mg * 10) / 10,
      kcal: Math.round(totals.kcal * 10) / 10
    };
  };

  // Remove food from current dish
  const removeFoodFromDish = (id: string) => {
    const updatedDish = currentDish.filter(item => item.id !== id);
    setCurrentDish(updatedDish);
    setDishTotals(calculateLocalTotals(updatedDish));
  };
  
  // Save meal
  const saveMeal = async () => {
    if (currentDish.length === 0) {
      alert('Adicione pelo menos um alimento ao prato atual.');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://127.0.0.1:8000/nutrition/analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items: currentDish.map(item => ({
            name: item.name,
            code: item.barcode || null,
            grams: item.grams
          })),
          meal_time: 'lunch'
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Refeição salva:', result);
        
        // Use totals from the response
        const totals = result.totals || {
          carbs_g: 0,
          sodium_mg: 0,
          kcal: 0
        };
        
        alert(`Refeição salva com sucesso!\n\nTotais:\nCarboidratos: ${totals.carbs_g}g\nSódio: ${totals.sodium_mg}mg\nCalorias: ${totals.kcal} kcal`);
        
        // Clear current dish and reset totals
        setCurrentDish([]);
        setDishTotals({ carbs_g: 0, sodium_mg: 0, kcal: 0 });
      } else {
        console.error('Erro ao salvar refeição:', response.statusText);
        alert('Erro ao salvar refeição.');
      }
    } catch (error) {
      console.error('Erro ao salvar refeição:', error);
      alert('Erro ao salvar refeição.');
    }
  };
  
  // Add food to current dish
  const addFoodToDish = (food: any, grams: number) => {
    const newItem = {
      ...food,
      grams,
      id: Date.now().toString()
    };
    const updatedDish = [...currentDish, newItem];
    setCurrentDish(updatedDish);
    setDishTotals(calculateLocalTotals(updatedDish));
  };
  

  
  return (
    <LayoutBase>
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 p-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Nutrição</h1>
          <p className="text-gray-600">{getDayLabel()}</p>
        </div>
        
        {/* Tabs */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-1 mb-6 flex">
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
              activeTab === 'camera'
                ? 'bg-white text-blue-600 shadow-md'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Camera className="w-5 h-5 inline mr-2" />
            Câmera
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
              activeTab === 'manual'
                ? 'bg-white text-blue-600 shadow-md'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Search className="w-5 h-5 inline mr-2" />
            Manual
          </button>
        </div>
        
        {/* Camera Tab */}
        {activeTab === 'camera' && (
          <div className="space-y-6">
            {isModelLoading && (
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
                <p className="text-gray-600">Carregando modelo de IA...</p>
              </div>
            )}
            
            {!isCameraActive && !isModelLoading && (
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 text-center">
                <Camera className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Detectar Alimentos</h3>
                <p className="text-gray-600 mb-4">Use a câmera para identificar alimentos automaticamente</p>
                <button
                  onClick={() => startCamera()}
                  disabled={!model}
                  className="bg-blue-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  Iniciar Câmera
                </button>
              </div>
            )}
            
            {isCameraActive && (
              <div className="bg-white/80 rounded-2xl p-4">
                <div className="relative aspect-video bg-black rounded-xl overflow-hidden" style={{ minHeight: '300px' }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ aspectRatio: '16/9' }}
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute top-0 left-0 w-full h-full pointer-events-none bg-transparent"
                  />
                  
                  <button
                    onClick={stopCamera}
                    className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  
                  {/* Camera selector */}
                  {availableCameras.length > 1 && (
                    <div className="absolute top-4 left-4">
                      <select
                        value={currentCameraId || ''}
                        onChange={(e) => switchCamera(e.target.value)}
                        className="bg-black/50 text-white text-sm rounded-lg px-2 py-1 border-none outline-none"
                      >
                        {availableCameras.map((camera, index) => (
                          <option key={camera.deviceId} value={camera.deviceId}>
                            {camera.label || `Câmera ${index + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                
                {detections.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Alimentos Detectados:</h4>
                    <div className="space-y-2">
                      {detections.map((detection, index) => (
                        <div key={index} className="flex items-center justify-between bg-white/80 rounded-lg p-3">
                          <div>
                            <span className="font-medium text-gray-800">{detection.class}</span>
                            <span className="text-sm text-gray-600 ml-2">
                              ({Math.round(detection.score * 100)}% confiança)
                            </span>
                          </div>
                          <button
                            onClick={() => addFoodFromCamera(detection)}
                            className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-green-600 transition-colors"
                          >
                            <Plus className="w-4 h-4 inline mr-1" />
                            Adicionar
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Manual Tab */}
        {activeTab === 'manual' && (
          <div className="space-y-6">
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Buscar Alimentos</h3>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  placeholder="Digite o nome do alimento..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 animate-spin" />
                )}
              </div>
              
              {searchResults.length > 0 && (
                <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                  {searchResults.map((product) => (
                    <div key={product.code} className="flex items-center justify-between bg-white/80 rounded-lg p-3">
                      <div>
                        <div className="font-medium text-gray-800">{product.product_name}</div>
                        {product.brands && (
                          <div className="text-sm text-gray-600">{product.brands}</div>
                        )}
                      </div>
                      <button
                        onClick={() => addFoodFromSearch(product)}
                        className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-green-600 transition-colors"
                      >
                        <Plus className="w-4 h-4 inline mr-1" />
                        Adicionar
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {searchQuery && !isSearching && searchResults.length === 0 && (
                <div className="mt-4 text-center text-gray-500">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                  <p>Nenhum alimento encontrado</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Current Dish */}
        {currentDish.length > 0 && (
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Prato Atual</h3>
              <div className="text-sm text-gray-600">
                {currentDish.length} {currentDish.length === 1 ? 'item' : 'itens'}
              </div>
            </div>
            
            <div className="space-y-3 mb-4">
              {currentDish.map((item) => (
                <div key={item.id} className="flex items-center justify-between bg-white/80 rounded-lg p-3">
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">{item.name}</div>
                    <div className="text-sm text-gray-600">
                      {item.grams}g • {item.source === 'camera' ? 'Câmera' : 'Manual'}
                    </div>
                  </div>
                  <button
                    onClick={() => removeFoodFromDish(item.id)}
                    className="text-red-500 hover:text-red-700 transition-colors p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            
            {/* Totals */}
            <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg border border-blue-200 mb-4">
              <h4 className="font-semibold text-gray-800 mb-2">Totais Nutricionais</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-blue-600">{dishTotals.kcal.toFixed(1)}</div>
                  <div className="text-gray-600">kcal</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-green-600">{dishTotals.carbs_g.toFixed(1)}</div>
                  <div className="text-gray-600">carbs (g)</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-orange-600">{dishTotals.sodium_mg.toFixed(1)}</div>
                  <div className="text-gray-600">sódio (mg)</div>
                </div>
              </div>
            </div>
            
            <button
              onClick={saveMeal}
              className="w-full bg-green-500 text-white py-3 rounded-xl font-medium hover:bg-green-600 transition-colors flex items-center justify-center"
            >
              <Save className="w-5 h-5 mr-2" />
              Salvar Refeição
            </button>
          </div>
        )}
        
        {/* Portion Modal */}
        {showPortionModal && selectedFoodForPortion && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Definir Porção (g)</h3>
              <p className="text-gray-600 mb-4">
                {selectedFoodForPortion.name}
                {selectedFoodForPortion.product?.brands && <span className="text-sm text-gray-500"> - {selectedFoodForPortion.product.brands}</span>}
              </p>
              
              {/* Preset buttons */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Porções rápidas
                </label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[50, 80, 100].map(preset => (
                    <button
                      key={preset}
                      onClick={() => setCustomPortion(preset.toString())}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-blue-50 hover:border-blue-300 focus:ring-2 focus:ring-blue-500"
                    >
                      {preset}g
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantidade personalizada (gramas)
                </label>
                <input
                  type="number"
                  value={customPortion}
                  onChange={(e) => setCustomPortion(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: 150"
                  min="1"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPortionModal(false);
                    setSelectedFoodForPortion(null);
                    setCustomPortion('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const grams = parseFloat(customPortion);
                    if (grams > 0) {
                      handlePortionConfirm(grams);
                      setCustomPortion('');
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  disabled={!customPortion || parseFloat(customPortion) <= 0}
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </LayoutBase>
  );
}