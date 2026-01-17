"""
Utility functions for the API.
"""

import io
import csv
from typing import List, Dict
import pandas as pd


def dataframe_to_csv_bytes(df: pd.DataFrame) -> bytes:
    """
    Convert DataFrame to CSV bytes.
    
    Args:
        df: DataFrame to convert
        
    Returns:
        CSV content as bytes
    """
    output = io.StringIO()
    df.to_csv(output, index=False, quoting=csv.QUOTE_NONNUMERIC)
    return output.getvalue().encode('utf-8')


def dataframe_to_dict_list(df: pd.DataFrame, max_rows: int = 50) -> List[Dict]:
    """
    Convert DataFrame to list of dictionaries for JSON serialization.
    
    Args:
        df: DataFrame to convert
        max_rows: Maximum number of rows to include
        
    Returns:
        List of dictionaries
    """
    df_preview = df.head(max_rows)
    # Convert NaN to None for JSON serialization
    df_preview = df_preview.where(pd.notna(df_preview), None)
    return df_preview.to_dict('records')
