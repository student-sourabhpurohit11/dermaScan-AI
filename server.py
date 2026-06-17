"""
DermaScan AI — Backend Server
Serves static files + stores/retrieves feedback via SQLite
"""

import http.server
import json
import sqlite3
import os
from datetime import datetime
from urllib.parse import urlparse

DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'feedbacks.db')

def init_db():
    """Initialize SQLite database and create feedbacks table."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS feedbacks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rating INTEGER NOT NULL,
            comments TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

class DermaScanHandler(http.server.SimpleHTTPRequestHandler):
    """Custom HTTP handler with API endpoints for feedback."""

    def do_POST(self):
        parsed = urlparse(self.path)

        if parsed.path == '/api/feedback':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)

            try:
                data = json.loads(body)
                rating = int(data.get('rating', 0))
                comments = data.get('comments', '').strip()

                if rating < 1 or rating > 5:
                    self._send_json(400, {'error': 'Rating must be between 1 and 5.'})
                    return

                if not comments:
                    self._send_json(400, {'error': 'Comments cannot be empty.'})
                    return

                # Save to database
                conn = sqlite3.connect(DB_FILE)
                cursor = conn.cursor()
                now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                cursor.execute(
                    'INSERT INTO feedbacks (rating, comments, created_at) VALUES (?, ?, ?)',
                    (rating, comments, now)
                )
                conn.commit()
                feedback_id = cursor.lastrowid
                conn.close()

                self._send_json(200, {
                    'success': True,
                    'message': 'Feedback saved successfully!',
                    'id': feedback_id
                })

            except (json.JSONDecodeError, ValueError):
                self._send_json(400, {'error': 'Invalid request data.'})
        else:
            self._send_json(404, {'error': 'Not found.'})

    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path == '/api/feedbacks':
            conn = sqlite3.connect(DB_FILE)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM feedbacks ORDER BY created_at DESC')
            rows = cursor.fetchall()
            conn.close()

            feedbacks = [dict(row) for row in rows]
            self._send_json(200, {'feedbacks': feedbacks, 'total': len(feedbacks)})

        elif parsed.path == '/api/feedbacks/stats':
            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            cursor.execute('SELECT COUNT(*) as total, AVG(rating) as avg_rating FROM feedbacks')
            row = cursor.fetchone()
            cursor.execute('SELECT rating, COUNT(*) as count FROM feedbacks GROUP BY rating ORDER BY rating')
            distribution = {str(r[0]): r[1] for r in cursor.fetchall()}
            conn.close()

            self._send_json(200, {
                'total': row[0],
                'average_rating': round(row[1], 1) if row[1] else 0,
                'distribution': distribution
            })
        else:
            # Serve static files
            super().do_GET()

    def _send_json(self, status, data):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

if __name__ == '__main__':
    PORT = 3000
    init_db()
    print(f'✅ Database initialized: {DB_FILE}')
    print(f'🚀 DermaScan AI Server running at http://localhost:{PORT}')
    print(f'📊 Admin dashboard: http://localhost:{PORT}/admin.html')
    print(f'📡 API endpoints:')
    print(f'   POST /api/feedback       — Submit feedback')
    print(f'   GET  /api/feedbacks      — Get all feedbacks')
    print(f'   GET  /api/feedbacks/stats — Get feedback stats')

    server = http.server.HTTPServer(('', PORT), DermaScanHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n🛑 Server stopped.')
        server.server_close()
