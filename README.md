# VideoApp - Video Sharing Platform

A modern, minimalist video sharing platform with a clean dark mode interface and social features.

## Features

### 🎬 Core Functionality
- **Video Upload**: Drag-and-drop video upload with metadata
- **Video Feed**: Beautiful grid layout with video cards
- **Video Player**: Full-screen modal player with controls
- **User Management**: Role-based authentication (Creator/Consumer)

### 💬 Social Features
- **Like System**: Real-time like/unlike with visual feedback
- **Comments**: Sliding comment panel with real-time updates
- **User Profiles**: Creator and consumer role management

### 🎨 Design
- **Dark Mode**: Beautiful glassmorphism design
- **Responsive**: Mobile-friendly responsive design
- **Animations**: Smooth hover effects and transitions
- **Minimal**: Clean, modern interface

## Tech Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Custom styling with glassmorphism effects
- **Vanilla JavaScript** - ES6+ with async/await
- **Responsive Design** - Mobile-first approach

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **SQLite** - Database for development
- **JWT** - Authentication tokens
- **Multer** - File upload handling
- **bcryptjs** - Password hashing

## Installation

### Prerequisites
- Node.js (v14+ recommended)
- npm or yarn

### Setup Instructions

1. **Clone or navigate to the project directory**
   ```bash
   cd videoApp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```
   Or for production:
   ```bash
   npm start
   ```

4. **Access the application**
   - Open your browser and go to: `http://localhost:3001`
   - The frontend and API are served from the same port

## Usage

### Getting Started

1. **Create an Account**
   - Click "Login" in the navigation
   - Switch to "Sign Up" mode
   - Choose your role:
     - **Consumer**: View and interact with videos
     - **Creator**: Upload, manage, and interact with videos

2. **Upload Videos** (Creators only)
   - Navigate to the "Upload" page
   - Drag and drop a video file or click to browse
   - Fill in title, description, and genre
   - Click "Upload Video"

3. **Watch Videos**
   - Browse the feed on the homepage
   - Click any video card to open the player modal
   - Use the video controls to play/pause, adjust volume, etc.

4. **Social Features**
   - **Like Videos**: Click the heart button in the video modal
   - **Comment**: Click "Comments" to open the sliding panel
   - **Manage Videos**: Go to "My Videos" to see your uploads

### API Endpoints

The backend provides a RESTful API:

#### Authentication
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/signin` - Sign in user
- `GET /api/auth/me` - Get current user info

#### Videos
- `GET /api/videos` - List all videos
- `POST /api/videos` - Upload new video (requires auth)
- `GET /api/videos/:id` - Get specific video
- `DELETE /api/videos/:id` - Delete video (owner only)
- `GET /api/users/:id/videos` - Get user's videos

#### Interactions
- `POST /api/videos/:id/like` - Toggle like on video
- `GET /api/videos/:id/likes` - Get like count
- `GET /api/videos/:id/likes/me` - Check if current user liked video

#### Comments
- `GET /api/videos/:id/comments` - Get video comments
- `POST /api/videos/:id/comments` - Add comment (requires auth)

## Project Structure

```
videoApp/
├── index.html          # Frontend HTML
├── styles.css          # CSS styles with glassmorphism
├── app.js              # Frontend JavaScript
├── server.js           # Backend Express server
├── package.json        # Dependencies and scripts
├── README.md          # This file
├── videoapp.db        # SQLite database (created on first run)
└── uploads/           # Video file storage directory
    └── videos/        # Uploaded video files
```

## Configuration

### Environment Variables
You can set these environment variables or use defaults:

- `PORT` - Server port (default: 3001)
- `JWT_SECRET` - Secret key for JWT tokens (change in production!)

### File Upload Limits
- Maximum file size: 100MB
- Supported formats: MP4, MOV, AVI, WebM
- Files are stored in `uploads/videos/`

## Development

### Running in Development Mode
```bash
npm run dev
```
This uses nodemon to automatically restart the server on changes.

### Database
- Uses SQLite for simplicity
- Database file: `videoapp.db`
- Tables are created automatically on first run

### Adding New Features
1. Backend: Add routes in `server.js`
2. Frontend: Update `app.js` and add API calls
3. UI: Update `index.html` and `styles.css`

## Security Notes

⚠️ **For Development Only**
- Change the `JWT_SECRET` before production deployment
- Add proper input validation and sanitization
- Implement rate limiting for production
- Add HTTPS in production
- Consider using a proper database (PostgreSQL/MySQL) for production

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Future Enhancements

- [ ] Video thumbnails generation
- [ ] User profiles and avatars
- [ ] Video categories and search
- [ ] Push notifications
- [ ] Video streaming optimization
- [ ] Admin panel
- [ ] Content moderation
- [ ] Mobile app

## License

MIT License - See LICENSE file for details

## Support

If you encounter any issues:
1. Check the browser console for errors
2. Ensure all dependencies are installed
3. Verify the server is running on the correct port
4. Check file permissions for uploads directory

---

**Happy sharing! 🎬✨**# videoApp
