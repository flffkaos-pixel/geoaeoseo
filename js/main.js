/* ==========================================================================
   GEO/SEO/AEO 가이드 - 메인 JavaScript
   ========================================================================== */

(function() {
  'use strict';

  // ==========================================================================
  // 다크모드 토글
  // ==========================================================================
  const ThemeManager = {
    STORAGE_KEY: 'geo-seo-aeo-theme',

    init() {
      this.toggle = document.querySelector('.theme-toggle');
      if (!this.toggle) return;

      const savedTheme = localStorage.getItem(this.STORAGE_KEY);
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const theme = savedTheme || (prefersDark ? 'dark' : 'light');
      this.setTheme(theme);

      this.toggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        this.setTheme(current === 'dark' ? 'light' : 'dark');
      });

      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(this.STORAGE_KEY)) {
          this.setTheme(e.matches ? 'dark' : 'light');
        }
      });
    },

    setTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem(this.STORAGE_KEY, theme);
      this.updateIcon(theme);
    },

    updateIcon(theme) {
      if (!this.toggle) return;
      this.toggle.innerHTML = theme === 'dark'
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
      this.toggle.setAttribute('aria-label', theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환');
    }
  };

  // ==========================================================================
  // 모바일 메뉴
  // ==========================================================================
  const MobileMenu = {
    init() {
      this.btn = document.querySelector('.mobile-menu-btn');
      this.menu = document.querySelector('.nav-menu');
      if (!this.btn || !this.menu) return;

      this.btn.addEventListener('click', () => {
        const isActive = this.menu.classList.toggle('active');
        this.btn.setAttribute('aria-expanded', isActive);
        this.btn.innerHTML = isActive
          ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
          : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
      });

      document.addEventListener('click', (e) => {
        if (!e.target.closest('.nav-container')) {
          this.menu.classList.remove('active');
          this.btn.setAttribute('aria-expanded', 'false');
        }
      });

      // 드롭다운 클릭 토글 (모바일)
      this.dropdowns = this.menu.querySelectorAll('.has-dropdown > .nav-link');
      this.dropdowns.forEach((trigger) => {
        trigger.addEventListener('click', (e) => {
          if (window.innerWidth <= 768) {
            e.preventDefault();
            const parent = trigger.parentElement;
            parent.classList.toggle('open');
          }
        });
      });
    }
  };

  // ==========================================================================
  // 탭
  // ==========================================================================
  const Tabs = {
    init() {
      document.querySelectorAll('.tabs').forEach(tabs => {
        const nav = tabs.querySelector('.tabs-nav');
        const panels = tabs.querySelectorAll('.tabs-panel');

        if (!nav) return;

        nav.addEventListener('click', (e) => {
          const button = e.target.closest('button');
          if (!button) return;

          const targetId = button.dataset.tab;

          nav.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
          button.classList.add('active');

          panels.forEach(panel => {
            panel.classList.toggle('active', panel.id === targetId);
          });
        });
      });
    }
  };

  // ==========================================================================
  // 아코디언
  // ==========================================================================
  const Accordion = {
    init() {
      document.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', () => {
          const item = header.parentElement;
          const isActive = item.classList.contains('active');

          const accordion = item.parentElement;
          if (accordion.dataset.singleOpen === 'true') {
            accordion.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('active'));
          }

          if (!isActive) {
            item.classList.add('active');
          }
        });
      });
    }
  };

  // ==========================================================================
  // 코드 복사
  // ==========================================================================
  const CodeCopy = {
    init() {
      document.addEventListener('click', (e) => {
        const btn = e.target.closest('.copy-btn');
        if (!btn) return;

        const code = btn.parentElement.querySelector('code, pre');
        if (!code) return;

        const text = code.textContent;
        navigator.clipboard.writeText(text).then(() => {
          this.showToast('코드가 복사되었습니다!', 'success');
        }).catch(() => {
          this.showToast('복사 실패', 'error');
        });
      });
    },

    showToast(message, type) {
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      toast.textContent = message;
      document.body.appendChild(toast);

      setTimeout(() => toast.classList.add('show'), 10);
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 2500);
    }
  };

  // ==========================================================================
  // 체크리스트 (로컬스토리지 저장)
  // ==========================================================================
  const Checklist = {
    init() {
      document.querySelectorAll('.checklist').forEach(list => {
        const listId = list.id;
        if (!listId) return;

        const saved = JSON.parse(localStorage.getItem(`checklist-${listId}`) || '[]');

        list.querySelectorAll('li').forEach((li, index) => {
          if (saved[index]) li.classList.add('checked');

          li.addEventListener('click', () => {
            li.classList.toggle('checked');
            this.save(list);
          });
        });

        this.save(list);
      });
    },

    save(list) {
      const checked = Array.from(list.querySelectorAll('li')).map(li => li.classList.contains('checked'));
      localStorage.setItem(`checklist-${list.id}`, JSON.stringify(checked));
    }
  };

  // ==========================================================================
  // 부드러운 스크롤
  // ==========================================================================
  const SmoothScroll = {
    init() {
      document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href^="#"]');
        if (!link) return;

        const href = link.getAttribute('href');
        if (href === '#' || href === '#!') return;

        const target = document.querySelector(href);
        if (!target) return;

        e.preventDefault();
        const headerOffset = 80;
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      });
    }
  };

  // ==========================================================================
  // 페이지 진행 표시기
  // ==========================================================================
  const ScrollProgress = {
    init() {
      const bar = document.querySelector('.progress-fill');
      if (!bar) return;

      const update = () => {
        const winHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = (window.scrollY / winHeight) * 100;
        bar.style.width = `${Math.min(progress, 100)}%`;
      };

      window.addEventListener('scroll', update, { passive: true });
      update();
    }
  };

  // ==========================================================================
  // 초기화
  // ==========================================================================
  document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
    MobileMenu.init();
    Tabs.init();
    Accordion.init();
    CodeCopy.init();
    Checklist.init();
    SmoothScroll.init();
    ScrollProgress.init();
  });
})();
