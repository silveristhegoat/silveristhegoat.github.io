const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });

// On startup, move any existing files from root uploads to public/uploads
const rootUploadsDir = path.join(__dirname, 'uploads');
const publicUploadsDir = path.join(__dirname, 'public', 'uploads');
if (fs.existsSync(rootUploadsDir)) {
  if (!fs.existsSync(publicUploadsDir)) {
    fs.mkdirSync(publicUploadsDir, { recursive: true });
  }
  try {
    const files = fs.readdirSync(rootUploadsDir);
    for (const f of files) {
      const src = path.join(rootUploadsDir, f);
      if (!fs.lstatSync(src).isFile()) continue;
      const destName = path.extname(f) ? f : f + '.jpg';
      const dest = path.join(publicUploadsDir, destName);
      fs.renameSync(src, dest);
    }
  } catch (err) {
    console.error('Error moving existing uploads:', err);
  }
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Photo upload endpoint
app.post('/upload', upload.single('photo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Move uploaded file to public/uploads for serving
  const uploadsDir = path.join(__dirname, 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
  }
  const ext = path.extname(req.file.originalname) || '.jpg';
  const newFilename = uuidv4() + ext;
  const newPath = path.join(uploadsDir, newFilename);
  fs.renameSync(req.file.path, newPath);
  const imageUrl = '/uploads/' + newFilename;

  // Return the image URL; music will be generated later
  res.json({ imageUrl });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
