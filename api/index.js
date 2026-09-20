const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const url = req.url || '';

  // 1. Template data
  if (url.includes('/templates/slug/')) {
    try {
      const filePath = path.join(process.cwd(), 'data', 'eng007-livedemo.json');
      let content = fs.readFileSync(filePath, 'utf8');
      content = content.replace(/https:\/\/cdn-admin\.invitationnation\.in/g, '/cdn');
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).send(content);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // 2. Customized template fallback
  if (url.includes('/customized-templates/')) {
    return res.status(404).json({ status: 404, message: 'Customized template not found' });
  }

  // 3. Wishes GET / POST
  if (url.includes('/wishes/')) {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}');
          return res.status(200).json({
            status: 200,
            message: 'Wish submitted successfully',
            data: {
              id: 'wish_' + Date.now(),
              name: parsed.name || 'Anonymous',
              message: parsed.message || '',
              createdAt: new Date().toISOString()
            }
          });
        } catch (e) {
          return res.status(400).json({ error: 'Invalid JSON' });
        }
      });
      return;
    }

    const filePath = path.join(process.cwd(), 'data', 'wishes.json');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).send(content);
    }
    return res.status(200).json({ status: 200, data: { list: [], totalPages: 0 } });
  }

  // 4. Gallery
  if (url.includes('/gallery/')) {
    const filePath = path.join(process.cwd(), 'data', 'gallery.json');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).send(content);
    }
    return res.status(200).json({ status: 200, data: [] });
  }

  return res.status(200).json({ status: 200, message: 'ok', data: [] });
};
