FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for building numpy/pandas
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code (flatten structure for uvicorn main:app)
COPY backend/main.py backend/schemas.py backend/logic.py backend/utils.py backend/__init__.py ./
COPY backend/tests/ ./tests/

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
