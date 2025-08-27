// VideoApp - Main Application Logic
class VideoApp {
    constructor() {
        this.currentUser = null;
        this.currentPage = 'feed';
        this.videos = [];
        this.isAuthMode = 'signin';
        this.currentVideoId = null;
        this.currentVideoIndex = 0;
        this.apiBase = window.location.origin + '/api';
        
        this.init();
    }

    init() {
        this.loadUserData();
        this.setupEventListeners();
        this.loadVideos();
        this.updateUI();
    }

    // API Helper methods
    async apiRequest(endpoint, options = {}) {
        const url = `${this.apiBase}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Add auth token if user is logged in
        if (this.currentUser && this.currentUser.token) {
            config.headers['Authorization'] = `Bearer ${this.currentUser.token}`;
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    // Data Management
    loadUserData() {
        const userData = localStorage.getItem('videoapp_user');
        if (userData) {
            this.currentUser = JSON.parse(userData);
            this.updateAuthUI();
            this.showMainApp();
        } else {
            this.showLandingPage();
        }
    }

    saveUserData() {
        if (this.currentUser) {
            localStorage.setItem('videoapp_user', JSON.stringify(this.currentUser));
        } else {
            localStorage.removeItem('videoapp_user');
        }
    }

    // Event Listeners Setup
    setupEventListeners() {
        // Sidebar navigation
        document.querySelectorAll('.sidebar-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = e.target.dataset.page || e.target.closest('.sidebar-btn').dataset.page;
                this.navigateTo(page);
            });
        });

        // User avatar click
        document.getElementById('user-avatar').addEventListener('click', () => {
            if (this.currentUser) {
                this.logout();
            } else {
                this.navigateTo('auth');
            }
        });

        // Logout button click
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });

        // Auth form
        document.getElementById('auth-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAuth();
        });

        // TikTok-style video controls
        this.setupVideoPlayerListeners();

        // Upload functionality
        this.setupUploadListeners();

        // Video modal (for grid views)
        this.setupModalListeners();

        // Comments panel
        this.setupCommentsListeners();

        // Search functionality
        this.setupSearchListeners();
    }

    setupVideoPlayerListeners() {
        const mainVideo = document.getElementById('main-video');
        const playButton = document.getElementById('play-button');
        const videoOverlay = document.getElementById('video-overlay');
        const likeAction = document.getElementById('like-action');
        const commentAction = document.getElementById('comment-action');
        const prevBtn = document.getElementById('prev-video');
        const nextBtn = document.getElementById('next-video');

        // Video play/pause controls
        mainVideo.addEventListener('click', () => {
            if (mainVideo.paused) {
                mainVideo.play();
                videoOverlay.classList.remove('show');
            } else {
                mainVideo.pause();
                videoOverlay.classList.add('show');
            }
        });

        playButton.addEventListener('click', () => {
            mainVideo.play();
            videoOverlay.classList.remove('show');
        });

        mainVideo.addEventListener('pause', () => {
            videoOverlay.classList.add('show');
        });

        mainVideo.addEventListener('play', () => {
            videoOverlay.classList.remove('show');
        });

        // Action buttons
        likeAction.addEventListener('click', () => {
            this.toggleLikeTikTok();
        });

        commentAction.addEventListener('click', () => {
            this.openCommentsPanel();
        });

        // Video navigation
        prevBtn.addEventListener('click', () => {
            this.navigateVideo(-1);
        });

        nextBtn.addEventListener('click', () => {
            this.navigateVideo(1);
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (this.currentPage === 'feed') {
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.navigateVideo(-1);
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.navigateVideo(1);
                } else if (e.key === ' ') {
                    e.preventDefault();
                    if (mainVideo.paused) {
                        mainVideo.play();
                    } else {
                        mainVideo.pause();
                    }
                }
            }
        });
    }

    setupSearchListeners() {
        const searchBtn = document.getElementById('search-btn');
        const searchInput = document.getElementById('search-input');

        searchBtn.addEventListener('click', () => {
            this.performSearch();
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });
    }

    setupUploadListeners() {
        const uploadArea = document.getElementById('upload-area');
        const videoInput = document.getElementById('video-input');

        uploadArea.addEventListener('click', () => videoInput.click());

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        });

        videoInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelect(e.target.files[0]);
            }
        });

        document.getElementById('upload-btn').addEventListener('click', () => {
            this.uploadVideo();
        });
    }

    setupModalListeners() {
        const modal = document.getElementById('video-modal');
        const closeBtn = document.getElementById('close-modal');
        const likeBtn = document.getElementById('like-btn');
        const commentBtn = document.getElementById('comment-btn');

        closeBtn.addEventListener('click', () => {
            this.closeVideoModal();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeVideoModal();
            }
        });

        likeBtn.addEventListener('click', () => {
            this.toggleLike();
        });

        commentBtn.addEventListener('click', () => {
            this.openCommentsPanel();
        });
    }

    setupCommentsListeners() {
        const closeCommentsBtn = document.getElementById('close-comments');
        const postCommentBtn = document.getElementById('post-comment-btn');
        const commentInput = document.getElementById('comment-input');

        closeCommentsBtn.addEventListener('click', () => {
            this.closeCommentsPanel();
        });

        postCommentBtn.addEventListener('click', () => {
            this.postComment();
        });

        commentInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.postComment();
            }
        });
    }

    // Navigation
    navigateTo(page) {
        // Check if user needs to be authenticated
        if ((page === 'upload' || page === 'liked') && !this.currentUser) {
            this.navigateTo('auth');
            return;
        }

        this.currentPage = page;
        
        // Update sidebar buttons
        document.querySelectorAll('.sidebar-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.page === page) {
                btn.classList.add('active');
            }
        });

        // Update page title
        const pageTitle = document.getElementById('page-title');
        const titles = {
            'feed': 'Home Feed',
            'search': 'Search',
            'liked': 'Liked Videos',
            'upload': 'Upload Video',
            'manage': 'My Videos',
            'auth': 'Sign In'
        };
        pageTitle.textContent = titles[page] || 'VideoApp';

        // Show/hide pages
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });
        document.getElementById(`${page}-page`).classList.add('active');

        // Load page-specific content
        if (page === 'feed') {
            this.loadTikTokFeed();
        } else if (page === 'search') {
            this.loadSearchPage();
        } else if (page === 'liked') {
            this.loadLikedVideos();
        } else if (page === 'manage') {
            this.renderManageGrid();
        }
    }

    // TikTok-style video navigation
    navigateVideo(direction) {
        if (this.videos.length === 0) return;

        this.currentVideoIndex += direction;
        
        if (this.currentVideoIndex < 0) {
            this.currentVideoIndex = this.videos.length - 1;
        } else if (this.currentVideoIndex >= this.videos.length) {
            this.currentVideoIndex = 0;
        }

        this.loadCurrentVideo();
    }

    loadCurrentVideo() {
        if (this.videos.length === 0) {
            this.showNoVideosMessage();
            return;
        }

        const video = this.videos[this.currentVideoIndex];
        this.currentVideoId = video.id;
        
        const mainVideo = document.getElementById('main-video');
        const videoInfoOverlay = document.getElementById('video-info-overlay') || document.querySelector('.video-info-overlay');
        
        // Start transition
        mainVideo.classList.add('transitioning');
        if (videoInfoOverlay) {
            videoInfoOverlay.classList.add('transitioning');
        }
        
        setTimeout(() => {
            const authorElement = document.getElementById('current-video-author');
            const titleElement = document.getElementById('current-video-title');
            const descriptionElement = document.getElementById('current-video-description');

            // Update video source
            if (video.url) {
                mainVideo.src = video.url;
                mainVideo.load();
            } else {
                mainVideo.src = '';
                mainVideo.poster = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDUwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI1MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9IjI1MCIgeT0iMTUwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE4Ij5WaWRlbyBQbGF5YmFjazwvdGV4dD4KPC9zdmc+';
            }

            // Update video info
            authorElement.textContent = `@${video.author}`;
            titleElement.textContent = video.title;
            descriptionElement.textContent = video.description || '';

            // Update action button counts
            document.getElementById('like-count').textContent = video.likes || 0;
            document.getElementById('comment-count').textContent = video.comments || 0;

            // Update like button state
            this.updateTikTokLikeButton();

            // Increment view count
            this.incrementViewCount(video.id);
            
            // End transition
            setTimeout(() => {
                mainVideo.classList.remove('transitioning');
                if (videoInfoOverlay) {
                    videoInfoOverlay.classList.remove('transitioning');
                }
            }, 50);
        }, 250);
    }

    showNoVideosMessage() {
        const mainVideo = document.getElementById('main-video');
        const authorElement = document.getElementById('current-video-author');
        const titleElement = document.getElementById('current-video-title');
        const descriptionElement = document.getElementById('current-video-description');

        mainVideo.src = '';
        mainVideo.poster = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDUwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI1MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9IjI1MCIgeT0iMTUwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE4Ij5ObyBWaWRlb3MgQXZhaWxhYmxlPC90ZXh0Pjx0ZXh0IHg9IjI1MCIgeT0iMTgwIiBmaWxsPSIjOTk5IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiPkJlIHRoZSBmaXJzdCB0byB1cGxvYWQhPC90ZXh0Pjwvc3ZnPg==';
        
        authorElement.textContent = '@videoapp';
        titleElement.textContent = 'Welcome to VideoApp!';
        descriptionElement.textContent = 'No videos available yet. Upload your first video to get started!';
    }

    async loadTikTokFeed() {
        try {
            await this.loadVideos();
            if (this.videos.length > 0) {
                this.currentVideoIndex = 0;
                this.loadCurrentVideo();
            } else {
                this.showNoVideosMessage();
            }
        } catch (error) {
            console.error('Failed to load TikTok feed:', error);
            this.showNoVideosMessage();
        }
    }

    async performSearch() {
        const searchInput = document.getElementById('search-input');
        const query = searchInput.value.trim();
        
        if (!query) return;

        try {
            const response = await this.apiRequest('/videos');
            const allVideos = response.videos || [];
            
            // Simple search - filter by title or description
            const searchResults = allVideos.filter(video => 
                video.title.toLowerCase().includes(query.toLowerCase()) ||
                video.description.toLowerCase().includes(query.toLowerCase()) ||
                video.author.toLowerCase().includes(query.toLowerCase())
            );

            this.renderSearchResults(searchResults);
        } catch (error) {
            console.error('Search failed:', error);
        }
    }

    renderSearchResults(videos) {
        const searchGrid = document.getElementById('search-grid');
        searchGrid.innerHTML = '';

        if (videos.length === 0) {
            searchGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: rgba(255,255,255,0.6); padding: 2rem;">No videos found matching your search.</p>';
            return;
        }

        videos.forEach(video => {
            const card = this.createVideoCard(video);
            searchGrid.appendChild(card);
        });
    }

    loadSearchPage() {
        // Clear previous search results
        const searchGrid = document.getElementById('search-grid');
        searchGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: rgba(255,255,255,0.6); padding: 2rem;">Enter a search term to find videos.</p>';
        
        // Focus on search input
        document.getElementById('search-input').focus();
    }

    async loadLikedVideos() {
        if (!this.currentUser) {
            this.navigateTo('auth');
            return;
        }

        const likedGrid = document.getElementById('liked-grid');
        
        try {
            const response = await this.apiRequest(`/users/${this.currentUser.id}/liked-videos`);
            const likedVideos = response.videos || [];
            
            likedGrid.innerHTML = '';
            
            if (likedVideos.length === 0) {
                likedGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: rgba(255,255,255,0.6); padding: 2rem;">No liked videos yet. Start liking videos to see them here!</p>';
                return;
            }

            likedVideos.forEach(video => {
                const card = this.createVideoCard(video);
                likedGrid.appendChild(card);
            });
        } catch (error) {
            console.error('Failed to load liked videos:', error);
            likedGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: rgba(255,255,255,0.6); padding: 2rem;">Failed to load liked videos.</p>';
        }
    }

    // Authentication
    toggleAuthMode() {
        this.isAuthMode = this.isAuthMode === 'signin' ? 'signup' : 'signin';
        const title = document.getElementById('auth-title');
        const submitBtn = document.querySelector('.auth-submit');
        const roleGroup = document.getElementById('role-group');
        const switchText = document.querySelector('.auth-switch');

        if (this.isAuthMode === 'signup') {
            title.textContent = 'Sign Up';
            submitBtn.textContent = 'Sign Up';
            roleGroup.style.display = 'block';
            switchText.innerHTML = 'Already have an account? <span class="switch-link" onclick="app.toggleAuthMode()">Sign In</span>';
        } else {
            title.textContent = 'Sign In';
            submitBtn.textContent = 'Sign In';
            roleGroup.style.display = 'none';
            switchText.innerHTML = 'Don\'t have an account? <span class="switch-link" onclick="app.toggleAuthMode()">Sign Up</span>';
        }
    }

    handleAuth() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const role = document.getElementById('role').value;

        if (this.isAuthMode === 'signup') {
            this.signup(email, password, role);
        } else {
            this.signin(email, password);
        }
    }

    async signup(email, password, role) {
        // Simple validation
        if (!email || !password) {
            alert('Please fill in all fields');
            return;
        }

        try {
            const response = await this.apiRequest('/auth/signup', {
                method: 'POST',
                body: JSON.stringify({ email, password, role })
            });

            this.currentUser = {
                ...response.user,
                token: response.token
            };
            
            this.saveUserData();
            this.updateAuthUI();
            this.navigateTo('feed');
            
            alert('Account created successfully!');
        } catch (error) {
            alert(error.message || 'Failed to create account');
        }
    }

    async signin(email, password) {
        if (!email || !password) {
            alert('Please fill in all fields');
            return;
        }

        try {
            const response = await this.apiRequest('/auth/signin', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            this.currentUser = {
                ...response.user,
                token: response.token
            };
            
            this.saveUserData();
            this.updateAuthUI();
            this.showMainApp();
            this.navigateTo('feed');
        } catch (error) {
            alert(error.message || 'Failed to sign in');
        }
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('videoapp_user');
        this.updateAuthUI();
        this.showLandingPage();
    }

    updateAuthUI() {
        const avatarText = document.getElementById('avatar-text');
        const avatarCircle = document.getElementById('avatar-circle');
        
        if (this.currentUser) {
            // Show user initials
            const initials = this.currentUser.email.substring(0, 2).toUpperCase();
            avatarText.textContent = initials;
            avatarCircle.title = `${this.currentUser.email} - Click to logout`;
        } else {
            avatarText.textContent = '?';
            avatarCircle.title = 'Click to sign in';
        }
    }

    showLandingPage() {
        document.getElementById('landing-page').style.display = 'block';
        document.getElementById('main-app').style.display = 'none';
    }

    showMainApp() {
        document.getElementById('landing-page').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
    }

    // TikTok-style like functionality
    async toggleLikeTikTok() {
        if (!this.currentUser) {
            alert('Please sign in to like videos');
            return;
        }

        try {
            await this.apiRequest(`/videos/${this.currentVideoId}/like`, {
                method: 'POST'
            });

            await this.updateTikTokLikeButton();
            
            // Refresh videos to get updated counts
            await this.loadVideos();
            
            // Update current video counts
            if (this.videos[this.currentVideoIndex]) {
                const video = this.videos[this.currentVideoIndex];
                document.getElementById('like-count').textContent = video.likes || 0;
            }
        } catch (error) {
            console.error('Failed to toggle like:', error);
        }
    }

    async updateTikTokLikeButton() {
        if (!this.currentVideoId) return;

        try {
            const [likeCountResponse, userLikedResponse] = await Promise.all([
                this.apiRequest(`/videos/${this.currentVideoId}/likes`),
                this.currentUser ? this.apiRequest(`/videos/${this.currentVideoId}/likes/me`) : Promise.resolve({ liked: false })
            ]);

            const likeAction = document.getElementById('like-action');
            const likeCount = likeCountResponse.count || 0;
            const userLiked = userLikedResponse.liked;

            likeAction.classList.toggle('liked', userLiked);
            document.getElementById('like-count').textContent = likeCount;
        } catch (error) {
            console.error('Failed to update like button:', error);
        }
    }

    async incrementViewCount(videoId) {
        try {
            await this.apiRequest(`/videos/${videoId}`);
        } catch (error) {
            console.error('Failed to increment view count:', error);
        }
    }

    // Video Management
    handleFileSelect(file) {
        if (!file.type.startsWith('video/')) {
            alert('Please select a video file');
            return;
        }

        document.getElementById('upload-area').style.display = 'none';
        document.getElementById('video-metadata').style.display = 'block';
        
        // Store file for upload
        this.selectedFile = file;
    }

    async uploadVideo() {
        if (!this.selectedFile) {
            alert('Please select a video file first');
            return;
        }

        const title = document.getElementById('video-title').value;
        const description = document.getElementById('video-description').value;
        const genre = document.getElementById('video-genre').value;

        if (!title) {
            alert('Please enter a video title');
            return;
        }

        // Show progress
        document.getElementById('video-metadata').style.display = 'none';
        document.getElementById('upload-progress').style.display = 'block';

        try {
            const formData = new FormData();
            formData.append('video', this.selectedFile);
            formData.append('title', title);
            formData.append('description', description);
            formData.append('genre', genre);

            // Simulate progress for UX
            this.simulateUpload();

            const response = await this.apiRequest('/videos', {
                method: 'POST',
                headers: {}, // Remove Content-Type to let browser set it for FormData
                body: formData
            });

            alert('Video uploaded successfully!');
            this.resetUploadForm();
            await this.loadVideos(); // Refresh video list
            this.navigateTo('feed'); // Go to feed to see the new video
        } catch (error) {
            alert(error.message || 'Failed to upload video');
            this.resetUploadForm();
        }
    }

    simulateUpload() {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                return;
            }
            
            document.getElementById('progress-fill').style.width = `${progress}%`;
            document.getElementById('progress-text').textContent = `Uploading... ${Math.round(progress)}%`;
        }, 200);
    }

    resetUploadForm() {
        document.getElementById('upload-area').style.display = 'block';
        document.getElementById('video-metadata').style.display = 'none';
        document.getElementById('upload-progress').style.display = 'none';
        document.getElementById('video-title').value = '';
        document.getElementById('video-description').value = '';
        document.getElementById('progress-fill').style.width = '0%';
        this.selectedFile = null;
    }

    generateThumbnail() {
        // Generate a random color for thumbnail placeholder
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // Video Rendering
    async loadVideos() {
        try {
            const response = await this.apiRequest('/videos');
            this.videos = response.videos || [];
        } catch (error) {
            console.error('Failed to load videos:', error);
            // Fallback to empty array if API fails
            this.videos = [];
        }
    }

    renderVideoGrid() {
        const grid = document.getElementById('video-grid');
        grid.innerHTML = '';

        this.videos.forEach(video => {
            const card = this.createVideoCard(video);
            grid.appendChild(card);
        });
    }

    async renderManageGrid() {
        const grid = document.getElementById('manage-grid');
        grid.innerHTML = '';

        if (!this.currentUser) {
            grid.innerHTML = '<p style="text-align: center; grid-column: 1/-1; color: rgba(255,255,255,0.6);">Please sign in to manage your videos.</p>';
            return;
        }

        try {
            const response = await this.apiRequest(`/users/${this.currentUser.id}/videos`);
            const userVideos = response.videos || [];
            
            if (userVideos.length === 0) {
                grid.innerHTML = '<p style="text-align: center; grid-column: 1/-1; color: rgba(255,255,255,0.6);">No videos uploaded yet. <a href="#" onclick="app.navigateTo(\'upload\')">Upload your first video!</a></p>';
                return;
            }

            userVideos.forEach(video => {
                const card = this.createVideoCard(video, true);
                grid.appendChild(card);
            });
        } catch (error) {
            console.error('Failed to load user videos:', error);
            grid.innerHTML = '<p style="text-align: center; grid-column: 1/-1; color: rgba(255,255,255,0.6);">Failed to load your videos.</p>';
        }
    }

    createVideoCard(video, showManageOptions = false) {
        const card = document.createElement('div');
        card.className = 'video-card';
        card.onclick = () => this.openVideoModal(video);

        const thumbnailColor = this.generateThumbnail();

        card.innerHTML = `
            <div class="video-thumbnail" style="background: ${video.thumbnail || thumbnailColor}; display: flex; align-items: center; justify-content: center; color: white; font-size: 2rem;">
                📹
            </div>
            <div class="video-info">
                <div class="video-title">${video.title}</div>
                <div class="video-meta">
                    <span>By ${video.author}</span>
                    <span>${new Date(video.uploadDate).toLocaleDateString()}</span>
                </div>
                <div class="video-stats">
                    <div class="stat">
                        <span>👁️</span>
                        <span>${video.views || 0}</span>
                    </div>
                    <div class="stat">
                        <span>❤️</span>
                        <span>${video.likes || 0}</span>
                    </div>
                    <div class="stat">
                        <span>💬</span>
                        <span>${video.comments || 0}</span>
                    </div>
                </div>
                ${showManageOptions ? `
                    <div class="manage-actions" style="margin-top: 0.5rem;">
                        <button onclick="event.stopPropagation(); app.deleteVideo('${video.id}')" style="background: #ff6b6b; border: none; padding: 0.3rem 0.8rem; border-radius: 5px; color: white; cursor: pointer;">Delete</button>
                    </div>
                ` : ''}
            </div>
        `;

        return card;
    }

    async deleteVideo(videoId) {
        if (confirm('Are you sure you want to delete this video?')) {
            try {
                await this.apiRequest(`/videos/${videoId}`, {
                    method: 'DELETE'
                });
                
                alert('Video deleted successfully');
                await this.renderManageGrid();
            } catch (error) {
                alert(error.message || 'Failed to delete video');
            }
        }
    }

    // Video Modal
    async openVideoModal(video) {
        this.currentVideoId = video.id;
        const modal = document.getElementById('video-modal');
        const modalVideo = document.getElementById('modal-video');
        const modalTitle = document.getElementById('modal-title');
        const modalDescription = document.getElementById('modal-description');

        modalTitle.textContent = video.title;
        modalDescription.textContent = video.description;
        
        // Set video source
        if (video.url) {
            modalVideo.src = video.url;
        } else {
            modalVideo.src = '';
            modalVideo.poster = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDUwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI1MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9IjI1MCIgeT0iMTUwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE4Ij5WaWRlbyBQbGF5YmFjazwvdGV4dD4KPC9zdmc+';
        }

        await this.updateLikeButton();
        modal.style.display = 'block';

        // Fetch updated video details to increment view count
        try {
            await this.apiRequest(`/videos/${video.id}`);
        } catch (error) {
            console.error('Failed to fetch video details:', error);
        }
    }

    closeVideoModal() {
        const modal = document.getElementById('video-modal');
        const modalVideo = document.getElementById('modal-video');
        
        modal.style.display = 'none';
        modalVideo.pause();
        modalVideo.src = '';
        this.currentVideoId = null;
    }

    // Like Functionality
    async toggleLike() {
        if (!this.currentUser) {
            alert('Please sign in to like videos');
            return;
        }

        try {
            await this.apiRequest(`/videos/${this.currentVideoId}/like`, {
                method: 'POST'
            });

            await this.updateLikeButton();
            
            // Refresh video grid if needed
            if (this.currentPage === 'feed') {
                await this.loadVideos();
                this.renderVideoGrid();
            }
        } catch (error) {
            console.error('Failed to toggle like:', error);
        }
    }

    async updateLikeButton() {
        if (!this.currentVideoId) return;

        try {
            const [likeCountResponse, userLikedResponse] = await Promise.all([
                this.apiRequest(`/videos/${this.currentVideoId}/likes`),
                this.currentUser ? this.apiRequest(`/videos/${this.currentVideoId}/likes/me`) : Promise.resolve({ liked: false })
            ]);

            const likeBtn = document.getElementById('like-btn');
            const likeCount = likeCountResponse.count || 0;
            const userLiked = userLikedResponse.liked;

            likeBtn.classList.toggle('liked', userLiked);
            likeBtn.querySelector('.like-count').textContent = likeCount;
        } catch (error) {
            console.error('Failed to update like button:', error);
        }
    }

    // Comments Functionality
    openCommentsPanel() {
        const panel = document.getElementById('comments-panel');
        panel.classList.add('open');
        this.loadComments();
    }

    closeCommentsPanel() {
        const panel = document.getElementById('comments-panel');
        panel.classList.remove('open');
    }

    async loadComments() {
        if (!this.currentVideoId) return;

        const commentsList = document.getElementById('comments-list');
        
        try {
            const response = await this.apiRequest(`/videos/${this.currentVideoId}/comments`);
            const comments = response.comments || [];

            if (comments.length === 0) {
                commentsList.innerHTML = '<p style="color: rgba(255,255,255,0.6); text-align: center; padding: 2rem;">No comments yet. Be the first to comment!</p>';
                return;
            }

            commentsList.innerHTML = comments.map(comment => `
                <div class="comment">
                    <div class="comment-author">${comment.author}</div>
                    <div class="comment-text">${comment.text}</div>
                    <div class="comment-time">${new Date(comment.timestamp).toLocaleString()}</div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Failed to load comments:', error);
            commentsList.innerHTML = '<p style="color: rgba(255,255,255,0.6); text-align: center; padding: 2rem;">Failed to load comments.</p>';
        }
    }

    async postComment() {
        if (!this.currentUser) {
            alert('Please sign in to comment');
            return;
        }

        const commentInput = document.getElementById('comment-input');
        const text = commentInput.value.trim();

        if (!text) {
            return;
        }

        try {
            console.log('Posting comment for video:', this.currentVideoId);
            console.log('Comment text:', text);
            
            const response = await this.apiRequest(`/videos/${this.currentVideoId}/comments`, {
                method: 'POST',
                body: JSON.stringify({ text })
            });

            console.log('Comment posted successfully:', response);

            commentInput.value = '';
            await this.loadComments();
            
            // Refresh video data to show new comment count
            if (this.currentPage === 'feed') {
                await this.loadVideos();
                // Update current video's comment count
                if (this.videos[this.currentVideoIndex]) {
                    const video = this.videos[this.currentVideoIndex];
                    document.getElementById('comment-count').textContent = video.comments || 0;
                }
            }
        } catch (error) {
            console.error('Failed to post comment:', error);
            alert(`Failed to post comment: ${error.message}`);
        }
    }

    // UI Updates
    async updateUI() {
        await this.loadVideos();
        this.updateAuthUI();
        
        // Load appropriate content based on current page
        if (this.currentPage === 'feed') {
            this.loadTikTokFeed();
        }
    }
}

// Global functions for onclick handlers
function toggleAuthMode() {
    app.toggleAuthMode();
}

// Initialize the app
const app = new VideoApp();

// Make app globally available for debugging
window.app = app;