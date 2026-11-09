FROM python:3.12-slim

# ffmpeg/ffprobe for probing, thumbnails and (later) clip export.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg \
 && rm -rf /var/lib/apt/lists/*

RUN useradd --create-home --uid 1000 app
WORKDIR /srv

COPY requirements.lock ./
RUN grep -v '^-e ' requirements.lock > /tmp/req.txt && pip install --no-cache-dir -r /tmp/req.txt

COPY alembic.ini ./
COPY migrations ./migrations
COPY app ./app

USER app
ENV FM_ARCHIVE_ROOT=/archive FM_IMPORT_ROOT=/inbox PYTHONUNBUFFERED=1
EXPOSE 8000
# Migrations run on every start; they are idempotent.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:create_app --factory --host 0.0.0.0 --port 8000"]
