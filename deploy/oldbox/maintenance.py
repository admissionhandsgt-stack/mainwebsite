#!/usr/bin/env python3
"""A one-minute holding page on 127.0.0.1:8120 while the database moves.

Run only during the cutover or a rollback, as a transient unit:
    systemd-run --unit=ah-maintenance --uid=admissionhands /usr/bin/python3 /opt/admissionhands/maintenance.py

It sits where the app was, so Caddy needs no edit. 503 with Retry-After tells
browsers, Cloudflare and Googlebot that this is temporary — a 200 holding page
would be indexed, and a 502 reads as broken.
"""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PAGE = """<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><meta http-equiv="refresh" content="30">
<title>AdmissionHands — back in a minute</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font:16px/1.6 system-ui,sans-serif;background:#f8fafc;color:#0f172a}
main{max-width:30rem;padding:24px;text-align:center}h1{font-size:1.4rem;margin:0 0 .5rem}a{color:#0891b2}
@media (prefers-color-scheme:dark){body{background:#0b1220;color:#e2e8f0}}</style></head>
<body><main><h1>We are moving to a faster server</h1>
<p>Back in about a minute — this page reloads by itself.</p>
<p>Bas ek minute — hum website ko tez server par shift kar rahe hain.</p>
<p>Need us now? <a href="https://wa.me/919310301949">WhatsApp +91 93103 01949</a></p>
</main></body></html>""".encode()


class Handler(BaseHTTPRequestHandler):
    def _send(self, body):
        api = self.path.startswith("/api/")
        payload = b'{"error":"maintenance","retryAfter":60}' if api else PAGE
        self.send_response(503)
        self.send_header("Content-Type", "application/json" if api else "text/html; charset=utf-8")
        self.send_header("Retry-After", "60")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        if body:
            self.wfile.write(payload)

    def do_GET(self):
        self._send(True)

    def do_HEAD(self):
        self._send(False)

    do_POST = do_PUT = do_PATCH = do_DELETE = do_GET

    def log_message(self, *args):
        pass


ThreadingHTTPServer(("127.0.0.1", 8120), Handler).serve_forever()
