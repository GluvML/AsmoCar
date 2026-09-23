/**
 * server.js
 * Máy chủ HTTP nội bộ siêu nhẹ dùng Node.js để phát ứng dụng cho Điện Thoại & Màn hình Ô tô
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, 'app');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

function getLocalIPs() {
  const nets = os.networkInterfaces();
  const results = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        results.push(net.address);
      }
    }
  }
  return results;
}

const server = http.createServer((req, res) => {
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = filePath.split('?')[0]; // Bỏ query string
  const fullPath = path.join(PUBLIC_DIR, filePath);

  const ext = path.extname(fullPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(fullPath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Không tìm thấy file: ' + filePath);
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500 Lỗi máy chủ: ' + err.code);
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      res.end(content);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIPs();
  console.log('\n===============================================================');
  console.log('🚗 CAR AIR MONITOR - MÁY CHỦ CHO ĐIỆN THOẠI & MÀN HÌNH XE');
  console.log('===============================================================');
  console.log('\n1. ĐỂ MỞ TRÊN MÁY TÍNH NÀY:');
  console.log(`   👉 http://localhost:${PORT}`);
  console.log('\n2. ĐỂ MỞ TRÊN ĐIỆN THOẠI (Kết nối chung Wi-Fi nhà/xe):');
  ips.forEach(ip => {
    console.log(`   👉 http://${ip}:${PORT}`);
  });
  console.log('\n💡 MẸO DÀNH CHO ĐIỆN THOẠI / MÀN HÌNH XE:');
  console.log('   - Mở link trên bằng trình duyệt Chrome.');
  console.log('   - Bấm nút 3 chấm góc trên > Chọn "Thêm vào màn hình chính" (Install App).');
  console.log('   - Ứng dụng sẽ trở thành App độc lập trên điện thoại không có thanh địa chỉ!\n');
  console.log('===============================================================\n');
});
