// Lobby management with Socket.io - Quản lý phòng chờ multiplayer

let socket;
let currentRoom = null;
let onlineUsers = [];
let availableRooms = [];

document.addEventListener('DOMContentLoaded', () => {
    const { TokenManager, Toast, AuthGuard, SOCKET_URL } = window.Utils;
    
    // Check authentication
    if (!AuthGuard.check()) return;
    
    // Initialize socket connection
    initSocket();
    
    // Initialize UI
    initLobbyUI();
    
    // Load user info
    displayUserInfo();
});

// Socket.io Connection
function initSocket() {
    const user = Utils.TokenManager.getUser();
    const token = Utils.TokenManager.getToken();
    
    socket = io(Utils.SOCKET_URL, {
        auth: {
            token: token
        }
    });
    
    // Connection events
    socket.on('connect', () => {
        console.log('Connected to server');
        Utils.Toast.show('Đã kết nối với server', 'success');
        
        // Join lobby
        socket.emit('join-lobby', {
            userId: user.id,
            username: user.username
        });
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        Utils.Toast.show('Mất kết nối với server', 'warning');
    });
    
    // Lobby events
    socket.on('lobby-update', (data) => {
        updateOnlineUsers(data.users);
        updateAvailableRooms(data.rooms);
    });
    
    // Room events
    socket.on('room-created', (room) => {
        Utils.Toast.show(`Phòng ${room.name} đã được tạo`, 'success');
        joinRoom(room.id);
    });
    
    socket.on('room-joined', (room) => {
        currentRoom = room;
        updateRoomUI(room);
        Utils.Toast.show(`Đã vào phòng ${room.name}`, 'success');
    });
    
    socket.on('room-left', () => {
        currentRoom = null;
        updateRoomUI(null);
        Utils.Toast.show('Đã rời phòng', 'info');
    });
    
    socket.on('room-updated', (room) => {
        if (currentRoom && currentRoom.id === room.id) {
            currentRoom = room;
            updateRoomUI(room);
        }
    });
    
    // Game events
    socket.on('game-starting', (data) => {
        Utils.Toast.show(`Game ${data.gameType} đang bắt đầu!`, 'success');
        redirectToGame(data.gameType, data.roomId);
    });
    
    // Chat events
    socket.on('chat-message', (data) => {
        displayChatMessage(data);
    });
    
    // Error handling
    socket.on('error', (error) => {
        Utils.Toast.show(error.message, 'error');
    });
}

// Lobby UI Initialization
function initLobbyUI() {
    // Create room button
    const createRoomBtn = document.getElementById('createRoomBtn');
    if (createRoomBtn) {
        createRoomBtn.addEventListener('click', showCreateRoomModal);
    }
    
    // Quick match button
    const quickMatchBtn = document.getElementById('quickMatchBtn');
    if (quickMatchBtn) {
        quickMatchBtn.addEventListener('click', findQuickMatch);
    }
    
    // Game type filters
    const gameFilters = document.querySelectorAll('.game-filter');
    gameFilters.forEach(filter => {
        filter.addEventListener('click', (e) => {
            const gameType = e.target.dataset.game;
            filterRoomsByGame(gameType);
        });
    });
    
    // Chat input
    const chatInput = document.getElementById('chatInput');
    const sendChatBtn = document.getElementById('sendChatBtn');
    
    if (chatInput && sendChatBtn) {
        sendChatBtn.addEventListener('click', sendChatMessage);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendChatMessage();
        });
    }
}

// Display User Info
function displayUserInfo() {
    const user = Utils.TokenManager.getUser();
    
    const userInfoEl = document.getElementById('userInfo');
    if (userInfoEl) {
        userInfoEl.innerHTML = `
            <div class="user-card">
                <img src="/images/avatar-default.png" alt="Avatar" class="user-avatar">
                <div class="user-details">
                    <h3>${user.username}</h3>
                    <p>Điểm: ${Utils.Format.number(user.score || 0)}</p>
                    <p>Cấp độ: ${user.level || 1}</p>
                </div>
            </div>
        `;
    }
}

// Update Online Users
function updateOnlineUsers(users) {
    onlineUsers = users;
    
    const onlineListEl = document.getElementById('onlineUsers');
    if (!onlineListEl) return;
    
    onlineListEl.innerHTML = `
        <h3>Người chơi online (${users.length})</h3>
        <div class="users-grid">
            ${users.map(user => `
                <div class="user-item ${user.status}" data-user-id="${user.id}">
                    <span class="status-indicator"></span>
                    <span class="username">${user.username}</span>
                    ${user.inGame ? '<span class="in-game">Trong game</span>' : ''}
                    <button class="invite-btn" onclick="inviteUser('${user.id}')">
                        Mời
                    </button>
                </div>
            `).join('')}
        </div>
    `;
}

// Update Available Rooms
function updateAvailableRooms(rooms) {
    availableRooms = rooms;
    
    const roomsListEl = document.getElementById('roomsList');
    if (!roomsListEl) return;
    
    roomsListEl.innerHTML = `
        <h3>Phòng chờ (${rooms.length})</h3>
        <div class="rooms-grid">
            ${rooms.map(room => `
                <div class="room-card" data-room-id="${room.id}">
                    <div class="room-header">
                        <h4>${room.name}</h4>
                        <span class="game-type">${room.gameType}</span>
                    </div>
                    <div class="room-info">
                        <p>👥 ${room.players.length}/${room.maxPlayers}</p>
                        <p>🏆 ${room.betAmount || 0} điểm</p>
                    </div>
                    <div class="room-players">
                        ${room.players.map(p => `
                            <span class="player-tag">${p.username}</span>
                        `).join('')}
                    </div>
                    <button class="join-room-btn" onclick="joinRoom('${room.id}')" 
                        ${room.players.length >= room.maxPlayers ? 'disabled' : ''}>
                        ${room.players.length >= room.maxPlayers ? 'Đầy' : 'Vào phòng'}
                    </button>
                </div>
            `).join('')}
        </div>
    `;
}

// Create Room Modal
function showCreateRoomModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h2>Tạo phòng mới</h2>
            <form id="createRoomForm">
                <input type="text" name="roomName" placeholder="Tên phòng" required>
                
                <select name="gameType" required>
                    <option value="">Chọn game</option>
                    <option value="tictactoe">Cờ Caro (X&O)</option>
                    <option value="ludo">Cờ Cá Ngựa</option>
                    <option value="uno">Bài UNO</option>
                    <option value="battleship">Bắn Thuyền</option>
                    <option value="bingo">Bingo</option>
                </select>
                
                <select name="maxPlayers" required>
                    <option value="2">2 người</option>
                    <option value="4">4 người</option>
                    <option value="6">6 người</option>
                    <option value="8">8 người</option>
                </select>
                
                <input type="number" name="betAmount" placeholder="Điểm cược (tuỳ chọn)" min="0">
                
                <div class="form-check">
                    <input type="checkbox" name="isPrivate" id="isPrivate">
                    <label for="isPrivate">Phòng riêng tư</label>
                </div>
                
                <input type="password" name="password" placeholder="Mật khẩu phòng" style="display:none">
                
                <button type="submit" class="btn btn-primary">Tạo phòng</button>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle private room toggle
    const isPrivateCheck = modal.querySelector('#isPrivate');
    const passwordInput = modal.querySelector('input[name="password"]');
    
    isPrivateCheck.addEventListener('change', (e) => {
        passwordInput.style.display = e.target.checked ? 'block' : 'none';
        if (e.target.checked) passwordInput.required = true;
        else passwordInput.required = false;
    });
    
    // Handle form submit
    const form = modal.querySelector('#createRoomForm');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const roomData = {
            name: formData.get('roomName'),
            gameType: formData.get('gameType'),
            maxPlayers: parseInt(formData.get('maxPlayers')),
            betAmount: parseInt(formData.get('betAmount')) || 0,
            isPrivate: formData.get('isPrivate') === 'on',
            password: formData.get('password')
        };
        
        socket.emit('create-room', roomData);
        modal.remove();
    });
}

// Join Room
function joinRoom(roomId) {
    socket.emit('join-room', { roomId });
}

// Leave Room
function leaveRoom() {
    if (currentRoom) {
        socket.emit('leave-room', { roomId: currentRoom.id });
    }
}

// Update Room UI
function updateRoomUI(room) {
    const roomDetailsEl = document.getElementById('currentRoom');
    if (!roomDetailsEl) return;
    
    if (!room) {
        roomDetailsEl.innerHTML = '<p>Bạn chưa vào phòng nào</p>';
        return;
    }
    
    roomDetailsEl.innerHTML = `
        <div class="current-room">
            <h3>${room.name}</h3>
            <p>Game: ${room.gameType}</p>
            <p>Người chơi: ${room.players.length}/${room.maxPlayers}</p>
            <div class="players-list">
                ${room.players.map(p => `
                    <div class="player-item">
                        <span>${p.username}</span>
                        ${p.isReady ? '<span class="ready">✓</span>' : ''}
                        ${p.isHost ? '<span class="host">👑</span>' : ''}
                    </div>
                `).join('')}
            </div>
            <div class="room-actions">
                ${room.host === Utils.TokenManager.getUser().id ? `
                    <button class="btn btn-success" onclick="startGame()">Bắt đầu</button>
                ` : `
                    <button class="btn btn-primary" onclick="toggleReady()">Sẵn sàng</button>
                `}
                <button class="btn btn-danger" onclick="leaveRoom()">Rời phòng</button>
            </div>
        </div>
    `;
}

// Quick Match
async function findQuickMatch() {
    const gameType = prompt('Chọn loại game:\n1. tictactoe\n2. ludo\n3. uno\n4. battleship\n5. bingo');
    
    if (!gameType) return;
    
    Utils.Toast.show('Đang tìm trận...', 'info');
    socket.emit('quick-match', { gameType });
}

// Filter Rooms by Game
function filterRoomsByGame(gameType) {
    const filtered = gameType === 'all' 
        ? availableRooms 
        : availableRooms.filter(r => r.gameType === gameType);
    
    updateAvailableRooms(filtered);
}

// Chat Functions
function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    socket.emit('chat-message', {
        message,
        roomId: currentRoom?.id || 'lobby'
    });
    
    input.value = '';
}

function displayChatMessage(data) {
    const chatBox = document.getElementById('chatBox');
    if (!chatBox) return;
    
    const messageEl = document.createElement('div');
    messageEl.className = 'chat-message';
    messageEl.innerHTML = `
        <span class="chat-user">${data.username}:</span>
        <span class="chat-text">${data.message}</span>
        <span class="chat-time">${new Date().toLocaleTimeString()}</span>
    `;
    
    chatBox.appendChild(messageEl);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Game Functions
function startGame() {
    if (!currentRoom || currentRoom.host !== Utils.TokenManager.getUser().id) {
        Utils.Toast.show('Chỉ chủ phòng mới có thể bắt đầu game', 'error');
        return;
    }
    
    socket.emit('start-game', { roomId: currentRoom.id });
}

function toggleReady() {
    if (!currentRoom) return;
    socket.emit('toggle-ready', { roomId: currentRoom.id });
}

function redirectToGame(gameType, roomId) {
    window.location.href = `/games/${gameType}/index.html?room=${roomId}`;
}

// Invite User
window.inviteUser = (userId) => {
    if (!currentRoom) {
        Utils.Toast.show('Bạn cần tạo hoặc vào phòng trước', 'warning');
        return;
    }
    
    socket.emit('invite-user', {
        userId,
        roomId: currentRoom.id
    });
    
    Utils.Toast.show('Đã gửi lời mời', 'success');
};