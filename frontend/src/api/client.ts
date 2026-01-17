import axios from 'axios';
import { AnalysisResponse, AnalysisRequestParams } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes for large files
});

export const analyzeSites = async (
  file: File,
  params: AnalysisRequestParams
): Promise<AnalysisResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const queryParams = new URLSearchParams();
  queryParams.append('radius_km', params.radius_km.toString());
  queryParams.append('co_location_threshold_m', params.co_location_threshold_m.toString());
  queryParams.append('classification_mode', params.classification_mode);
  
  if (params.rural_threshold !== undefined) {
    queryParams.append('rural_threshold', params.rural_threshold.toString());
  }
  if (params.suburban_threshold !== undefined) {
    queryParams.append('suburban_threshold', params.suburban_threshold.toString());
  }
  if (params.urban_threshold !== undefined) {
    queryParams.append('urban_threshold', params.urban_threshold.toString());
  }

  const response = await apiClient.post<AnalysisResponse>(
    `/analyze?${queryParams.toString()}`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
};

export const downloadResults = async (
  file: File,
  params: AnalysisRequestParams
): Promise<Blob> => {
  const formData = new FormData();
  formData.append('file', file);

  const queryParams = new URLSearchParams();
  queryParams.append('radius_km', params.radius_km.toString());
  queryParams.append('co_location_threshold_m', params.co_location_threshold_m.toString());
  queryParams.append('classification_mode', params.classification_mode);
  
  if (params.rural_threshold !== undefined) {
    queryParams.append('rural_threshold', params.rural_threshold.toString());
  }
  if (params.suburban_threshold !== undefined) {
    queryParams.append('suburban_threshold', params.suburban_threshold.toString());
  }
  if (params.urban_threshold !== undefined) {
    queryParams.append('urban_threshold', params.urban_threshold.toString());
  }

  const response = await apiClient.post(
    `/download?${queryParams.toString()}`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      responseType: 'blob',
    }
  );

  return response.data;
};
