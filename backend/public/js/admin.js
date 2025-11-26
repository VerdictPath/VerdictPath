// VerdictPath Admin Portal JavaScript

document.addEventListener('DOMContentLoaded', function() {
  // Auto-refresh dashboard stats every 5 minutes
  if (window.location.pathname === '/portal/admin/dashboard') {
    setInterval(function() {
      window.location.reload();
    }, 300000);
  }
  
  // Confirm dangerous actions
  document.querySelectorAll('[data-confirm]').forEach(function(element) {
    element.addEventListener('click', function(e) {
      if (!confirm(this.dataset.confirm)) {
        e.preventDefault();
      }
    });
  });
  
  // Search input auto-submit on Enter
  document.querySelectorAll('.search-input').forEach(function(input) {
    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        this.closest('form').submit();
      }
    });
  });
  
  // Tab navigation
  document.querySelectorAll('.tab-btn').forEach(function(tab) {
    tab.addEventListener('click', function(e) {
      // Allow default link behavior
    });
  });
  
  // Format numbers with commas
  document.querySelectorAll('.stat-card-value').forEach(function(el) {
    const value = parseInt(el.textContent.replace(/,/g, ''));
    if (!isNaN(value)) {
      el.textContent = value.toLocaleString();
    }
  });
  
  // Responsive sidebar toggle
  const toggleBtn = document.querySelector('.sidebar-toggle');
  const sidebar = document.querySelector('.admin-sidebar');
  
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', function() {
      sidebar.classList.toggle('open');
    });
  }
  
  console.log('VerdictPath Admin Portal loaded');
});
