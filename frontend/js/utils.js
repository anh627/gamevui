// Utility functions - Các hàm tiện ích dùng chung

// API Base URL
const API_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

// Token Management
const TokenManager = {
    getToken: () => localStorage.getItem('token'),
    setToken: (token) => localStorage.setItem('token', token),
    removeToken: () => localStorage.removeItem('token'),
    
    getUser: () => {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },
    setUser: (user) => localStorage.setItem('user', JSON.stringify(user)),
    removeUser: () => localStorage.removeItem('user'),
    
    isAuthenticated: () => {
        const token = localStorage.getItem('token');
        if (!token) return false;
        
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.exp > Date.now() / 1000;
        } catch (e) {
            return false;
        }
    }
};

// HTTP Request Helper
const httpRequest = async (endpoint, options = {}) => {
    const token = TokenManager.getToken();
    
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };
    
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
        const response = await fetch(`${API_URL}${endpoint}`, config);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Request failed');
        }
        
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Toast Notification System
const Toast = {
    show: (message, type = 'info', duration = 3000) => {
        // Remove existing toast if any
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${Toast.getIcon(type)}</span>
                <span class="toast-message">${message}</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Remove after duration
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },
    
    getIcon: (type) => {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || icons.info;
    }
};

// Loading Spinner
const Loading = {
    show: (container = document.body) => {
        const loader = document.createElement('div');
        loader.className = 'loading-overlay';
        loader.innerHTML = `
            <div class="spinner">
                <div class="double-bounce1"></div>
                <div class="double-bounce2"></div>
            </div>
        `;
        container.appendChild(loader);
    },
    
    hide: (container = document.body) => {
        const loader = container.querySelector('.loading-overlay');
        if (loader) loader.remove();
    }
};

// Form Validation
const Validator = {
    email: (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    
    password: (password) => {
        return password.length >= 6;
    },
    
    username: (username) => {
        return username.length >= 3 && username.length <= 20 && /^[a-zA-Z0-9_]+$/.test(username);
    }
};

// Format Functions
const Format = {
    date: (dateString) => {
        return new Date(dateString).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    
    number: (num) => {
        return new Intl.NumberFormat('vi-VN').format(num);
    },
    
    timeAgo: (dateString) => {
        const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
        
        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60
        };
        
        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return interval === 1 
                    ? `1 ${unit} ago` 
                    : `${interval} ${unit}s ago`;
            }
        }
        
        return 'Just now';
    }
};

// Auth Guard
const AuthGuard = {
    check: () => {
        if (!TokenManager.isAuthenticated()) {
            window.location.href = '/login.html';
            return false;
        }
        return true;
    },
    
    redirectIfAuthenticated: () => {
        if (TokenManager.isAuthenticated()) {
            window.location.href = '/lobby.html';
            return true;
        }
        return false;
    }
};

// Export for use in other files
window.Utils = {
    API_URL,
    SOCKET_URL,
    TokenManager,
    httpRequest,
    Toast,
    Loading,
    Validator,
    Format,
    AuthGuard
};