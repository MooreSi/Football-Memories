FROM python:3.12-slim@sha256:5e2bdb1b0d542d5039cffb8181c65930093949194a65c365dfb1b0fe13a4fa5b

# ffmpeg/ffprobe for probing, thumbnails and (later) clip export.
RUN apt-get update \
 && apt-get upgrade -y \
 && apt-get install -y --no-install-recommends ffmpeg \
 && rm -rf /var/lib/apt/lists/*

RUN useradd --create-home --uid 1000 app
# Hosted copies (owner decision 011) mount fresh named volumes here; Docker copies this
# ownership into a new volume so the app user can write. Bind mounts (the owner's install)
# replace these folders and are unaffected.
RUN mkdir -p /archive /inbox/uploaded /crests && chown -R app:app /archive /inbox /crests
WORKDIR /srv

COPY requirements.lock ./
RUN grep -v '^-e ' requirements.lock > /tmp/req.txt && pip install --no-cache-dir -r /tmp/req.txt
RUN python -m pip uninstall -y pip

COPY alembic.ini ./
COPY migrations ./migrations
COPY app ./app

USER app
ENV FM_ARCHIVE_ROOT=/archive FM_IMPORT_ROOT=/inbox PYTHONUNBUFFERED=1
EXPOSE 8000
# Migrations run on every start; they are idempotent.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:create_app --factory --host 0.0.0.0 --port 8000"]
