/* ==========================================================================
   AEO 체커 JavaScript - Featured Snippet·음성 검색 최적화 분석
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

  function extractJsonLd(doc) {
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    const out = [];
    scripts.forEach(s => { try { out.push(JSON.parse(s.textContent)); } catch (e) {} });
    return out;
  }

  function extractBodyText(doc) {
    const main = doc.querySelector('main, article, [role="main"]') || doc.body;
    return main ? main.textContent.replace(/\s+/g, ' ').trim() : '';
  }

  // H2/H3 텍스트 추출
  function getHeadings(doc) {
    return [...doc.querySelectorAll('h2, h3')].map(h => h.textContent.trim());
  }

  // 질문형 헤딩 감지
  function isQuestionHeading(text) {
    return /(뭐|무엇|어떻|왜|왜|어디|언제|누구|어떤|어떠|인가|인가요|일까|할까|하나요|되나요|가이드|방법|방법은|방법이|하는|하는법|방법|원리|정의|뜻)/.test(text) ||
      /^(how|what|why|when|where|who|which|can|does|is|are|should)/i.test(text) ||
      text.includes('?') || text.includes('？');
  }

  // 답변으로 보이는 단락 추출 (헤딩 다음 1-3 문장)
  function getAnswerAfterHeading(doc) {
    const results = [];
    const headings = doc.querySelectorAll('h2, h3');
    headings.forEach(h => {
      let next = h.nextElementSibling;
      let collected = '';
      let count = 0;
      while (next && count < 3) {
        if (next.tagName === 'P' || next.tagName === 'UL' || next.tagName === 'OL') {
          collected += ' ' + next.textContent.trim();
          count++;
        } else if (next.tagName === 'H2' || next.tagName === 'H3') break;
        next = next.nextElementSibling;
      }
      results.push({ heading: h.textContent.trim(), answer: collected.trim() });
    });
    return results;
  }

  function analyze(url, html, doc) {
    const checks = [];
    const jsonLds = extractJsonLd(doc);
    const allTypes = new Set();
    jsonLds.forEach(j => {
      if (j['@type']) allTypes.add(Array.isArray(j['@type']) ? j['@type'][0] : j['@type']);
    });
    const bodyText = extractBodyText(doc);
    const headings = getHeadings(doc);
    const questionHeadings = headings.filter(isQuestionHeading);
    const answerPairs = getAnswerAfterHeading(doc);

    // 1. FAQPage 스키마
    const hasFaq = [...allTypes].some(t => t === 'FAQPage' || t === 'QAPage');
    checks.push({
      id: 'faq', weight: 12,
      title: 'FAQPage/QAPage 스키마',
      status: hasFaq ? 'pass' : 'fail',
      message: hasFaq ? 'FAQPage 또는 QAPage 스키마가 있습니다.' : 'FAQPage/QAPage 스키마가 없습니다. Featured Snippet과 AI 답변 추출에 필수입니다.'
    });

    // 2. HowTo 스키마
    const hasHowTo = [...allTypes].some(t => t === 'HowTo');
    checks.push({
      id: 'howto', weight: 8,
      title: 'HowTo 스키마',
      status: hasHowTo ? 'pass' : 'warn',
      message: hasHowTo ? 'HowTo 스키마가 있습니다. 단계별 답변에 유리합니다.' : 'HowTo 스키마가 없습니다. 절차/단계 콘텐츠라면 추가하세요.'
    });

    // 3. Speakable 스키마 (음성 검색)
    const hasSpeakable = jsonLds.some(j => j.speakable);
    checks.push({
      id: 'speakable', weight: 10,
      title: 'Speakable 스키마 (음성 검색)',
      status: hasSpeakable ? 'pass' : 'fail',
      message: hasSpeakable ? 'Speakable 스키마가 설정되어 있습니다.' : 'Speakable 스키마가 없습니다. 음성 검색·TTS에 권장됩니다.'
    });

    // 4. 질문형 헤딩
    const qRatio = headings.length > 0 ? questionHeadings.length / headings.length : 0;
    let qhStatus = 'warn', qhMsg = `질문형 헤딩 ${questionHeadings.length}/${headings.length}개.`;
    if (qRatio >= 0.5 && questionHeadings.length >= 3) { qhStatus = 'pass'; qhMsg = `질문형 헤딩 ${questionHeadings.length}개 - PAA·음성 검색에 최적.`; }
    else if (questionHeadings.length === 0) { qhStatus = 'fail'; qhMsg = '질문형 헤딩이 없습니다. H2/H3를 의문문으로 작성하세요.'; }
    checks.push({ id: 'qheadings', weight: 9, title: '질문형 헤딩', status: qhStatus, message: qhMsg });

    // 5. 짧은 답변 단락 (헤딩 직후 40-60단어)
    const shortAnswers = answerPairs.filter(p => p.answer.split(/\s+/).length >= 20 && p.answer.split(/\s+/).length <= 80);
    let shortStatus = 'warn', shortMsg = `헤딩 직후 적정 길이 답변 ${shortAnswers.length}개. 40-60단어가 Featured Snippet에 최적입니다.`;
    if (shortAnswers.length >= 3) { shortStatus = 'pass'; shortMsg = `헤딩 직후 적정 길이 답변 ${shortAnswers.length}개 - Snippet 추출 친화적.`; }
    else if (shortAnswers.length === 0) { shortStatus = 'fail'; shortMsg = '헤딩 직후 짧은 답변이 없습니다. 질문 → 1-2문장 답변 패턴을 사용하세요.'; }
    checks.push({ id: 'short-ans', weight: 9, title: '짧은 직접 답변', status: shortStatus, message: shortMsg });

    // 6. 리스트/표 (리스트형 Snippet)
    const lists = doc.querySelectorAll('ul, ol, table').length;
    let listStatus = 'warn', listMsg = `리스트/표 ${lists}개.`;
    if (lists >= 3) { listStatus = 'pass'; listMsg = `리스트/표 ${lists}개 - 리스트형 Snippet에 유리.`; }
    else if (lists === 0) { listStatus = 'fail'; listMsg = '리스트/표가 없습니다. UL/OL/TABLE을 사용하세요.'; }
    checks.push({ id: 'lists', weight: 7, title: '리스트/표', status: listStatus, message: listMsg });

    // 7. 정의형 문장 (X는 Y이다 - 정의형 Snippet)
    const defPattern = /[가-힣A-Za-z]+\s*(은|는|이|가)\s+.+\s*(이다|다)\./g;
    const defs = (bodyText.match(defPattern) || []).length;
    let defStatus = 'warn', defMsg = `정의형 문장 ${defs}개. "X는 Y이다" 패턴은 정의형 Snippet에 추출됩니다.`;
    if (defs >= 5) { defStatus = 'pass'; defMsg = `정의형 문장 ${defs}개 - 정의형 Snippet에 유리.`; }
    else if (defs === 0) { defStatus = 'fail'; defMsg = '정의형 문장이 없습니다. 첫 문장에서 정의를 명확히 하세요.'; }
    checks.push({ id: 'defs', weight: 8, title: '정의형 문장', status: defStatus, message: defMsg });

    // 8. 콘텐츠 길이
    let lenStatus = 'pass', lenMsg = `본문 ${bodyText.length.toLocaleString()}자 (3,000자 이상 권장).`;
    if (bodyText.length < 1000) { lenStatus = 'fail'; lenMsg = `본문 ${bodyText.length}자. 1,000자 이상 필요.`; }
    else if (bodyText.length < 3000) { lenStatus = 'warn'; lenMsg = `본문 ${bodyText.length.toLocaleString()}자. 3,000자 이상 권장.`; }
    checks.push({ id: 'length', weight: 6, title: '콘텐츠 길이', status: lenStatus, message: lenMsg });

    // 9. PAA (People Also Ask) 관련 키워드
    const paaKeywords = /(비교|차이|장단점|vs|또는|대안|방법|가이드|어떻게|왜|이유|원인)/g;
    const paaCount = (bodyText.match(paaKeywords) || []).length;
    let paaStatus = 'warn', paaMsg = `PAA 관련 키워드 ${paaCount}회 등장.`;
    if (paaCount >= 5) { paaStatus = 'pass'; paaMsg = `PAA 관련 키워드 ${paaCount}회 - PAA 박스에 노출될 가능성 ↑.`; }
    else if (paaCount === 0) { paaStatus = 'fail'; paaMsg = 'PAA 관련 키워드가 부족합니다. 비교/차이/방법/이유 등을 포함하세요.'; }
    checks.push({ id: 'paa', weight: 7, title: 'PAA 키워드', status: paaStatus, message: paaMsg });

    // 10. 자연스러운 Q&A 페어
    const qaPairs = answerPairs.filter(p => isQuestionHeading(p.heading) && p.answer.length > 30);
    let qaStatus = 'warn', qaMsg = `질문-답변 페어 ${qaPairs.length}개.`;
    if (qaPairs.length >= 3) { qaStatus = 'pass'; qaMsg = `질문-답변 페어 ${qaPairs.length}개 - Q&A 구조 우수.`; }
    else if (qaPairs.length === 0) { qaStatus = 'fail'; qaMsg = 'Q&A 페어가 없습니다. 질문 헤딩 + 직접 답변 패턴을 사용하세요.'; }
    checks.push({ id: 'qa-pairs', weight: 8, title: 'Q&A 페어', status: qaStatus, message: qaMsg });

    // 11. 첫 문단에 직접 답변
    const firstP = doc.querySelector('main p, article p, .content p, p');
    const firstPText = firstP ? firstP.textContent.trim() : '';
    let firstStatus = 'warn', firstMsg = `첫 문단 ${firstPText.split(/\s+/).length}단어. Featured Snippet은 첫 문단을 추출합니다.`;
    if (firstPText.length > 50 && firstPText.length < 300) { firstStatus = 'pass'; firstMsg = `첫 문단 ${firstPText.split(/\s+/).length}단어 - 적정 길이.`; }
    else if (firstPText.length === 0) { firstStatus = 'fail'; firstMsg = '첫 문단이 없습니다.'; }
    checks.push({ id: 'first-p', weight: 6, title: '첫 문단 답변', status: firstStatus, message: firstMsg });

    // 12. H1 + 질문 구조
    const h1 = doc.querySelector('h1');
    const h1Text = h1 ? h1.textContent.trim() : '';
    let h1Status = 'warn', h1Msg = `H1: ${h1Text.substring(0, 50)}...`;
    if (h1Text.length > 10) h1Status = 'pass';
    if (isQuestionHeading(h1Text)) h1Msg = `H1이 질문형입니다. PAA 타겟에 유리.`;
    else h1Msg = `H1: "${h1Text.substring(0, 50)}..." (질문형 권장)`;
    checks.push({ id: 'h1', weight: 5, title: 'H1 구조', status: h1Status, message: h1Msg });

    // 13. 음성 검색 친화 단어
    const voiceKeywords = /(알려주세요|설명해주세요|알아보|소개해|뭐야|뭔가요|하는 법|하는 방법|하는 법이|정의|뜻|의미|차이)/g;
    const voiceCount = (bodyText.match(voiceKeywords) || []).length;
    let voiceStatus = 'warn', voiceMsg = `음성 검색 키워드 ${voiceCount}회.`;
    if (voiceCount >= 5) { voiceStatus = 'pass'; voiceMsg = `음성 검색 키워드 ${voiceCount}회 - 음성 검색에 유리.`; }
    else if (voiceCount === 0) { voiceStatus = 'fail'; voiceMsg = '음성 검색 키워드가 부족합니다. "~알려주세요", "~하는 법" 등을 사용하세요.'; }
    checks.push({ id: 'voice', weight: 5, title: '음성 검색 친화', status: voiceStatus, message: voiceMsg });

    // 14. Numbered List (단계형)
    const orderedLists = doc.querySelectorAll('ol').length;
    let olStatus = 'warn', olMsg = `순서 있는 리스트 ${orderedLists}개.`;
    if (orderedLists >= 1) { olStatus = 'pass'; olMsg = `순서 있는 리스트 ${orderedLists}개 - HowTo Snippet에 유리.`; }
    checks.push({ id: 'ol', weight: 4, title: '순서형 리스트', status: olStatus, message: olMsg });

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
    const headline = score >= 80 ? '훌륭합니다! 답변 엔진 최적화 우수 🎉' : score >= 50 ? '개선 여지가 있어요 ⚠️' : 'AEO 최적화 강화 필요 🔧';
    const summary = `합격 ${checks.filter(c => c.status === 'pass').length}개, 경고 ${checks.filter(c => c.status === 'warn').length}개, 실패 ${checks.filter(c => c.status === 'fail').length}개.`;
    document.getElementById('score-headline').textContent = headline;
    document.getElementById('score-summary').textContent = summary;
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
      status.innerHTML = '<div class="callout callout-success"><p>✅ AEO 분석 완료.</p></div>';
    } catch (e) {
      status.innerHTML = '<div class="callout callout-warning"><p class="callout-title">⚠️ 분석 실패</p><p>' + e.message + '</p><p style="margin-top: 8px; font-size: 14px;">CORS 정책으로 일부 사이트는 분석이 제한될 수 있습니다.</p></div>';
    } finally {
      btn.disabled = false;
      btn.textContent = '검사하기';
    }
  };
})();
