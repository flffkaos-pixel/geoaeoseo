/* ==========================================================================
   GEO/SEO/AEO 가이드 - 도구 JavaScript
   ========================================================================== */

(function() {
  'use strict';

  // ==========================================================================
  // 유틸리티
  // ==========================================================================
  const Utils = {
    showToast(message, type = 'success') {
      const existing = document.querySelector('.toast');
      if (existing) existing.remove();

      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      toast.textContent = message;
      document.body.appendChild(toast);

      setTimeout(() => toast.classList.add('show'), 10);
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 2500);
    },

    escapeHtml(str) {
      if (str == null) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },

    formatJson(obj) {
      return JSON.stringify(obj, null, 2);
    },

    showOutput(id) {
      const el = document.getElementById(id);
      if (el) el.classList.remove('hidden');
    }
  };

  // ==========================================================================
  // Article 생성기
  // ==========================================================================
  window.generateArticle = function() {
    const data = {
      title: document.getElementById('art-title').value.trim(),
      desc: document.getElementById('art-desc').value.trim(),
      image: document.getElementById('art-image').value.trim(),
      author: document.getElementById('art-author').value.trim(),
      authorUrl: document.getElementById('art-author-url').value.trim(),
      publisher: document.getElementById('art-publisher').value.trim(),
      pubLogo: document.getElementById('art-pub-logo').value.trim(),
      date: document.getElementById('art-date').value
    };

    if (!data.title || !data.desc || !data.image || !data.author || !data.publisher || !data.date) {
      Utils.showToast('필수 항목을 모두 입력하세요', 'error');
      return;
    }

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": data.title,
      "description": data.desc,
      "image": data.image,
      "datePublished": new Date(data.date).toISOString(),
      "dateModified": new Date(data.date).toISOString(),
      "author": {
        "@type": "Person",
        "name": data.author
      }
    };

    if (data.authorUrl) jsonLd.author.url = data.authorUrl;
    if (data.publisher) {
      jsonLd.publisher = { "@type": "Organization", "name": data.publisher };
      if (data.pubLogo) {
        jsonLd.publisher.logo = {
          "@type": "ImageObject",
          "url": data.pubLogo,
          "width": 300,
          "height": 60
        };
      }
    }

    const output = `<script type="application/ld+json">\n${Utils.formatJson(jsonLd)}\n<\/script>`;
    document.getElementById('article-output-code').textContent = output;
    Utils.showOutput('article-output');
    Utils.showToast('Article JSON-LD가 생성되었습니다!');
  };

  // ==========================================================================
  // FAQ 생성기
  // ==========================================================================
  window.addFaqItem = function() {
    const container = document.getElementById('faq-items');
    const index = container.children.length + 1;
    const item = document.createElement('div');
    item.className = 'faq-item';
    item.innerHTML = `
      <div class="form-group">
        <label class="form-label">질문 ${index}</label>
        <input class="form-input" type="text" name="faq-q" placeholder="질문을 입력하세요">
      </div>
      <div class="form-group">
        <label class="form-label">답변 ${index}</label>
        <textarea class="form-textarea" name="faq-a" placeholder="답변을 입력하세요"></textarea>
      </div>
    `;
    container.appendChild(item);
  };

  window.generateFAQ = function() {
    const items = document.querySelectorAll('#faq-items .faq-item');
    const mainEntity = [];

    items.forEach(item => {
      const q = item.querySelector('[name="faq-q"]').value.trim();
      const a = item.querySelector('[name="faq-a"]').value.trim();
      if (q && a) {
        mainEntity.push({
          "@type": "Question",
          "name": q,
          "acceptedAnswer": { "@type": "Answer", "text": a }
        });
      }
    });

    if (mainEntity.length === 0) {
      Utils.showToast('최소 하나의 질문/답변을 입력하세요', 'error');
      return;
    }

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": mainEntity
    };

    const output = `<script type="application/ld+json">\n${Utils.formatJson(jsonLd)}\n<\/script>`;
    document.getElementById('faq-output-code').textContent = output;
    Utils.showOutput('faq-output');
    Utils.showToast('FAQ JSON-LD가 생성되었습니다!');
  };

  // ==========================================================================
  // HowTo 생성기
  // ==========================================================================
  window.addHowToStep = function() {
    const container = document.getElementById('howto-steps');
    const index = container.children.length + 1;
    const step = document.createElement('div');
    step.className = 'howto-step';
    step.innerHTML = `
      <div class="form-group">
        <label class="form-label">단계 ${index} 이름</label>
        <input class="form-input" type="text" name="step-name" placeholder="단계 이름">
      </div>
      <div class="form-group">
        <label class="form-label">단계 ${index} 설명</label>
        <textarea class="form-textarea" name="step-text" placeholder="단계 설명"></textarea>
      </div>
    `;
    container.appendChild(step);
  };

  window.generateHowTo = function() {
    const name = document.getElementById('howto-name').value.trim();
    const desc = document.getElementById('howto-desc').value.trim();
    const stepEls = document.querySelectorAll('#howto-steps .howto-step');

    if (!name || !desc) {
      Utils.showToast('이름과 설명을 입력하세요', 'error');
      return;
    }

    const steps = [];
    stepEls.forEach((step, idx) => {
      const stepName = step.querySelector('[name="step-name"]').value.trim();
      const stepText = step.querySelector('[name="step-text"]').value.trim();
      if (stepName && stepText) {
        steps.push({
          "@type": "HowToStep",
          "position": idx + 1,
          "name": stepName,
          "text": stepText
        });
      }
    });

    if (steps.length === 0) {
      Utils.showToast('최소 하나의 단계를 입력하세요', 'error');
      return;
    }

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": name,
      "description": desc,
      "step": steps
    };

    const output = `<script type="application/ld+json">\n${Utils.formatJson(jsonLd)}\n<\/script>`;
    document.getElementById('howto-output-code').textContent = output;
    Utils.showOutput('howto-output');
    Utils.showToast('HowTo JSON-LD가 생성되었습니다!');
  };

  // ==========================================================================
  // Product 생성기
  // ==========================================================================
  window.generateProduct = function() {
    const data = {
      name: document.getElementById('prod-name').value.trim(),
      desc: document.getElementById('prod-desc').value.trim(),
      image: document.getElementById('prod-image').value.trim(),
      brand: document.getElementById('prod-brand').value.trim(),
      price: document.getElementById('prod-price').value.trim(),
      currency: document.getElementById('prod-currency').value,
      url: document.getElementById('prod-url').value.trim()
    };

    if (!data.name || !data.desc || !data.image || !data.brand || !data.price || !data.url) {
      Utils.showToast('필수 항목을 모두 입력하세요', 'error');
      return;
    }

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": data.name,
      "description": data.desc,
      "image": data.image,
      "brand": { "@type": "Brand", "name": data.brand },
      "offers": {
        "@type": "Offer",
        "url": data.url,
        "priceCurrency": data.currency,
        "price": data.price,
        "availability": "https://schema.org/InStock",
        "itemCondition": "https://schema.org/NewCondition"
      }
    };

    const output = `<script type="application/ld+json">\n${Utils.formatJson(jsonLd)}\n<\/script>`;
    document.getElementById('product-output-code').textContent = output;
    Utils.showOutput('product-output');
    Utils.showToast('Product JSON-LD가 생성되었습니다!');
  };

  // ==========================================================================
  // Organization 생성기
  // ==========================================================================
  window.generateOrganization = function() {
    const name = document.getElementById('org-name').value.trim();
    const url = document.getElementById('org-url').value.trim();
    const logo = document.getElementById('org-logo').value.trim();
    const desc = document.getElementById('org-desc').value.trim();
    const phone = document.getElementById('org-phone').value.trim();
    const twitter = document.getElementById('org-twitter').value.trim();

    if (!name || !url || !logo) {
      Utils.showToast('필수 항목을 모두 입력하세요', 'error');
      return;
    }

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": name,
      "url": url,
      "logo": logo
    };

    if (desc) jsonLd.description = desc;
    if (phone) {
      jsonLd.contactPoint = {
        "@type": "ContactPoint",
        "telephone": phone,
        "contactType": "customer support"
      };
    }
    if (twitter) {
      jsonLd.sameAs = [twitter];
    }

    const output = `<script type="application/ld+json">\n${Utils.formatJson(jsonLd)}\n<\/script>`;
    document.getElementById('org-output-code').textContent = output;
    Utils.showOutput('org-output');
    Utils.showToast('Organization JSON-LD가 생성되었습니다!');
  };

  // ==========================================================================
  // 메타태그 생성기
  // ==========================================================================
  window.generateMetaTags = function() {
    const title = document.getElementById('meta-title').value.trim();
    const desc = document.getElementById('meta-desc').value.trim();
    const keywords = document.getElementById('meta-keywords').value.trim();
    const canonical = document.getElementById('meta-canonical').value.trim();
    const author = document.getElementById('meta-author').value.trim();
    const robots = document.getElementById('meta-robots').value;

    if (!title || !desc) {
      Utils.showToast('제목과 설명은 필수입니다', 'error');
      return;
    }

    let html = `<!-- Primary Meta Tags -->
<title>${Utils.escapeHtml(title)}</title>
<meta name="title" content="${Utils.escapeHtml(title)}">
<meta name="description" content="${Utils.escapeHtml(desc)}">`;

    if (keywords) {
      html += `\n<meta name="keywords" content="${Utils.escapeHtml(keywords)}">`;
    }
    if (author) {
      html += `\n<meta name="author" content="${Utils.escapeHtml(author)}">`;
    }
    if (canonical) {
      html += `\n<link rel="canonical" href="${Utils.escapeHtml(canonical)}">`;
    }
    html += `\n<meta name="robots" content="${robots}">`;

    document.getElementById('meta-output-code').textContent = html;
    Utils.showOutput('meta-output');
    Utils.showToast('메타태그가 생성되었습니다!');
  };

  // ==========================================================================
  // robots.txt 생성기
  // ==========================================================================
  window.addDisallowPath = function() {
    const list = document.getElementById('robots-disallow-list');
    const div = document.createElement('div');
    div.className = 'form-group';
    div.innerHTML = `<input class="form-input" type="text" name="disallow-path" placeholder="/private/">`;
    list.appendChild(div);
  };

  window.generateRobotsTxt = function() {
    const site = document.getElementById('robots-site').value.trim();
    if (!site) {
      Utils.showToast('사이트 도메인을 입력하세요', 'error');
      return;
    }

    const paths = Array.from(document.querySelectorAll('[name="disallow-path"]'))
      .map(input => input.value.trim())
      .filter(Boolean);

    let txt = '# robots.txt\n\n';

    // AI 크롤러 설정
    const aiCrawlers = {
      'GPTBot': document.getElementById('opt-gptbot').checked,
      'ChatGPT-User': false,
      'OAI-SearchBot': document.getElementById('opt-chatgpt-search').checked,
      'ClaudeBot': document.getElementById('opt-claudebot').checked,
      'CCBot': document.getElementById('opt-ccbot').checked,
      'PerplexityBot': document.getElementById('opt-perplexity').checked,
      'Google-Extended': document.getElementById('opt-google-ext').checked,
      'Applebot-Extended': document.getElementById('opt-apple-ext').checked
    };

    Object.entries(aiCrawlers).forEach(([bot, allowed]) => {
      txt += `User-agent: ${bot}\n`;
      if (allowed) {
        txt += `Allow: /\n`;
      } else {
        txt += `Disallow: /\n`;
      }
      paths.forEach(p => {
        txt += `Disallow: ${p}\n`;
      });
      txt += '\n';
    });

    // 기본 User-agent
    txt += `# 모든 다른 봇\nUser-agent: *\nAllow: /\n`;
    paths.forEach(p => {
      txt += `Disallow: ${p}\n`;
    });

    txt += `\n# 사이트맵\nSitemap: ${site.replace(/\/$/, '')}/sitemap.xml\n`;

    document.getElementById('robots-output-code').textContent = txt;
    Utils.showOutput('robots-output');
    Utils.showToast('robots.txt가 생성되었습니다!');
  };

  // ==========================================================================
  // Open Graph 생성기
  // ==========================================================================
  window.generateOpenGraph = function() {
    const title = document.getElementById('og-title').value.trim();
    const desc = document.getElementById('og-desc').value.trim();
    const image = document.getElementById('og-image').value.trim();
    const url = document.getElementById('og-url').value.trim();
    const type = document.getElementById('og-type').value;
    const siteName = document.getElementById('og-site-name').value.trim();

    if (!title || !desc || !image || !url) {
      Utils.showToast('필수 항목을 모두 입력하세요', 'error');
      return;
    }

    let html = `<!-- Open Graph / Facebook -->\n`;
    html += `<meta property="og:type" content="${type}">\n`;
    html += `<meta property="og:url" content="${url}">\n`;
    html += `<meta property="og:title" content="${Utils.escapeHtml(title)}">\n`;
    html += `<meta property="og:description" content="${Utils.escapeHtml(desc)}">\n`;
    html += `<meta property="og:image" content="${image}">`;
    if (siteName) {
      html += `\n<meta property="og:site_name" content="${Utils.escapeHtml(siteName)}">`;
    }
    html += `\n\n<!-- Twitter -->\n`;
    html += `<meta name="twitter:card" content="summary_large_image">\n`;
    html += `<meta name="twitter:url" content="${url}">\n`;
    html += `<meta name="twitter:title" content="${Utils.escapeHtml(title)}">\n`;
    html += `<meta name="twitter:description" content="${Utils.escapeHtml(desc)}">\n`;
    html += `<meta name="twitter:image" content="${image}">`;

    document.getElementById('og-output-code').textContent = html;
    Utils.showOutput('og-output');
    Utils.showToast('Open Graph 태그가 생성되었습니다!');
  };

  // ==========================================================================
  // 헤드라인 분석기
  // ==========================================================================
  window.analyzeHeadline = function() {
    const text = document.getElementById('headline-input').value.trim();
    const keyword = document.getElementById('headline-keyword').value.trim().toLowerCase();

    if (!text) {
      Utils.showToast('제목을 입력하세요', 'error');
      return;
    }

    let score = 0;
    const feedback = [];

    // 1. 길이 분석 (50-60자가 이상적)
    const length = text.length;
    if (length >= 30 && length <= 60) {
      score += 25;
      feedback.push({ type: 'good', text: `✓ 적절한 길이 (${length}자)` });
    } else if (length < 30) {
      score += 10;
      feedback.push({ type: 'bad', text: `✗ 너무 짧음 (${length}자) - 30자 이상 권장` });
    } else if (length > 60) {
      score += 5;
      feedback.push({ type: 'bad', text: `✗ 너무 긺 (${length}자) - 검색결과에서 잘릴 수 있음` });
    } else {
      score += 15;
      feedback.push({ type: 'medium', text: `△ 보통 길이 (${length}자)` });
    }

    // 2. 키워드 포함
    if (keyword) {
      const lowerText = text.toLowerCase();
      if (lowerText.includes(keyword)) {
        score += 20;
        feedback.push({ type: 'good', text: `✓ 타겟 키워드 "${keyword}" 포함` });
      } else {
        feedback.push({ type: 'bad', text: `✗ 타겟 키워드 "${keyword}" 미포함` });
      }
    } else {
      score += 10;
    }

    // 3. 숫자/리스트 (클릭률 높임)
    if (/\d/.test(text)) {
      score += 15;
      feedback.push({ type: 'good', text: '✓ 숫자/리스트 포함 (CTR 증가)' });
    } else {
      feedback.push({ type: 'medium', text: '△ 숫자/리스트 추가 시 CTR 향상 가능' });
    }

    // 4. 감정/파워 단어
    const powerWords = ['최고', '최신', '완벽', '무료', '빠른', '쉬운', '비밀', '전략', '가이드', '공식', '검증', 'ultimate', 'best', 'free', 'easy', 'proven', 'official', 'complete', 'definitive'];
    const hasPowerWord = powerWords.some(w => text.toLowerCase().includes(w));
    if (hasPowerWord) {
      score += 15;
      feedback.push({ type: 'good', text: '✓ 파워 단어 포함' });
    } else {
      feedback.push({ type: 'medium', text: '△ 감정적 단어 추가 가능' });
    }

    // 5. 질문형 또는 How-to
    if (/^(how|what|why|when|where|어떻게|왜|무엇|언제|어디서)/i.test(text)) {
      score += 15;
      feedback.push({ type: 'good', text: '✓ 질문형 제목 (Featured Snippet 친화적)' });
    }

    // 6. 대문자 또는 강조 (영문의 경우)
    if (/[A-Z]/.test(text) && /[a-z]/.test(text)) {
      score += 10;
      feedback.push({ type: 'good', text: '✓ 적절한 대소문자 사용' });
    }

    score = Math.min(score, 100);

    // 점수 표시
    const fill = document.getElementById('headline-score-fill');
    const scoreEl = document.getElementById('headline-score');
    const feedbackEl = document.getElementById('headline-feedback');

    fill.style.width = score + '%';
    fill.className = 'score-fill ' + (score >= 80 ? 'good' : score >= 50 ? 'medium' : 'bad');
    scoreEl.textContent = score;

    let html = '<ul style="list-style: none; padding: 0;">';
    feedback.forEach(f => {
      const color = f.type === 'good' ? 'var(--color-secondary)' : f.type === 'bad' ? 'var(--color-danger)' : 'var(--color-warning)';
      html += `<li style="padding: 8px 0; color: ${color};">${f.text}</li>`;
    });
    html += '</ul>';

    let recommendation = '';
    if (score >= 80) {
      recommendation = '<div class="alert alert-success mt-4"><strong>훌륭합니다!</strong> 이 제목은 SEO에 최적화되어 있습니다.</div>';
    } else if (score >= 50) {
      recommendation = '<div class="alert alert-warning mt-4"><strong>괜찮습니다.</strong> 몇 가지 개선으로 더 효과적인 제목을 만들 수 있습니다.</div>';
    } else {
      recommendation = '<div class="alert alert-danger mt-4"><strong>개선이 필요합니다.</strong> 위의 권장사항을 참고하여 제목을 다시 작성하세요.</div>';
    }

    feedbackEl.innerHTML = html + recommendation;
    Utils.showOutput('headline-output');
  };

  // ==========================================================================
  // 스키마 검증기
  // ==========================================================================
  window.validateSchema = function() {
    const input = document.getElementById('schema-input').value.trim();
    const output = document.getElementById('schema-output');

    if (!input) {
      output.innerHTML = '<div class="alert alert-danger">JSON-LD 코드를 입력하세요</div>';
      return;
    }

    let json;
    try {
      // script 태그 제거 시도
      let cleanInput = input;
      const scriptMatch = input.match(/<script[^>]*>([\s\S]*?)<\/script>/);
      if (scriptMatch) {
        cleanInput = scriptMatch[1];
      }
      json = JSON.parse(cleanInput);
    } catch (e) {
      output.innerHTML = `<div class="alert alert-danger">
        <strong>❌ JSON 파싱 오류</strong><br>
        ${e.message}
      </div>`;
      return;
    }

    const checks = [];
    let score = 0;
    let total = 0;

    // @context 확인
    total++;
    if (json['@context'] === 'https://schema.org') {
      checks.push({ type: 'good', text: '✓ @context가 올바르게 설정됨' });
      score++;
    } else {
      checks.push({ type: 'bad', text: '✗ @context가 "https://schema.org"이 아님' });
    }

    // @type 확인
    total++;
    if (json['@type']) {
      checks.push({ type: 'good', text: `✓ @type: ${json['@type']}` });
      score++;
    } else {
      checks.push({ type: 'bad', text: '✗ @type이 없음' });
    }

    // 타입별 필수 속성 검사
    if (json['@type'] === 'Article') {
      if (json.headline) { checks.push({ type: 'good', text: '✓ headline 있음' }); score++; }
      else { checks.push({ type: 'bad', text: '✗ headline이 없음 (Article 필수)' }); }
      total++;
    }

    if (json['@type'] === 'FAQPage' && Array.isArray(json.mainEntity)) {
      if (json.mainEntity.length > 0) {
        checks.push({ type: 'good', text: `✓ mainEntity에 ${json.mainEntity.length}개 항목` });
        score++;
      } else {
        checks.push({ type: 'bad', text: '✗ mainEntity가 비어있음' });
      }
      total++;
    }

    if (json['@type'] === 'Product') {
      if (json.name) { checks.push({ type: 'good', text: '✓ name 있음' }); score++; }
      else { checks.push({ type: 'bad', text: '✗ name이 없음 (Product 필수)' }); }
      total++;
      if (json.offers) { checks.push({ type: 'good', text: '✓ offers 있음' }); score++; }
      else { checks.push({ type: 'medium', text: '△ offers 권장' }); }
      total++;
    }

    const percent = Math.round((score / total) * 100);
    let html = `<div class="alert ${percent === 100 ? 'alert-success' : percent >= 70 ? 'alert-warning' : 'alert-danger'}">
      <strong>${percent === 100 ? '✅ 완벽합니다!' : percent >= 70 ? '⚠️ 대부분 OK' : '❌ 개선 필요'}</strong> - ${score}/${total} 검사 통과
    </div>`;
    html += '<ul style="list-style: none; padding: 0; margin-top: 12px;">';
    checks.forEach(c => {
      const color = c.type === 'good' ? 'var(--color-secondary)' : c.type === 'bad' ? 'var(--color-danger)' : 'var(--color-warning)';
      html += `<li style="padding: 6px 0; color: ${color};">${c.text}</li>`;
    });
    html += '</ul>';

    output.innerHTML = html;
  };

  // ==========================================================================
  // 클립보드 복사 (전역)
  // ==========================================================================
  window.copyOutput = function(id) {
    const code = document.getElementById(id);
    if (!code) return;
    const text = code.textContent;
    navigator.clipboard.writeText(text).then(() => {
      Utils.showToast('클립보드에 복사되었습니다!', 'success');
    }).catch(() => {
      // 폴백
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        Utils.showToast('클립보드에 복사되었습니다!', 'success');
      } catch (e) {
        Utils.showToast('복사 실패', 'error');
      }
      document.body.removeChild(textarea);
    });
  };

  // ==========================================================================
  // 메타태그 글자수 카운터
  // ==========================================================================
  document.addEventListener('DOMContentLoaded', () => {
    const titleInput = document.getElementById('meta-title');
    const descInput = document.getElementById('meta-desc');
    const titleCount = document.getElementById('meta-title-count');
    const descCount = document.getElementById('meta-desc-count');

    if (titleInput && titleCount) {
      const updateCount = () => {
        titleCount.textContent = titleInput.value.length;
        titleCount.style.color = titleInput.value.length > 60 ? 'var(--color-danger)' : 'var(--color-text-secondary)';
      };
      titleInput.addEventListener('input', updateCount);
      updateCount();
    }

    if (descInput && descCount) {
      const updateCount = () => {
        descCount.textContent = descInput.value.length;
        descCount.style.color = descInput.value.length > 160 ? 'var(--color-danger)' : 'var(--color-text-secondary)';
      };
      descInput.addEventListener('input', updateCount);
      updateCount();
    }
  });

})();
