// Authentication handling - Xử lý đăng nhập, đăng ký

document.addEventListener('DOMContentLoaded', () => {
    const { TokenManager, httpRequest, Toast, Loading, Validator, AuthGuard } = window.Utils;
    
    // Check if already authenticated
    AuthGuard.redirectIfAuthenticated();
    
    // Initialize forms
    initLoginForm();
    initRegisterForm();
    initSocialLogin();
});

// Login Form Handler
function initLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(loginForm);
        const email = formData.get('email');
        const password = formData.get('password');
        
        // Validation
        if (!Utils.Validator.email(email)) {
            Utils.Toast.show('Email không hợp lệ', 'error');
            return;
        }
        
        if (!Utils.Validator.password(password)) {
            Utils.Toast.show('Mật khẩu phải có ít nhất 6 ký tự', 'error');
            return;
        }
        
        // Show loading
        Utils.Loading.show();
        
        // Send login request
        const result = await Utils.httpRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        Utils.Loading.hide();
        
        if (result.success) {
            // Save token and user info
            Utils.TokenManager.setToken(result.data.token);
            Utils.TokenManager.setUser(result.data.user);
            
            Utils.Toast.show('Đăng nhập thành công!', 'success');
            
            // Redirect to lobby
            setTimeout(() => {
                window.location.href = '/lobby.html';
            }, 1000);
        } else {
            Utils.Toast.show(result.error || 'Đăng nhập thất bại', 'error');
        }
    });
}

// Register Form Handler
function initRegisterForm() {
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) return;
    
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(registerForm);
        const username = formData.get('username');
        const email = formData.get('email');
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');
        
        // Validation
        if (!Utils.Validator.username(username)) {
            Utils.Toast.show('Username phải từ 3-20 ký tự và chỉ chứa chữ, số, _', 'error');
            return;
        }
        
        if (!Utils.Validator.email(email)) {
            Utils.Toast.show('Email không hợp lệ', 'error');
            return;
        }
        
        if (!Utils.Validator.password(password)) {
            Utils.Toast.show('Mật khẩu phải có ít nhất 6 ký tự', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            Utils.Toast.show('Mật khẩu không khớp', 'error');
            return;
        }
        
        // Show loading
        Utils.Loading.show();
        
        // Send register request
        const result = await Utils.httpRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password })
        });
        
        Utils.Loading.hide();
        
        if (result.success) {
            Utils.Toast.show('Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.', 'success');
            
            // Show verification modal
            showVerificationModal(email);
        } else {
            Utils.Toast.show(result.error || 'Đăng ký thất bại', 'error');
        }
    });
}

// Email Verification Modal
function showVerificationModal(email) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Xác thực Email</h2>
            <p>Chúng tôi đã gửi mã xác thực đến ${email}</p>
            <input type="text" id="verificationCode" placeholder="Nhập mã 6 số" maxlength="6">
            <button id="verifyBtn" class="btn btn-primary">Xác thực</button>
            <button id="resendBtn" class="btn btn-secondary">Gửi lại mã</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Verify button
    document.getElementById('verifyBtn').addEventListener('click', async () => {
        const code = document.getElementById('verificationCode').value;
        
        if (code.length !== 6) {
            Utils.Toast.show('Mã xác thực phải có 6 số', 'error');
            return;
        }
        
        const result = await Utils.httpRequest('/auth/verify-email', {
            method: 'POST',
            body: JSON.stringify({ email, code })
        });
        
        if (result.success) {
            Utils.Toast.show('Xác thực thành công! Bạn có thể đăng nhập.', 'success');
            modal.remove();
            window.location.href = '/login.html';
        } else {
            Utils.Toast.show(result.error || 'Mã xác thực không đúng', 'error');
        }
    });
    
    // Resend button
    document.getElementById('resendBtn').addEventListener('click', async () => {
        const result = await Utils.httpRequest('/auth/resend-verification', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
        
        if (result.success) {
            Utils.Toast.show('Đã gửi lại mã xác thực', 'success');
        } else {
            Utils.Toast.show('Không thể gửi lại mã', 'error');
        }
    });
}

// Social Login
function initSocialLogin() {
    // Google Login
    const googleBtn = document.getElementById('googleLogin');
    if (googleBtn) {
        googleBtn.addEventListener('click', () => {
            window.location.href = `${Utils.API_URL}/auth/google`;
        });
    }
    
    // Facebook Login
    const facebookBtn = document.getElementById('facebookLogin');
    if (facebookBtn) {
        facebookBtn.addEventListener('click', () => {
            window.location.href = `${Utils.API_URL}/auth/facebook`;
        });
    }
}

// Forgot Password
function initForgotPassword() {
    const forgotLink = document.getElementById('forgotPassword');
    if (!forgotLink) return;
    
    forgotLink.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const email = prompt('Nhập email của bạn:');
        if (!email) return;
        
        if (!Utils.Validator.email(email)) {
            Utils.Toast.show('Email không hợp lệ', 'error');
            return;
        }
        
        const result = await Utils.httpRequest('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
        
        if (result.success) {
            Utils.Toast.show('Đã gửi link reset password đến email của bạn', 'success');
        } else {
            Utils.Toast.show(result.error || 'Không thể gửi email', 'error');
        }
    });
}

// Logout
window.logout = async () => {
    Utils.TokenManager.removeToken();
    Utils.TokenManager.removeUser();
    Utils.Toast.show('Đã đăng xuất', 'info');
    window.location.href = '/';
};