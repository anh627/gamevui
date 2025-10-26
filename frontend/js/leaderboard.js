// Leaderboard management - Quản lý bảng xếp hạng

document.addEventListener('DOMContentLoaded', () => {
    initLeaderboard();
});

async function initLeaderboard() {
    // Load different leaderboards
    loadGlobalLeaderboard();
    loadGameLeaderboards();
    loadTournamentLeaderboard();
    
    // Initialize filters and tabs
    initFilters();
    initTabs();
    
    // Auto refresh every 30 seconds
    setInterval(() => {
        refreshLeaderboards();
    }, 30000);
}

// Load Global Leaderboard
async function loadGlobalLeaderboard() {
    const result = await Utils.httpRequest('/game/leaderboard/global');
    
    if (result.success) {
        displayLeaderboard('global', result.data.leaderboard);
    } else {
        Utils.Toast.show('Không thể tải bảng xếp hạng', 'error');
    }
}

// Load Game-specific Leaderboards
async function loadGameLeaderboards() {
    const games = ['tictactoe', 'ludo', 'uno', 'battleship', 'bingo'];
    
    for (const game of games) {
        const result = await Utils.httpRequest(`/game/leaderboard/${game}`);
        
        if (result.success) {
            displayLeaderboard(game, result.data.leaderboard);
        }
    }
}

// Load Tournament Leaderboard
async function loadTournamentLeaderboard() {
    const result = await Utils.httpRequest('/tournament/current/leaderboard');
    
    if (result.success && result.data.tournament) {
        displayTournamentInfo(result.data.tournament);
        displayLeaderboard('tournament', result.data.leaderboard);
    }
}

// Display Leaderboard
function displayLeaderboard(type, data) {
    const container = document.getElementById(`leaderboard-${type}`);
    if (!container) return;
    
    const currentUser = Utils.TokenManager.getUser();
    
    container.innerHTML = `
        <div class="leaderboard-container">
            ${data.length === 0 ? '<p class="no-data">Chưa có dữ liệu</p>' : ''}
            
            ${data.slice(0, 3).map((player, index) => `
                <div class="top-player rank-${index + 1} ${player.userId === currentUser?.id ? 'current-user' : ''}">
                    <div class="rank-badge">
                        ${getRankIcon(index + 1)}
                    </div>
                    <div class="player-info">
                        <img src="${player.avatar || '/images/avatar-default.png'}" alt="Avatar" class="player-avatar">
                        <div class="player-details">
                            <h3>${player.username}</h3>
                            <p class="player-stats">
                                <span>🏆 ${Utils.Format.number(player.score)} điểm</span>
                                <span>🎮 ${player.gamesPlayed} trận</span>
                                <span>📊 ${player.winRate}% thắng</span>
                            </p>
                        </div>
                    </div>
                </div>
            `).join('')}
            
            <table class="leaderboard-table">
                <thead>
                    <tr>
                        <th>Hạng</th>
                        <th>Người chơi</th>
                        <th>Điểm</th>
                        <th>Số trận</th>
                        <th>Tỷ lệ thắng</th>
                        <th>Thành tích</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.slice(3).map((player, index) => `
                        <tr class="${player.userId === currentUser?.id ? 'current-user' : ''}">
                            <td class="rank">${index + 4}</td>
                            <td class="player">
                                <img src="${player.avatar || '/images/avatar-default.png'}" alt="Avatar">
                                <span>${player.username}</span>
                            </td>
                            <td class="score">${Utils.Format.number(player.score)}</td>
                            <td>${player.gamesPlayed}</td>
                            <td>${player.winRate}%</td>
                            <td class="achievements">
                                ${player.achievements?.map(a => `
                                    <span class="achievement" title="${a.name}">
                                        ${a.icon}
                                    </span>
                                `).join('') || '-'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            ${displayUserRank(data, currentUser)}
        </div>
    `;
}

// Display User's Rank
function displayUserRank(leaderboard, user) {
    if (!user) return '';
    
    const userRank = leaderboard.findIndex(p => p.userId === user.id) + 1;
    
    if (userRank === 0) {
        return `
            <div class="user-rank-info">
                <p>Bạn chưa có trong bảng xếp hạng</p>
                <button class="btn btn-primary" onclick="window.location.href='/lobby.html'">
                    Chơi ngay
                </button>
            </div>
        `;
    }
    
    return `
        <div class="user-rank-info">
            <h4>Thứ hạng của bạn: #${userRank}</h4>
            <div class="rank-progress">
                <div class="progress-bar" style="width: ${Math.min(100, (100 - userRank))}%"></div>
            </div>
            <p>Cần ${calculatePointsToNextRank(leaderboard, userRank)} điểm để lên hạng</p>
        </div>
    `;
}

// Calculate Points to Next Rank
function calculatePointsToNextRank(leaderboard, currentRank) {
    if (currentRank === 1) return 0;
    
    const currentPlayer = leaderboard[currentRank - 1];
    const nextPlayer = leaderboard[currentRank - 2];
    
    return nextPlayer.score - currentPlayer.score + 1;
}

// Get Rank Icon
function getRankIcon(rank) {
    const icons = {
        1: '🥇',
        2: '🥈',
        3: '🥉'
    };
    return icons[rank] || rank;
}

// Display Tournament Info
function displayTournamentInfo(tournament) {
    const container = document.getElementById('tournament-info');
    if (!container) return;
    
    container.innerHTML = `
        <div class="tournament-card">
            <h2>${tournament.name}</h2>
            <div class="tournament-details">
                <p>🏆 Giải thưởng: ${Utils.Format.number(tournament.prize)} điểm</p>
                <p>📅 Thời gian: ${Utils.Format.date(tournament.startDate)} - ${Utils.Format.date(tournament.endDate)}</p>
                <p>👥 Người tham gia: ${tournament.participants.length}/${tournament.maxParticipants}</p>
            </div>
            <div class="tournament-actions">
                ${tournament.status === 'upcoming' ? `
                    <button class="btn btn-primary" onclick="joinTournament('${tournament.id}')">
                        Đăng ký tham gia
                    </button>
                ` : ''}
                <button class="btn btn-secondary" onclick="viewTournamentDetails('${tournament.id}')">
                    Xem chi tiết
                </button>
            </div>
        </div>
    `;
}

// Initialize Filters
function initFilters() {
    // Time filter
    const timeFilter = document.getElementById('timeFilter');
    if (timeFilter) {
        timeFilter.addEventListener('change', (e) => {
            const period = e.target.value;
            filterLeaderboardByTime(period);
        });
    }
    
    // Game filter
    const gameFilter = document.getElementById('gameFilter');
    if (gameFilter) {
        gameFilter.addEventListener('change', (e) => {
            const game = e.target.value;
            showLeaderboardTab(game);
        });
    }
    
    // Search player
    const searchInput = document.getElementById('searchPlayer');
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            searchPlayer(e.target.value);
        }, 300));
    }
}

// Initialize Tabs
function initTabs() {
    const tabs = document.querySelectorAll('.leaderboard-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const target = e.target.dataset.tab;
            showLeaderboardTab(target);
            
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
        });
    });
}

// Filter by Time Period
async function filterLeaderboardByTime(period) {
    const result = await Utils.httpRequest(`/game/leaderboard/global?period=${period}`);
    
    if (result.success) {
        displayLeaderboard('global', result.data.leaderboard);
    }
}

// Show Specific Tab
function showLeaderboardTab(tab) {
    const containers = document.querySelectorAll('.leaderboard-container');
    containers.forEach(c => c.style.display = 'none');
    
    const targetContainer = document.getElementById(`leaderboard-${tab}`);
    if (targetContainer) {
        targetContainer.style.display = 'block';
    }
}

// Search Player
async function searchPlayer(query) {
    if (query.length < 3) return;
    
    const result = await Utils.httpRequest(`/game/search-player?q=${query}`);
    
    if (result.success) {
        displaySearchResults(result.data.players);
    }
}

// Display Search Results
function displaySearchResults(players) {
    const container = document.getElementById('searchResults');
    if (!container) return;
    
    container.innerHTML = `
        <div class="search-results">
            ${players.map(player => `
                <div class="player-result" onclick="viewPlayerProfile('${player.userId}')">
                    <img src="${player.avatar || '/images/avatar-default.png'}" alt="Avatar">
                    <div class="player-info">
                        <h4>${player.username}</h4>
                        <p>Hạng #${player.rank} • ${Utils.Format.number(player.score)} điểm</p>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Refresh Leaderboards
function refreshLeaderboards() {
    loadGlobalLeaderboard();
    
    const activeTab = document.querySelector('.leaderboard-tab.active');
    if (activeTab) {
        const tab = activeTab.dataset.tab;
        if (tab !== 'global') {
            loadGameLeaderboards();
        }
    }
}

// Tournament Functions
window.joinTournament = async (tournamentId) => {
    const result = await Utils.httpRequest(`/tournament/${tournamentId}/join`, {
        method: 'POST'
    });
    
    if (result.success) {
        Utils.Toast.show('Đăng ký tham gia giải đấu thành công!', 'success');
        loadTournamentLeaderboard();
    } else {
        Utils.Toast.show(result.error || 'Không thể đăng ký', 'error');
    }
};

window.viewTournamentDetails = (tournamentId) => {
    window.location.href = `/tournament.html?id=${tournamentId}`;
};

window.viewPlayerProfile = (userId) => {
    window.location.href = `/profile.html?id=${userId}`;
};

// Utility: Debounce
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Compare with friends
async function compareWithFriends() {
    const result = await Utils.httpRequest('/game/leaderboard/friends');
    
    if (result.success) {
        displayFriendsComparison(result.data);
    }
}

function displayFriendsComparison(data) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h2>So sánh với bạn bè</h2>
            <div class="friends-comparison">
                ${data.friends.map(friend => `
                    <div class="friend-compare">
                        <img src="${friend.avatar}" alt="${friend.username}">
                        <div class="compare-details">
                            <h4>${friend.username}</h4>
                            <div class="stat-compare">
                                <div class="stat">
                                    <span>Điểm:</span>
                                    <span class="${friend.score > data.yourScore ? 'higher' : 'lower'}">
                                        ${Utils.Format.number(friend.score)}
                                    </span>
                                </div>
                                <div class="stat">
                                    <span>Thắng:</span>
                                    <span>${friend.winRate}%</span>
                                </div>
                            </div>
                        </div>
                        <button class="btn btn-primary" onclick="challengeFriend('${friend.userId}')">
                            Thách đấu
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

window.challengeFriend = (friendId) => {
    // Send challenge via socket
    if (window.socket) {
        window.socket.emit('challenge-friend', { friendId });
        Utils.Toast.show('Đã gửi lời thách đấu!', 'success');
    }
};