export interface DetectedFoodItem {
  class: string;
  score: number; // 0-1
}

// Tipo para evitar necessidade de importar no topo em ambiente SSR
type CocoSsdModule = typeof import('@tensorflow-models/coco-ssd');

let modelPromise: Promise<any> | null = null;

/**
 * Carrega o modelo coco-ssd (lazy singleton) apenas no browser.
 * Em ambiente SSR, retorna stub que não faz nada para evitar erros de import.
 */
async function loadModel(): Promise<any> {
  if (typeof window === 'undefined') {
    // Estamos no lado do servidor – retornar objeto mock para evitar importar tfjs
    return {
      // detect retorna array vazio em SSR
      detect: async () => [] as any[],
    };
  }

  if (!modelPromise) {
    // Importa dinamicamente apenas no client para evitar que o Next tente bundlear no lado do servidor
    const tf = await import(/* webpackChunkName: "tfjs" */ '@tensorflow/tfjs');
    await import(/* webpackChunkName: "tfjs-backend" */ '@tensorflow/tfjs-backend-webgl');
    const cocoSsd: CocoSsdModule = await import(/* webpackChunkName: "coco-ssd" */ '@tensorflow-models/coco-ssd');
    await (tf as any).setBackend('webgl');
    modelPromise = cocoSsd.load({ base: 'lite_mobilenet_v2' });
  }
  return modelPromise;
}

/**
 * Detecta possíveis itens de comida em uma imagem DataURL.
 * Retorna as classes detectadas com maior confiança (>0.3).
 */
export async function detectFoodFromDataUrl(dataUrl: string): Promise<DetectedFoodItem[]> {
  const model = await loadModel();
  if (!model || typeof window === 'undefined') {
    return [];
  }

  // Cria elemento Image para inferência
  const img = new Image();
  img.src = dataUrl;

  await new Promise((resolve, reject) => {
    img.onload = () => resolve(null);
    img.onerror = reject;
  });

  const predictions = await model.detect(img);

  // Filtra previsões de alimentos (heurística simples: subset de classes de interesse)
  const foodClasses = new Set([
    'banana','apple','orange','broccoli','carrot','hot dog','pizza','donut','cake','sandwich','bowl','cup','wine glass','bottle','spoon','fork','knife'
  ]);

  return predictions
    .filter((p: any) => foodClasses.has(p.class) && p.score >= 0.3)
    .map((p: any) => ({ class: p.class, score: p.score }));
}