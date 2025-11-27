document.addEventListener('DOMContentLoaded', function() {
  initMobileMenu();
  initResponsiveAdjustments();
  initExistingFeatures();
});

function initMobileMenu() {
  const sidebar = document.getElementById('adminSidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const closeBtn = document.querySelector('.sidebar-close');
  
  if (sidebar && closeBtn) {
    const checkMobile = () => {
      if (window.innerWidth <= 768) {
        closeBtn.style.display = 'block';
      } else {
        closeBtn.style.display = 'none';
        sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('adminSidebar');
  const overlay = document.getElementById('sidebarOverlay');
  
  if (sidebar) {
    sidebar.classList.toggle('active');
  }
  if (overlay) {
    overlay.classList.toggle('active');
  }
  
  document.body.style.overflow = sidebar && sidebar.classList.contains('active') ? 'hidden' : '';
}

function closeSidebarOnMobile() {
  if (window.innerWidth <= 768) {
    const sidebar = document.getElementById('adminSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar) {
      sidebar.classList.remove('active');
    }
    if (overlay) {
      overlay.classList.remove('active');
    }
    document.body.style.overflow = '';
  }
}

function initResponsiveAdjustments() {
  const tableContainers = document.querySelectorAll('.table-container');
  tableContainers.forEach(container => {
    const table = container.querySelector('table');
    if (table) {
      const checkScroll = () => {
        if (container.scrollWidth > container.clientWidth) {
          container.style.boxShadow = 'inset -10px 0 10px -10px rgba(0,0,0,0.3)';
        } else {
          container.style.boxShadow = 'none';
        }
      };
      checkScroll();
      window.addEventListener('resize', checkScroll);
      container.addEventListener('scroll', () => {
        if (container.scrollLeft > 0) {
          container.style.boxShadow = 'inset 10px 0 10px -10px rgba(0,0,0,0.3), inset -10px 0 10px -10px rgba(0,0,0,0.3)';
        } else if (container.scrollWidth > container.clientWidth) {
          container.style.boxShadow = 'inset -10px 0 10px -10px rgba(0,0,0,0.3)';
        }
      });
    }
  });
  
  const statCards = document.querySelectorAll('.stat-card');
  statCards.forEach(card => {
    const updateLayout = () => {
      const icon = card.querySelector('.stat-card-icon');
      const value = card.querySelector('.stat-card-value');
      const label = card.querySelector('.stat-card-label');
      const existingContent = card.querySelector('.stat-card-content');
      
      if (window.innerWidth <= 576) {
        if (icon && value && label && !existingContent) {
          const content = document.createElement('div');
          content.className = 'stat-card-content';
          content.appendChild(value);
          content.appendChild(label);
          card.appendChild(content);
        }
      } else {
        if (existingContent && icon) {
          const value = existingContent.querySelector('.stat-card-value');
          const label = existingContent.querySelector('.stat-card-label');
          if (value && label) {
            card.appendChild(value);
            card.appendChild(label);
            existingContent.remove();
          }
        }
      }
    };
    
    updateLayout();
    window.addEventListener('resize', updateLayout);
  });
}

function initExistingFeatures() {
  if (window.location.pathname === '/portal/admin/dashboard') {
    setInterval(function() {
      window.location.reload();
    }, 300000);
  }
  
  document.querySelectorAll('[data-confirm]').forEach(function(element) {
    element.addEventListener('click', function(e) {
      if (!confirm(this.dataset.confirm)) {
        e.preventDefault();
      }
    });
  });
  
  document.querySelectorAll('.search-input').forEach(function(input) {
    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        this.closest('form').submit();
      }
    });
  });
  
  document.querySelectorAll('.stat-card-value').forEach(function(el) {
    const value = parseInt(el.textContent.replace(/,/g, ''));
    if (!isNaN(value)) {
      el.textContent = value.toLocaleString();
    }
  });
  
  console.log('VerdictPath Admin Portal loaded');
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    const sidebar = document.getElementById('adminSidebar');
    if (sidebar && sidebar.classList.contains('active')) {
      toggleSidebar();
    }
  }
});

let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', function(e) {
  touchStartX = e.changedTouches[0].screenX;
}, { passive: true });

document.addEventListener('touchend', function(e) {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipe();
}, { passive: true });

function handleSwipe() {
  const swipeThreshold = 100;
  const sidebar = document.getElementById('adminSidebar');
  
  if (!sidebar) return;
  
  if (touchEndX - touchStartX > swipeThreshold && touchStartX < 50) {
    if (!sidebar.classList.contains('active')) {
      toggleSidebar();
    }
  }
  
  if (touchStartX - touchEndX > swipeThreshold) {
    if (sidebar.classList.contains('active')) {
      toggleSidebar();
    }
  }
}
