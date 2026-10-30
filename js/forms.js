/* ============================================================
   Forms: client-side validation, AJAX quote (enquiry.html)
   and email compilation (contact.html).

   Single place to change the contact details:
   ============================================================ */
(function () {
  'use strict';

  var CONFIG = {
    // The email address that receives contact-form messages.
    RECIPIENT_EMAIL: 'info@churchsquarestationers.co.za',
    // Optional: paste a Formspree (or similar) endpoint such as
    // 'https://formspree.io/f/xxxxxxx' to send the contact form with AJAX.
    // Leave empty to compile an email the visitor sends from their own email app.
    CONTACT_ENDPOINT: ''
  };

  var el = window.Stationers.el;

  /* ============================================================
     1. VALIDATION RULES
     Each rule is a function(value, field) that returns an error
     message, or an empty string when the value is fine.
     ============================================================ */
  var V = {
    required: function (msg) {
      return function (v) { return String(v).trim() ? '' : msg; };
    },
    pattern: function (re, msg) {
      return function (v) { return re.test(String(v).trim()) ? '' : msg; };
    },
    optional: function (rule) {
      return function (v, f) { return String(v).trim() ? rule(v, f) : ''; };
    },
    phone: function (msg) {
      // South African numbers: 0821234567 or +27821234567 (spaces, dashes and brackets allowed)
      return function (v) {
        var n = String(v).replace(/[\s\-()]/g, '');
        return /^(?:\+27|0)[1-9]\d{8}$/.test(n) ? '' : msg;
      };
    },
    intRange: function (emptyMsg, rangeMsg, min, max) {
      return function (v) {
        var s = String(v).trim();
        if (!s) return emptyMsg;
        if (!/^\d+$/.test(s)) return rangeMsg;
        var n = parseInt(s, 10);
        return n >= min && n <= max ? '' : rangeMsg;
      };
    },
    length: function (label, min, max) {
      return function (v) {
        var len = String(v).trim().length;
        if (len < min) return label + ' must be at least ' + min + ' characters (you have ' + len + ').';
        if (len > max) return label + ' must be ' + max + ' characters or fewer.';
        return '';
      };
    },
    futureDate: function (v) {
      if (!v) return '';
      var d = new Date(v + 'T00:00:00');
      if (isNaN(d.getTime())) return 'Please enter a valid date.';
      var today = new Date();
      today.setHours(0, 0, 0, 0);
      if (d < today) return 'The date cannot be in the past.';
      var limit = new Date(today);
      limit.setFullYear(limit.getFullYear() + 1);
      if (d > limit) return 'Please choose a date within the next 12 months.';
      return '';
    },
    checked: function (msg) {
      return function (v) { return v === true ? '' : msg; };
    }
  };

  var NAME_RE = /^[A-Za-zÀ-ɏ][A-Za-zÀ-ɏ' -]{1,59}$/;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /* ============================================================
     2. FORM ENGINE
     Wires blur/change/input validation, shows errors next to each
     field (aria-invalid + a linked message) and an error summary.
     ============================================================ */
  function bindForm(form, schema, onValid) {
    var ids = Object.keys(schema);
    var summary = form.querySelector('[data-error-summary]');

    function valueOf(f) { return f.type === 'checkbox' ? f.checked : f.value; }

    function check(id) {
      var field = document.getElementById(id);
      var out = document.getElementById(id + '-error');
      var rules = schema[id];
      var msg = '';
      for (var i = 0; i < rules.length; i++) {
        msg = rules[i](valueOf(field), field);
        if (msg) break;
      }
      if (msg) {
        field.setAttribute('aria-invalid', 'true');
        out.textContent = msg;
      } else {
        field.removeAttribute('aria-invalid');
        out.textContent = '';
      }
      return !msg;
    }

    ids.forEach(function (id) {
      var field = document.getElementById(id);
      var eventName = (field.type === 'checkbox' || field.tagName === 'SELECT') ? 'change' : 'blur';
      field.addEventListener(eventName, function () { check(id); });
      // Once a field has been flagged, re-check live so the error clears as soon as it is fixed
      field.addEventListener('input', function () {
        if (field.getAttribute('aria-invalid') === 'true') check(id);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstBad = null;
      var badCount = 0;
      ids.forEach(function (id) {
        if (!check(id)) {
          badCount++;
          if (!firstBad) firstBad = document.getElementById(id);
        }
      });

      if (badCount) {
        summary.textContent = 'Please fix the ' + badCount + ' highlighted ' + (badCount === 1 ? 'field' : 'fields') + ' below.';
        summary.classList.remove('hidden');
        firstBad.focus();
        return;
      }
      summary.classList.add('hidden');

      var values = {};
      Array.prototype.forEach.call(form.elements, function (f) {
        if (!f.name) return;
        values[f.name] = f.type === 'checkbox' ? f.checked : f.value.trim();
      });
      onValid(values);
    });

    return {
      clear: function () {
        ids.forEach(function (id) {
          document.getElementById(id).removeAttribute('aria-invalid');
          document.getElementById(id + '-error').textContent = '';
        });
        summary.classList.add('hidden');
      }
    };
  }

  /* Live character counter for textareas */
  function bindCounter(textareaId, counterId, max) {
    var ta = document.getElementById(textareaId);
    var out = document.getElementById(counterId);
    if (!ta || !out) return;
    function update() { out.textContent = ta.value.length + ' / ' + max + ' characters'; }
    ta.addEventListener('input', update);
    update();
  }

  function money(n) { return 'R' + n.toFixed(2); }

  /* ============================================================
     3. ENQUIRY PAGE: AJAX quote
     ============================================================ */
  function loadPricing() {
    return fetch('data/pricing.json', { headers: { Accept: 'application/json' } })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .catch(function () {
        // fetch() is blocked when a page is opened straight from the file system
        if (window.FALLBACK_DATA && window.FALLBACK_DATA.pricing) return window.FALLBACK_DATA.pricing;
        throw new Error('Pricing unavailable');
      });
  }

  function isWorkingDay(d) { var day = d.getDay(); return day !== 0 && day !== 6; }

  function addWorkingDays(from, n) {
    var d = new Date(from.getTime());
    while (n > 0) {
      d.setDate(d.getDate() + 1);
      if (isWorkingDay(d)) n--;
    }
    return d;
  }

  function nextWorkingDay(from) { return addWorkingDays(from, 1); }

  function startOfDay(d) { var c = new Date(d.getTime()); c.setHours(0, 0, 0, 0); return c; }

  function formatDate(d) {
    return d.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  /* Works out cost and availability from the form values and pricing data.
     `now` is a parameter so the logic is easy to test. */
  function calculateQuote(v, pricing, now) {
    var service = pricing.services[v.service];
    var pages = parseInt(v.pages, 10);
    var copies = parseInt(v.copies, 10);
    var sheets = pages * copies;
    var notes = [];

    var turnaround = v.turnaround;
    if (turnaround === 'express' && sheets > pricing.expressMaxSheets) {
      turnaround = 'standard';
      notes.push('Express service is limited to ' + pricing.expressMaxSheets + ' pages in total, so this job has been quoted at the standard rate and timing.');
    }

    var sizeMultiplier = pricing.paperSizeMultiplier[v.size];
    var sidesFactor = v.sides === 'double' ? pricing.doubleSidedFactor : 1;
    var printing = Math.max(service.minCharge, service.perPage * sheets * sizeMultiplier * sidesFactor);
    var discount = v.student ? printing * pricing.studentDiscount : 0;
    var binding = pricing.binding[v.binding].perCopy * copies;
    var subtotal = printing - discount + binding;
    var express = turnaround === 'express' ? subtotal * pricing.expressSurcharge : 0;
    var total = subtotal + express;

    // Availability
    var ready;
    if (turnaround === 'express') {
      if (isWorkingDay(now) && now.getHours() < pricing.expressCutoffHour) {
        ready = new Date(now.getTime());
        notes.push('Same-day service applies to orders received before ' + pricing.expressCutoffHour + ':00. Please send your files or visit us before then.');
      } else {
        ready = nextWorkingDay(now);
        notes.push('Today’s express cut-off (' + pricing.expressCutoffHour + ':00) has passed or the shop is closed, so your order will be ready the next working day.');
      }
    } else {
      var days = sheets >= pricing.largeJobSheets ? pricing.largeJobWorkingDays : pricing.standardWorkingDays;
      ready = addWorkingDays(now, days);
      if (sheets >= pricing.largeJobSheets) notes.push('Large jobs (' + pricing.largeJobSheets + '+ pages) take an extra working day.');
    }

    var deadlineMissed = false;
    if (v.date) {
      var needed = startOfDay(new Date(v.date + 'T00:00:00'));
      deadlineMissed = startOfDay(ready) > needed;
    }

    return {
      serviceLabel: service.label,
      bindingLabel: pricing.binding[v.binding].label,
      sheets: sheets,
      printing: printing,
      discount: discount,
      binding: binding,
      express: express,
      total: total,
      turnaround: turnaround,
      ready: ready,
      deadlineMissed: deadlineMissed,
      notes: notes
    };
  }

  function initEnquiry() {
    var form = document.getElementById('enquiry-form');
    if (!form) return;

    var resultBox = document.getElementById('quote-result');
    var submitBtn = document.getElementById('enq-submit');
    var submitLabel = submitBtn.textContent;

    // Date picker limits
    var dateField = document.getElementById('enq-date');
    var today = new Date();
    var limit = new Date(today);
    limit.setFullYear(limit.getFullYear() + 1);
    function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
    dateField.min = iso(today);
    dateField.max = iso(limit);

    bindCounter('enq-notes', 'enq-notes-count', 500);

    var engine = bindForm(form, {
      'enq-name':       [V.required('Please enter your full name.'), V.pattern(NAME_RE, 'Use letters only (2 to 60 characters). Spaces, hyphens and apostrophes are fine.')],
      'enq-email':      [V.required('Please enter your email address.'), V.pattern(EMAIL_RE, 'Enter a valid email address, for example name@example.com.')],
      'enq-phone':      [V.required('Please enter your phone number.'), V.phone('Enter a valid South African number, for example 082 123 4567 or +27 82 123 4567.')],
      'enq-service':    [V.required('Please choose a printing service.')],
      'enq-size':       [V.required('Please choose a paper size.')],
      'enq-sides':      [V.required('Please choose single or double-sided.')],
      'enq-pages':      [V.intRange('Please enter the number of pages.', 'Enter a whole number from 1 to 10 000.', 1, 10000)],
      'enq-copies':     [V.intRange('Please enter the number of copies.', 'Enter a whole number from 1 to 1 000.', 1, 1000)],
      'enq-binding':    [V.required('Please choose a binding option.')],
      'enq-turnaround': [V.required('Please choose a turnaround time.')],
      'enq-date':       [V.futureDate],
      'enq-notes':      [V.optional(V.length('Notes', 0, 500))],
      'enq-consent':    [V.checked('Please tick the box so we can contact you about this quote.')]
    }, function (values) {
      submitBtn.disabled = true;
      submitBtn.replaceChildren(el('span', { class: 'spinner', 'aria-hidden': 'true' }), document.createTextNode(' Calculating...'));

      Promise.all([loadPricing(), new Promise(function (r) { setTimeout(r, 400); })])
        .then(function (results) {
          showQuote(values, calculateQuote(values, results[0], new Date()));
        })
        .catch(function () {
          resultBox.replaceChildren(el('div', { class: 'bg-red-50 border border-red-300 text-red-800 rounded-lg p-5', role: 'alert' }, [
            el('p', { class: 'font-bold', text: 'Sorry, we could not calculate your quote right now.' }),
            el('p', { class: 'text-sm mt-1', text: 'Please try again in a moment or send us a message on the contact page.' })
          ]));
        })
        .then(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = submitLabel;
        });
    });

    function row(label, value) {
      return el('div', { class: 'flex justify-between gap-4 py-2 border-b border-gray-200 text-sm' }, [
        el('dt', { class: 'text-gray-600', text: label }),
        el('dd', { class: 'font-semibold text-right', text: value })
      ]);
    }

    function showQuote(v, q) {
      var rows = [
        row('Service', q.serviceLabel + ' (' + v.size + ', ' + (v.sides === 'double' ? 'double-sided' : 'single-sided') + ')'),
        row('Total pages to print', q.sheets.toLocaleString('en-ZA')),
        row('Printing', money(q.printing))
      ];
      if (q.discount > 0) rows.push(row('Student discount', '-' + money(q.discount)));
      rows.push(row(q.bindingLabel, money(q.binding)));
      if (q.express > 0) rows.push(row('Express surcharge', money(q.express)));

      var children = [
        el('h2', { class: 'text-2xl font-bold text-maroon mb-1', text: 'Your estimate' }),
        el('p', { class: 'text-sm text-gray-600 mb-4', text: 'Thanks, ' + v.name.split(' ')[0] + '. Here is what we estimate for your job.' }),
        el('dl', {}, rows),
        el('div', { class: 'flex justify-between items-center bg-maroon text-white rounded-lg px-4 py-3 mt-4' }, [
          el('span', { class: 'font-semibold', text: 'Estimated total' }),
          el('span', { class: 'text-2xl font-bold', text: money(q.total) })
        ]),
        el('div', { class: 'mt-4 bg-yellow-50 border border-gold rounded-lg p-4' }, [
          el('p', { class: 'font-bold text-maroon', text: 'Estimated ready: ' + formatDate(q.ready) }),
          el('p', { class: 'text-sm text-gray-700 mt-1', text: q.turnaround === 'express' ? 'Express service' : 'Standard service' })
        ])
      ];

      if (q.deadlineMissed) {
        children.push(el('p', { class: 'mt-3 bg-red-50 border border-red-300 text-red-800 rounded-lg p-3 text-sm', role: 'alert',
          text: 'Heads up: this is later than your "needed by" date. Try the express option, reduce the job size, or contact us to see what is possible.' }));
      }
      q.notes.forEach(function (n) {
        children.push(el('p', { class: 'mt-3 text-sm text-gray-700', text: n }));
      });

      children.push(el('p', { class: 'mt-4 text-xs text-gray-500',
        text: 'This is an estimate that includes VAT. The final price is confirmed when we have your files. Public holidays are not included in turnaround times.' }));

      var mailBody = [
        'Print and binding enquiry',
        '',
        'Name: ' + v.name,
        'Email: ' + v.email,
        'Phone: ' + v.phone,
        '',
        'Service: ' + q.serviceLabel,
        'Paper size: ' + v.size + ', ' + (v.sides === 'double' ? 'double-sided' : 'single-sided'),
        'Pages: ' + v.pages + ' x ' + v.copies + ' copies',
        'Binding: ' + q.bindingLabel,
        'Turnaround: ' + (q.turnaround === 'express' ? 'Express' : 'Standard'),
        'Needed by: ' + (v.date || 'Not specified'),
        'Student: ' + (v.student ? 'Yes' : 'No'),
        '',
        'Estimated total: ' + money(q.total),
        'Estimated ready: ' + formatDate(q.ready),
        '',
        'Notes: ' + (v.notes || 'None')
      ].join('\n');

      var mailLink = el('a', {
        class: 'inline-block bg-gold text-maroon font-bold px-5 py-2 rounded-lg hover:bg-yellow-400 text-center',
        href: 'mailto:' + CONFIG.RECIPIENT_EMAIL + '?subject=' + encodeURIComponent('Print quote enquiry from ' + v.name) + '&body=' + encodeURIComponent(mailBody),
        text: 'Email this quote request to us'
      });
      var resetBtn = el('button', {
        type: 'button',
        class: 'border-2 border-maroon text-maroon font-bold px-5 py-2 rounded-lg hover:bg-gray-100',
        text: 'Start a new enquiry'
      });
      resetBtn.addEventListener('click', function () {
        form.reset();
        engine.clear();
        document.getElementById('enq-notes').dispatchEvent(new Event('input'));
        resultBox.replaceChildren(placeholder());
        document.getElementById('enq-name').focus();
      });
      children.push(el('div', { class: 'flex flex-col sm:flex-row gap-3 mt-5' }, [mailLink, resetBtn]));

      resultBox.replaceChildren(el('div', { class: 'result-in' }, children));
      resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function placeholder() {
      return el('div', { class: 'text-center text-gray-500 py-10' }, [
        el('div', { class: 'text-5xl mb-3', 'aria-hidden': 'true', text: '🧾' }),
        el('p', { class: 'font-semibold', text: 'Your estimate will appear here' }),
        el('p', { class: 'text-sm', text: 'Fill in the form and choose "Get my estimate".' })
      ]);
    }
  }

  /* ============================================================
     4. CONTACT PAGE: compile an email (or send with AJAX)
     ============================================================ */
  function initContact() {
    var form = document.getElementById('contact-form');
    if (!form) return;

    // Keep the form's action attribute in sync with the single recipient setting above
    form.setAttribute('action', 'mailto:' + CONFIG.RECIPIENT_EMAIL);

    var typeField = document.getElementById('con-type');
    var subjectField = document.getElementById('con-subject');
    var submitBtn = document.getElementById('con-submit');
    var submitLabel = submitBtn.textContent;
    var previewBox = document.getElementById('email-preview');
    var statusBox = document.getElementById('contact-status');

    bindCounter('con-message', 'con-message-count', 1000);

    // Pre-fill from links such as contact.html?topic=Product%20enquiry&product=Gel%20Pen%20Set
    var params = new URLSearchParams(window.location.search);
    var topic = params.get('topic');
    var product = params.get('product');
    if (topic) {
      Array.prototype.forEach.call(typeField.options, function (o) { if (o.value === topic) typeField.value = topic; });
    }
    if (product) subjectField.value = ('Question about: ' + product).slice(0, 80);

    var engine = bindForm(form, {
      'con-name':    [V.required('Please enter your full name.'), V.pattern(NAME_RE, 'Use letters only (2 to 60 characters). Spaces, hyphens and apostrophes are fine.')],
      'con-email':   [V.required('Please enter your email address.'), V.pattern(EMAIL_RE, 'Enter a valid email address, for example name@example.com.')],
      'con-phone':   [V.optional(V.phone('Enter a valid South African number, for example 082 123 4567, or leave this blank.'))],
      'con-type':    [V.required('Please choose the type of message.')],
      'con-subject': [V.required('Please enter a subject.'), V.length('Subject', 3, 80)],
      'con-message': [V.required('Please type your message.'), V.length('Message', 20, 1000)],
      'con-consent': [V.checked('Please agree so we can reply to you.')]
    }, function (values) {
      // Honeypot: real visitors never see or fill this field, bots usually do
      if (values.website) return;

      var subject = '[Website] ' + values.type + ': ' + values.subject;
      var body = [
        'Message type: ' + values.type,
        'Name: ' + values.name,
        'Email: ' + values.email,
        'Phone: ' + (values.phone || 'Not provided'),
        '',
        values.message
      ].join('\n');

      if (CONFIG.CONTACT_ENDPOINT) {
        sendWithAjax(values, subject);
      } else {
        showEmailPreview(subject, body);
      }
    });

    function status(kind, text) {
      var styles = {
        ok:  'bg-green-50 border border-green-400 text-green-800',
        err: 'bg-red-50 border border-red-300 text-red-800'
      };
      statusBox.replaceChildren(el('p', { class: 'rounded-lg p-4 font-semibold ' + styles[kind], text: text }));
    }

    function sendWithAjax(values, subject) {
      submitBtn.disabled = true;
      submitBtn.replaceChildren(el('span', { class: 'spinner', 'aria-hidden': 'true' }), document.createTextNode(' Sending...'));

      fetch(CONFIG.CONTACT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: values.name, email: values.email, phone: values.phone,
          type: values.type, subject: subject, message: values.message
        })
      })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          status('ok', 'Thank you, ' + values.name.split(' ')[0] + '! Your message has been sent. We will reply by email soon.');
          form.reset();
          engine.clear();
          document.getElementById('con-message').dispatchEvent(new Event('input'));
        })
        .catch(function () {
          status('err', 'Sorry, the message could not be sent. Please try again or email us directly at ' + CONFIG.RECIPIENT_EMAIL + '.');
        })
        .then(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = submitLabel;
        });
    }

    function showEmailPreview(subject, body) {
      var href = 'mailto:' + CONFIG.RECIPIENT_EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);

      var preview = el('textarea', {
        class: 'field-input font-mono text-sm', rows: '9', readonly: 'readonly',
        'aria-label': 'Compiled email message'
      });
      preview.value = body;

      var openLink = el('a', {
        class: 'inline-block bg-maroon text-white font-bold px-5 py-2 rounded-lg hover:bg-red-900 text-center',
        href: href, text: 'Open in my email app'
      });
      var copyBtn = el('button', { type: 'button', class: 'border-2 border-maroon text-maroon font-bold px-5 py-2 rounded-lg hover:bg-gray-100', text: 'Copy message' });
      var editBtn = el('button', { type: 'button', class: 'underline text-maroon font-semibold px-2 py-2', text: 'Edit my message' });
      var copyNote = el('p', { class: 'text-sm text-green-700 mt-2', role: 'status' });

      copyBtn.addEventListener('click', function () {
        if (navigator.clipboard) {
          navigator.clipboard.writeText('To: ' + CONFIG.RECIPIENT_EMAIL + '\nSubject: ' + subject + '\n\n' + body)
            .then(function () { copyNote.textContent = 'Copied. Paste it into any email app.'; });
        } else {
          preview.select();
          copyNote.textContent = 'Message selected. Press Ctrl+C (or Cmd+C) to copy it.';
        }
      });
      editBtn.addEventListener('click', function () {
        previewBox.classList.add('hidden');
        previewBox.replaceChildren();
        form.classList.remove('hidden');
        document.getElementById('con-message').focus();
      });

      previewBox.replaceChildren(el('div', { class: 'result-in' }, [
        el('h2', { class: 'text-2xl font-bold text-maroon mb-1', text: 'Your email is ready' }),
        el('p', { class: 'text-sm text-gray-600 mb-4', text: 'Check the details below, then send it from your own email app.' }),
        el('dl', { class: 'text-sm mb-3' }, [
          el('div', { class: 'flex gap-2 py-1' }, [el('dt', { class: 'font-bold w-16', text: 'To:' }), el('dd', { text: CONFIG.RECIPIENT_EMAIL })]),
          el('div', { class: 'flex gap-2 py-1' }, [el('dt', { class: 'font-bold w-16', text: 'Subject:' }), el('dd', { text: subject })])
        ]),
        preview,
        el('div', { class: 'flex flex-col sm:flex-row sm:items-center gap-3 mt-4' }, [openLink, copyBtn, editBtn]),
        copyNote
      ]));

      form.classList.add('hidden');
      previewBox.classList.remove('hidden');
      previewBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
      openLink.focus();
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    initEnquiry();
    initContact();
  });

  // Exposed for testing
  window.Stationers.calculateQuote = calculateQuote;
  window.Stationers.validators = V;
})();
