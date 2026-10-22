(function(){
  /* the home page is served inside a wrapper whose <html> carries no lang attribute */
  if (!document.documentElement.lang) document.documentElement.lang = 'en';
  /* header scroll state */
  var header = document.getElementById('siteHeader');
  var backToTop = document.getElementById('backToTop');
  /* transparent header: light logo while it sits over the hero image, hides while the
     visitor scrolls down and comes straight back on the smallest scroll up */
  var heroEl = document.querySelector('main > .hero');
  var lastScrollY = window.scrollY;
  var headerTicking = false;
  function updateHeader() {
    headerTicking = false;
    var y = window.scrollY;
    if (header) {
      var overHero = !!heroEl && y < heroEl.offsetHeight - header.offsetHeight;
      header.classList.toggle('is-over-hero', overHero);
      header.classList.toggle('is-scrolled', y > 8 && !overHero);
      if (document.documentElement.classList.contains('menu-open') || y < 120) {
        header.classList.remove('is-hidden');
      } else if (y > lastScrollY + 4) {
        header.classList.add('is-hidden');
      } else if (y < lastScrollY - 4) {
        header.classList.remove('is-hidden');
      }
    }
    if (backToTop) backToTop.hidden = y < 500;
    lastScrollY = y;
  }
  updateHeader();
  window.addEventListener('scroll', function(){
    if (!headerTicking) { headerTicking = true; requestAnimationFrame(updateHeader); }
  }, { passive:true });
  window.addEventListener('resize', updateHeader);

  /* hero background video: keep the static poster frame for reduced-motion users instead of autoplaying.
     Chrome sometimes aborts autoplay on large muted "background" videos to save power
     (AbortError: "video-only background media was paused to save power"); the documented
     workaround is to just retry play() when that happens; it succeeds on the retry. */
  var heroVideo = document.querySelector('.hero-video');
  if (heroVideo) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      heroVideo.removeAttribute('autoplay');
      heroVideo.pause();
    } else {
      var heroRetryTimer = null;
      function tryPlayHero() {
        heroVideo.muted = true;
        var p = heroVideo.play();
        if (p && p.catch) {
          p.catch(function () {
            clearTimeout(heroRetryTimer);
            heroRetryTimer = setTimeout(tryPlayHero, 350);
          });
        }
      }
      heroVideo.addEventListener('pause', function () {
        if (document.visibilityState === 'visible') tryPlayHero();
      });
      tryPlayHero();
    }
  }

  /* hero background parallax: the bg layer drifts slower than the page scroll, the
     Ken Burns zoom/shimmer (CSS animations) keep running on the image/pseudo-element below it */
  var heroBg = document.querySelector('.hero-bg-animated');
  if (heroBg && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var heroSection = heroBg.closest('.hero');
    var heroTicking = false;
    function updateHeroParallax() {
      heroTicking = false;
      if (!heroSection) return;
      var rect = heroSection.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      heroBg.style.transform = 'translateY(' + Math.min(window.scrollY * 0.18, 140) + 'px)';
    }
    window.addEventListener('scroll', function () {
      if (!heroTicking) { heroTicking = true; requestAnimationFrame(updateHeroParallax); }
    }, { passive: true });
    updateHeroParallax();
  }

  /* curve spotlight: a faint grid revealed only around the cursor, over the dark curve panel */
  var curveSpotlight = document.querySelector('.curve-spotlight');
  if (curveSpotlight && !matchMedia('(prefers-reduced-motion: reduce)').matches && matchMedia('(hover: hover)').matches) {
    var spotPlanned = false, spotX = 0, spotY = 0;
    var writeSpotlight = function () {
      spotPlanned = false;
      var r = curveSpotlight.getBoundingClientRect();
      curveSpotlight.style.setProperty('--x', (spotX - r.left) + 'px');
      curveSpotlight.style.setProperty('--y', (spotY - r.top) + 'px');
    };
    window.addEventListener('pointermove', function (e) {
      spotX = e.clientX; spotY = e.clientY;
      if (spotPlanned) return;
      spotPlanned = true;
      requestAnimationFrame(writeSpotlight);
    }, { passive: true });
  }

  /* mobile drawer */
  var drawer = document.getElementById('mobileDrawer');
  var menuToggle = document.getElementById('menuToggle');
  var drawerClose = document.getElementById('drawerClose');
  function openDrawer(){
    if (!drawer) return;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('menu-open');
    if (menuToggle) menuToggle.setAttribute('aria-expanded','true');
    if (drawerClose) drawerClose.focus();
  }
  function closeDrawer(){
    if (!drawer) return;
    var wasOpen = drawer.classList.contains('is-open');
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('menu-open');
    if (menuToggle) {
      menuToggle.setAttribute('aria-expanded','false');
      if (wasOpen) menuToggle.focus();
    }
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });
  if (menuToggle) menuToggle.addEventListener('click', openDrawer);
  if (drawerClose) drawerClose.addEventListener('click', closeDrawer);

  if (backToTop) backToTop.addEventListener('click', function(){
    window.scrollTo({ top:0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });

  /* property location filter (properties page snake showcase) */
  var locationButtons = document.querySelectorAll('#locationFilters .pill');
  var rows = document.querySelectorAll('#propertyGrid .snake-row');
  var countEl = document.getElementById('propCount');

  function applyFilters(activeLocation){
    var visible = 0;
    rows.forEach(function(row){
      var show = activeLocation === 'all' || row.getAttribute('data-location') === activeLocation;
      row.classList.toggle('is-hidden', !show);
      if (show) visible++;
    });
    if (countEl) countEl.textContent = visible + (visible === 1 ? ' available property' : ' available properties');
  }
  if (locationButtons.length) {
    locationButtons.forEach(function(btn){
      btn.addEventListener('click', function(){
        locationButtons.forEach(function(b){ b.setAttribute('aria-pressed','false'); });
        btn.setAttribute('aria-pressed','true');
        applyFilters(btn.getAttribute('data-location'));
      });
    });
    applyFilters('all');
  }

  /* founder bio expand */
  document.querySelectorAll('[data-expand]').forEach(function(btn){
    btn.addEventListener('click', function(){
      var bio = btn.previousElementSibling;
      var expanded = !bio.classList.contains('is-clamped');
      bio.classList.toggle('is-clamped');
      btn.textContent = expanded ? 'Read more' : 'Show less';
    });
  });

  /* stat numbers outside the hero (e.g. testimonials strip): show real value, count up once in view */
  Array.prototype.filter.call(document.querySelectorAll('[data-count]'), function (el) {
    return !el.closest('.quickfacts');
  }).forEach(function (el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var prefix = el.getAttribute('data-prefix') || '';
    var suffix = el.getAttribute('data-suffix') || '';
    el.textContent = prefix + target + suffix;

    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;

    var played = false;
    function playCount() {
      if (played) return;
      played = true;
      var start = null, duration = 1400;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(step); else el.textContent = prefix + target + suffix;
      }
      requestAnimationFrame(step);
    }
    var countObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { if (entry.isIntersecting) playCount(); });
    }, { threshold: .4 });
    countObserver.observe(el);
  });

  /* hero quickfacts: staggered "canon" reveal: each stat fades in slightly after the last, then counts up */
  var quickfacts = document.querySelector('.quickfacts');
  if (quickfacts) {
    var qItems = Array.prototype.slice.call(quickfacts.querySelectorAll('.quickfact-item'));
    var qReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    qItems.forEach(function (item) {
      var dt = item.querySelector('[data-count]');
      if (dt) dt.textContent = (dt.getAttribute('data-prefix') || '') + dt.getAttribute('data-count') + (dt.getAttribute('data-suffix') || '');
    });

    function countUpQuickfact(dt) {
      var target = parseFloat(dt.getAttribute('data-count'));
      var prefix = dt.getAttribute('data-prefix') || '';
      var suffix = dt.getAttribute('data-suffix') || '';
      if (qReduced) { dt.textContent = prefix + target + suffix; return; }
      var start = null, duration = 1300;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        dt.textContent = prefix + Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(step); else dt.textContent = prefix + target + suffix;
      }
      requestAnimationFrame(step);
    }

    function playQuickfactsCanon() {
      if (!qReduced) quickfacts.classList.add('stagger-armed');
      qItems.forEach(function (item, i) {
        setTimeout(function () {
          item.classList.add('is-revealed');
          var dt = item.querySelector('[data-count]');
          if (dt) countUpQuickfact(dt);
        }, qReduced ? 0 : i * 280);
      });
    }

    var qPlayed = false;
    if ('IntersectionObserver' in window) {
      var qObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !qPlayed) { qPlayed = true; playQuickfactsCanon(); }
        });
      }, { threshold: .3 });
      qObserver.observe(quickfacts);
    } else {
      playQuickfactsCanon();
    }
  }

  /* estate line: sine-curve showcase: one function drives both the SVG path and every node's x
     position; the whole curve is drawn at the cards' real height and panned in sync with scroll,
     so each node always sits at the same screen height as the property it belongs to. */
  var estateSection = document.getElementById('estateLine');
  if (estateSection) {
    var graphicEl = estateSection.querySelector('.estate-line-graphic');
    var canvasEl = estateSection.querySelector('.estate-line-canvas');
    var estateSvg = document.getElementById('estateSvg');
    var estatePath = document.getElementById('estatePath');
    var cardsEl = estateSection.querySelector('.estate-cards');
    var estateNodes = Array.prototype.slice.call(estateSection.querySelectorAll('.estate-node'));
    var estateCards = Array.prototype.slice.call(estateSection.querySelectorAll('.estate-card'));
    var N = estateNodes.length;

    function layoutEstateCurve() {
      if (!cardsEl || !canvasEl || !estateSvg || !estatePath || N === 0) return;
      var H = cardsEl.offsetHeight;
      if (!H) return;
      canvasEl.style.height = H + 'px';
      estateSvg.setAttribute('viewBox', '0 0 200 ' + H);

      var MID = 100, AMP = 80, FREQ = N / 1.6, PHASE = 0; // more winding, still one node per card height

      function xAt(y) {
        return MID + Math.sin((y / H) * Math.PI * FREQ + PHASE) * AMP;
      }

      var steps = Math.max(60, Math.round(H / 12));
      var d = '';
      for (var i = 0; i <= steps; i++) {
        var y = (i / steps) * H;
        d += (i === 0 ? 'M' : 'L') + xAt(y).toFixed(2) + ' ' + y.toFixed(2) + ' ';
      }
      estatePath.setAttribute('d', d.trim());

      var cardsTop = cardsEl.getBoundingClientRect().top;
      estateNodes.forEach(function (node, idx) {
        var card = estateCards[idx];
        if (!card) return;
        var cardRect = card.getBoundingClientRect();
        var ny = (cardRect.top - cardsTop) + cardRect.height / 2;
        var nx = xAt(ny);
        node.style.top = ny + 'px';
        node.style.left = (nx / 200 * 100) + '%';
      });
    }

    var estateTicking = false;
    function syncEstateScroll() {
      estateTicking = false;
      if (!graphicEl || !cardsEl || !canvasEl) return;
      var graphicRect = graphicEl.getBoundingClientRect();
      var cardsRect = cardsEl.getBoundingClientRect();
      canvasEl.style.transform = 'translateY(' + (cardsRect.top - graphicRect.top) + 'px)';
    }
    function onEstateScroll() {
      if (!estateTicking) { estateTicking = true; requestAnimationFrame(syncEstateScroll); }
    }

    layoutEstateCurve();
    syncEstateScroll();
    window.addEventListener('scroll', onEstateScroll, { passive: true });
    window.addEventListener('resize', function () { layoutEstateCurve(); syncEstateScroll(); });

    function setEstateActive(idx) {
      estateNodes.forEach(function (n) { n.classList.toggle('is-active', n.getAttribute('data-index') == idx); });
      estateCards.forEach(function (c) { c.classList.toggle('is-active', c.getAttribute('data-index') == idx); });
    }

    /* highlighting is hover/focus only; nothing is highlighted at rest, and scrolling never
       advances the highlight on its own */
    setEstateActive(null);

    function bindEstateHover(el) {
      var idx = el.getAttribute('data-index');
      var enter = function () { setEstateActive(idx); };
      var leave = function () { setEstateActive(null); };
      el.addEventListener('mouseenter', enter);
      el.addEventListener('mouseleave', leave);
      el.addEventListener('focus', enter);
      el.addEventListener('blur', leave);
    }

    estateCards.forEach(bindEstateHover);
    estateNodes.forEach(function (node) {
      node.style.pointerEvents = 'auto';
      bindEstateHover(node);
    });
  }


  /* ============================================================
     Property search: keyword, location, price, beds/baths/area,
     type and amenity filters, plus sorting, JamesEdition parity.
     ============================================================ */
  var jGrid = document.getElementById('jGrid');
  if (jGrid) {
    var jCards = Array.prototype.slice.call(jGrid.querySelectorAll('.jcard'));
    var el = function (id) { return document.getElementById(id); };
    var jCount = el('jCount'), jEmpty = el('jEmpty');
    var typeBtns = Array.prototype.slice.call(document.querySelectorAll('#jTypes .pill'));
    var amenBtns = Array.prototype.slice.call(document.querySelectorAll('#jAmenities .pill'));

    function pressedValues(buttons, attr) {
      return buttons.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; })
                    .map(function (b) { return b.getAttribute(attr); });
    }

    function applyJ() {
      var kw = (el('jKeyword').value || '').trim().toLowerCase();
      var region = el('jRegion').value;
      var pMin = parseInt(el('jPriceMin').value, 10) || 0;
      var pMax = parseInt(el('jPriceMax').value, 10) || Infinity;
      var beds = parseInt(el('jBeds').value, 10) || 0;
      var baths = parseInt(el('jBaths').value, 10) || 0;
      var area = parseInt(el('jArea').value, 10) || 0;
      var status = el('jStatus').value;
      var types = pressedValues(typeBtns, 'data-type');
      var amens = pressedValues(amenBtns, 'data-amenity');

      var visible = 0;
      jCards.forEach(function (c) {
        var price = parseInt(c.getAttribute('data-price'), 10);
        var cAmens = (c.getAttribute('data-amenities') || '').split(' ');
        var ok =
          (!kw || c.getAttribute('data-name').indexOf(kw) !== -1) &&
          (region === 'all' || c.getAttribute('data-region') === region) &&
          price >= pMin && price <= pMax &&
          parseInt(c.getAttribute('data-beds'), 10) >= beds &&
          parseInt(c.getAttribute('data-baths'), 10) >= baths &&
          parseInt(c.getAttribute('data-area'), 10) >= area &&
          (status === 'all' || c.getAttribute('data-status') === status) &&
          (!types.length || types.indexOf(c.getAttribute('data-type')) !== -1) &&
          amens.every(function (a) { return cAmens.indexOf(a) !== -1; });
        c.classList.toggle('is-hidden', !ok);
        if (ok) visible++;
      });
      if (jCount) jCount.textContent = visible + (visible === 1 ? ' property' : ' properties');
      if (jEmpty) jEmpty.hidden = visible !== 0;
    }

    ['jKeyword', 'jRegion', 'jPriceMin', 'jPriceMax', 'jBeds', 'jBaths', 'jArea', 'jStatus']
      .forEach(function (id) {
        var node = el(id);
        if (node) node.addEventListener(node.tagName === 'SELECT' ? 'change' : 'input', applyJ);
      });

    function toggleMulti(buttons) {
      buttons.forEach(function (b) {
        b.addEventListener('click', function () {
          b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
          applyJ();
        });
      });
    }
    toggleMulti(typeBtns);
    toggleMulti(amenBtns);

    var moreBtn = el('jMoreBtn'), advanced = el('jAdvanced');
    if (moreBtn && advanced) {
      moreBtn.addEventListener('click', function () {
        var open = moreBtn.getAttribute('aria-expanded') === 'true';
        moreBtn.setAttribute('aria-expanded', open ? 'false' : 'true');
        advanced.hidden = open;
      });
    }

    function resetAll() {
      el('jKeyword').value = '';
      el('jRegion').value = 'all';
      el('jPriceMin').selectedIndex = 0;
      el('jPriceMax').value = '99999999';
      el('jBeds').value = '0'; el('jBaths').value = '0'; el('jArea').value = '0';
      el('jStatus').value = 'all';
      typeBtns.concat(amenBtns).forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
      applyJ();
    }
    ['jReset', 'jResetEmpty'].forEach(function (id) {
      var b = el(id); if (b) b.addEventListener('click', resetAll);
    });

    var jSort = el('jSort');
    if (jSort) {
      var original = jCards.slice();
      jSort.addEventListener('change', function () {
        var m = jSort.value, n = original.slice();
        var num = function (c, a) { return parseInt(c.getAttribute(a), 10); };
        if (m === 'price-asc') n.sort(function (a, b) { return num(a, 'data-price') - num(b, 'data-price'); });
        else if (m === 'price-desc') n.sort(function (a, b) { return num(b, 'data-price') - num(a, 'data-price'); });
        else if (m === 'area-desc') n.sort(function (a, b) { return num(b, 'data-area') - num(a, 'data-area'); });
        else if (m === 'name') n.sort(function (a, b) {
          return a.getAttribute('data-name').localeCompare(b.getAttribute('data-name'));
        });
        n.forEach(function (c) { jGrid.appendChild(c); });
      });
    }

    var mapToggle = el('jMapToggle'), mapPanel = el('jMapPanel');
    if (mapToggle && mapPanel) {
      mapToggle.addEventListener('click', function () {
        var on = mapToggle.getAttribute('aria-pressed') === 'true';
        mapToggle.setAttribute('aria-pressed', on ? 'false' : 'true');
        mapPanel.hidden = on;
        mapToggle.lastChild.textContent = on ? 'Show map' : 'Hide map';
        var holder = mapPanel.querySelector('.pmap');
        if (!on && holder) holder.dispatchEvent(new CustomEvent('nf:map-visible', { bubbles: true }));
      });
    }



    applyJ();
  }

  /* card photo carousels + favourites (works on listing and related grids) */
  document.querySelectorAll('.jcard').forEach(function (card) {
    var slides = Array.prototype.slice.call(card.querySelectorAll('.jcard-slides img'));
    var dots = Array.prototype.slice.call(card.querySelectorAll('.jcard-dot'));
    var idx = 0;
    function show(i) {
      idx = (i + slides.length) % slides.length;
      slides.forEach(function (s, n) { s.classList.toggle('is-current', n === idx); });
      dots.forEach(function (d, n) { d.classList.toggle('is-current', n === idx); });
    }
    var prev = card.querySelector('.jcard-prev'), next = card.querySelector('.jcard-next');
    if (prev) prev.addEventListener('click', function (e) { e.preventDefault(); show(idx - 1); });
    if (next) next.addEventListener('click', function (e) { e.preventDefault(); show(idx + 1); });
    dots.forEach(function (d) {
      d.addEventListener('click', function (e) { e.preventDefault(); show(parseInt(d.getAttribute('data-slide'), 10)); });
    });

    var fav = card.querySelector('.jcard-fav');
    if (fav) {
      var slug = card.getAttribute('data-slug');
      var key = 'nf-fav-' + slug;
      try { if (localStorage.getItem(key) === '1') fav.setAttribute('aria-pressed', 'true'); } catch (e) {}
      fav.addEventListener('click', function (e) {
        e.preventDefault();
        var on = fav.getAttribute('aria-pressed') === 'true';
        fav.setAttribute('aria-pressed', on ? 'false' : 'true');
        try { on ? localStorage.removeItem(key) : localStorage.setItem(key, '1'); } catch (err) {}
      });
    }
  });

  /* detail page gallery */
  var jGal = document.getElementById('jGal');
  if (jGal) {
    var gSlides = Array.prototype.slice.call(jGal.querySelectorAll('.jgal-slides img'));
    var gThumbs = Array.prototype.slice.call(jGal.querySelectorAll('.jgal-thumb'));
    var gIdx = 0;
    function gShow(i) {
      gIdx = (i + gSlides.length) % gSlides.length;
      gSlides.forEach(function (s, n) { s.classList.toggle('is-current', n === gIdx); });
      gThumbs.forEach(function (t, n) { t.classList.toggle('is-current', n === gIdx); });
    }
    var gp = jGal.querySelector('.jgal-prev'), gn = jGal.querySelector('.jgal-next');
    if (gp) gp.addEventListener('click', function () { gShow(gIdx - 1); });
    if (gn) gn.addEventListener('click', function () { gShow(gIdx + 1); });
    gThumbs.forEach(function (t) {
      t.addEventListener('click', function () { gShow(parseInt(t.getAttribute('data-slide'), 10)); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') gShow(gIdx - 1);
      if (e.key === 'ArrowRight') gShow(gIdx + 1);
    });
  }

  /* lightbox: all photos */
  var lightbox = document.getElementById('plightbox');
  var galAll = document.getElementById('jGalAll');
  if (lightbox && galAll) {
    var closeBtn = document.getElementById('plightboxClose');
    var openLb = function () { lightbox.hidden = false; document.body.style.overflow = 'hidden'; };
    var closeLb = function () { lightbox.hidden = true; document.body.style.overflow = ''; };
    galAll.addEventListener('click', openLb);
    if (closeBtn) closeBtn.addEventListener('click', closeLb);
    lightbox.addEventListener('click', function (e) { if (e.target === lightbox) closeLb(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !lightbox.hidden) closeLb(); });
  }

  /* ============================================================
     Stylised Attica / Saronic Gulf map
     ============================================================ */
  var ATTICA_PLACES = [
    { key: 'athens-center', label: 'Athens Center', x: 556, y: 182 },
    { key: 'piraeus',       label: 'Piraeus',       x: 432, y: 286 },
    { key: 'kato-glyfada',  label: 'Kato Glyfada',  x: 532, y: 368 },
    { key: 'delivered',     label: 'Voula',         x: 568, y: 416 }
  ];

  function atticaMapSVG(activeKey) {
    var markers = ATTICA_PLACES.map(function (pl) {
      var on = pl.key === activeKey;
      return '<g class="amap-marker' + (on ? ' is-active' : '') + '">' +
             '<circle class="amap-halo" cx="' + pl.x + '" cy="' + pl.y + '" r="26"/>' +
             '<circle class="amap-dot" cx="' + pl.x + '" cy="' + pl.y + '" r="7"/>' +
             '<text class="amap-label" x="' + (pl.x + 20) + '" y="' + (pl.y + 5) + '">' + pl.label + '</text>' +
             '</g>';
    }).join('');
    return '<svg viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<rect class="amap-land" width="1000" height="560"/>' +
      '<path class="amap-sea" d="M0,250 C120,236 210,268 300,300 C392,332 452,372 520,430 C560,464 598,508 622,560 L0,560 Z"/>' +
      '<path class="amap-coast" d="M0,250 C120,236 210,268 300,300 C392,332 452,372 520,430 C560,464 598,508 622,560"/>' +
      '<path class="amap-road" d="M556,182 C520,230 486,252 432,286"/>' +
      '<path class="amap-road" d="M432,286 C470,318 500,340 532,368"/>' +
      '<path class="amap-road" d="M532,368 C548,388 558,400 568,416"/>' +
      markers + '</svg>';
  }

  /* homepage region map: tabs switch the property list and the highlighted marker */
  var regionTabs = document.getElementById('regionTabs');
  if (regionTabs) {
    var tabs = Array.prototype.slice.call(regionTabs.querySelectorAll('.regionmap-tab'));
    var panes = Array.prototype.slice.call(document.querySelectorAll('.regionmap-pane'));
    var homeMap = document.getElementById('homeMap');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var r = tab.getAttribute('data-region');
        tabs.forEach(function (t) {
          var on = t === tab;
          t.classList.toggle('is-current', on);
          t.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        panes.forEach(function (pane) {
          var on = pane.getAttribute('data-region') === r;
          pane.classList.toggle('is-current', on);
          pane.hidden = !on;
        });
        if (homeMap) {
          homeMap.setAttribute('data-region', r);
          var cv = homeMap.querySelector('.pmap-canvas');
          if (cv) cv.innerHTML = atticaMapSVG(r);
          homeMap.dispatchEvent(new CustomEvent('nf:region', { detail: r }));
        }
      });
    });
  }

  document.querySelectorAll('.pmap-canvas').forEach(function (canvas) {
    var holder = canvas.closest('.pmap');
    canvas.innerHTML = atticaMapSVG(holder ? holder.getAttribute('data-region') : null);
  });

  /* property video tours: the YouTube player is only inserted after the visitor presses play */
  document.querySelectorAll('.pvideo[data-youtube]').forEach(function (box) {
    var btn = box.querySelector('.pvideo-play');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + box.getAttribute('data-youtube') + '?autoplay=1&rel=0';
      f.title = 'Video tour';
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.allowFullscreen = true;
      box.classList.add('is-playing');
      box.appendChild(f);
    });
  });

  /* enquiries: sent through /api/enquiry (Cloudflare function + Brevo); if that endpoint is not
     available (local preview, outage) the visitor's email program opens with the same message */
  var formStartedAt = Date.now();
  function sendEnquiry(form, payload, mailto, statusEl) {
    var btn = form.querySelector('button[type="submit"]');
    var hpField = form.querySelector('.hp input');
    payload.website = hpField ? hpField.value : '';
    payload.elapsed = Date.now() - formStartedAt;
    function show(msg, isError) {
      if (!statusEl) return;
      statusEl.textContent = msg;
      statusEl.classList.toggle('is-error', !!isError);
      statusEl.hidden = false;
    }
    function fallback() {
      show('Opening your email program with your message.', false);
      window.location.href = mailto;
    }
    if (btn) btn.disabled = true;
    fetch('/api/enquiry', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { status: r.status, data: d }; }); })
      .then(function (res) {
        if (res.status === 200 && res.data.ok) {
          form.reset();
          show('Thank you. Your request has been sent and a confirmation is on its way to your inbox.', false);
        } else if (res.status === 422) {
          show(res.data.error || 'Please check your entries.', true);
        } else {
          fallback();
        }
      })
      .catch(fallback)
      .then(function () { if (btn) btn.disabled = false; });
  }

  /* reference request -> mailto, same pattern as the consultation form */
  var refForm = document.getElementById('referenceForm');
  if (refForm) {
    refForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var nameEl = document.getElementById('rf-name');
      var emailEl = document.getElementById('rf-email');
      if (!nameEl.value.trim() || !emailEl.value.trim()) { nameEl.reportValidity && nameEl.reportValidity(); return; }
      var situation = document.getElementById('rf-situation').value;
      var note = document.getElementById('rf-message').value.trim();
      var body = 'Name: ' + nameEl.value.trim() + '\nEmail: ' + emailEl.value.trim() + '\nSituation: ' + situation + (note ? '\n\n' + note : '');
      var mailto = 'mailto:info@netherfieldevelopments.com?subject=' + encodeURIComponent('Reference request: ' + situation) + '&body=' + encodeURIComponent(body);
      sendEnquiry(refForm, { kind: 'reference', name: nameEl.value.trim(), email: emailEl.value.trim(), situation: situation, message: note },
        mailto, document.getElementById('refStatus'));
    });
  }

  /* founders index: hovering or selecting a name brings that portrait forward */
  var foundersIndex = document.querySelector('.founders-index');
  if (foundersIndex) {
    var founderNames = Array.prototype.slice.call(foundersIndex.querySelectorAll('.founders-name'));
    var founderCards = Array.prototype.slice.call(document.querySelectorAll('.founder'));
    var showFounder = function (idx) {
      founderNames.forEach(function (n) { n.classList.toggle('is-current', n.getAttribute('data-person') === idx); });
      founderCards.forEach(function (c) { c.classList.toggle('is-current', c.getAttribute('data-person') === idx); });
    };
    founderNames.forEach(function (n) {
      var idx = n.getAttribute('data-person');
      n.addEventListener('mouseenter', function () { showFounder(idx); });
      n.addEventListener('focus', function () { showFounder(idx); });
      n.addEventListener('click', function () { showFounder(idx); });
    });
  }

  /* faq jump navigation: categories left, matching answer group right */
  var faqNav = document.querySelector('.faq-nav');
  if (faqNav) {
    var faqGroups = Array.prototype.slice.call(document.querySelectorAll('.faq-group'));
    var faqLinks = Array.prototype.slice.call(faqNav.querySelectorAll('.faq-navlink'));
    faqLinks.forEach(function (link) {
      link.addEventListener('click', function () {
        var cat = link.getAttribute('data-cat');
        faqLinks.forEach(function (l) { l.classList.toggle('is-current', l === link); });
        faqGroups.forEach(function (g) {
          var on = g.getAttribute('data-cat') === cat;
          g.hidden = !on;
          g.classList.toggle('is-current', on);
        });
      });
    });
  }

  /* contact form -> mailto, prefilled from ?interest= query param when arriving from a property CTA */
  var form = document.getElementById('contactForm');
  if (form) {
    var params = new URLSearchParams(location.search);
    var interest = params.get('interest');
    var selectEl = document.getElementById('cf-interest');
    var msgEl = document.getElementById('cf-message');
    if (interest && selectEl) {
      var matched = -1;
      for (var i = 0; i < selectEl.options.length; i++) {
        if (selectEl.options[i].value === interest) matched = i;
      }
      /* Properties that are already sold are deliberately absent from the dropdown.
         Without this fallback their enquiries silently arrived as a general enquiry,
         so add the referenced property as an option rather than mis-attributing the lead. */
      if (matched === -1) {
        var opt = document.createElement('option');
        opt.value = interest;
        opt.textContent = interest;
        selectEl.appendChild(opt);
        matched = selectEl.options.length - 1;
      }
      selectEl.selectedIndex = matched;
      if (msgEl && !msgEl.value) msgEl.value = "I'm interested in " + interest + ". Please share availability and pricing.";
    }

    form.addEventListener('submit', function(e){
      e.preventDefault();
      var name = document.getElementById('cf-name').value.trim();
      var email = document.getElementById('cf-email').value.trim();
      var phone = document.getElementById('cf-phone').value.trim();
      var interestVal = selectEl ? selectEl.value : '';
      var message = msgEl ? msgEl.value.trim() : '';
      if (!name || !email) { document.getElementById('cf-name').reportValidity && document.getElementById('cf-name').reportValidity(); return; }
      var subject = 'Consultation Request: ' + interestVal;
      var body = 'Name: ' + name + '\nEmail: ' + email + (phone ? '\nPhone: ' + phone : '') + '\nInterested in: ' + interestVal + '\n\n' + message;
      var mailto = 'mailto:info@netherfieldevelopments.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      sendEnquiry(form, { kind: 'consultation', name: name, email: email, phone: phone, interest: interestVal, message: message },
        mailto, document.getElementById('formSuccess'));
    });
  }
})();
