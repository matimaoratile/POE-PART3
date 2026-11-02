/* ============================================================
   Church Square Stationers - shared interactions (Part 3)
   Features: mobile menu, scroll-reveal animation, accordion,
   tabs, modal dialog, gallery lightbox, interactive map,
   share button.
   Each feature only runs if its elements exist on the page.
   ============================================================ */
(function () {
  'use strict';

  var Stationers = (window.Stationers = window.Stationers || {});
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Small DOM helper ----------
     el('div', { class: 'p-4', text: 'Hi' }, [child, child])
     Builds elements with textContent (never innerHTML), so any
     text that came from a user or a data file cannot inject HTML. */
  Stationers.el = function (tag, props, children) {
    var node = document.createElement(tag);
    Object.keys(props || {}).forEach(function (key) {
      var value = props[key];
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key === 'dataset') Object.keys(value).forEach(function (d) { node.dataset[d] = value[d]; });
      else node.setAttribute(key, value);
    });
    (children || []).forEach(function (child) {
      if (child) node.appendChild(child);
    });
    return node;
  };

  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  /* ---------- Mobile menu ---------- */
  function initMobileMenu() {
    var btn = document.getElementById('mobile-menu-btn');
    var menu = document.getElementById('mobile-menu');
    if (!btn || !menu) return;
    btn.addEventListener('click', function () {
      var open = menu.classList.toggle('hidden') === false;
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? '✕' : '☰';
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
  }

  /* ---------- Scroll-reveal animation (IntersectionObserver) ---------- */
  function initReveal() {
    var items = document.querySelectorAll('[data-reveal]');
    if (!items.length || reduceMotion || !('IntersectionObserver' in window)) return;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    items.forEach(function (item, index) {
      item.classList.add('reveal');
      // Stagger siblings slightly so cards cascade in
      item.style.setProperty('--reveal-delay', ((index % 3) * 90) + 'ms');
      observer.observe(item);
    });
  }

  /* ---------- Accordion (FAQ) ---------- */
  function initAccordions() {
    document.querySelectorAll('[data-accordion]').forEach(function (group) {
      var triggers = group.querySelectorAll('.accordion-trigger');

      function setOpen(trigger, open) {
        var panel = document.getElementById(trigger.getAttribute('aria-controls'));
        trigger.setAttribute('aria-expanded', String(open));
        if (panel) panel.setAttribute('data-open', String(open));
      }

      triggers.forEach(function (trigger) {
        trigger.addEventListener('click', function () {
          var willOpen = trigger.getAttribute('aria-expanded') !== 'true';
          // Only one answer open at a time
          triggers.forEach(function (other) { if (other !== trigger) setOpen(other, false); });
          setOpen(trigger, willOpen);
        });
      });
    });
  }

  /* ---------- Tabs (with arrow-key navigation) ---------- */
  function initTabs() {
    document.querySelectorAll('[data-tabs]').forEach(function (root) {
      var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));

      function select(tab, moveFocus) {
        tabs.forEach(function (t) {
          var active = t === tab;
          t.setAttribute('aria-selected', String(active));
          t.tabIndex = active ? 0 : -1;
          var panel = document.getElementById(t.getAttribute('aria-controls'));
          if (panel) panel.hidden = !active;
        });
        if (moveFocus) tab.focus();
      }

      tabs.forEach(function (tab, i) {
        tab.addEventListener('click', function () { select(tab, false); });
        tab.addEventListener('keydown', function (e) {
          var next = null;
          if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
          else if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
          else if (e.key === 'Home') next = tabs[0];
          else if (e.key === 'End') next = tabs[tabs.length - 1];
          if (next) { e.preventDefault(); select(next, true); }
        });
      });
    });
  }

  /* ---------- Modal / overlay engine (shared by product quick-view + lightbox) ---------- */
  var activeOverlay = null;
  var lastTrigger = null;

  Stationers.openOverlay = function (overlay, trigger) {
    lastTrigger = trigger || document.activeElement;
    activeOverlay = overlay;
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('overflow-hidden');
    requestAnimationFrame(function () {
      overlay.classList.add('is-open');
      var first = overlay.querySelector('[data-autofocus]') || overlay.querySelector(FOCUSABLE);
      if (first) first.focus();
    });
  };

  Stationers.closeOverlay = function (overlay) {
    overlay = overlay || activeOverlay;
    if (!overlay) return;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('overflow-hidden');
    window.setTimeout(function () { overlay.classList.add('hidden'); }, reduceMotion ? 0 : 200);
    activeOverlay = null;
    if (lastTrigger && typeof lastTrigger.focus === 'function') lastTrigger.focus();
  };

  function initOverlays() {
    document.querySelectorAll('.overlay').forEach(function (overlay) {
      // Close on backdrop click or any [data-close] button
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay || e.target.closest('[data-close]')) Stationers.closeOverlay(overlay);
      });
    });

    document.addEventListener('keydown', function (e) {
      if (!activeOverlay) return;
      if (e.key === 'Escape') {
        Stationers.closeOverlay();
      } else if (e.key === 'Tab') {
        // Keep keyboard focus inside the open dialog
        var focusable = activeOverlay.querySelectorAll(FOCUSABLE);
        if (!focusable.length) return;
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ---------- Gallery lightbox ---------- */
  function initLightbox() {
    var overlay = document.getElementById('lightbox');
    var links = Array.prototype.slice.call(document.querySelectorAll('[data-lightbox]'));
    if (!overlay || !links.length) return;

    var img = overlay.querySelector('[data-lightbox-img]');
    var caption = overlay.querySelector('[data-lightbox-caption]');
    var counter = overlay.querySelector('[data-lightbox-counter]');
    var index = 0;

    function show(i) {
      index = (i + links.length) % links.length;
      var link = links[index];
      var thumb = link.querySelector('img');
      img.src = link.getAttribute('href');
      img.alt = thumb ? thumb.alt : '';
      caption.textContent = link.dataset.caption || (thumb ? thumb.alt : '');
      counter.textContent = (index + 1) + ' of ' + links.length;
    }

    links.forEach(function (link, i) {
      link.addEventListener('click', function (e) {
        e.preventDefault(); // without JS the link simply opens the full image
        show(i);
        Stationers.openOverlay(overlay, link);
      });
    });

    overlay.querySelector('[data-prev]').addEventListener('click', function () { show(index - 1); });
    overlay.querySelector('[data-next]').addEventListener('click', function () { show(index + 1); });

    document.addEventListener('keydown', function (e) {
      if (activeOverlay !== overlay) return;
      if (e.key === 'ArrowLeft') show(index - 1);
      if (e.key === 'ArrowRight') show(index + 1);
    });
  }

  /* ---------- Interactive map (Leaflet + OpenStreetMap) ---------- */
  function initMap() {
    var mapEl = document.getElementById('map');
    if (!mapEl) return;
    var fallback = document.getElementById('map-fallback');

    if (!window.L) {
      if (fallback) fallback.classList.remove('hidden');
      return;
    }

    // Approximate position of Church Square, Pretoria Central (edit if the shop moves)
    var store = [-25.74611, 28.18806];

    L.Icon.Default.imagePath = 'assets/vendor/leaflet/images/';
    var map = L.map(mapEl, { scrollWheelZoom: false }).setView(store, 16);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    L.marker(store).addTo(map)
      .bindPopup('<strong>Church Square Stationers</strong><br>Paul Kruger Street, Pretoria Central')
      .openPopup();

    // Allow scroll-zoom only after the visitor clicks the map (avoids scroll-trapping on mobile)
    map.on('click', function () { map.scrollWheelZoom.enable(); });

    // "How far am I?" - uses the Geolocation API and the haversine formula
    var locateBtn = document.getElementById('locate-btn');
    var distanceOut = document.getElementById('distance-output');
    if (!locateBtn || !distanceOut) return;

    function haversineKm(a, b) {
      var R = 6371;
      var toRad = function (d) { return d * Math.PI / 180; };
      var dLat = toRad(b[0] - a[0]);
      var dLng = toRad(b[1] - a[1]);
      var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
      return 2 * R * Math.asin(Math.sqrt(h));
    }

    var youMarker = null;
    locateBtn.addEventListener('click', function () {
      if (!('geolocation' in navigator)) {
        distanceOut.textContent = 'Your browser does not support location lookup.';
        return;
      }
      distanceOut.textContent = 'Finding your location...';
      navigator.geolocation.getCurrentPosition(function (pos) {
        var you = [pos.coords.latitude, pos.coords.longitude];
        var km = haversineKm(you, store);
        if (youMarker) map.removeLayer(youMarker);
        youMarker = L.circleMarker(you, { radius: 8, color: '#7A1F2B', fillColor: '#D4AF37', fillOpacity: 0.9 })
          .addTo(map).bindPopup('You are here');
        map.fitBounds([you, store], { padding: [40, 40] });
        distanceOut.textContent = km < 1
          ? 'You are less than 1 km from our store.'
          : 'You are about ' + km.toFixed(1) + ' km (in a straight line) from our store.';
      }, function () {
        distanceOut.textContent = 'We could not get your location. You can still use the directions link.';
      }, { timeout: 10000 });
    });
  }

  /* ---------- Share button (Web Share API with copy-link fallback) ---------- */
  function initShare() {
    var btn = document.getElementById('share-btn');
    var status = document.getElementById('share-status');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var data = { title: document.title, text: 'Stationery, printing and binding in Pretoria Central', url: window.location.href };
      if (navigator.share) {
        navigator.share(data).catch(function () { /* user cancelled */ });
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(data.url).then(function () {
          if (status) status.textContent = 'Link copied to clipboard.';
        });
      } else if (status) {
        status.textContent = 'Copy the page address from your browser bar to share.';
      }
    });
  }

  /* ---------- Current year in footer ---------- */
  function initYear() {
    document.querySelectorAll('[data-year]').forEach(function (n) { n.textContent = new Date().getFullYear(); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initMobileMenu();
    initReveal();
    initAccordions();
    initTabs();
    initOverlays();
    initLightbox();
    initMap();
    initShare();
    initYear();
  });
})();
