import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

// Setup JSON parsing with size limits for base64 image data
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ limit: "25mb", extended: true }));

// Lazy init of GoogleGenAI client to avoid crash on modules load if key is missing
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set. Please add it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

function parseGeminiError(error: any): { cleanMessage: string; isProjectDenied: boolean } {
  let errorMessage = error?.message || "";
  let isProjectDenied = false;

  // If the error message is stringified JSON, try to extract the inner message
  if (typeof errorMessage === "string" && errorMessage.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(errorMessage);
      if (parsed.error) {
        if (parsed.error.message) {
          errorMessage = parsed.error.message;
        }
        if (parsed.error.status === "PERMISSION_DENIED" || parsed.error.code === 403) {
          isProjectDenied = true;
        }
      }
    } catch (e) {
      // Ignore parse failure
    }
  }

  // Fallbacks or broader checks
  if (
    error?.status === "PERMISSION_DENIED" || 
    error?.status === 403 ||
    error?.statusCode === 403 ||
    errorMessage.includes("denied access") || 
    errorMessage.includes("PERMISSION_DENIED") || 
    errorMessage.includes("403")
  ) {
    isProjectDenied = true;
  }

  let cleanMessage = errorMessage;
  if (!cleanMessage && error) {
    cleanMessage = String(error);
  }

  if (
    cleanMessage.includes("experiencing high demand") || 
    cleanMessage.includes("UNAVAILABLE") || 
    cleanMessage.includes("503")
  ) {
    cleanMessage = "El servicio de IA está experimentando una alta demanda temporal. Por favor, reintenta en unos instantes.";
  }

  return { cleanMessage, isProjectDenied };
}

async function generateContentWithRetry(params: {
  contents: any;
  config?: any;
}): Promise<any> {
  const ai = getGenAI();
  // Resilient fallback chain with gemini-3.5-flash-lite as primary engine
  const models = [
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-3.8-flash"
  ];
  let lastError: any = null;

  for (const model of models) {
    try {
      console.log(`Attempting generateContent using model ${model}...`);
      
      const response = await ai.models.generateContent({
        model,
        ...params
      });

      return response;
    } catch (error: any) {
      lastError = error;
      const errStr = String(error?.message || error);
      console.warn(`Attempt failed with model ${model}: ${errStr}`);
      
      // If it's a security block (SAFETY) or invalid schema (validation error), don't retry, it won't help
      if (errStr.includes("SAFETY") || errStr.includes("schema") || errStr.includes("validation")) {
        throw error;
      }
      
      // If it's a 403 / PERMISSION_DENIED (project denied), don't retry
      if (errStr.includes("PERMISSION_DENIED") || errStr.includes("403")) {
        throw error;
      }

      console.log(`Failing over from ${model} to next candidate model...`);
    }
  }

  throw lastError || new Error("All model attempts and fallbacks failed.");
}

// API Routes FIRST
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", apiKeyLoaded: !(!process.env.GEMINI_API_KEY) });
});

// Endpoint to analyze base64 image or a remote URL and return a structured prompt breakdown
app.post("/api/analyze-image", async (req, res) => {
  // Use chunked transfer to keep the connection alive while waiting for the model
  res.setHeader("Content-Type", "application/json");
  // Send a space character every 10 seconds to bypass the 60s proxy timeout
  const keepAlive = setInterval(() => {
    res.write(" ");
  }, 10000);

  try {
    const { 
      image, 
      mimeType, 
      imageUrl, 
      generateLanguage = "English",
      includeHasselbladConditions = true,
      customConditions = ""
    } = req.body;

    if (!image && !imageUrl) {
      clearInterval(keepAlive);
      res.write(JSON.stringify({ success: false, error: "No image base64 or imageUrl provided" }));
      return res.end();
    }

    const ai = getGenAI();
    let imagePart;

    if (image) {
      // Prepare image part: remove data url prefix if present
      let rawBase64 = image;
      if (image.includes("base64,")) {
        rawBase64 = image.split("base64,")[1];
      }
      let detectedMime = mimeType || "image/jpeg";
      if (detectedMime === "image/jpg") {
        detectedMime = "image/jpeg";
      }
      imagePart = {
        inlineData: {
          mimeType: detectedMime,
          data: rawBase64
        }
      };
    } else if (imageUrl) {
      // Download remote image and convert to base64
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) {
        throw new Error(`Failed to fetch image from preset URL: ${imageUrl}`);
      }
      const arrayBuf = await imgRes.arrayBuffer();
      const base64Data = Buffer.from(arrayBuf).toString("base64");
      let detectedMime = imgRes.headers.get("content-type") || "image/jpeg";
      if (detectedMime === "image/jpg") {
        detectedMime = "image/jpeg";
      }
      
      imagePart = {
        inlineData: {
          mimeType: detectedMime,
          data: base64Data
        }
      };
    } else {
      clearInterval(keepAlive);
      res.write(JSON.stringify({ success: false, error: "No valid image payload detected" }));
      return res.end();
    }

    const mandatoryAnalysisRules = includeHasselbladConditions
      ? `
MANDATORY ANALYSIS & PROMPT DELIVERY CONDITIONS:
1. DESCRIPCIÓN EXACTA Y CERO VARIACIÓN DE FACCIONES, RASGOS Y PROPORCIONES (STRICT ZERO-VARIATION IDENTITY & FACIAL FIDELITY):
- Describir exactamente y sin ninguna variación las facciones faciales exactas: contorno de la mandíbula, pómulos, puente y punta de la nariz, grosor y forma de los labios, arco de cupido y mentón.
- Describir con absoluta exactitud las proporciones de la cara (distancia interpupilar, simetría facial, tercio superior, medio e inferior, estructura ósea craneofacial) al máximo nivel de detalle anatómico.
- Describir con fidelidad milimétrica el color exacto de los ojos (tono preciso de iris, degradados, motas de color, reflejo corneal y esclera) y la expresión facial exacta (mirada, tensión ocular, sutil microexpresión emotiva, sin alterar el estado anímico original).
- Describir exactamente sin variación el color exacto de cabello (tonos base, subtonos, reflejos de luz y brillo) y el tipo y estilo exacto de peinado (corte, raya/partición, caída, longitud, volumen, recogido o suelto).

2. DETALLES DEL CABELLO Y ESPECIFICACIONES HASSELBLAD:
- Refinar y profundizar al máximo los detalles del cabello, agregando microtexturas de hebras individuales y flyaways (individual hair strands and flyaways).
- Incorporar iluminación de contorno (rim lighting) dorada y dispersión de subsuperficie (subsurface scattering) para dar translucidez y brillo al cabello.
- Añadir detalles fotorrealistas de la piel (poros y texturas visibles) en las manos y el cuello.
- Optimizar la toma con especificaciones de cámara profesional de formato medio (Hasselblad H6D-100c, lente de 100mm) para lograr un enfoque comercial ultra nítido y de alta fidelidad.

3. ROSTRO ULTRA-DETALLADO Y MICROTEXTURA DE PIEL:
- Refinar y profundizar al máximo los detalles del rostro humano (Ultra-detailed human face focusing on an expressive look).
- Detalle extremo en microtextura de piel (Extreme detail on skin microtexture), mostrando poros de piel altamente definidos y realistas (highly defined realistic skin pores), vello fino y natural (fine natural peach fuzz), y delicada dispersión de subsuperficie (delicate subsurface scattering).
- Ojos expresivos, destellos de luz natural e iris detallados, textura visible en pestañas y labios.
${customConditions ? `4. CONDICIONES ADICIONALES DEL USUARIO:\n${customConditions}` : ""}

Ensure the generated masterPrompt strictly incorporates these exact facial features, exact hair specs, and camera specifications whenever humans, portraits, subjects, or figures appear in or relate to the scene.`
      : (customConditions ? `\nUSER SPECIFIC CONDITIONS:\n${customConditions}` : "");

    const textPart = {
      text: `Analyze this image in extreme detail and generate the ultimate image generation prompt (ideal for Midjourney, Stable Diffusion, DALL-E 3, or Imagen) that would reconstruct this exact image. Write the master prompt in ${generateLanguage === "Spanish" ? "Spanish" : "English (highly recommended for generator models)"}. Provide details for each visual component in Spanish so the user can understand the analysis and modify elements.

${mandatoryAnalysisRules}`
    };

    // Configure a solid json schema to receive structured breakdown fields
    const response = await generateContentWithRetry({
      contents: { parts: [imagePart, textPart] },
      config: {
        systemInstruction: "You are the world's leading AI Art Engineer and Reverse Prompt Generator. Your goal is to deconstruct images into extremely powerful, detail-packed prompts, and provide a detailed analysis of style, composition, subject, lighting, and colors. You must strictly describe without ANY variation the exact facial features, exact eye color and expressions, exact hair color and hairstyle, and exact facial proportions at maximum detail, while incorporating mandatory hair microtexture, skin subsurface scattering, and Hasselblad H6D-100c medium format specs into the delivered master prompt.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            masterPrompt: {
              type: Type.STRING,
              description: "The complete, optimized keyphrase-heavy image generator prompt to match the visual style, contents, and vibes of the image. Should include camera details, aesthetic details, and medium."
            },
            style: {
              type: Type.STRING,
              description: "Brief analysis of the style/medium, e.g. Cinematic, Watercolor, 3D Render, Oil Painting, Brutalist, Retro Synthwave (in Spanish)."
            },
            subject: {
              type: Type.STRING,
              description: "Detailed description of the primary and secondary subjects, including actions, details, clothing, facial expression (in Spanish)."
            },
            composition: {
              type: Type.STRING,
              description: "The framing, perspective, camera angle, and lens details, e.g. Close up, shot with 85mm lens, high angle, Rule of Thirds (in Spanish)."
            },
            lighting: {
              type: Type.STRING,
              description: "The light sources, shadows, intensity, and direction. E.g. Backlit, sunset golden hour, volumetric light, neon glow (in Spanish)."
            },
            colors: {
              type: Type.STRING,
              description: "Color palette description, contrast level, e.g. Warm tones, muted pastel colors, dark high-contrast monochrome (in Spanish)."
            },
            palette: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "An array of 5 hex color codes representing the dominant colors of the image (e.g., ['#ff003e', '#1a2238', ...])"
            },
            negativePrompt: {
              type: Type.STRING,
              description: "Proposed negative prompts or things to avoid when transferring this idea (e.g., blurry, distorted faces, wrong text) (in Spanish)."
            },
            aspectRatio: {
              type: Type.STRING,
              description: "Best matching aspect ratio for generation, e.g., '16:9', '1:1', '4:3', '9:16', '21:9'"
            }
          },
          required: ["masterPrompt", "style", "subject", "composition", "lighting", "colors", "palette", "negativePrompt", "aspectRatio"]
        }
      }
    });

    let resultText = response.text;
    
    // Check fallback if response.text is empty
    if (!resultText && response.candidates?.[0]?.content?.parts?.[0]?.text) {
      resultText = response.candidates[0].content.parts[0].text;
    }

    if (!resultText) {
      const candidate = response.candidates?.[0];
      const finishReason = candidate?.finishReason;
      const safetyRatings = candidate?.safetyRatings;
      console.warn("Empty response received from Gemini API. Details:", {
        finishReason,
        safetyRatings,
        response: JSON.stringify(response)
      });
      if (finishReason === "SAFETY") {
        throw new Error("El análisis de la imagen fue bloqueado por los filtros de seguridad de la API de Gemini.");
      }
      throw new Error(`Empty response received from Gemini API (Finish reason: ${finishReason || "unknown"}). Por favor, intenta de nuevo con otra imagen.`);
    }

    const analyzedData = JSON.parse(resultText);
    clearInterval(keepAlive);
    res.write(JSON.stringify({ success: true, data: analyzedData }));
    res.end();

  } catch (error: any) {
    console.error("Error analyzing image:", error);
    const { cleanMessage, isProjectDenied } = parseGeminiError(error);
                            
    clearInterval(keepAlive);
    res.write(JSON.stringify({ 
      success: false, 
      error: cleanMessage || "Failed to analyze image",
      isKeyMissing: !process.env.GEMINI_API_KEY,
      isProjectDenied: isProjectDenied
    }));
    res.end();
  }
});

// Endpoint to enhance/modify the generated prompt based on user instructions
app.post("/api/enhance-prompt", async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  const keepAlive = setInterval(() => {
    res.write(" ");
  }, 10000);

  try {
    const { prompt, instructions, language = "English" } = req.body;
    if (!prompt || !instructions) {
      clearInterval(keepAlive);
      res.write(JSON.stringify({ success: false, error: "Missing prompt or instructions" }));
      return res.end();
    }

    const ai = getGenAI();
    const systemPrompt = `You are an AI prompt engineering expert for generative models like Midjourney, Stable Diffusion, and Imagen.
The user has an existing prompt and wants to modify or enhance it according to instructions: "${instructions}".

Your goal is to carefully integrate these instructions into the prompt:
1. Keep the prompt as a highly dense, keyphrase-rich generator prompt with technical terms (like lighting, camera model, lens, composition).
2. ZERO-VARIATION FACIAL FIDELITY MANDATE: When dealing with human faces, portraits, or characters, strictly describe without any variation the exact facial features, exact eye color and subtle micro-expressions, exact hair color and exact hairstyle/cut, and exact facial proportions at maximum anatomical fidelity.
3. If the user instructions mention facial or skin details ("detalles faciales", "rostro", "facial", "face", "skin", "ojos", "piel", "facciones", "proporciones"), ensure the prompt is supercharged with high-fidelity terms: "ultra-detailed expressive human face, exact facial features and bone structure, highly defined realistic skin pores, fine natural peach fuzz, realistic iris reflections, caught-light, natural eye glints, delicate subsurface scattering, 8k resolution, sharp focus, eyelashes texture".
4. If hair details or photographic camera specs are requested or modified ("cabello", "hair", "hasselblad", "cámara", "lighting", "peinado"), incorporate: "microtexturas de hebras individuales, natural flyaways, exact hair color and styling, golden rim lighting, subsurface scattering on hair for translucency and shine, visible skin pores on neck and hands, shot on medium format Hasselblad H6D-100c with 100mm lens, ultra-sharp commercial focus".
5. Deliver the enhanced prompt in ${language === "Spanish" ? "Spanish" : "English"}.`;

    const response = await generateContentWithRetry({
      contents: `Existing prompt: ${prompt}\n\nInstructions to modify: ${instructions}`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            enhancedPrompt: {
              type: Type.STRING,
              description: "The newly updated, expanded, and optimized image generation prompt."
            },
            changesApplied: {
              type: Type.STRING,
              description: "Brief summary in Spanish of what changes were applied and why."
            }
          },
          required: ["enhancedPrompt", "changesApplied"]
        }
      }
    });

    let resultText = response.text;
    if (!resultText && response.candidates?.[0]?.content?.parts?.[0]?.text) {
      resultText = response.candidates[0].content.parts[0].text;
    }

    if (!resultText) {
      const candidate = response.candidates?.[0];
      const finishReason = candidate?.finishReason;
      console.warn("Empty response from Gemini API when enhancing prompt. Details:", {
        finishReason,
        response: JSON.stringify(response)
      });
      if (finishReason === "SAFETY") {
        throw new Error("El proceso de optimización del prompt fue bloqueado por los filtros de seguridad de la API de Gemini.");
      }
      throw new Error(`Empty response from Gemini API (Finish reason: ${finishReason || "unknown"}).`);
    }

    res.write(JSON.stringify({ success: true, data: JSON.parse(resultText) }));
    res.end();
  } catch (error: any) {
    console.error("Error enhancing prompt:", error);
    const { cleanMessage, isProjectDenied } = parseGeminiError(error);

    clearInterval(keepAlive);
    res.write(JSON.stringify({ 
      success: false, 
      error: cleanMessage || "Failed to enhance prompt",
      isKeyMissing: !process.env.GEMINI_API_KEY,
      isProjectDenied: isProjectDenied
    }));
    res.end();
  }
});

async function startServer() {
  // Vite middleware for development / Static routing for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
