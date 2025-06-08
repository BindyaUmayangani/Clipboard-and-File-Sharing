function getDeviceEmoji() {
  const ua = navigator.userAgent.toLowerCase();
  if (/android|iphone|ipad|ipod|mobile/i.test(ua)) return "📱";
  return "💻";
}

const deviceEmoji = getDeviceEmoji();
const name = prompt("Enter your device name") || "Unknown";
const ws = new WebSocket(`ws://${location.host}`);

ws.onopen = () => {
  ws.send(JSON.stringify({ type: 'register', name, emoji: deviceEmoji }));
};

ws.onmessage = e => {
  const data = JSON.parse(e.data);

  if (data.type === 'register') {
    updateDevices(data);
  }

  if (data.type === 'chat') {
    addChat(`${data.from}: ${data.message}`);
  } else if (data.type === 'clipboard') {
    const div = document.createElement('div');
    div.className = 'clipboard-item';
    const span = document.createElement('span');
    span.innerText = `${data.from}: ${data.content}`;
    div.appendChild(span);
    const copyBtn = document.createElement('button');
    copyBtn.innerText = 'Copy';
    copyBtn.onclick = () => navigator.clipboard.writeText(data.content);
    copyBtn.classList.add('copy-btn');
    div.appendChild(copyBtn);
    document.getElementById('clipboard-output').appendChild(div);
  } else if (data.type === 'file') {
    const a = document.createElement('a');
    a.href = data.url;
    a.innerText = `File from ${data.from}: ${data.name}`;
    a.target = "_blank";
    document.getElementById('file-links').appendChild(a);
    document.getElementById('file-links').appendChild(document.createElement('br'));
  }
};

function sendChat() {
  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  if (message) {
    ws.send(JSON.stringify({ type: 'chat', message }));
    input.value = '';
  }
}

function sendClipboard() {
  const input = document.getElementById('clipboard-input');
  const text = input.value.trim();
  if (text) {
    ws.send(JSON.stringify({ type: 'clipboard', content: text }));
    input.value = '';
  }
}

function sendFile() {
  const fileInput = document.getElementById('file-input');
  if (!fileInput.files.length) return;
  const file = fileInput.files[0];
  const ext = file.name.split('.').pop().toLowerCase();

  const formData = new FormData();
  formData.append('file', file);

  fetch('/upload', { method: 'POST', body: formData })
    .then(res => res.ok ? res.json() : res.json().then(err => Promise.reject(err)))
    .then(data => {
      if (!data.name || !data.url) throw new Error("Invalid server response");
      ws.send(JSON.stringify({ type: 'file', url: data.url, name: data.name }));
    })
    .catch(err => alert(`Upload failed: ${err.message}`));
}

function addChat(msg) {
  const div = document.createElement('div');
  div.innerText = msg;
  document.getElementById('chat-box').appendChild(div);
}

let deviceMap = {};
function updateDevices(data) {
  deviceMap[data.ip] = {
    name: data.from,
    lastSeen: new Date().toLocaleTimeString(),
    emoji: data.emoji || "💻"
  };

  const list = Object.entries(deviceMap).map(([ip, info]) =>
    `<div class="device-box">
       <span>${info.emoji} ${info.name} (${ip}) – Last seen: ${info.lastSeen}</span>
     </div>`).join('');

  document.getElementById('devices').innerHTML = `<strong>Connected Devices:</strong>${list}`;
}

// 🆕 Add Enter key support:
const chatInput = document.getElementById('chat-input');
const clipboardInput = document.getElementById('clipboard-input');
chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    sendChat();
  }
});
clipboardInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    sendClipboard();
  }
});

// Attach click handlers:
document.getElementById('send-chat').onclick = sendChat;
document.getElementById('send-clipboard').onclick = sendClipboard;
document.getElementById('send-file').onclick = sendFile;
