/* ==========================================================================
   GEO 체커 JavaScript - AI 인용 최적화 분석
   ========================================================================== */

(function() {
  'use strict';

  const CORS_PROXIES = [
    'https://api.allorigins.win/get?url=',
    'https://corsproxy.io/?'
  ];

  async function fetchWithProxy(url) {
    const errors = [];
    for (const proxy of CORS_PROXIES) {
      try {
        const proxyUrl = proxy + encodeURIComponent(url);
        const res = await fetch(proxyUrl);
        if (!res.ok) { errors.push(`${proxy}: ${res.status}`); continue; }
        if (proxy.includes('allorigins')) {
          const data = await res.json();
          if (data.contents) return { html: data.contents, status: data.status || res.status };
        } else {
          const text = await res.text();
          if (text && text.length > 0) return { html: text, status: res.status };
        }
      } catch (e) { errors.push(`${proxy}: ${e.message}`); }
    }
    throw new Error('CORS 프록시 실패: ' + errors.join(', '));
  }

  async function fetchDirect(url) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, { method: 'GET', mode: 'cors', signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) return { ok: true, status: res.status, text: await res.text() };
      return { ok: false, status: res.status };
    } catch (e) {
      return { ok: false, status: 0, error: e.message };
    }
  }

  function parseHTML(html, baseUrl) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    try {
      const base = doc.createElement('base');
      base.href = baseUrl;
      doc.head.insertBefore(base, doc.head.firstChild);
    } catch (e) {}
    return doc;
  }

  // JSON-LD 추출
  function extractJsonLd(doc) {
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    const out = [];
    scripts.forEach(s => {
      try { out.push(JSON.parse(s.textContent)); } catch (e) {}
    });
    return out;
  }

  // 본문 텍스트 추출
  function extractBodyText(doc) {
    const main = doc.querySelector('main, article, [role="main"]') || doc.body;
    return main ? main.textContent.replace(/\s+/g, ' ').trim() : '';
  }

  function analyze(url, html, doc) {
    const checks = [];
    const jsonLds = extractJsonLd(doc);
    const allTypes = new Set();
    jsonLds.forEach(j => {
      if (j['@type']) allTypes.add(Array.isArray(j['@type']) ? j['@type'][0] : j['@type']);
    });

    // 1. JSON-LD 구조화 데이터
    checks.push({
      id: 'jsonld', weight: 8,
      title: 'JSON-LD 구조화 데이터',
      status: jsonLds.length > 0 ? 'pass' : 'fail',
      message: jsonLds.length > 0 ? `${jsonLds.length}개 JSON-LD 발견 (${[...allTypes].join(', ')}).` : 'JSON-LD가 없습니다. AI가 콘텐츠를 이해하는 데 필수입니다.'
    });

    // 2. FAQPage 스키마 (가장 많이 인용됨)
    const hasFaq = [...allTypes].some(t => t === 'FAQPage' || t === 'QAPage');
    checks.push({
      id: 'faq', weight: 9,
      title: 'FAQ/QAPage 스키마',
      status: hasFaq ? 'pass' : 'fail',
      message: hasFaq ? 'FAQPage 또는 QAPage 스키마가 있습니다.' : 'AI가 가장 자주 인용하는 FAQPage/QAPage 스키마가 없습니다.'
    });

    // 3. 작성자/Person 정보
    const hasAuthor = [...allTypes].some(t => t === 'Person' || t === 'Organization') || doc.querySelector('meta[name="author"], [rel="author"]');
    checks.push({
      id: 'author', weight: 7,
      title: '작성자/주체 정보',
      status: hasAuthor ? 'pass' : 'warn',
      message: hasAuthor ? '작성자 또는 주체 정보가 마크업되어 있습니다.' : 'Person/Organization 스키마가 없습니다. AI는 신뢰 가능한 출처를 우선 인용합니다.'
    });

    // 4. 발행일/수정일
    const hasDate = jsonLds.some(j => j.datePublished || j.dateModified) ||
      doc.querySelector('meta[property="article:published_time"], meta[property="article:modified_time"]');
    checks.push({
      id: 'date', weight: 5,
      title: '발행일/수정일',
      status: hasDate ? 'pass' : 'warn',
      message: hasDate ? '발행일 또는 수정일이 표시되어 있습니다.' : 'datePublished/dateModified가 없습니다. 최신 콘텐츠임을 AI에 알려주세요.'
    });

    // 5. llms.txt
    checks.push({
      id: 'llms', weight: 4,
      title: 'llms.txt', status: 'warn',
      message: '로딩 후 결과 반영...',
      async: true, asyncFn: async () => {
        try {
          const u = new URL(url);
          const r = await fetchDirect(u.origin + '/llms.txt');
          if (r.ok) return { status: 'pass', message: 'llms.txt가 존재합니다.' };
          return { status: 'warn', message: 'llms.txt가 없습니다. (권장이며 필수는 아닙니다.)' };
        } catch (e) { return { status: 'warn', message: '확인 불가 (CORS).' }; }
      }
    });

    // 6. AI 크롤러 허용 (robots.txt에서)
    checks.push({
      id: 'ai-crawlers', weight: 8,
      title: 'AI 크롤러 허용', status: 'warn',
      message: '로딩 후 결과 반영...',
      async: true, asyncFn: async () => {
        try {
          const u = new URL(url);
          const r = await fetchDirect(u.origin + '/robots.txt');
          if (!r.ok) return { status: 'warn', message: 'robots.txt 확인 불가.' };
          const allowBots = ['GPTBot', 'ClaudeBot', 'OAI-SearchBot', 'CCBot', 'PerplexityBot'];
          const blocked = allowBots.filter(b => new RegExp(`User-agent:\\s*${b}[\\s\\S]*?Disallow:\\s*/\\s*$`, 'mi').test(r.text));
          if (blocked.length === 0) return { status: 'pass', message: '주요 AI 크롤러(GPTBot, ClaudeBot 등)가 허용되어 있습니다.' };
          if (blocked.length <= 2) return { status: 'warn', message: `차단된 AI 크롤러: ${blocked.join(', ')}` };
          return { status: 'fail', message: `다수 AI 크롤러 차단됨: ${blocked.join(', ')}` };
        } catch (e) { return { status: 'warn', message: '확인 불가.' }; }
      }
    });

    // 7. 콘텐츠 길이
    const bodyText = extractBodyText(doc);
    const bodyLen = bodyText.length;
    let lenStatus = 'pass', lenMsg = `본문 ${bodyLen.toLocaleString()}자 (2,000자 이상 권장).`;
    if (bodyLen < 500) { lenStatus = 'fail'; lenMsg = `본문 ${bodyLen}자. 500자 미만은 AI 인용 대상이 되기 어렵습니다.`; }
    else if (bodyLen < 2000) { lenStatus = 'warn'; lenMsg = `본문 ${bodyLen.toLocaleString()}자. 2,000자 이상 권장.`; }
    checks.push({ id: 'length', weight: 6, title: '콘텐츠 길이', status: lenStatus, message: lenMsg });

    // 8. 구체적 수치/통계 (인용 가치가 높음)
    const numberMatches = (bodyText.match(/\d+(\.\d+)?(%|명|개|년|월|일|원|달러)/g) || []).length;
    let numStatus = 'warn', numMsg = `구체적 수치 ${numberMatches}개 발견. 통계를 추가하면 인용 가능성이 높아집니다.`;
    if (numberMatches >= 5) { numStatus = 'pass'; numMsg = `구체적 수치 ${numberMatches}개 - 인용 가치가 높습니다.`; }
    else if (numberMatches === 0) { numStatus = 'fail'; numMsg = '구체적 수치/통계가 없습니다. AI는 데이터를 인용하는 것을 선호합니다.'; }
    checks.push({ id: 'stats', weight: 7, title: '구체적 수치/통계', status: numStatus, message: numMsg });

    // 9. 리스트/표 형식 (인용하기 좋은 구조)
    const lists = doc.querySelectorAll('ul, ol, table').length;
    let listStatus = 'warn', listMsg = `리스트/표 ${lists}개. AI는 구조화된 형식을 선호합니다.`;
    if (lists >= 3) { listStatus = 'pass'; listMsg = `리스트/표 ${lists}개 - 인용 친화적 구조입니다.`; }
    else if (lists === 0) { listStatus = 'fail'; listMsg = '리스트/표가 없습니다. UL/OL/TABLE 태그를 사용하세요.'; }
    checks.push({ id: 'lists', weight: 6, title: '리스트/표 사용', status: listStatus, message: listMsg });

    // 10. 명확한 헤딩 구조
    const h2s = doc.querySelectorAll('h2').length;
    const h3s = doc.querySelectorAll('h3').length;
    let headStatus = 'warn', headMsg = `H2 ${h2s}개, H3 ${h3s}개`;
    if (h2s >= 3 && h3s >= 1) { headStatus = 'pass'; headMsg = `명확한 헤딩 구조 (H2 ${h2s}개, H3 ${h3s}개).`; }
    else if (h2s < 2) { headStatus = 'fail'; headMsg = 'H2가 부족합니다. 콘텐츠를 섹션으로 나누세요.'; }
    checks.push({ id: 'headings', weight: 5, title: '헤딩 구조', status: headStatus, message: headMsg });

    // 11. 정의형 문장 (X는 Y이다)
    const definitionPattern = /[가-힣A-Za-z]+\s*(은|는|이|가)\s+.+\s*(이다|다)\./g;
    const definitions = (bodyText.match(definitionPattern) || []).length;
    let defStatus = 'warn', defMsg = `정의형 문장 ${definitions}개. "X는 Y이다" 패턴을 사용하면 인용률이 올라갑니다.`;
    if (definitions >= 3) { defStatus = 'pass'; defMsg = `정의형 문장 ${definitions}개 - AI가 정의 인용에 유리합니다.`; }
    checks.push({ id: 'defs', weight: 5, title: '정의형 콘텐츠', status: defStatus, message: defMsg });

    // 12. 출처/인용
    const citations = doc.querySelectorAll('cite, blockquote, [rel="canonical"]').length +
      (bodyText.match(/(출처|참고|reference|according to|연구|조사|보고서)/gi) || []).length;
    let citStatus = 'warn', citMsg = `출처/인용 ${citations}개. 신뢰할 수 있는 출처 표기는 E-E-A-T 신호입니다.`;
    if (citations >= 3) { citStatus = 'pass'; citMsg = `출처/인용 ${citations}개 - 권위성이 높습니다.`; }
    else if (citations === 0) { citStatus = 'fail'; citMsg = '출처/인용이 없습니다. AI는 출처 없는 정보를 잘 인용하지 않습니다.'; }
    checks.push({ id: 'cites', weight: 7, title: '출처/인용', status: citStatus, message: citMsg });

    // 13. 외부 링크 (참조)
    const externalLinks = [...doc.querySelectorAll('a[href^="http"]')].filter(a => {
      try { return new URL(a.href).host !== new URL(url).host; } catch (e) { return false; }
    }).length;
    let linkStatus = 'warn', linkMsg = `외부 링크 ${externalLinks}개`;
    if (externalLinks >= 2) linkStatus = 'pass';
    if (externalLinks === 0) { linkStatus = 'fail'; linkMsg = '외부 링크가 없습니다. 권위 있는 소스로의 링크가 권위성을 높입니다.'; }
    else linkMsg = `외부 링크 ${externalLinks}개 - 권위 있는 소스로의 연결이 권위성 신호입니다.`;
    checks.push({ id: 'ext-links', weight: 4, title: '외부 링크 (참조)', status: linkStatus, message: linkMsg });

    // 14. 페이지 속도 신호 (HTML 크기 기반 추정)
    const sizeKB = Math.round(html.length / 1024);
    let speedStatus = 'pass', speedMsg = `HTML 크기 ${sizeKB}KB (1MB 이하 권장).`;
    if (sizeKB > 2000) { speedStatus = 'fail'; speedMsg = `HTML 크기 ${sizeKB}KB - 페이지가 너무 큽니다.`; }
    else if (sizeKB > 1000) { speedStatus = 'warn'; speedMsg = `HTML 크기 ${sizeKB}KB - 최적화 필요.`; }
    checks.push({ id: 'speed', weight: 4, title: '페이지 크기', status: speedStatus, message: speedMsg });

    // 15. 사이트맵 존재
    checks.push({
      id: 'sitemap', weight: 5,
      title: 'sitemap.xml', status: 'warn',
      message: '로딩 후 결과 반영...',
      async: true, asyncFn: async () => {
        try {
          const u = new URL(url);
          const r = await fetchDirect(u.origin + '/sitemap.xml');
          if (r.ok) return { status: 'pass', message: 'sitemap.xml이 존재합니다.' };
          return { status: 'warn', message: 'sitemap.xml이 없습니다. AI 크롤러가 페이지를 찾는 데 불리합니다.' };
        } catch (e) { return { status: 'warn', message: '확인 불가.' }; }
      }
    });

    return checks;
  }

  // ========== UI ==========
  function renderResults(checks) {
    const listEl = document.getElementById('check-list');
    listEl.innerHTML = '';
    for (const c of checks) listEl.appendChild(buildCheckItem(c));
    updateScore(checks);
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

  function calcScore(checks) {
    let totalW = 0, earned = 0;
    for (const c of checks) {
      totalW += c.weight;
      if (c.status === 'pass') earned += c.weight;
      else if (c.status === 'warn') earned += c.weight * 0.5;
    }
    return Math.round((earned / totalW) * 100);
  }

  function updateScore(checks) {
    const score = calcScore(checks);
    document.getElementById('score-number').textContent = score;
    const deg = Math.round((score / 100) * 360);
    const color = score >= 80 ? '#1e8e3e' : score >= 50 ? '#f9ab00' : '#d93025';
    document.getElementById('score-circle').style.background = `conic-gradient(${color} ${deg}deg, var(--color-border) ${deg}deg)`;
    const headline = score >= 80 ? '훌륭합니다! AI 인용 최적화 우수 🎉' : score >= 50 ? '개선 여지가 있어요 ⚠️' : 'GEO 최적화 강화 필요 🔧';
    const summary = `합격 ${checks.filter(c => c.status === 'pass').length}개, 경고 ${checks.filter(c => c.status === 'warn').length}개, 실패 ${checks.filter(c => c.status === 'fail').length}개.`;
    document.getElementById('score-headline').textContent = headline;
    document.getElementById('score-summary').textContent = summary;
  }

  function updateCheckItem(c, allChecks) {
    const el = document.getElementById('check-' + c.id);
    if (!el) return;
    el.querySelector('.check-icon').className = 'check-icon ' + c.status;
    el.querySelector('.check-icon').textContent = c.status === 'pass' ? '✓' : c.status === 'warn' ? '!' : '✕';
    el.querySelector('.check-msg').textContent = c.message;
    updateScore(allChecks);
  }

  async function runAsyncChecks(checks) {
    for (const c of checks) {
      if (c.async && c.asyncFn) {
        try {
          const r = await c.asyncFn();
          c.status = r.status;
          c.message = r.message;
        } catch (e) { c.status = 'warn'; c.message = '검사 실패.'; }
        updateCheckItem(c, checks);
      }
    }
  }

  window.runCheck = async function() {
    const input = document.getElementById('checker-url');
    const url = input.value.trim();
    if (!url) { input.focus(); return; }
    if (!url.match(/^https?:\/\//)) input.value = 'https://' + url;
    const finalUrl = input.value.trim();

    const btn = document.getElementById('checker-btn');
    const status = document.getElementById('checker-status');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> 분석 중...';
    status.classList.remove('hidden');
    status.innerHTML = '<div class="callout callout-info"><p>🔄 ' + finalUrl + ' 분석 중... (CORS 프록시 사용)</p></div>';
    document.getElementById('checker-result').classList.add('hidden');

    try {
      const result = await fetchWithProxy(finalUrl);
      const doc = parseHTML(result.html, finalUrl);
      const checks = analyze(finalUrl, result.html, doc);
      renderResults(checks);
      status.innerHTML = '<div class="callout callout-success"><p>✅ 1차 분석 완료. 비동기 항목(robots.txt, llms.txt, sitemap) 검사 중...</p></div>';
      runAsyncChecks(checks);
    } catch (e) {
      status.innerHTML = '<div class="callout callout-warning"><p class="callout-title">⚠️ 분석 실패</p><p>' + e.message + '</p><p style="margin-top: 8px; font-size: 14px;">CORS 정책으로 일부 사이트는 분석이 제한될 수 있습니다.</p></div>';
    } finally {
      btn.disabled = false;
      btn.textContent = '검사하기';
    }
  };
})();
