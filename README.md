# Site Analysis Dashboard

A production-grade solution for AI/ML Intern Take-Home Assignment. This application analyzes site density, performs co-location grouping, and classifies sites into Rural, Suburban, Urban, and Dense categories.

## Architecture Overview

### Tech Stack

**Backend:**
- Python 3.11
- FastAPI (REST API framework)
- Pandas (Data processing)
- Scikit-Learn BallTree (Spatial indexing)
- NumPy (Numerical computations)
- Pydantic (Data validation)

**Frontend:**
- React 18 (UI framework)
- TypeScript (Type safety)
- Material UI (Component library)
- Recharts (Data visualization)
- Vite (Build tool)

**Infrastructure:**
- Docker & Docker Compose
- Nginx (Frontend serving)
- Uvicorn (ASGI server)

### Project Structure

```
TasKK/
├── backend/
│   ├── main.py              # FastAPI application entry point
│   ├── logic.py             # Core business logic (pure functions)
│   ├── schemas.py           # Pydantic models for validation
│   ├── utils.py             # Utility functions
│   ├── tests/
│   │   └── test_logic.py    # Comprehensive unit tests
│   ├── requirements.txt     # Python dependencies
│   ├── Dockerfile           # Backend container
│   └── pytest.ini           # Test configuration
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Main application component
│   │   ├── components/      # React components
│   │   │   ├── ConfigurationPanel.tsx
│   │   │   └── Dashboard.tsx
│   │   ├── api/
│   │   │   └── client.ts    # API client
│   │   └── types.ts         # TypeScript types
│   ├── package.json
│   ├── Dockerfile           # Multi-stage frontend build
│   └── nginx.conf           # Nginx configuration
├── docker-compose.yml       # Orchestration
└── README.md
```

## Core Algorithm: Why BallTree?

### Spatial Indexing Performance

The application uses **scikit-learn's BallTree** for spatial neighbor queries instead of brute-force O(N²) distance calculations.

**Time Complexity:**
- **Brute Force:** O(N²) - For each point, calculate distance to all other points
- **BallTree:** O(N log N) construction + O(N log N) queries = **O(N log N) overall**

**Why BallTree over KD-Tree?**
- BallTree supports **Haversine distance** (great-circle distance on a sphere)
- KD-Tree only works with Euclidean distance, which is inaccurate for geographic coordinates
- BallTree is specifically designed for metric spaces, making it ideal for geographic data

**Example Performance:**
- 1,000 sites: Brute force ~1M operations vs BallTree ~10K operations
- 10,000 sites: Brute force ~100M operations vs BallTree ~130K operations

### Density Calculation

Density is calculated as:
```
density = (number of neighbors within radius) / (π × radius²)
```

**Key Points:**
- Neighbors exclude the point itself
- Radius is user-configurable (default: 2km)
- Units: sites per km²

### Co-location Grouping

Uses **graph-based connected components** algorithm:

1. Build a graph where edges exist if distance < threshold
2. Find connected components using Depth-First Search (DFS)
3. Generate deterministic `group_id` as hash of sorted member site_ids
4. Calculate `group_size` for each group

**Deterministic Group IDs:**
- Same members → Same group_id (regardless of processing order)
- Uses hash of sorted tuple of site_ids

### Classification

Two modes available:

1. **Quantile Mode (default):**
   - Calculates percentiles (25th, 50th, 75th) **per cluster_id**
   - Ensures fair distribution across clusters
   - Rural ≤ Q25, Suburban (Q25, Q50], Urban (Q50, Q75], Dense > Q75

2. **Threshold Mode:**
   - Uses fixed density thresholds
   - Configurable via API parameters
   - Default: Rural ≤ 10, Suburban (10, 50], Urban (50, 200], Dense > 200 sites/km²

## Running the Application

### Prerequisites

- Docker and Docker Compose installed
- OR Python 3.11+ and Node.js 20+ for local development

### Quick Start with Docker

```bash
# Build and start all services
docker-compose up --build

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Local Development

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Running Tests

```bash
cd backend
pip install -r requirements.txt
pytest tests/test_logic.py -v
```

**Mandatory Test:**
```bash
pytest tests/test_logic.py::TestDensityCalculation::test_three_points_in_line -v
```

This test verifies:
- 3 points placed 1km apart in a line
- With 2km radius, each point has 2 neighbors
- Density = 2 / (π × 2²) ≈ 0.159 sites/km²

## API Endpoints

### POST /analyze

Analyze sites from uploaded CSV file.

**Request:**
- Multipart form data with CSV file
- Query parameters:
  - `radius_km` (float, default: 2.0)
  - `co_location_threshold_m` (float, default: 100.0)
  - `classification_mode` (string: "quantile" | "threshold")
  - `rural_threshold`, `suburban_threshold`, `urban_threshold` (optional, for threshold mode)

**Response:**
```json
{
  "summary": {
    "Rural": 10,
    "Suburban": 5,
    "Urban": 3,
    "Dense": 2
  },
  "preview": [...],
  "total_rows": 20,
  "messages": [...],
  "download_url": "/download"
}
```

### POST /download

Download full analysis results as CSV.

**Request:** Same as `/analyze`

**Response:** CSV file download

### GET /health

Health check endpoint.

## CSV Format

Required columns:
- `site_id` (string): Unique identifier
- `lat` (float): Latitude (-90 to 90)
- `lon` (float): Longitude (-180 to 180)
- `cluster_id` (string): Cluster identifier

**Example:**
```csv
site_id,lat,lon,cluster_id
A,40.7128,-74.0060,1
B,40.7580,-73.9855,1
C,40.7489,-73.9680,2
```

## Design Decisions

### 1. Service-Layer Architecture

- **logic.py**: Pure functions, no side effects, easily testable
- **main.py**: API layer, handles HTTP concerns
- **schemas.py**: Validation and type safety
- Clear separation of concerns

### 2. Deterministic Logic

- No random seeds in production code
- Deterministic group IDs (hash of sorted members)
- Reproducible results for same input

### 3. Defensive Validation

- Comprehensive CSV validation
- Detailed error messages
- Graceful handling of invalid data

### 4. Standard Libraries

- No "clever" hacks
- Industry-standard tools (Pydantic, FastAPI, MUI)
- Well-documented and maintainable

### 5. Frontend Simplicity

- Clean internal tool aesthetic
- No heavy map libraries (simple scatter plot)
- Material UI for professional look
- TypeScript for type safety

## Testing

The test suite includes:

1. **Validation Tests**: CSV structure and data quality
2. **Haversine Distance Tests**: Geographic distance calculations
3. **Density Calculation Tests**: Including mandatory 3-point line test
4. **Co-location Tests**: Graph-based grouping verification
5. **Classification Tests**: Both quantile and threshold modes
6. **Integration Tests**: Full pipeline end-to-end

## Performance Considerations

- **BallTree**: O(N log N) spatial queries
- **Pandas**: Efficient data manipulation
- **Vectorized Operations**: NumPy for numerical computations
- **Client-side Pagination**: For data table preview

## Future Enhancements

- Job queue for large file processing
- Result caching with Redis
- WebSocket for real-time progress updates
- Batch processing API
- Authentication and authorization
- Database persistence for results

## License

This is a take-home assignment solution. All code is provided for evaluation purposes.
