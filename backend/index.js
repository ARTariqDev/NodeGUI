const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Function to get the directory tree
const getDirectoryTree = (dirPath) => {
  const stats = fs.lstatSync(dirPath);
  const name = path.basename(dirPath);

  // Filter out unnecessary files and folders
  const ignoredFiles = [
    'node_modules',
    '.git',
    'package-lock.json',
    'yarn.lock',
    'dist',
    'build',
    'README.md',
    '.env',
  ];

  if (ignoredFiles.includes(name)) return null;

  if (stats.isDirectory()) {
    return {
      label: name,
      children: fs
        .readdirSync(dirPath)
        .map((child) => getDirectoryTree(path.join(dirPath, child)))
        .filter(Boolean), // Remove null values
    };
  }

  // Only include relevant file types
  const validFileExtensions = ['.js', '.jsx', '.css', '.html'];
  if (validFileExtensions.includes(path.extname(name))) {
    return { label: name };
  }

  return null;
};

app.post('/get-directory-tree', (req, res) => {
  const { projectPath } = req.body;

  try {
    const tree = getDirectoryTree(projectPath);
    res.json(tree);
  } catch (err) {
    res.status(500).json({ error: 'Invalid project path or directory not found.' });
  }
});

app.listen(5001, () => {
  console.log('Server is running on http://localhost:5001');
});
