import { useState, type ChangeEvent } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  Alert,
  Chip,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import 'leaflet/dist/leaflet.css';
import SiteMap from './SiteMap';
import { AnalysisResponse } from '../types';

interface DashboardProps {
  analysisResult: AnalysisResponse;
}

const COLORS = {
  Rural: '#4caf50',
  Suburban: '#ff9800',
  Urban: '#2196f3',
  Dense: '#f44336',
};

const Dashboard = ({ analysisResult }: DashboardProps) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const { summary, preview, total_rows, messages } = analysisResult;

  // Prepare data for map
  const mapData = preview.map((row) => ({
    site_id: row.site_id || undefined,
    lon: parseFloat(String(row.lon)) || 0,
    lat: parseFloat(String(row.lat)) || 0,
    area_class: String(row.area_class || 'Unknown'),
    density: parseFloat(String(row.density)) || 0,
  })).filter(site => !isNaN(site.lat) && !isNaN(site.lon));

  /**
   * Convert array of objects to CSV string efficiently.
   * Handles special characters, commas, quotes, and newlines properly.
   * Optimized for large datasets (100k+ rows).
   */
  const convertToCSV = (data: Record<string, any>[]): string => {
    if (data.length === 0) {
      return '';
    }

    // Get all unique keys from all objects (in case some rows have different keys)
    const allKeys = new Set<string>();
    data.forEach(row => {
      Object.keys(row).forEach(key => allKeys.add(key));
    });
    const headers = Array.from(allKeys);

    // Escape CSV field: wrap in quotes if contains comma, quote, or newline
    const escapeCSVField = (field: any): string => {
      if (field === null || field === undefined) {
        return '';
      }
      
      const str = String(field);
      
      // If field contains comma, quote, or newline, wrap in quotes and escape quotes
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      
      return str;
    };

    // Build CSV efficiently using array join (faster than string concatenation)
    const rows: string[] = [];
    
    // Add header row
    rows.push(headers.map(escapeCSVField).join(','));
    
    // Add data rows
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const values = headers.map(header => {
        const value = row[header];
        // Format numbers to reasonable precision
        if (typeof value === 'number') {
          // Check if it's an integer or float
          if (Number.isInteger(value)) {
            return value.toString();
          }
          // Format floats to 4 decimal places (matching table display)
          return value.toFixed(4);
        }
        return escapeCSVField(value);
      });
      rows.push(values.join(','));
    }
    
    return rows.join('\n');
  };

  /**
   * Handle CSV download - converts current preview data to CSV and triggers browser download.
   * Client-side only, no backend calls.
   */
  const handleDownload = () => {
    setDownloading(true);
    setDownloadError(null);
    
    try {
      if (!preview || preview.length === 0) {
        setDownloadError('No data available to export');
        setDownloading(false);
        return;
      }

      // Convert data to CSV string
      const csvContent = convertToCSV(preview);
      
      // Create Blob with CSV content
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // Create download link and trigger download
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', 'analysis_results.csv');
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (err: any) {
      setDownloadError(err.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedPreview = preview.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box>
      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card
            sx={{
              height: '100%',
              borderLeft: `4px solid ${COLORS.Rural}`,
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 3,
              },
            }}
          >
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                Rural
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: COLORS.Rural, mt: 0.5 }}>
                {summary.Rural}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card
            sx={{
              height: '100%',
              borderLeft: `4px solid ${COLORS.Suburban}`,
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 3,
              },
            }}
          >
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                Suburban
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: COLORS.Suburban, mt: 0.5 }}>
                {summary.Suburban}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card
            sx={{
              height: '100%',
              borderLeft: `4px solid ${COLORS.Urban}`,
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 3,
              },
            }}
          >
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                Urban
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: COLORS.Urban, mt: 0.5 }}>
                {summary.Urban}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card
            sx={{
              height: '100%',
              borderLeft: `4px solid ${COLORS.Dense}`,
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 3,
              },
            }}
          >
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                Dense
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: COLORS.Dense, mt: 0.5 }}>
                {summary.Dense}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Messages */}
      {messages.length > 0 && (
        <Box sx={{ mb: 3 }}>
          {messages.map((msg, idx) => (
            <Alert key={idx} severity="info" sx={{ mb: 1 }}>
              {msg}
            </Alert>
          ))}
        </Box>
      )}

      {/* Geographic Map */}
      <Card sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
            Geospatial Density Distribution
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Interactive map showing site locations colored by area classification (Preview: {preview.length} sites)
          </Typography>
        </Box>
        {mapData.length > 0 ? (
          <SiteMap sites={mapData} />
        ) : (
          <Box sx={{ height: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography color="text.secondary">No valid geographic data to display</Typography>
          </Box>
        )}
      </Card>

      {/* Data Table */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              Data Preview
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Showing {preview.length} of {total_rows} total rows
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
            disabled={downloading}
            sx={{ borderRadius: 2 }}
          >
            {downloading ? 'Downloading...' : 'Download CSV'}
          </Button>
        </Box>
        {downloadError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDownloadError(null)}>
            {downloadError}
          </Alert>
        )}
        <TableContainer>
          <Table size="small" sx={{ '& .MuiTableCell-root': { borderColor: 'divider' } }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                {preview.length > 0 &&
                  Object.keys(preview[0]).map((key) => (
                    <TableCell key={key} sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                      {key.replace(/_/g, ' ')}
                    </TableCell>
                  ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedPreview.map((row, idx) => (
                <TableRow
                  key={idx}
                  sx={{
                    '&:hover': { bgcolor: 'action.hover' },
                    '&:nth-of-type(even)': { bgcolor: 'action.hover' },
                  }}
                >
                  {Object.entries(row).map(([key, value], cellIdx) => (
                    <TableCell key={cellIdx}>
                      {key === 'area_class' ? (
                        <Chip
                          label={String(value)}
                          size="small"
                          sx={{
                            bgcolor: COLORS[value as keyof typeof COLORS] || '#ccc',
                            color: '#fff',
                            fontWeight: 500,
                          }}
                        />
                      ) : typeof value === 'number' ? (
                        value.toFixed(4)
                      ) : (
                        String(value)
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={preview.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
          sx={{ borderTop: 1, borderColor: 'divider' }}
        />
      </Paper>
    </Box>
  );
};

export default Dashboard;
