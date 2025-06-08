const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const multer = require('multer');
const path = require('path');
const os = require('os');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const upload = multer({ dest: 'uploads/' });
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

const clients = new Map();

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
}

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const ext = path.extname(req.file.originalname) || '';
  const newFileName = `${req.file.filename}${ext}`;
  const newPath = path.join('uploads', newFileName);

  fs.rename(req.file.path, newPath, err => {
    if (err) {
      console.error('Rename error:', err);
      return res.status(500).json({ error: `Server error renaming file: ${err.message}` });
    }

    const response = {
      url: `/uploads/${newFileName}`,
      name: req.file.originalname
    };
    console.log("Server response:", response);
    res.json(response);
  });
});

wss.on('connection', (ws, req) => {
  const ip = getClientIP(req);

  ws.on('message', msg => {
    const data = JSON.parse(msg);
    const sender = clients.get(ws);

    if (data.type === 'register') {
      clients.set(ws, { name: data.name, ip, emoji: data.emoji || "💻" });
      broadcast({
        type: 'register',
        from: data.name,
        ip,
        emoji: data.emoji || "💻"
      });
    } else {
      const payload = {
        ...data,
        from: sender?.name || 'Unknown',
        ip,
        emoji: sender?.emoji || "💻"
      };
      broadcast(payload);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    // Optional: broadcast a "deregister" event here to remove from clients list
  });
});

function broadcast(data) {
  const json = JSON.stringify(data);
  clients.forEach((_, client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  });
}

server.listen(3000, () => {
  const interfaces = os.networkInterfaces();
  Object.values(interfaces).flat().forEach(iface => {
    if (iface.family === 'IPv4' && !iface.internal) {
      console.log(`Server running at: http://${iface.address}:3000`);
    }
  });
});
