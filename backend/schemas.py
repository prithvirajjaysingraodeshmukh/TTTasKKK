"""
Pydantic models for API request/response validation.
"""

from typing import Optional, Dict, List
from pydantic import BaseModel, Field


class AnalysisRequest(BaseModel):
    """Request model for analysis parameters."""
    radius_km: float = Field(default=2.0, ge=0.1, le=100.0, description="Radius for density calculation in kilometers")
    co_location_threshold_m: float = Field(default=100.0, ge=1.0, le=10000.0, description="Threshold for co-location grouping in meters")
    classification_mode: str = Field(default="quantile", pattern="^(quantile|threshold)$", description="Classification mode: 'quantile' or 'threshold'")
    classification_thresholds: Optional[Dict[str, float]] = Field(
        default=None,
        description="Optional thresholds for threshold mode: {'rural': float, 'suburban': float, 'urban': float}"
    )


class AnalysisSummary(BaseModel):
    """Summary statistics for area classification."""
    Rural: int = Field(default=0, description="Number of rural sites")
    Suburban: int = Field(default=0, description="Number of suburban sites")
    Urban: int = Field(default=0, description="Number of urban sites")
    Dense: int = Field(default=0, description="Number of dense sites")


class AnalysisResponse(BaseModel):
    """Response model for analysis endpoint."""
    summary: AnalysisSummary = Field(description="Summary statistics by area class")
    preview: List[Dict] = Field(description="First 50 rows of enriched data")
    total_rows: int = Field(description="Total number of processed rows")
    messages: List[str] = Field(description="Processing messages and warnings")
    download_url: Optional[str] = Field(default=None, description="URL to download full results (simulated)")
