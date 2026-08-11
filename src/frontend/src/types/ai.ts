export type AiProvider = 'OpenAI' | 'Anthropic' | 'Gemini';
export type AiContext = 'Bom' | 'Route';
export type AiFieldType = 'condition' | 'formula';

export const AI_PROVIDERS: AiProvider[] = ['OpenAI', 'Anthropic', 'Gemini'];

export interface ProviderConfig {
  provider: AiProvider;
  model: string;
  enabled: boolean;
  hasKey: boolean;
}

export interface AiInstruction {
  context: AiContext;
  systemInstructions: string;
}

export interface AiSettings {
  activeProvider: AiProvider;
  groundingEnabled: boolean;
  groundingFileName: string | null;
  providers: ProviderConfig[];
  instructions: AiInstruction[];
}

export interface UpdateProviderConfigRequest {
  provider: AiProvider;
  model: string;
  enabled: boolean;
  apiKey?: string | null;
}

export interface UpdateInstructionRequest {
  context: AiContext;
  systemInstructions: string;
}

export interface UpdateAiSettingsRequest {
  activeProvider: AiProvider;
  groundingEnabled: boolean;
  providers: UpdateProviderConfigRequest[];
  instructions: UpdateInstructionRequest[];
}

export interface TranslateRequest {
  context: AiContext;
  fieldType: AiFieldType;
  naturalLanguage: string;
}

export interface TranslateResponse {
  expression: string;
  provider: AiProvider;
  model: string;
}

export interface TestProviderResponse {
  success: boolean;
  message: string;
}
