# GEO/SEO/AEO 최적화 가이드

> **Google 공식 문서 기반의 AI 검색 시대 최적화 완벽 가이드**
> Search Central Documentation · 2026년 최신

[![Made with Google Docs](https://img.shields.io/badge/Based%20on-Google%20Search%20Central-blue)](https://developers.google.com/search)
[![Schema.org](https://img.shields.io/badge/Schema.org-Compliant-green)](https://schema.org)
[![Mobile Friendly](https://img.shields.io/badge/Mobile-Friendly-brightgreen)]()

## 📋 프로젝트 소개

이 웹사이트는 **Google Search Central 공식 문서**를 기반으로 작성된 GEO(Generative Engine Optimization), SEO(Search Engine Optimization), AEO(Answer Engine Optimization) 종합 가이드입니다. AI 검색 시대에 맞춰 검색엔진과 생성형 AI 모두에서 가시성을 극대화하는 전략을 제공합니다.

## 🌟 주요 특징

- **Google 공식 권장사항 100% 반영**
- **10개의 상세 가이드 페이지** (총 5,000+ 단어)
- **5개의 실전 도구** (JSON-LD 생성기, 메타태그 생성기, robots.txt 생성기 등)
- **150+ 항목의 실행 체크리스트**
- **완전 반응형 디자인** + **다크모드** 지원
- **WCAG 2.1 AA** 접근성 준수
- **Schema.org** 구조화 데이터 완비
- **제로 의존성** (Vanilla HTML/CSS/JS)

## 📁 프로젝트 구조

```
geo-seo-aeo-guide/
├── index.html                    # 메인 페이지
├── robots.txt                    # AI 크롤러 정책 포함
├── sitemap.xml                   # 사이트맵
├── README.md                     # 이 파일
│
├── css/
│   ├── main.css                  # 메인 스타일 (CSS 변수, 컴포넌트)
│   ├── components.css            # 배지, 탭, 아코디언, 카드
│   └── responsive.css            # 반응형 + 다크모드
│
├── js/
│   ├── main.js                   # 테마, 메뉴, 탭, 체크리스트
│   └── tools.js                  # 도구 페이지 로직
│
└── pages/
    ├── seo-fundamentals.html     # SEO 기초 (Google 공식)
    ├── geo-guide.html            # GEO 가이드
    ├── aeo-guide.html            # AEO 가이드
    ├── structured-data.html      # Schema.org 가이드
    ├── eeat-content.html         # E-E-A-T 가이드
    ├── ai-crawlers.html          # AI 크롤러 관리
    ├── measurement.html          # 성과 측정
    ├── tools.html                # 5가지 실전 도구
    └── checklist.html            # 종합 체크리스트
```

## 🚀 시작하기

### 1. 로컬에서 실행

```bash
# 프로젝트 디렉토리로 이동
cd geo-seo-aeo-guide

# 간단한 HTTP 서버 실행 (Python 3)
python -m http.server 8000

# 또는 Node.js http-server
npx http-server -p 8000

# 브라우저에서 열기
open http://localhost:8000
```

### 2. 배포

이 사이트는 정적 HTML이므로 어떤 호스팅 서비스에든 쉽게 배포할 수 있습니다:

- **GitHub Pages**: 저장소 설정에서 Pages 활성화
- **Netlify**: 드래그 앤 드롭 배포
- **Vercel**: `vercel deploy` 명령어
- **Cloudflare Pages**: GitHub 연동

## 🎯 페이지별 내용

| 페이지 | 내용 | URL |
|--------|------|-----|
| **홈** | GEO/SEO/AEO 소개, 학습 로드맵 | `/` |
| **SEO 기초** | Google Search Essentials, 크롤링/색인/랭킹 | `/pages/seo-fundamentals.html` |
| **GEO 가이드** | 생성형 AI 검색 최적화 | `/pages/geo-guide.html` |
| **AEO 가이드** | Featured Snippet, 음성 검색 | `/pages/aeo-guide.html` |
| **구조화 데이터** | Schema.org JSON-LD | `/pages/structured-data.html` |
| **E-E-A-T** | 사람 중심 콘텐츠 4요소 | `/pages/eeat-content.html` |
| **AI 크롤러** | GPTBot, ClaudeBot 관리 | `/pages/ai-crawlers.html` |
| **성과 측정** | Search Console, GA4 | `/pages/measurement.html` |
| **실전 도구** | JSON-LD 생성기 등 5종 | `/pages/tools.html` |
| **체크리스트** | 150+ 실행 항목 | `/pages/checklist.html` |

## 🛠️ 도구 목록

1. **JSON-LD 생성기** - Article, FAQ, HowTo, Product, Organization
2. **메타태그 생성기** - Title, Description, Canonical 등
3. **robots.txt 생성기** - AI 크롤러 정책 포함
4. **Open Graph 생성기** - 소셜 미디어 공유 태그
5. **헤드라인 분석기** - 제목 SEO 점수 분석
6. **스키마 검증기** - JSON-LD 기본 검증

## 🎨 디자인 시스템

### CSS 변수 (디자인 토큰)
- **색상**: Primary (#1a73e8), Success, Warning, Danger
- **타이포그래피**: 시스템 폰트 + Noto Sans KR
- **간격**: 4px 그리드 시스템
- **반응형**: Mobile First (320px ~ 1440px+)

### 다크모드
- 자동 시스템 설정 감지
- 수동 토글 (localStorage 저장)
- prefers-color-scheme 미디어 쿼리

## 🔍 SEO 최적화 기능

### 기술적 SEO
- [x] 시맨틱 HTML5
- [x] 메타 태그 (Title, Description, OG, Twitter)
- [x] Canonical URL
- [x] Open Graph + Twitter Card
- [x] 구조화된 데이터 (WebSite, Organization, Article, FAQPage, BreadcrumbList)
- [x] 모바일 반응형
- [x] 빠른 로딩 (인라인 CSS, 최소 JS)
- [x] HTTPS 권장
- [x] robots.txt
- [x] sitemap.xml

### 접근성 (WCAG 2.1)
- [x] 시맨틱 HTML
- [x] ARIA 레이블
- [x] 키보드 네비게이션
- [x] 충분한 색상 대비
- [x] 대체 텍스트
- [x] 포커스 가시성
- [x] prefers-reduced-motion 존중

## 📚 참고 자료

### Google 공식 문서
- [Google Search Central](https://developers.google.com/search)
- [SEO 스타터 가이드](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [AI 검색 최적화 가이드](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- [구조화 데이터 가이드](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)
- [검색 품질 평가자 가이드라인](https://static.googleusercontent.com/media/guidelines.raterhub.com/en//searchqualityevaluatorguidelines.pdf)

### Schema.org
- [Schema.org 공식](https://schema.org)
- [Google 검색 갤러리](https://developers.google.com/search/docs/appearance/structured-data/search-gallery)

## 🤝 기여하기

이 프로젝트는 학습 및 참고용으로 자유롭게 사용하실 수 있습니다.

## 📄 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능

## 📞 연락처

질문이나 피드백이 있으시면 GitHub Issues를 통해 알려주세요.

---

**© 2026 GEO/SEO/AEO 가이드** · Google Search Central 공식 문서 기반
