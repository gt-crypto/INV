const templateData = require('../data/eng007-livedemo.json');
const wishesData = require('../data/wishes.json');
const galleryData = require('../data/gallery.json');
const mediaIndex = require('../cdn/media/eng007/index/index.json');

// Pre-rewrite CDN URLs to local paths
const templateJsonString = JSON.stringify(templateData).replace(/https:\/\/cdn-admin\.invitationnation\.in/g, '/cdn');
const mediaIndexString = JSON.stringify(mediaIndex).replace(/https:\/\/cdn-admin\.invitationnation\.in/g, '/cdn');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS' || (req.url && req.url.includes('favicon'))) {
    return res.status(204).end();
  }

  const url = req.url || '';

  // 1. Template data
  if (url.includes('/templates/slug/')) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(templateJsonString);
  }

  // 2. Customized template fallback (must return 404 so client fetches slug)
  if (url.includes('/customized-templates/')) {
    return res.status(404).json({ status: 404, message: 'Customized template not found' });
  }

  // 3. Media index
  if (url.includes('/index/index.json')) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(mediaIndexString);
  }

  // 4. Wishes GET / POST
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

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(wishesData);
  }

  // 5. Gallery
  if (url.includes('/gallery/')) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(galleryData);
  }

  return res.status(200).json({ status: 200, message: 'ok', data: [] });
};
