const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const ASSETS_DIR = path.join(ROOT_DIR, 'assets');
const CDN_DIR = path.join(ROOT_DIR, 'cdn');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const FONTS_DIR = path.join(ROOT_DIR, 'fonts');
const FAVICONS_DIR = path.join(ROOT_DIR, 'favicons');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json'
};

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
}

function serveFile(req, res, filePath) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      return false;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    setCorsHeaders(res);

    // Support HTTP Range requests (crucial for audio streaming & seeking)
    const range = req.headers.range;
    if (range && stats.size > 0) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      const chunksize = (end - start) + 1;
      
      const fileStream = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType
      });
      fileStream.pipe(res);
      return true;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(filePath).pipe(res);
    return true;
  });
  return true;
}

const server = http.createServer((req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(reqUrl.pathname);

  // Normalize root path to index.html
  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }

  // Explicitly return 204 No Content for favicon requests so browser removes icon
  if (pathname === '/favicon.ico' || pathname.startsWith('/favicons/')) {
    res.writeHead(204);
    res.end();
    return;
  }

  // Handle Mock API Endpoints
  if (pathname.startsWith('/rest/api/')) {
    // 1. Customized templates (fallback endpoint)
    if (pathname.startsWith('/rest/api/public/customized-templates/')) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 404, message: 'Customized template not found' }));
      return;
    }

    // 2. Template slug endpoint
    if (pathname.startsWith('/rest/api/public/templates/slug/')) {
      const templateFile = path.join(DATA_DIR, 'eng007-livedemo.json');
      if (fs.existsSync(templateFile)) {
        let content = fs.readFileSync(templateFile, 'utf8');
        content = content.replace(/https:\/\/cdn-admin\.invitationnation\.in/g, '/cdn');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(content);
        return;
      }
    }

    // 3. Wishes GET / POST
    if (pathname.startsWith('/rest/api/public/wishes/')) {
      const wishesFile = path.join(DATA_DIR, 'wishes.json');
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            let wishesData = { status: 200, message: 'Fetched', data: { list: [], page: 0, size: 10, totalElements: 0, totalPages: 1 } };
            if (fs.existsSync(wishesFile)) {
              wishesData = JSON.parse(fs.readFileSync(wishesFile, 'utf8'));
            }
            const newWish = {
              id: 'wish_' + Date.now(),
              name: parsed.name || 'Anonymous',
              message: parsed.message || '',
              createdAt: new Date().toISOString()
            };
            wishesData.data.list.unshift(newWish);
            wishesData.data.totalElements = wishesData.data.list.length;
            fs.writeFileSync(wishesFile, JSON.stringify(wishesData, null, 2));

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 200, message: 'Wish submitted successfully', data: newWish }));
          } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 400, message: 'Invalid payload' }));
          }
        });
        return;
      } else {
        if (fs.existsSync(wishesFile)) {
          const content = fs.readFileSync(wishesFile, 'utf8');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(content);
          return;
        }
      }
    }

    // 4. Gallery endpoint
    if (pathname.startsWith('/rest/api/public/gallery/')) {
      const galleryFile = path.join(DATA_DIR, 'gallery.json');
      if (fs.existsSync(galleryFile)) {
        const content = fs.readFileSync(galleryFile, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(content);
        return;
      }
    }

    // Generic fallback for any other API endpoint
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 200, message: 'ok', data: [] }));
    return;
  }

  // Handle CDN media index mapping
  if (
    pathname === '/cdn/media/eng007/index/index.json' ||
    pathname === '/cdn-admin/media/eng007/index/index.json' ||
    pathname === '/media/eng007/index/index.json'
  ) {
    const indexPath = path.join(CDN_DIR, 'media', 'eng007', 'index', 'index.json');
    if (fs.existsSync(indexPath)) {
      let content = fs.readFileSync(indexPath, 'utf8');
      content = content.replace(/https:\/\/cdn-admin\.invitationnation\.in/g, '/cdn');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(content);
      return;
    }
  }

  // Resolve static files
  let candidatePaths = [];

  if (pathname.startsWith('/cdn/')) {
    candidatePaths.push(path.join(CDN_DIR, pathname.replace(/^\/cdn\//, '')));
  } else if (pathname.startsWith('/cdn-admin/')) {
    candidatePaths.push(path.join(CDN_DIR, pathname.replace(/^\/cdn-admin\//, '')));
  } else if (pathname.startsWith('/categories/') || pathname.startsWith('/admin/') || pathname.startsWith('/media/')) {
    candidatePaths.push(path.join(CDN_DIR, pathname));
  } else if (pathname.startsWith('/assets/')) {
    candidatePaths.push(path.join(ASSETS_DIR, pathname.replace(/^\/assets\//, '')));
  } else if (pathname.startsWith('/favicons/')) {
    candidatePaths.push(path.join(FAVICONS_DIR, pathname.replace(/^\/favicons\//, '')));
  } else if (pathname.startsWith('/fonts/')) {
    candidatePaths.push(path.join(FONTS_DIR, pathname.replace(/^\/fonts\//, '')));
  } else {
    candidatePaths.push(path.join(ROOT_DIR, pathname));
    candidatePaths.push(path.join(ASSETS_DIR, pathname));
    candidatePaths.push(path.join(CDN_DIR, pathname));
  }

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      serveFile(req, res, candidate);
      return;
    }
  }

  // SPA fallback for page navigation: serve index.html if no extension
  if (!path.extname(pathname)) {
    const indexPath = path.join(ROOT_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      serveFile(req, res, indexPath);
      return;
    }
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found: ' + pathname);
});

server.listen(PORT, () => {
  console.log('====================================================');
  console.log('  Invitation Nation - Local Server Running');
  console.log(`  Local URL: http://localhost:${PORT}/?slug=eng007-livedemo`);
  console.log('====================================================');
});
