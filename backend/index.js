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
  const validFileExtensions = ['.js', '.jsx', '.css', '.html', '.svg', '.jpg', '.png'];
  if (validFileExtensions.includes(path.extname(name))) {
    return { label: name };
  }

  return null;
};

// Function to create a new file or folder
const createFileOrFolder = (parentPath, name, type) => {
  const fullPath = path.join(parentPath, name);

  if (type === 'file') {
    // Create a file with the provided name
    fs.writeFileSync(fullPath, '', { flag: 'w' });
  } else if (type === 'folder') {
    // Create a folder with the provided name
    fs.mkdirSync(fullPath);
  } else {
    throw new Error('Invalid type. Must be "file" or "folder".');
  }
};

// Endpoint to get the directory tree
app.post('/api/get-directory-tree', (req, res) => {
  const { projectPath } = req.body;

  try {
    const tree = getDirectoryTree(projectPath);
    res.json(tree);
  } catch (err) {
    res.status(500).json({ error: 'Invalid project path or directory not found.' });
  }
});

// Endpoint to create a new node (file or folder)
app.post('/api/create-node', (req, res) => {
  const { parentPath, name, type } = req.body;

  try {
    createFileOrFolder(parentPath, name, type);
    res.json({ success: true, message: `${type} created successfully!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔴 ADD THIS AT THE END
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
