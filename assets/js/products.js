/* ============================================================
   Products page: dynamic loading, search, filter and sort.
   Data is loaded with fetch() from data/products.json and the
   product cards are built with DOM methods (no innerHTML).
   ============================================================ */
(function () {
  'use strict';

  var el = window.Stationers.el;

  var grid = document.getElementById('product-grid');
  if (!grid) return;

  var searchInput = document.getElementById('product-search');
  var sortSelect = document.getElementById('product-sort');
  var chipBar = document.getElementById('category-chips');
  var countOut = document.getElementById('result-count');
  var emptyMsg = document.getElementById('no-results');
  var errorMsg = document.getElementById('load-error');
  var loading = document.getElementById('loading-state');
  var clearBtn = document.getElementById('clear-filters');
  var modal = document.getElementById('product-modal');

  var state = { all: [], query: '', category: 'All', sort: 'featured' };

  function formatPrice(n) {
    return 'R' + n.toFixed(2);
  }

  /* ---------- Load data (fetch, with an offline fallback) ---------- */
  function loadProducts() {
    return fetch('data/products.json', { headers: { Accept: 'application/json' } })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (json) { return json.products; })
      .catch(function () {
        // fetch() is blocked when the page is opened straight from the file system,
        // so fall back to the copy bundled in data/fallback-data.js
        if (window.FALLBACK_DATA && window.FALLBACK_DATA.products) return window.FALLBACK_DATA.products;
        throw new Error('No product data available');
      });
  }

  /* ---------- Rendering ---------- */
  function buildChips() {
    var cats = ['All'];
    state.all.forEach(function (p) { if (cats.indexOf(p.category) === -1) cats.push(p.category); });

    chipBar.replaceChildren();
    cats.forEach(function (cat) {
      var chip = el('button', {
        type: 'button',
        class: 'chip px-4 py-2 rounded-full border-2 border-maroon text-sm font-semibold transition',
        text: cat,
        'aria-pressed': String(cat === state.category),
        dataset: { category: cat }
      });
      chipBar.appendChild(chip);
    });
    paintChips();
  }

  function paintChips() {
    chipBar.querySelectorAll('.chip').forEach(function (chip) {
      var active = chip.dataset.category === state.category;
      chip.setAttribute('aria-pressed', String(active));
      chip.classList.toggle('bg-maroon', active);
      chip.classList.toggle('text-white', active);
      chip.classList.toggle('text-maroon', !active);
      chip.classList.toggle('bg-white', !active);
    });
  }

  function stockBadge(stock) {
    var low = stock === 'low-stock';
    return el('span', {
      class: 'inline-block text-xs font-bold px-2 py-1 rounded-full ' + (low ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'),
      text: low ? 'Low stock' : 'In stock'
    });
  }

  function buildCard(p) {
    var viewBtn = el('button', {
      type: 'button',
      class: 'mt-4 w-full border-2 border-maroon text-maroon font-bold py-2 rounded-lg hover:bg-maroon hover:text-white transition',
      text: 'Quick view',
      'aria-label': 'Quick view: ' + p.name
    });
    viewBtn.addEventListener('click', function () { openQuickView(p, viewBtn); });

    return el('article', { class: 'bg-white rounded-xl shadow border border-gray-200 p-6 flex flex-col card-hover' }, [
      el('div', { class: 'text-5xl mb-3', 'aria-hidden': 'true', text: p.emoji }),
      el('p', { class: 'text-xs uppercase tracking-wider text-gray-500 mb-1', text: p.category }),
      el('h3', { class: 'text-lg font-bold text-maroon mb-2', text: p.name }),
      el('p', { class: 'text-gray-600 text-sm flex-1', text: p.description }),
      el('div', { class: 'flex items-center justify-between mt-4' }, [
        el('span', { class: 'text-xl font-bold', text: formatPrice(p.price) }),
        stockBadge(p.stock)
      ]),
      viewBtn
    ]);
  }

  function getVisible() {
    var terms = state.query.toLowerCase().split(/\s+/).filter(Boolean);

    var list = state.all.filter(function (p) {
      if (state.category !== 'All' && p.category !== state.category) return false;
      if (!terms.length) return true;
      var haystack = (p.name + ' ' + p.description + ' ' + p.category + ' ' + p.tags.join(' ')).toLowerCase();
      return terms.every(function (t) { return haystack.indexOf(t) !== -1; });
    });

    var sorters = {
      'price-asc':  function (a, b) { return a.price - b.price; },
      'price-desc': function (a, b) { return b.price - a.price; },
      'name':       function (a, b) { return a.name.localeCompare(b.name); }
    };
    if (sorters[state.sort]) list = list.slice().sort(sorters[state.sort]);
    return list;
  }

  function render() {
    var list = getVisible();
    grid.replaceChildren.apply(grid, list.map(buildCard));
    countOut.textContent = 'Showing ' + list.length + ' of ' + state.all.length + ' products';
    emptyMsg.classList.toggle('hidden', list.length > 0);
    syncUrl();
  }

  /* ---------- Keep filters in the URL so a search can be shared or bookmarked ---------- */
  function syncUrl() {
    var params = new URLSearchParams();
    if (state.query) params.set('q', state.query);
    if (state.category !== 'All') params.set('category', state.category);
    if (state.sort !== 'featured') params.set('sort', state.sort);
    var qs = params.toString();
    try {
      history.replaceState(null, '', qs ? '?' + qs : window.location.pathname);
    } catch (err) {
      // Some browsers refuse to change the URL when a page is opened straight from
      // the file system. Filtering still works; the link just is not shareable.
    }
  }

  function readUrl() {
    var params = new URLSearchParams(window.location.search);
    state.query = (params.get('q') || '').slice(0, 60);
    state.category = params.get('category') || 'All';
    state.sort = params.get('sort') || 'featured';
    if (['featured', 'price-asc', 'price-desc', 'name'].indexOf(state.sort) === -1) state.sort = 'featured';
    if (state.category !== 'All' && !state.all.some(function (p) { return p.category === state.category; })) state.category = 'All';
    searchInput.value = state.query;
    sortSelect.value = state.sort;
  }

  /* ---------- Quick-view modal ---------- */
  function openQuickView(p, trigger) {
    modal.querySelector('[data-m-emoji]').textContent = p.emoji;
    modal.querySelector('[data-m-category]').textContent = p.category;
    modal.querySelector('#product-modal-title').textContent = p.name;
    modal.querySelector('[data-m-desc]').textContent = p.description;
    modal.querySelector('[data-m-price]').textContent = formatPrice(p.price);

    var stock = modal.querySelector('[data-m-stock]');
    stock.replaceChildren(stockBadge(p.stock));

    var enquire = modal.querySelector('[data-m-enquire]');
    enquire.href = 'contact.html?topic=' + encodeURIComponent('Product enquiry') +
                   '&product=' + encodeURIComponent(p.name) + '#contact-form';

    window.Stationers.openOverlay(modal, trigger);
  }

  /* ---------- Events ---------- */
  function debounce(fn, ms) {
    var t;
    return function () {
      var args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(null, args); }, ms);
    };
  }

  searchInput.addEventListener('input', debounce(function () {
    state.query = searchInput.value.trim().slice(0, 60);
    render();
  }, 200));

  sortSelect.addEventListener('change', function () {
    state.sort = sortSelect.value;
    render();
  });

  // Event delegation: one listener handles every category chip
  chipBar.addEventListener('click', function (e) {
    var chip = e.target.closest('.chip');
    if (!chip) return;
    state.category = chip.dataset.category;
    paintChips();
    render();
  });

  clearBtn.addEventListener('click', function () {
    state.query = '';
    state.category = 'All';
    state.sort = 'featured';
    searchInput.value = '';
    sortSelect.value = 'featured';
    paintChips();
    render();
    searchInput.focus();
  });

  /* ---------- Start ---------- */
  loadProducts()
    .then(function (products) {
      state.all = products;
      loading.classList.add('hidden');
      buildChips();
      readUrl();
      paintChips();
      render();
    })
    .catch(function () {
      loading.classList.add('hidden');
      errorMsg.classList.remove('hidden');
    });
})();
