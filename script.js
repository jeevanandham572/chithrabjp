/**
 * Chithra's Political Journey — Main Application Script
 * Handles: data loading, rendering, filtering, search, lightbox, animations
 */

(function () {
  'use strict';

  // =============================================
  // State
  // =============================================
  let allPosts = [];
  let filteredPosts = [];
  let currentFilter = 'all';
  let currentSearch = '';
  let lightboxImages = [];
  let lightboxIndex = 0;
  let observer = null;

  // =============================================
  // DOM Elements
  // =============================================
  const postsContainer = document.getElementById('posts-container');
  const filterGroup = document.getElementById('filter-group');
  const searchInput = document.getElementById('search-input');
  const postsCounterEl = document.getElementById('posts-counter');
  const heroPostCount = document.getElementById('hero-post-count');
  const heroYearSpan = document.getElementById('hero-year-span');
  const heroImageCount = document.getElementById('hero-image-count');
  const lightboxOverlay = document.getElementById('lightbox-overlay');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCounter = document.getElementById('lightbox-counter');
  const backToTopBtn = document.getElementById('back-to-top');
  const loadingContainer = document.getElementById('loading-container');

  // =============================================
  // Data Loading
  // =============================================
  async function loadPosts() {
    try {
      if (window.POSTS_DATA && Array.isArray(window.POSTS_DATA)) {
        allPosts = window.POSTS_DATA;
      } else {
        const response = await fetch('posts_data.json');
        if (!response.ok) throw new Error('Failed to load posts data');
        allPosts = await response.json();
      }
      
      // Update hero stats
      if (heroPostCount) heroPostCount.textContent = allPosts.length;
      
      // Calculate year span
      const years = [...new Set(allPosts.filter(p => p.date).map(p => p.date.split('-')[0]))].sort();
      if (heroYearSpan && years.length > 0) {
        heroYearSpan.textContent = years.length > 1 ? `${years[0]}–${years[years.length - 1]}` : years[0];
      }
      
      // Total images
      const totalImages = allPosts.reduce((sum, p) => sum + (p.images ? p.images.length : 0), 0);
      if (heroImageCount) heroImageCount.textContent = totalImages;

      // Build filter buttons
      buildFilters(years);

      // Initial render
      applyFilters();

      // Hide loading
      if (loadingContainer) loadingContainer.style.display = 'none';

    } catch (err) {
      console.error('Error loading posts:', err);
      if (loadingContainer) {
        loadingContainer.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">⚠️</div>
            <p>Failed to load posts data. Please ensure posts_data.json exists.</p>
          </div>`;
      }
    }
  }

  // =============================================
  // Filter Buttons
  // =============================================
  function buildFilters(years) {
    if (!filterGroup) return;

    // "All" button
    let html = `<button class="filter-btn active" data-filter="all">All</button>`;

    // Year buttons (descending)
    years.sort((a, b) => b - a).forEach(year => {
      html += `<button class="filter-btn" data-filter="${year}">${year}</button>`;
    });

    filterGroup.innerHTML = html;

    // Attach click events
    filterGroup.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        filterGroup.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        applyFilters();
      });
    });
  }

  // =============================================
  // Filtering & Search
  // =============================================
  function applyFilters() {
    filteredPosts = allPosts.filter(post => {
      // Year filter
      if (currentFilter !== 'all') {
        const postYear = post.date ? post.date.split('-')[0] : '';
        if (postYear !== currentFilter) return false;
      }

      // Search filter
      if (currentSearch) {
        const search = currentSearch.toLowerCase();
        const caption = (post.caption || '').toLowerCase();
        const date = (post.date || '').toLowerCase();
        if (!caption.includes(search) && !date.includes(search)) return false;
      }

      return true;
    });

    renderPosts();
  }

  // =============================================
  // Rendering
  // =============================================
  function renderPosts() {
    if (!postsContainer) return;

    // Update counter
    if (postsCounterEl) {
      postsCounterEl.innerHTML = `Showing <span>${filteredPosts.length}</span> of <span>${allPosts.length}</span> posts`;
    }

    if (filteredPosts.length === 0) {
      postsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <p>No posts found matching your criteria.</p>
        </div>`;
      return;
    }

    // Group by year for year dividers
    let html = '';
    let lastYear = '';

    filteredPosts.forEach((post, index) => {
      const postYear = post.date ? post.date.split('-')[0] : 'Unknown';

      // Year divider
      if (postYear !== lastYear) {
        html += `
          <div class="year-divider">
            <span class="year-label">${postYear}</span>
          </div>`;
        lastYear = postYear;
      }

      // Format date nicely
      const formattedDate = formatDate(post.date);
      const formattedTime = post.time ? formatTime(post.time) : '';

      // Image grid
      const imageCount = post.images ? post.images.length : 0;
      let gridClass = 'grid-1';
      if (imageCount === 2) gridClass = 'grid-2';
      else if (imageCount === 3) gridClass = 'grid-3';
      else if (imageCount === 4) gridClass = 'grid-4';
      else if (imageCount > 4) gridClass = 'grid-many';

      // Max 4 visible images, rest behind overlay
      const maxVisible = 4;
      let imagesHtml = '';
      if (imageCount > 0) {
        const visibleImages = post.images.slice(0, maxVisible);
        visibleImages.forEach((img, imgIdx) => {
          const isLast = imgIdx === maxVisible - 1 && imageCount > maxVisible;
          imagesHtml += `
            <div class="post-image-wrapper" data-post-index="${index}" data-img-index="${imgIdx}" onclick="openLightbox(${index}, ${imgIdx})">
              <img src="images/${img}" alt="Post ${post.post_number} image ${imgIdx + 1}" loading="lazy" />
              ${isLast ? `<div class="image-more-overlay">+${imageCount - maxVisible}</div>` : ''}
            </div>`;
        });
      }

      html += `
        <article class="post-card" data-index="${index}" id="post-${post.post_number}">
          <div class="post-header">
            <span class="post-number">Post #${post.post_number}</span>
            <div class="post-date">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span>${formattedDate}${formattedTime ? ' · ' + formattedTime : ''}</span>
            </div>
          </div>
          ${post.caption ? `<p class="post-caption">${escapeHtml(post.caption)}</p>` : ''}
          ${imageCount > 0 ? `<div class="post-images ${gridClass}">${imagesHtml}</div>` : ''}
        </article>`;
    });

    postsContainer.innerHTML = html;

    // Setup intersection observer for animations
    setupScrollAnimations();
  }

  // =============================================
  // Date/Time Formatting
  // =============================================
  function formatDate(dateStr) {
    if (!dateStr) return 'Unknown date';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return dateStr;
    }
  }

  function formatTime(timeStr) {
    if (!timeStr) return '';
    try {
      const parts = timeStr.split(':');
      let h = parseInt(parts[0]);
      const m = parts[1];
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${h}:${m} ${ampm}`;
    } catch {
      return timeStr;
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // =============================================
  // Scroll Animations (Intersection Observer)
  // =============================================
  function setupScrollAnimations() {
    // Disconnect previous observer
    if (observer) observer.disconnect();

    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { 
      threshold: 0.1, 
      rootMargin: '0px 0px -50px 0px' 
    });

    document.querySelectorAll('.post-card').forEach(card => {
      observer.observe(card);
    });
  }

  // =============================================
  // Lightbox
  // =============================================
  window.openLightbox = function (postIndex, imgIndex) {
    const post = filteredPosts[postIndex];
    if (!post || !post.images) return;

    lightboxImages = post.images;
    lightboxIndex = imgIndex;
    updateLightbox();

    lightboxOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  window.closeLightbox = function () {
    lightboxOverlay.classList.remove('active');
    document.body.style.overflow = '';
  };

  window.lightboxPrev = function (e) {
    e.stopPropagation();
    lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
    updateLightbox();
  };

  window.lightboxNext = function (e) {
    e.stopPropagation();
    lightboxIndex = (lightboxIndex + 1) % lightboxImages.length;
    updateLightbox();
  };

  function updateLightbox() {
    if (!lightboxImg) return;
    lightboxImg.src = `images/${lightboxImages[lightboxIndex]}`;
    if (lightboxCounter) {
      lightboxCounter.textContent = `${lightboxIndex + 1} / ${lightboxImages.length}`;
    }
  }

  // Keyboard navigation for lightbox
  document.addEventListener('keydown', (e) => {
    if (!lightboxOverlay.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') {
      lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
      updateLightbox();
    }
    if (e.key === 'ArrowRight') {
      lightboxIndex = (lightboxIndex + 1) % lightboxImages.length;
      updateLightbox();
    }
  });

  // Click outside to close
  lightboxOverlay?.addEventListener('click', (e) => {
    if (e.target === lightboxOverlay) closeLightbox();
  });

  // =============================================
  // Search
  // =============================================
  let searchTimeout;
  searchInput?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentSearch = e.target.value.trim();
      applyFilters();
    }, 300);
  });

  // =============================================
  // Back to Top Button
  // =============================================
  window.addEventListener('scroll', () => {
    if (backToTopBtn) {
      if (window.scrollY > 600) {
        backToTopBtn.classList.add('visible');
      } else {
        backToTopBtn.classList.remove('visible');
      }
    }
  });

  backToTopBtn?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // =============================================
  // Hero scroll indicator
  // =============================================
  document.querySelector('.hero-scroll-indicator')?.addEventListener('click', () => {
    document.querySelector('.nav-filter')?.scrollIntoView({ behavior: 'smooth' });
  });

  // =============================================
  // Initialize
  // =============================================
  document.addEventListener('DOMContentLoaded', () => {
    loadPosts();

    // Generate hero particles
    const particlesContainer = document.querySelector('.hero-particles');
    if (particlesContainer) {
      for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'hero-particle';
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        particle.style.animationDelay = `${Math.random() * 8}s`;
        particle.style.animationDuration = `${6 + Math.random() * 6}s`;
        particlesContainer.appendChild(particle);
      }
    }
  });

})();
