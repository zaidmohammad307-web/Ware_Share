// api/utils/fileSignature.js
// Multer's mimetype comes from the client, so check the file's first bytes
// actually match the claimed type before uploading it anywhere.
const fs = require('fs/promises');

const SIGNATURES = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) =>
    b.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': (b) =>
    b.slice(0, 4).toString('ascii') === 'RIFF' &&
    b.slice(8, 12).toString('ascii') === 'WEBP',
  'application/pdf': (b) => b.slice(0, 5).toString('ascii') === '%PDF-',
};

const matchesSignature = (buf, mimetype) => {
  const check = SIGNATURES[mimetype];
  return !!check && buf.length >= 12 && check(buf);
};

const assertFileSignature = async (filePath, mimetype) => {
  const fh = await fs.open(filePath, 'r');
  try {
    const buf = Buffer.alloc(12);
    const { bytesRead } = await fh.read(buf, 0, 12, 0);
    if (!matchesSignature(buf.subarray(0, bytesRead), mimetype)) {
      const err = new Error('File content does not match its type.');
      err.status = 400;
      throw err;
    }
  } finally {
    await fh.close();
  }
};

module.exports = { assertFileSignature, matchesSignature };
