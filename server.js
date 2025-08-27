const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use(express.static('.')); // Serve frontend files

// Database Setup
const db = new sqlite3.Database('videoapp.db');

// Initialize database tables
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'consumer',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Videos table
  db.run(`CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    genre TEXT,
    filename TEXT NOT NULL,
    thumbnail TEXT,
    user_id TEXT NOT NULL,
    views INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Likes table
  db.run(`CREATE TABLE IF NOT EXISTS likes (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos (id),
    FOREIGN KEY (user_id) REFERENCES users (id),
    UNIQUE(video_id, user_id)
  )`);

  // Comments table
  db.run(`CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);
});

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/videos';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = uuidv4() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed!'), false);
    }
  }
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Helper function to get user by email
const getUserByEmail = (email) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Helper function to get user by id
const getUserById = (id) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT id, email, role, created_at FROM users WHERE id = ?', [id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Authentication Routes

// Sign Up
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, role = 'consumer' } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    // Create user
    db.run(
      'INSERT INTO users (id, email, password, role) VALUES (?, ?, ?, ?)',
      [userId, email, hashedPassword, role],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to create user' });
        }

        // Generate JWT token
        const token = jwt.sign(
          { id: userId, email, role },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        res.status(201).json({
          message: 'User created successfully',
          token,
          user: { id: userId, email, role }
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Sign In
app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Get user from database
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Signed in successfully',
      token,
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Video Routes

// Upload video
app.post('/api/videos', authenticateToken, upload.single('video'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Video file is required' });
    }

    const { title, description, genre } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const videoId = uuidv4();
    const filename = req.file.filename;

    db.run(
      'INSERT INTO videos (id, title, description, genre, filename, user_id) VALUES (?, ?, ?, ?, ?, ?)',
      [videoId, title, description || '', genre || '', filename, req.user.id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to save video' });
        }

        res.status(201).json({
          message: 'Video uploaded successfully',
          video: {
            id: videoId,
            title,
            description,
            genre,
            filename,
            url: `/uploads/videos/${filename}`
          }
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all videos
app.get('/api/videos', (req, res) => {
  const query = `
    SELECT v.*, u.email as author,
           (SELECT COUNT(*) FROM likes WHERE video_id = v.id) as like_count,
           (SELECT COUNT(*) FROM comments WHERE video_id = v.id) as comment_count
    FROM videos v 
    JOIN users u ON v.user_id = u.id 
    ORDER BY v.created_at DESC
  `;
  
  db.all(query, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch videos' });
    }

    const videos = rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      genre: row.genre,
      author: row.author,
      url: `/uploads/videos/${row.filename}`,
      thumbnail: row.thumbnail,
      views: row.views,
      likes: row.like_count,
      comments: row.comment_count,
      uploadDate: row.created_at
    }));

    res.json({ videos });
  });
});

// Get single video
app.get('/api/videos/:id', (req, res) => {
  const videoId = req.params.id;
  
  const query = `
    SELECT v.*, u.email as author,
           (SELECT COUNT(*) FROM likes WHERE video_id = v.id) as like_count,
           (SELECT COUNT(*) FROM comments WHERE video_id = v.id) as comment_count
    FROM videos v 
    JOIN users u ON v.user_id = u.id 
    WHERE v.id = ?
  `;
  
  db.get(query, [videoId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch video' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Increment view count
    db.run('UPDATE videos SET views = views + 1 WHERE id = ?', [videoId]);

    const video = {
      id: row.id,
      title: row.title,
      description: row.description,
      genre: row.genre,
      author: row.author,
      url: `/uploads/videos/${row.filename}`,
      thumbnail: row.thumbnail,
      views: row.views + 1,
      likes: row.like_count,
      comments: row.comment_count,
      uploadDate: row.created_at
    };

    res.json({ video });
  });
});

// Delete video
app.delete('/api/videos/:id', authenticateToken, (req, res) => {
  const videoId = req.params.id;

  // First check if the video belongs to the user
  db.get('SELECT * FROM videos WHERE id = ? AND user_id = ?', [videoId, req.user.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Video not found or unauthorized' });
    }

    // Delete the file
    const filePath = path.join('uploads/videos', row.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    db.run('DELETE FROM videos WHERE id = ?', [videoId], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete video' });
      }
      res.json({ message: 'Video deleted successfully' });
    });
  });
});

// Get user's videos
app.get('/api/users/:id/videos', (req, res) => {
  const userId = req.params.id;
  
  const query = `
    SELECT v.*, u.email as author,
           (SELECT COUNT(*) FROM likes WHERE video_id = v.id) as like_count,
           (SELECT COUNT(*) FROM comments WHERE video_id = v.id) as comment_count
    FROM videos v 
    JOIN users u ON v.user_id = u.id 
    WHERE v.user_id = ?
    ORDER BY v.created_at DESC
  `;
  
  db.all(query, [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch videos' });
    }

    const videos = rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      genre: row.genre,
      author: row.author,
      url: `/uploads/videos/${row.filename}`,
      thumbnail: row.thumbnail,
      views: row.views,
      likes: row.like_count,
      comments: row.comment_count,
      uploadDate: row.created_at
    }));

    res.json({ videos });
  });
});

// Get user's liked videos
app.get('/api/users/:id/liked-videos', (req, res) => {
  const userId = req.params.id;
  
  const query = `
    SELECT v.*, u.email as author,
           (SELECT COUNT(*) FROM likes WHERE video_id = v.id) as like_count,
           (SELECT COUNT(*) FROM comments WHERE video_id = v.id) as comment_count,
           l.created_at as liked_at
    FROM videos v 
    JOIN users u ON v.user_id = u.id 
    JOIN likes l ON v.id = l.video_id AND l.user_id = ?
    ORDER BY l.created_at DESC
  `;
  
  db.all(query, [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch liked videos' });
    }

    const videos = rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      genre: row.genre,
      author: row.author,
      url: `/uploads/videos/${row.filename}`,
      thumbnail: row.thumbnail,
      views: row.views,
      likes: row.like_count,
      comments: row.comment_count,
      uploadDate: row.created_at,
      likedAt: row.liked_at
    }));

    res.json({ videos });
  });
});

// Like Routes

// Toggle like
app.post('/api/videos/:id/like', authenticateToken, (req, res) => {
  const videoId = req.params.id;
  const userId = req.user.id;

  // Check if already liked
  db.get('SELECT * FROM likes WHERE video_id = ? AND user_id = ?', [videoId, userId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }

    if (row) {
      // Unlike
      db.run('DELETE FROM likes WHERE video_id = ? AND user_id = ?', [videoId, userId], (err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to unlike video' });
        }
        res.json({ message: 'Video unliked', liked: false });
      });
    } else {
      // Like
      const likeId = uuidv4();
      db.run('INSERT INTO likes (id, video_id, user_id) VALUES (?, ?, ?)', [likeId, videoId, userId], (err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to like video' });
        }
        res.json({ message: 'Video liked', liked: true });
      });
    }
  });
});

// Get video likes
app.get('/api/videos/:id/likes', (req, res) => {
  const videoId = req.params.id;
  
  db.get('SELECT COUNT(*) as count FROM likes WHERE video_id = ?', [videoId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch likes' });
    }
    res.json({ count: row.count });
  });
});

// Check if user liked video
app.get('/api/videos/:id/likes/me', authenticateToken, (req, res) => {
  const videoId = req.params.id;
  const userId = req.user.id;
  
  db.get('SELECT * FROM likes WHERE video_id = ? AND user_id = ?', [videoId, userId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }
    res.json({ liked: !!row });
  });
});

// Comment Routes

// Get video comments
app.get('/api/videos/:id/comments', (req, res) => {
  const videoId = req.params.id;
  
  const query = `
    SELECT c.*, u.email as author 
    FROM comments c 
    JOIN users u ON c.user_id = u.id 
    WHERE c.video_id = ? 
    ORDER BY c.created_at ASC
  `;
  
  db.all(query, [videoId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch comments' });
    }

    const comments = rows.map(row => ({
      id: row.id,
      text: row.text,
      author: row.author,
      timestamp: row.created_at
    }));

    res.json({ comments });
  });
});

// Add comment
app.post('/api/videos/:id/comments', authenticateToken, (req, res) => {
  const videoId = req.params.id;
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Comment text is required' });
  }

  const commentId = uuidv4();
  
  db.run(
    'INSERT INTO comments (id, video_id, user_id, text) VALUES (?, ?, ?, ?)',
    [commentId, videoId, req.user.id, text.trim()],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to add comment' });
      }

      res.status(201).json({
        message: 'Comment added successfully',
        comment: {
          id: commentId,
          text: text.trim(),
          author: req.user.email,
          timestamp: new Date().toISOString()
        }
      });
    }
  );
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend: http://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Closing database connection...');
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Database connection closed.');
    process.exit(0);
  });
});