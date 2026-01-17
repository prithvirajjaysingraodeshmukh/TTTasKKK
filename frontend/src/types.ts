export interface AnalysisSummary {
  Rural: number;
  Suburban: number;
  Urban: number;
  Dense: number;
}

export interface AnalysisResponse {
  summary: AnalysisSummary;
  preview: Record<string, any>[];
  total_rows: number;
  messages: string[];
  download_url: string | null;
}

export interface AnalysisRequestParams {
  radius_km: number;
  co_location_threshold_m: number;
  classification_mode: 'quantile' | 'threshold';
  rural_threshold?: number;
  suburban_threshold?: number;
  urban_threshold?: number;
}
