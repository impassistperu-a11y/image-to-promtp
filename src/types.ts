export interface AnalyzedData {
  masterPrompt: string;
  style: string;
  subject: string;
  composition: string;
  lighting: string;
  colors: string;
  palette: string[];
  negativePrompt: string;
  aspectRatio: string;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  imageUrl: string;
  data: AnalyzedData;
}

export interface PresetImage {
  id: string;
  name: string;
  genre: string;
  url: string;
}

export interface PromptModifier {
  id: string;
  title: string;
  category: string; // e.g. 'Lighting Styles', 'Camera Specs', 'Skin & Face Textures', 'Artistic Mediums', etc.
  description?: string;
  content: string;
  isCustom?: boolean;
  createdAt?: number;
}
