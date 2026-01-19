"""
Core business logic for site analysis.
Pure functions for spatial analysis, density calculation, and classification.
"""

import logging
from typing import List, Dict, Tuple, Optional
import pandas as pd
import numpy as np
from sklearn.neighbors import BallTree
from scipy.sparse import csr_matrix
from scipy.sparse.csgraph import connected_components

logger = logging.getLogger(__name__)

# Earth's radius in kilometers for Haversine distance
EARTH_RADIUS_KM = 6371.0


def validate_csv(df: pd.DataFrame) -> Tuple[pd.DataFrame, List[str]]:
    """
    Validate CSV structure and drop invalid rows.
    
    Required columns: site_id, lat, lon, cluster_id
    
    Args:
        df: Input DataFrame
        
    Returns:
        Tuple of (cleaned DataFrame, list of error messages)
    """
    errors = []
    required_columns = ['site_id', 'lat', 'lon', 'cluster_id']
    
    # Check for required columns
    missing_columns = [col for col in required_columns if col not in df.columns]
    if missing_columns:
        errors.append(f"Missing required columns: {missing_columns}")
        return pd.DataFrame(), errors
    
    initial_count = len(df)
    
    # Drop rows with missing values in required columns
    df_clean = df[required_columns].copy()
    df_clean = df_clean.dropna(subset=required_columns)
    
    # Validate numeric types first
    for col in ['lat', 'lon']:
        non_numeric = pd.to_numeric(df_clean[col], errors='coerce').isna()
        if non_numeric.any():
            invalid_count = non_numeric.sum()
            errors.append(f"Dropped {invalid_count} rows with non-numeric {col}")
            df_clean = df_clean[~non_numeric]
    
    # Convert to proper types
    df_clean['lat'] = pd.to_numeric(df_clean['lat'])
    df_clean['lon'] = pd.to_numeric(df_clean['lon'])
    df_clean['site_id'] = df_clean['site_id'].astype(str)
    df_clean['cluster_id'] = df_clean['cluster_id'].astype(str)
    
    # Validate lat/lon ranges
    invalid_lat = (df_clean['lat'] < -90) | (df_clean['lat'] > 90)
    invalid_lon = (df_clean['lon'] < -180) | (df_clean['lon'] > 180)
    invalid_coords = invalid_lat | invalid_lon
    
    if invalid_coords.any():
        invalid_count = invalid_coords.sum()
        errors.append(f"Dropped {invalid_count} rows with invalid coordinates")
        df_clean = df_clean[~invalid_coords]
    
    # Restore other columns if they exist
    other_columns = [col for col in df.columns if col not in required_columns]
    if other_columns:
        # Reindex to match original indices
        df_other = df[other_columns].loc[df_clean.index]
        df_clean = pd.concat([df_clean, df_other], axis=1)
    
    dropped_count = initial_count - len(df_clean)
    if dropped_count > 0:
        errors.append(f"Dropped {dropped_count} invalid rows (from {initial_count} total)")
    
    if errors:
        for error in errors:
            logger.warning(error)
    
    return df_clean, errors


def haversine_distance(
    lat1: np.ndarray, lon1: np.ndarray,
    lat2: np.ndarray, lon2: np.ndarray
) -> np.ndarray:
    """
    Calculate Haversine distance between two sets of coordinates.
    
    Args:
        lat1, lon1: First set of coordinates (can be arrays)
        lat2, lon2: Second set of coordinates (can be arrays)
        
    Returns:
        Distance in kilometers
    """
    # Convert to radians
    lat1_rad = np.radians(lat1)
    lon1_rad = np.radians(lon1)
    lat2_rad = np.radians(lat2)
    lon2_rad = np.radians(lon2)
    
    # Haversine formula
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    
    a = (
        np.sin(dlat / 2) ** 2 +
        np.cos(lat1_rad) * np.cos(lat2_rad) * np.sin(dlon / 2) ** 2
    )
    c = 2 * np.arcsin(np.sqrt(a))
    distance = EARTH_RADIUS_KM * c
    
    return distance


def calculate_density(
    df: pd.DataFrame,
    radius_km: float = 2.0
) -> pd.Series:
    """
    Calculate site density using spatial indexing.
    
    Density = (number of neighbors within radius) / (π * radius²)
    Excludes self from neighbor count.
    
    Args:
        df: DataFrame with 'lat' and 'lon' columns
        radius_km: Search radius in kilometers (default 2.0)
        
    Returns:
        Series with density values (sites per km²)
    """
    if len(df) == 0:
        return pd.Series(dtype=float)
    
    # Convert lat/lon to radians for BallTree
    coords_rad = np.radians(df[['lat', 'lon']].values)
    
    # Create BallTree with Haversine metric
    tree = BallTree(coords_rad, metric='haversine')
    
    # Query all points within radius (in radians)
    radius_rad = radius_km / EARTH_RADIUS_KM
    neighbor_counts = tree.query_radius(coords_rad, r=radius_rad, count_only=True)
    
    # Exclude self from count
    neighbor_counts = neighbor_counts - 1
    
    # Calculate density: neighbors / (π * radius²)
    area_km2 = np.pi * (radius_km ** 2)
    density = neighbor_counts / area_km2
    
    return pd.Series(density, index=df.index, name='density')


def find_co_location_groups(
    df: pd.DataFrame,
    threshold_m: float = 100.0
) -> Tuple[pd.Series, pd.Series]:
    """
    Find co-location groups using graph-based connected components.
    
    Two sites are in the same group if their distance < threshold.
    Uses connected components algorithm on a graph where edges exist
    when distance < threshold.
    
    Args:
        df: DataFrame with 'lat' and 'lon' columns
        threshold_m: Distance threshold in meters (default 100.0)
        
    Returns:
        Series with group_id (deterministic hash of sorted member IDs)
    """
    if len(df) == 0:
        return pd.Series(dtype=str)
    
    threshold_km = threshold_m / 1000.0
    
    # Convert lat/lon to radians for BallTree
    coords_rad = np.radians(df[['lat', 'lon']].values)
    
    # Create BallTree
    tree = BallTree(coords_rad, metric='haversine')
    
    # Query all points within threshold
    threshold_rad = threshold_km / EARTH_RADIUS_KM
    neighbors = tree.query_radius(coords_rad, r=threshold_rad)
    
    # Build sparse adjacency matrix for efficient connected components
    n = len(df)
    row_indices = []
    col_indices = []
    
    for i, neighbor_indices in enumerate(neighbors):
        for j in neighbor_indices:
            if i != j:  # Exclude self
                row_indices.append(i)
                col_indices.append(j)
    
    # Create sparse CSR matrix (symmetric, undirected graph)
    if len(row_indices) > 0:
        # Add symmetric edges (undirected graph) - use 1.0 for edge weights
        all_rows = row_indices + col_indices
        all_cols = col_indices + row_indices
        adjacency = csr_matrix((np.ones(len(all_rows), dtype=np.float64), (all_rows, all_cols)), shape=(n, n))
    else:
        # No edges, each node is its own component
        adjacency = csr_matrix((n, n), dtype=np.float64)
    
    # Find connected components using scipy (fast and non-recursive)
    n_components, labels = connected_components(csgraph=adjacency, directed=False, return_labels=True)
    
    # Group nodes by component label
    components = {}
    for i, label in enumerate(labels):
        if label not in components:
            components[label] = []
        components[label].append(i)
    
    # Create group_id as deterministic hash of sorted member site_ids
    group_ids = {}
    for label, component_indices in components.items():
        # Get site_ids for this component
        component_site_ids = sorted([df.iloc[i]['site_id'] for i in component_indices])
        # Create deterministic hash (using hash of sorted tuple)
        group_id = str(hash(tuple(component_site_ids)))
        for i in component_indices:
            group_ids[i] = group_id
    
    # Create Series with group_id and group_size
    group_id_series = pd.Series(
        [group_ids.get(i, '') for i in range(len(df))],
        index=df.index,
        name='group_id'
    )
    
    # Calculate group sizes
    group_sizes = group_id_series.value_counts()
    group_size_series = group_id_series.map(group_sizes).rename('group_size')
    
    return group_id_series, group_size_series


def classify_sites(
    df: pd.DataFrame,
    mode: str = 'quantile',
    thresholds: Optional[Dict[str, float]] = None
) -> pd.Series:
    """
    Classify sites into Rural, Suburban, Urban, Dense based on density.
    
    Args:
        df: DataFrame with 'density' and 'cluster_id' columns
        mode: 'quantile' or 'threshold'
        thresholds: Optional dict with 'rural', 'suburban', 'urban' keys
                    (only used in threshold mode)
        
    Returns:
        Series with area_class values
    """
    if 'density' not in df.columns:
        raise ValueError("DataFrame must have 'density' column")
    
    if mode == 'quantile':
        # Calculate percentiles per cluster_id
        area_classes = pd.Series(index=df.index, dtype=str)
        
        for cluster_id in df['cluster_id'].unique():
            cluster_mask = df['cluster_id'] == cluster_id
            cluster_densities = df.loc[cluster_mask, 'density']
            
            if len(cluster_densities) == 0:
                continue
            
            # Calculate percentiles
            q25 = cluster_densities.quantile(0.25)
            q50 = cluster_densities.quantile(0.50)
            q75 = cluster_densities.quantile(0.75)
            
            # Classify based on percentiles
            cluster_classes = pd.Series(index=cluster_densities.index, dtype=str)
            cluster_classes[cluster_densities <= q25] = 'Rural'
            cluster_classes[(cluster_densities > q25) & (cluster_densities <= q50)] = 'Suburban'
            cluster_classes[(cluster_densities > q50) & (cluster_densities <= q75)] = 'Urban'
            cluster_classes[cluster_densities > q75] = 'Dense'
            
            area_classes.loc[cluster_mask] = cluster_classes
        
        return area_classes.rename('area_class')
    
    elif mode == 'threshold':
        if thresholds is None:
            # Default thresholds (sites per km²)
            thresholds = {
                'rural': 10.0,
                'suburban': 50.0,
                'urban': 200.0
            }
        
        area_classes = pd.Series(index=df.index, dtype=str)
        density = df['density']
        
        area_classes[density <= thresholds['rural']] = 'Rural'
        area_classes[
            (density > thresholds['rural']) & (density <= thresholds['suburban'])
        ] = 'Suburban'
        area_classes[
            (density > thresholds['suburban']) & (density <= thresholds['urban'])
        ] = 'Urban'
        area_classes[density > thresholds['urban']] = 'Dense'
        
        return area_classes.rename('area_class')
    
    else:
        raise ValueError(f"Invalid mode: {mode}. Must be 'quantile' or 'threshold'")


def process_sites(
    df: pd.DataFrame,
    radius_km: float = 2.0,
    co_location_threshold_m: float = 100.0,
    classification_mode: str = 'quantile',
    classification_thresholds: Optional[Dict[str, float]] = None
) -> Tuple[pd.DataFrame, List[str]]:
    """
    Complete processing pipeline for site analysis.
    
    Args:
        df: Input DataFrame
        radius_km: Radius for density calculation (km)
        co_location_threshold_m: Threshold for co-location grouping (meters)
        classification_mode: 'quantile' or 'threshold'
        classification_thresholds: Optional thresholds for threshold mode
        
    Returns:
        Tuple of (enriched DataFrame, list of processing messages)
    """
    messages = []
    
    # Step 1: Validate
    df_clean, validation_errors = validate_csv(df)
    messages.extend(validation_errors)
    
    if len(df_clean) == 0:
        messages.append("No valid rows after validation")
        return df_clean, messages
    
    # Step 2: Calculate density
    density = calculate_density(df_clean, radius_km=radius_km)
    df_clean = df_clean.copy()
    df_clean['density'] = density
    
    # Step 3: Find co-location groups
    group_id, group_size = find_co_location_groups(
        df_clean, threshold_m=co_location_threshold_m
    )
    df_clean['group_id'] = group_id
    df_clean['group_size'] = group_size
    
    # Step 4: Classify
    area_class = classify_sites(
        df_clean,
        mode=classification_mode,
        thresholds=classification_thresholds
    )
    df_clean['area_class'] = area_class
    
    messages.append(f"Processed {len(df_clean)} sites successfully")
    
    return df_clean, messages
