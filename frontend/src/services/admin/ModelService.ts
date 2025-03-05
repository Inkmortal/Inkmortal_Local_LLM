/**
 * Model management service for admin dashboard
 */

import { fetchApi } from '../../config/api';
import { API_PATHS } from './ApiPaths';

// Model interface
export interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
  is_active: boolean;
}

// Response interfaces
export interface ModelsResponse {
  models: OllamaModel[];
  active_model: string;
}

export interface ModelUpdateResponse {
  success: boolean;
  model: string;
  message: string;
}

/**
 * Fetch available models from Ollama
 */
export const fetchModels = async (): Promise<ModelsResponse | null> => {
  try {
    const response = await fetchApi<ModelsResponse>(API_PATHS.ADMIN.MODELS);
    
    if (!response.success) {
      throw new Error(`Failed to fetch models: ${response.error || response.status}`);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error fetching models:', error);
    return null;
  }
};

/**
 * Set the active model in Ollama
 */
export const setActiveModel = async (modelName: string): Promise<ModelUpdateResponse | null> => {
  try {
    const response = await fetchApi<ModelUpdateResponse>(API_PATHS.ADMIN.SET_MODEL, {
      method: 'PUT',
      body: JSON.stringify({ model: modelName }),
    });
    
    if (!response.success) {
      throw new Error(`Failed to set active model: ${response.error || response.status}`);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error setting active model:', error);
    return null;
  }
};