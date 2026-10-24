"""Loopback-only speech adapter. No audio files, transcripts or request logs are retained.

uv run --python 3.12 --with faster-whisper==1.2.1 scripts/local-speech.py
Set JALRAKSHAK_WHISPER_MODEL to an already-downloaded multilingual model directory.
"""
import io
import json
import os
import threading
import wave
from email.parser import BytesParser
from email.policy import default
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import numpy as np
from faster_whisper import WhisperModel

os.environ['HF_HUB_OFFLINE'] = '1'
model_path = os.environ.get('JALRAKSHAK_WHISPER_MODEL')
if not model_path or not os.path.isdir(model_path):
    raise SystemExit('Set JALRAKSHAK_WHISPER_MODEL to a downloaded multilingual model directory.')
model = WhisperModel(model_path, device='cpu', compute_type='int8', cpu_threads=4, local_files_only=True)
lock = threading.Lock()


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def send_json(self, status, value):
        payload = json.dumps(value).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        self.send_json(200 if self.path == '/health' else 404, {'ready': self.path == '/health'})

    def do_POST(self):
        if self.path != '/inference' or self.headers.get('X-Jalrakshak-Local') != '1' or self.headers.get('Origin'):
            self.send_json(403, {'error': 'Local application requests only.'})
            return
        if not lock.acquire(blocking=False):
            self.send_json(429, {'error': 'Busy'})
            return
        try:
            self.connection.settimeout(130)
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 2_000_000:
                raise ValueError('size')
            content_type = self.headers.get('Content-Type', '')
            if not content_type.startswith('multipart/form-data;'):
                raise ValueError('type')
            message = BytesParser(policy=default).parsebytes(
                ('Content-Type: ' + content_type + '\r\nMIME-Version: 1.0\r\n\r\n').encode() + self.rfile.read(length))
            parts = {p.get_param('name', header='content-disposition'): p.get_payload(decode=True) for p in message.iter_parts()}
            language = parts.get('language', b'').decode()
            if language not in ('en', 'hi'):
                raise ValueError('language')
            with wave.open(io.BytesIO(parts['file']), 'rb') as audio:
                if audio.getnchannels() != 1 or audio.getframerate() != 16000 or audio.getsampwidth() != 2 or not 0 < audio.getnframes() <= 960000:
                    raise ValueError('audio')
                samples = np.frombuffer(audio.readframes(audio.getnframes()), dtype='<i2').astype(np.float32) / 32768
            if not samples.size or float(np.sqrt(np.mean(samples ** 2))) < .002:
                self.send_json(200, {'text': ''})
                return
            segments, _ = model.transcribe(samples, language=language, beam_size=3, vad_filter=True, condition_on_previous_text=False)
            text = ' '.join(segment.text.strip() for segment in segments).strip()
            if len(text) > 2000:
                raise ValueError('transcript')
            self.send_json(200, {'text': text})
        except (ValueError, KeyError, wave.Error):
            self.send_json(400, {'error': 'Invalid recording'})
        except Exception:
            self.send_json(503, {'error': 'Speech service unavailable'})
        finally:
            lock.release()


print('Local speech service ready on 127.0.0.1:8178', flush=True)
ThreadingHTTPServer(('127.0.0.1', 8178), Handler).serve_forever()
