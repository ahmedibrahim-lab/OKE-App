# Build stage or single stage for python-slim
FROM python:3.11-slim AS base

# Prevent python from writing pyc files to disk and buffering stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=5000

WORKDIR /app

# Create a non-privileged user that the app will run under.
# This prevents root-level privilege escalation vulnerabilities.
RUN groupadd --gid 10001 appuser && \
    useradd --uid 10001 --gid 10001 --shell /bin/bash --create-home appuser

# Install requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code and change ownership to appuser
COPY . .
RUN chown -R appuser:appuser /app

# Switch to the non-privileged user
USER appuser

# Expose port
EXPOSE 5000

# Run with Gunicorn WSGI server for production-grade concurrency
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--threads", "4", "app:app"]
