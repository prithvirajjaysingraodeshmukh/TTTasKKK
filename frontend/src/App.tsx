import { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  CssBaseline,
  AppBar,
  Toolbar,
  Grid,
  Alert,
  CircularProgress,
} from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import theme from './theme';
import ConfigurationPanel from './components/ConfigurationPanel';
import Dashboard from './components/Dashboard';
import { AnalysisResponse } from './types';

function App() {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalysisComplete = (result: AnalysisResponse) => {
    setAnalysisResult(result);
    setError(null);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setAnalysisResult(null);
  };

  const handleLoading = (isLoading: boolean) => {
    setLoading(isLoading);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
        {/* AppBar */}
        <AppBar position="static" elevation={0} sx={{ bgcolor: 'primary.main' }}>
          <Toolbar>
            <AnalyticsIcon sx={{ mr: 2 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
              Site Context Intelligence
            </Typography>
          </Toolbar>
        </AppBar>

        {/* Main Content */}
        <Container maxWidth="lg" sx={{ py: 4 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
              <CircularProgress size={48} />
              <Typography variant="body1" sx={{ ml: 2 }}>
                Processing your data...
              </Typography>
            </Box>
          )}

          {!loading && (
            <Grid container spacing={3}>
              {/* Left Column: Configuration Panel */}
              <Grid item xs={12} md={4}>
                <ConfigurationPanel
                  onAnalysisComplete={handleAnalysisComplete}
                  onError={handleError}
                  onLoading={handleLoading}
                />
              </Grid>

              {/* Right Column: Results Area */}
              <Grid item xs={12} md={8}>
                {analysisResult ? (
                  <Dashboard analysisResult={analysisResult} />
                ) : (
                  <Box
                    sx={{
                      p: 4,
                      textAlign: 'center',
                      bgcolor: 'background.paper',
                      borderRadius: 2,
                      boxShadow: 1,
                    }}
                  >
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      Ready to Analyze
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Upload a CSV file and configure your analysis parameters to get started.
                    </Typography>
                  </Box>
                )}
              </Grid>
            </Grid>
          )}
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
