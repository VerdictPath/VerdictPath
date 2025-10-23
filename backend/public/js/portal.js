document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('loginForm');
  
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const formData = {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        userType: 'lawfirm'
      };
      
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('lawFirmData', JSON.stringify(data.user));
          window.location.href = '/portal/dashboard';
        } else {
          alert(data.message || 'Login failed');
        }
      } catch (error) {
        console.error('Login error:', error);
        alert('An error occurred during login');
      }
    });
  }
});
