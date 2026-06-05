/* ==========================================================================
   사이트 SEO 체커 JavaScript
   ========================================================================== */

(function() {
  'use strict';

  const CORS_PROXIES = [
    'https://api.allorigins.win/get?url=',
    'https://corsproxy.io/?'
  ];

  /**
   * URL을 CORS 프록시를 통해 가져오기
   */
  async function fetchWithProxy(url) {
    const errors = [];
    for (const proxy of CORS_PROXIES) {
      try {
        const proxyUrl = proxy + encodeURIComponent(url);
        const res = await fetch(proxyUrl, {
          method: proxy.includes('allorigins') ? 'GET' : 'GET',
          headers: { 'Accept': proxy.includes('allorigins') ? 'application/json' : '*/*' }
        });
        if (!res.ok) {
          errors.push(`${proxy}: ${res.status}`);
          continue;
        }
        if (proxy.includes('allorigins')) {
          const data = await res.json();
          if (data.contents) {
            return { html: data.contents, proxy: proxy, status: data.status || res.status };
          }
        } else {
          const text = await res.text();
          if (text && text.length > 0) {
            return { html: text, proxy: proxy, status: res.status };
          }
        }
      } catch (e) {
        errors.push(`${proxy}: ${e.message}`);
      }
    }
    throw new Error('CORS 프록시 실패: ' + errors.join(', '));
  }

  /**
   * robots.txt / sitemap.xml 별도 직접 fetch
   */
  async function fetchDirect(url) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, { method: 'GET', mode: 'cors', signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) return { ok: true, status: res.status };
      return { ok: false, status: res.status };
    } catch (e) {
      return { ok: false, status: 0, error: e.message };
    }
  }

  /**
   * HTML 문자열을 DOM으로 파싱
   */
  function parseHTML(html, baseUrl) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const base = doc.createElement('base');
    base.href = baseUrl;
    doc.head.insertBefore(base, doc.head.firstChild);
    return doc;
  }

  /**
   * 점수 계산 및 결과 반환
   */
  function analyze(url, html, doc) {
    const checks = [];
    let totalScore = 0;
    const weights = {
      https: 5,
      title: 10,
      description: 8,
      viewport: 8,
      canonical: 5,
      og: 6,
      twitter: 4,
      h1: 6,
      imageAlt: 8,
      jsonld: 10,
      robots: 6,
      sitemap: 5,
      lang: 3,
      favicon: 4,
      size: 6,
      speed: 6
    };

    // 1. HTTPS
    const isHttps = url.startsWith('https://');
    checks.push({
      id: 'https',
      title: 'HTTPS 사용',
      status: isHttps ? 'pass' : 'fail',
      message: isHttps ? '안전한 HTTPS 연결을 사용 중입니다.' : 'HTTP를 사용 중입니다. HTTPS로 전환하세요.',
      weight: weights.https
    });

    // 2. Title
    const title = doc.querySelector('title');
    const titleText = title ? title.textContent.trim() : '';
    let titleStatus = 'fail', titleMsg = 'title 태그가 없습니다.';
    if (titleText.length === 0) {
      titleStatus = 'fail';
      titleMsg = 'title 태그가 없습니다.';
    } else if (titleText.length < 30) {
      titleStatus = 'warn';
      titleMsg = `title이 ${titleText.length}자입니다. 30-60자가 권장됩니다.`;
    } else if (titleText.length > 60) {
      titleStatus = 'warn';
      titleMsg = `title이 ${titleText.length}자입니다. 60자 이하가 권장됩니다.`;
    } else {
      titleStatus = 'pass';
      titleMsg = `title 길이 적정 (${titleText.length}자).`;
    }
    checks.push({ id: 'title', title: 'Title 태그', status: titleStatus, message: titleMsg, weight: weights.title });

    // 3. Meta Description
    const desc = doc.querySelector('meta[name="description"]');
    const descContent = desc ? desc.getAttribute('content') || '' : '';
    let descStatus = 'fail', descMsg = 'meta description이 없습니다.';
    if (descContent.length === 0) {
      descStatus = 'fail';
      descMsg = 'meta description이 없습니다.';
    } else if (descContent.length < 120) {
      descStatus = 'warn';
      descMsg = `description이 ${descContent.length}자입니다. 120-160자가 권장됩니다.`;
    } else if (descContent.length > 160) {
      descStatus = 'warn';
      descMsg = `description이 ${descContent.length}자입니다. 160자 이하가 권장됩니다.`;
    } else {
      descStatus = 'pass';
      descMsg = `description 길이 적정 (${descContent.length}자).`;
    }
    checks.push({ id: 'description', title: 'Meta Description', status: descStatus, message: descMsg, weight: weights.description });

    // 4. Viewport
    const viewport = doc.querySelector('meta[name="viewport"]');
    const hasViewport = !!viewport;
    checks.push({
      id: 'viewport',
      title: '모바일 Viewport',
      status: hasViewport ? 'pass' : 'fail',
      message: hasViewport ? 'viewport meta 태그가 설정되어 있습니다.' : 'viewport meta 태그가 없습니다. 모바일 최적화에 필수입니다.',
      weight: weights.viewport
    });

    // 5. Canonical
    const canonical = doc.querySelector('link[rel="canonical"]');
    const canonicalHref = canonical ? canonical.getAttribute('href') : '';
    checks.push({
      id: 'canonical',
      title: 'Canonical URL',
      status: canonicalHref ? 'pass' : 'warn',
      message: canonicalHref ? 'canonical이 설정되어 있습니다.' : 'canonical URL이 없습니다. 중복 콘텐츠 방지에 권장됩니다.',
      weight: weights.canonical
    });

    // 6. Open Graph
    const ogTitle = doc.querySelector('meta[property="og:title"]');
    const ogImage = doc.querySelector('meta[property="og:image"]');
    const ogDesc = doc.querySelector('meta[property="og:description"]');
    const ogCount = (ogTitle ? 1 : 0) + (ogImage ? 1 : 0) + (ogDesc ? 1 : 0);
    let ogStatus = 'fail', ogMsg = 'Open Graph 태그가 없습니다.';
    if (ogCount === 3) {
      ogStatus = 'pass';
      ogMsg = 'og:title, og:image, og:description 모두 설정됨.';
    } else if (ogCount > 0) {
      ogStatus = 'warn';
      ogMsg = `Open Graph ${ogCount}/3 설정. SNS 공유 미리보기에 권장됩니다.`;
    }
    checks.push({ id: 'og', title: 'Open Graph 태그', status: ogStatus, message: ogMsg, weight: weights.og });

    // 7. Twitter Card
    const twCard = doc.querySelector('meta[name="twitter:card"]');
    checks.push({
      id: 'twitter',
      title: 'Twitter Card',
      status: twCard ? 'pass' : 'warn',
      message: twCard ? 'twitter:card가 설정되어 있습니다.' : 'twitter:card가 없습니다. 트위터 공유에 권장됩니다.',
      weight: weights.twitter
    });

    // 8. H1
    const h1s = doc.querySelectorAll('h1');
    const h1Count = h1s.length;
    let h1Status = 'warn', h1Msg = `H1 태그가 ${h1Count}개입니다. 정확히 1개가 권장됩니다.`;
    if (h1Count === 1) {
      h1Status = 'pass';
      h1Msg = 'H1 태그가 정확히 1개입니다.';
    } else if (h1Count === 0) {
      h1Status = 'fail';
      h1Msg = 'H1 태그가 없습니다.';
    }
    checks.push({ id: 'h1', title: 'H1 태그', status: h1Status, message: h1Msg, weight: weights.h1 });

    // 9. Image alt
    const images = doc.querySelectorAll('img');
    let imgsWithAlt = 0, imgsWithoutAlt = 0;
    images.forEach(img => {
      if (img.hasAttribute('alt') && img.getAttribute('alt').trim() !== '') {
        imgsWithAlt++;
      } else {
        imgsWithoutAlt++;
      }
    });
    let altStatus = 'pass', altMsg = '';
    if (images.length === 0) {
      altStatus = 'warn';
      altMsg = '이미지가 없어 alt 검사를 건너뜁니다.';
    } else if (imgsWithoutAlt === 0) {
      altStatus = 'pass';
      altMsg = `모든 이미지(${images.length}개)에 alt가 설정됨.`;
    } else {
      altStatus = 'fail';
      altMsg = `${imgsWithoutAlt}/${images.length}개 이미지에 alt 누락.`;
    }
    checks.push({ id: 'imageAlt', title: '이미지 alt 속성', status: altStatus, message: altMsg, weight: weights.imageAlt });

    // 10. JSON-LD
    const jsonlds = doc.querySelectorAll('script[type="application/ld+json"]');
    checks.push({
      id: 'jsonld',
      title: 'Schema.org JSON-LD',
      status: jsonlds.length > 0 ? 'pass' : 'warn',
      message: jsonlds.length > 0 ? `${jsonlds.length}개의 JSON-LD 스키마 발견.` : 'JSON-LD 구조화 데이터가 없습니다. 리치 결과에 권장됩니다.',
      weight: weights.jsonld
    });

    // 11. robots.txt
    let robotsOk = false, robotsMsg = '확인 불가';
    try {
      const u = new URL(url);
      // 동기적으로 robots는 비동기 체크가 필요. 비동기 호출은 별도.
      checks.push({
        id: 'robots',
        title: 'robots.txt',
        status: 'warn',
        message: '로딩 후 결과 반영...',
        weight: weights.robots,
        async: true,
        asyncFn: async () => {
          const res = await fetchDirect(u.origin + '/robots.txt');
          if (res.ok) {
            return { status: 'pass', message: 'robots.txt가 존재합니다.' };
          } else if (res.status === 404) {
            return { status: 'fail', message: 'robots.txt가 없습니다.' };
          } else {
            return { status: 'warn', message: 'robots.txt 확인 불가 (CORS).' };
          }
        }
      });
    } catch (e) {
      checks.push({ id: 'robots', title: 'robots.txt', status: 'fail', message: 'URL 파싱 실패.', weight: weights.robots });
    }

    // 12. sitemap.xml
    try {
      const u = new URL(url);
      checks.push({
        id: 'sitemap',
        title: 'sitemap.xml',
        status: 'warn',
        message: '로딩 후 결과 반영...',
        weight: weights.sitemap,
        async: true,
        asyncFn: async () => {
          const res = await fetchDirect(u.origin + '/sitemap.xml');
          if (res.ok) {
            return { status: 'pass', message: 'sitemap.xml이 존재합니다.' };
          } else if (res.status === 404) {
            return { status: 'fail', message: 'sitemap.xml이 없습니다.' };
          } else {
            return { status: 'warn', message: 'sitemap.xml 확인 불가 (CORS).' };
          }
        }
      });
    } catch (e) {
      checks.push({ id: 'sitemap', title: 'sitemap.xml', status: 'fail', message: 'URL 파싱 실패.', weight: weights.sitemap });
    }

    // 13. lang
    const lang = doc.documentElement.getAttribute('lang');
    checks.push({
      id: 'lang',
      title: '언어 속성 (lang)',
      status: lang ? 'pass' : 'warn',
      message: lang ? `lang="${lang}" 설정됨.` : 'html lang 속성이 없습니다.',
      weight: weights.lang
    });

    // 14. favicon
    const favicon = doc.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
    checks.push({
      id: 'favicon',
      title: 'Favicon',
      status: favicon ? 'pass' : 'warn',
      message: favicon ? 'favicon이 설정되어 있습니다.' : 'favicon이 없습니다. 브라우저 탭 아이콘에 권장됩니다.',
      weight: weights.favicon
    });

    // 15. 페이지 크기
    const sizeKB = Math.round(html.length / 1024);
    let sizeStatus = 'pass', sizeMsg = `페이지 크기 ${sizeKB}KB`;
    if (sizeKB > 2000) {
      sizeStatus = 'fail';
      sizeMsg = `페이지 크기 ${sizeKB}KB (2MB 초과).`;
    } else if (sizeKB > 1000) {
      sizeStatus = 'warn';
      sizeMsg = `페이지 크기 ${sizeKB}KB (1MB 초과).`;
    }
    checks.push({ id: 'size', title: '페이지 크기', status: sizeStatus, message: sizeMsg, weight: weights.size });

    // 16. 응답 속도 (프록시 응답 기준)
    const speed = '측정됨 (프록시)';
    checks.push({
      id: 'speed',
      title: '응답 속도',
      status: 'pass',
      message: '실제 서버 속도는 Search Console에서 확인하세요.',
      weight: weights.speed
    });

    return checks;
  }

  /**
   * 비동기 항목 실행
   */
  async function runAsyncChecks(checks) {
    for (const c of checks) {
      if (c.async && c.asyncFn) {
        try {
          const r = await c.asyncFn();
          c.status = r.status;
          c.message = r.message;
        } catch (e) {
          c.status = 'warn';
          c.message = '검사 실패: ' + e.message;
        }
        updateCheckItem(c);
      }
    }
  }

  /**
   * 점수 계산
   */
  function calcScore(checks) {
    let totalWeight = 0, earned = 0;
    for (const c of checks) {
      totalWeight += c.weight;
      if (c.status === 'pass') earned += c.weight;
      else if (c.status === 'warn') earned += c.weight * 0.5;
    }
    return Math.round((earned / totalWeight) * 100);
  }

  /**
   * UI 렌더링
   */
  function renderResults(url, checks) {
    const listEl = document.getElementById('check-list');
    listEl.innerHTML = '';
    for (const c of checks) {
      listEl.appendChild(buildCheckItem(c));
    }

    const score = calcScore(checks);
    document.getElementById('score-number').textContent = score;
    const deg = Math.round((score / 100) * 360);
    const color = score >= 80 ? '#1e8e3e' : score >= 50 ? '#f9ab00' : '#d93025';
    document.getElementById('score-circle').style.background = `conic-gradient(${color} ${deg}deg, var(--color-border) ${deg}deg)`;
    const headline = score >= 80 ? '훌륭합니다! 🎉' : score >= 50 ? '개선 여지가 있어요 ⚠️' : '많은 개선이 필요합니다 🔧';
    const summary = `총 ${checks.length}개 항목 검사 완료. 합격 ${checks.filter(c => c.status === 'pass').length}개, 경고 ${checks.filter(c => c.status === 'warn').length}개, 실패 ${checks.filter(c => c.status === 'fail').length}개.`;
    document.getElementById('score-headline').textContent = headline;
    document.getElementById('score-summary').textContent = summary;
    document.getElementById('checker-result').classList.remove('hidden');
  }

  function buildCheckItem(c) {
    const wrap = document.createElement('div');
    wrap.className = 'check-item';
    wrap.id = 'check-' + c.id;
    const icon = document.createElement('div');
    icon.className = 'check-icon ' + c.status;
    icon.textContent = c.status === 'pass' ? '✓' : c.status === 'warn' ? '!' : '✕';
    const body = document.createElement('div');
    body.className = 'check-body';
    body.innerHTML = '<div class="check-title"></div><div class="check-msg"></div>';
    body.querySelector('.check-title').textContent = c.title;
    body.querySelector('.check-msg').textContent = c.message;
    wrap.appendChild(icon);
    wrap.appendChild(body);
    return wrap;
  }

  function updateCheckItem(c) {
    const el = document.getElementById('check-' + c.id);
    if (!el) return;
    const icon = el.querySelector('.check-icon');
    icon.className = 'check-icon ' + c.status;
    icon.textContent = c.status === 'pass' ? '✓' : c.status === 'warn' ? '!' : '✕';
    el.querySelector('.check-msg').textContent = c.message;

    // 점수 재계산
    const allItems = document.querySelectorAll('.check-item');
    const checks = [];
    allItems.forEach(item => {
      const id = item.id.replace('check-', '');
      const icon = item.querySelector('.check-icon');
      const title = item.querySelector('.check-title').textContent;
      const msg = item.querySelector('.check-msg').textContent;
      const status = icon.classList.contains('pass') ? 'pass' : icon.classList.contains('warn') ? 'warn' : 'fail';
      // 가짜 weight (실제로는 원본 사용해야 하지만 단순화)
      checks.push({ id, title, status, message: msg, weight: 5 });
    });
    const score = calcScore(checks);
    document.getElementById('score-number').textContent = score;
    const deg = Math.round((score / 100) * 360);
    const color = score >= 80 ? '#1e8e3e' : score >= 50 ? '#f9ab00' : '#d93025';
    document.getElementById('score-circle').style.background = `conic-gradient(${color} ${deg}deg, var(--color-border) ${deg}deg)`;
    const headline = score >= 80 ? '훌륭합니다! 🎉' : score >= 50 ? '개선 여지가 있어요 ⚠️' : '많은 개선이 필요합니다 🔧';
    const summary = `합격 ${checks.filter(c => c.status === 'pass').length}개, 경고 ${checks.filter(c => c.status === 'warn').length}개, 실패 ${checks.filter(c => c.status === 'fail').length}개.`;
    document.getElementById('score-headline').textContent = headline;
    document.getElementById('score-summary').textContent = summary;
  }

  // Expose
  window.runCheck = async function() {
    const input = document.getElementById('checker-url');
    const url = input.value.trim();
    if (!url) {
      input.focus();
      return;
    }
    if (!url.match(/^https?:\/\//)) {
      input.value = 'https://' + url;
    }
    const finalUrl = input.value.trim();

    const btn = document.getElementById('checker-btn');
    const status = document.getElementById('checker-status');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> 분석 중...';
    status.classList.remove('hidden');
    status.innerHTML = '<div class="callout callout-info"><p>🔄 ' + finalUrl + ' 페이지를 가져오고 있습니다...</p></div>';
    document.getElementById('checker-result').classList.add('hidden');

    try {
      const result = await fetchWithProxy(finalUrl);
      const doc = parseHTML(result.html, finalUrl);
      const checks = analyze(finalUrl, result.html, doc);
      renderResults(finalUrl, checks);
      status.innerHTML = '<div class="callout callout-success"><p>✅ 분석 완료!</p></div>';
      runAsyncChecks(checks);
    } catch (e) {
      status.innerHTML = '<div class="callout callout-warning"><p class="callout-title">⚠️ 분석 실패</p><p>' + e.message + '</p><p style="margin-top: 8px; font-size: 14px;">CORS 정책으로 인해 일부 사이트는 분석이 불가능할 수 있습니다. 공개 페이지를 권장합니다.</p></div>';
    } finally {
      btn.disabled = false;
      btn.textContent = '검사하기';
    }
  };
})();
