import { useState, type DragEvent, type ChangeEvent } from 'react';
import {
  Box,
  Paper,
  Typography,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { analyzeSites } from '../api/client';
import { AnalysisRequestParams, AnalysisResponse } from '../types';

interface ConfigurationPanelProps {
  onAnalysisComplete: (result: AnalysisResponse) => void;
  onError: (error: string) => void;
  onLoading: (loading: boolean) => void;
}

const ConfigurationPanel = ({
  onAnalysisComplete,
  onError,
  onLoading,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(2.0);
  const [coLocationThresholdM, setCoLocationThresholdM] = useState<number>(100.0);
  const [classificationMode, setClassificationMode] = useState<'quantile' | 'threshold'>('quantile');
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile && selectedFile.name.endsWith('.csv')) {
      setFile(selectedFile);
      onError('');
    } else {
      onError('Please select a valid CSV file');
    }
  };

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      onError('Please select a CSV file first');
      return;
    }

    onLoading(true);
    onError('');

    try {
      const params: AnalysisRequestParams = {
        radius_km: radiusKm,
        co_location_threshold_m: coLocationThresholdM,
        classification_mode: classificationMode,
      };

      const result = await analyzeSites(file, params);
      onAnalysisComplete(result);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'An error occurred during analysis';
      onError(errorMessage);
    } finally {
      onLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3, borderRadius: 2, height: 'fit-content', position: 'sticky', top: 24 }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
        Configuration
      </Typography>

      {/* File Upload */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
          CSV File Upload
        </Typography>
        <Box
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          sx={{
            border: '2px dashed',
            borderColor: dragActive ? 'primary.main' : 'grey.300',
            borderRadius: 2,
            p: 4,
            textAlign: 'center',
            bgcolor: dragActive ? 'action.hover' : 'background.paper',
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: 'action.hover',
            },
          }}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <input
            id="file-input"
            type="file"
            accept=".csv"
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />
          <CloudUploadIcon
            sx={{
              fontSize: 56,
              color: dragActive ? 'primary.main' : 'text.secondary',
              mb: 1.5,
              transition: 'color 0.2s',
            }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            {file ? (
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  {file.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Click to change file
                </Typography>
              </Box>
            ) : (
              'Drag & drop CSV file here or click to browse'
            )}
          </Typography>
        </Box>
      </Box>

      {/* Radius Slider */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Density Radius
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 700, color: 'primary.main' }}>
            {radiusKm.toFixed(1)} km
          </Typography>
        </Box>
        <Slider
          value={radiusKm}
          onChange={(_, value) => setRadiusKm(value as number)}
          min={0.1}
          max={10.0}
          step={0.1}
          marks={[
            { value: 0.5, label: '0.5km' },
            { value: 2.0, label: '2km' },
            { value: 5.0, label: '5km' },
            { value: 10.0, label: '10km' },
          ]}
          sx={{ mt: 1 }}
        />
      </Box>

      {/* Co-location Threshold Slider */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Co-location Threshold
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 700, color: 'primary.main' }}>
            {coLocationThresholdM.toFixed(0)} m
          </Typography>
        </Box>
        <Slider
          value={coLocationThresholdM}
          onChange={(_, value) => setCoLocationThresholdM(value as number)}
          min={1}
          max={1000}
          step={10}
          marks={[
            { value: 50, label: '50m' },
            { value: 100, label: '100m' },
            { value: 500, label: '500m' },
            { value: 1000, label: '1000m' },
          ]}
          sx={{ mt: 1 }}
        />
      </Box>

      {/* Classification Mode */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
          Classification Mode
        </Typography>
        <FormControl fullWidth>
          <InputLabel>Mode</InputLabel>
          <Select
            value={classificationMode}
            onChange={(e) => setClassificationMode(e.target.value as 'quantile' | 'threshold')}
            label="Mode"
          >
            <MenuItem value="quantile">Quantile (per cluster)</MenuItem>
            <MenuItem value="threshold">Threshold (fixed values)</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Analyze Button */}
      <Button
        variant="contained"
        fullWidth
        size="large"
        onClick={handleAnalyze}
        disabled={!file}
        sx={{ py: 1.5, fontWeight: 600, borderRadius: 2 }}
      >
        Analyze Sites
      </Button>
    </Paper>
  );
};

export default ConfigurationPanel;
