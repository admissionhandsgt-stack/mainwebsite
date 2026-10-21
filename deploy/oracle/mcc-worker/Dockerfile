# MCC round-result worker (worker.py). Built on the server (ARM64) by docker compose — see
# ../compose.yml, service mcc-worker.
FROM python:3.12-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /worker
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY worker.py .
# Nobody: it downloads and parses PDFs from the internet, so it owns nothing it could damage.
USER 65534:65534
CMD ["python", "-P", "worker.py"]
