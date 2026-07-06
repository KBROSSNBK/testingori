(function () {
  "use strict";

  function loadData(key) {
    var raw = localStorage.getItem(key);
    try { return raw ? JSON.parse(raw) : []; } catch (e) { return []; }
  }
  function saveData(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
  function formatDate(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  var currentUser = localStorage.getItem('rl_user') || '';
  var reviews = loadData('rl_reviews');
  var listings = loadData('rl_listings');
  var requests = loadData('rl_requests');

  var selectedBook = null;
  var searchMode = null;
  var currentRating = 0;
  var proposeTargetListing = null;
  var searchTimer = null;

  function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
  function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

  document.querySelectorAll('.modal-close').forEach(function (btn) {
    btn.addEventListener('click', function () {
      closeModal(btn.getAttribute('data-close'));
    });
  });
  document.querySelectorAll('.modal').forEach(function (m) {
    m.addEventListener('click', function (e) {
      if (e.target === m) { m.classList.add('hidden'); }
    });
  });

  document.querySelectorAll('.tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
      document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
      btn.classList.add('active');
      document.getElementById('tab-' + btn.getAttribute('data-tab')).classList.add('active');
    });
  });

  function refreshUserLabel() {
    document.getElementById('currentUserLabel').textContent = currentUser ? currentUser : 'Invitado';
  }
  document.getElementById('changeUserBtn').addEventListener('click', function () {
    document.getElementById('userNameInput').value = currentUser;
    openModal('userModal');
  });
  document.getElementById('saveUserBtn').addEventListener('click', function () {
    var val = document.getElementById('userNameInput').value.trim();
    if (!val) { alert('Por favor escribe un nombre.'); return; }
    currentUser = val;
    localStorage.setItem('rl_user', currentUser);
    refreshUserLabel();
    closeModal('userModal');
    renderCatalog();
    renderMyExchanges();
  });
  if (!currentUser) { openModal('userModal'); }
  refreshUserLabel();

  document.getElementById('bookSearchInput').addEventListener('input', function () {
    clearTimeout(searchTimer);
    var q = this.value.trim();
    var resultsBox = document.getElementById('bookSearchResults');
    if (q.length < 3) { resultsBox.innerHTML = ''; return; }
    searchTimer = setTimeout(function () { doSearch(q); }, 450);
  });

  function doSearch(query) {
    var resultsBox = document.getElementById('bookSearchResults');
    resultsBox.textContent = 'Buscando...';
    var url = 'https://openlibrary.org/search.json?limit=12&q=' + encodeURIComponent(query);
    fetch(url).then(function (r) { return r.json(); }).then(function (data) {
      resultsBox.innerHTML = '';
      var items = data.docs || [];
      if (items.length === 0) {
        resultsBox.textContent = 'No se encontraron libros. Intenta con otro título.';
        return;
      }
      items.forEach(function (doc) {
        var thumb = '';
        if (doc.cover_i) {
          thumb = 'https://covers.openlibrary.org/b/id/' + doc.cover_i + '-M.jpg';
        } else if (doc.cover_edition_key) {
          thumb = 'https://covers.openlibrary.org/b/olid/' + doc.cover_edition_key + '-M.jpg';
        }
        var title = doc.title || 'Título desconocido';
        var authors = doc.author_name ? doc.author_name.join(', ') : 'Autor desconocido';
        var card = document.createElement('div');
        card.className = 'search-result-item';
        var img = document.createElement('img');
        img.src = thumb || 'https://placehold.co/100x150?text=Sin+portada';
        img.alt = title;
        var infoDiv = document.createElement('div');
        var titleEl = document.createElement('strong');
        titleEl.textContent = title;
        var authorEl = document.createElement('span');
        authorEl.textContent = authors;
        infoDiv.appendChild(titleEl);
        infoDiv.appendChild(document.createElement('br'));
        infoDiv.appendChild(authorEl);
        card.appendChild(img);
        card.appendChild(infoDiv);
        card.addEventListener('click', function () {
          selectedBook = {
            id: doc.key || uid(),
            title: title,
            authors: authors,
            thumbnail: thumb || ''
          };
          closeModal('bookSearchModal');
          if (searchMode === 'review') {
            openReviewForm();
          } else if (searchMode === 'listing') {
            openListingForm();
          }
        });
        resultsBox.appendChild(card);
      });
    }).catch(function () {
      resultsBox.textContent = 'Ocurrió un error al buscar. Intenta nuevamente.';
    });
  }

  document.getElementById('newReviewBtn').addEventListener('click', function () {
    searchMode = 'review';
    selectedBook = null;
    document.getElementById('bookSearchTitle').textContent = 'Buscar libro para reseñar';
    document.getElementById('bookSearchInput').value = '';
    document.getElementById('bookSearchResults').innerHTML = '';
    openModal('bookSearchModal');
  });

  document.getElementById('newListingBtn').addEventListener('click', function () {
    if (!currentUser) { openModal('userModal'); return; }
    searchMode = 'listing';
    selectedBook = null;
    document.getElementById('bookSearchTitle').textContent = 'Buscar mi libro para publicar';
    document.getElementById('bookSearchInput').value = '';
    document.getElementById('bookSearchResults').innerHTML = '';
    openModal('bookSearchModal');
  });

  function bookPreviewNode(book) {
    var wrap = document.createElement('div');
    wrap.className = 'book-preview-inner';
    var img = document.createElement('img');
    img.src = book.thumbnail || 'https://placehold.co/100x150?text=Sin+portada';
    img.alt = book.title;
    var info = document.createElement('div');
    var t = document.createElement('strong');
    t.textContent = book.title;
    var a = document.createElement('span');
    a.textContent = book.authors;
    info.appendChild(t);
    info.appendChild(document.createElement('br'));
    info.appendChild(a);
    wrap.appendChild(img);
    wrap.appendChild(info);
    return wrap;
  }

  function openReviewForm() {
    var preview = document.getElementById('reviewBookPreview');
    preview.innerHTML = '';
    preview.appendChild(bookPreviewNode(selectedBook));
    currentRating = 0;
    renderStarPicker();
    document.getElementById('reviewText').value = '';
    openModal('reviewFormModal');
  }

  function renderStarPicker() {
    var box = document.getElementById('starPicker');
    box.innerHTML = '';
    for (var i = 1; i <= 5; i++) {
      (function (i) {
        var star = document.createElement('span');
        star.className = 'star-pick' + (i <= currentRating ? ' filled' : '');
        star.textContent = i <= currentRating ? '★' : '☆';
        star.addEventListener('click', function () {
          currentRating = i;
          renderStarPicker();
        });
        box.appendChild(star);
      })(i);
    }
  }

  document.getElementById('submitReviewBtn').addEventListener('click', function () {
    if (!currentUser) { openModal('userModal'); return; }
    if (currentRating < 1) { alert('Por favor selecciona una calificación de 1 a 5 estrellas.'); return; }
    var text = document.getElementById('reviewText').value.trim();
    if (!text) { alert('Por favor escribe tu reseña.'); return; }
    reviews.unshift({
      id: uid(),
      book: selectedBook,
      rating: currentRating,
      text: text,
      reviewer: currentUser,
      date: new Date().toISOString()
    });
    saveData('rl_reviews', reviews);
    closeModal('reviewFormModal');
    renderReviews();
  });

  function openListingForm() {
    var preview = document.getElementById('listingBookPreview');
    preview.innerHTML = '';
    preview.appendChild(bookPreviewNode(selectedBook));
    document.getElementById('listingCondition').value = 'Buen estado';
    document.getElementById('listingNotes').value = '';
    openModal('listingFormModal');
  }

  document.getElementById('submitListingBtn').addEventListener('click', function () {
    if (!currentUser) { openModal('userModal'); return; }
    listings.unshift({
      id: uid(),
      book: selectedBook,
      condition: document.getElementById('listingCondition').value,
      notes: document.getElementById('listingNotes').value.trim(),
      owner: currentUser,
      status: 'available',
      date: new Date().toISOString()
    });
    saveData('rl_listings', listings);
    closeModal('listingFormModal');
    renderCatalog();
  });

  function starDisplay(rating) {
    var s = '';
    for (var i = 1; i <= 5; i++) { s += (i <= rating ? '★' : '☆'); }
    return s;
  }

  function renderReviews() {
    var box = document.getElementById('reviewsList');
    box.innerHTML = '';
    if (reviews.length === 0) {
      var empty = document.createElement('p');
      empty.className = 'empty-msg';
      empty.textContent = 'Aún no hay reseñas. ¡Sé el primero en compartir tu opinión sobre un libro!';
      box.appendChild(empty);
      return;
    }
    reviews.forEach(function (rev) {
      var card = document.createElement('div');
      card.className = 'card review-card';
      var img = document.createElement('img');
      img.src = rev.book.thumbnail || 'https://placehold.co/100x150?text=Sin+portada';
      img.alt = rev.book.title;
      var body = document.createElement('div');
      body.className = 'card-body';
      var title = document.createElement('h3');
      title.textContent = rev.book.title;
      var author = document.createElement('p');
      author.className = 'author';
      author.textContent = rev.book.authors;
      var stars = document.createElement('div');
      stars.className = 'stars-display';
      stars.textContent = starDisplay(rev.rating);
      var text = document.createElement('p');
      text.className = 'review-text';
      text.textContent = rev.text;
      var meta = document.createElement('p');
      meta.className = 'meta';
      meta.textContent = 'Por ' + rev.reviewer + ' · ' + formatDate(rev.date);
      body.appendChild(title);
      body.appendChild(author);
      body.appendChild(stars);
      body.appendChild(text);
      body.appendChild(meta);
      card.appendChild(img);
      card.appendChild(body);
      box.appendChild(card);
    });
  }

  function renderCatalog() {
    var box = document.getElementById('catalogList');
    box.innerHTML = '';
    if (listings.length === 0) {
      var empty = document.createElement('p');
      empty.className = 'empty-msg';
      empty.textContent = 'Todavía no hay libros publicados para intercambio.';
      box.appendChild(empty);
      return;
    }
    listings.forEach(function (item) {
      var card = document.createElement('div');
      card.className = 'card listing-card';
      var img = document.createElement('img');
      img.src = item.book.thumbnail || 'https://placehold.co/100x150?text=Sin+portada';
      img.alt = item.book.title;
      var body = document.createElement('div');
      body.className = 'card-body';
      var statusBadge = document.createElement('span');
      statusBadge.className = 'badge badge-' + item.status;
      statusBadge.textContent = item.status === 'available' ? 'Disponible' : (item.status === 'completed' ? 'Intercambiado' : item.status);
      var title = document.createElement('h3');
      title.textContent = item.book.title;
      var author = document.createElement('p');
      author.className = 'author';
      author.textContent = item.book.authors;
      var cond = document.createElement('p');
      cond.className = 'condition';
      cond.textContent = 'Estado: ' + item.condition;
      body.appendChild(statusBadge);
      body.appendChild(title);
      body.appendChild(author);
      body.appendChild(cond);
      if (item.notes) {
        var notes = document.createElement('p');
        notes.className = 'notes';
        notes.textContent = item.notes;
        body.appendChild(notes);
      }
      var owner = document.createElement('p');
      owner.className = 'meta';
      owner.textContent = 'Publicado por ' + item.owner + ' · ' + formatDate(item.date);
      body.appendChild(owner);
      if (item.owner === currentUser) {
        var youBadge = document.createElement('p');
        youBadge.className = 'you-badge';
        youBadge.textContent = 'Esta es tu publicación';
        body.appendChild(youBadge);
        if (item.status === 'available') {
          var delBtn = document.createElement('button');
          delBtn.className = 'btn-secondary';
          delBtn.textContent = 'Eliminar publicación';
          delBtn.addEventListener('click', function () {
            if (confirm('¿Eliminar esta publicación?')) {
              listings = listings.filter(function (l) { return l.id !== item.id; });
              saveData('rl_listings', listings);
              renderCatalog();
            }
          });
          body.appendChild(delBtn);
        }
      } else if (item.status === 'available') {
        var btn = document.createElement('button');
        btn.className = 'btn-primary';
        btn.textContent = 'Proponer intercambio';
        btn.addEventListener('click', function () {
          if (!currentUser) { openModal('userModal'); return; }
          openProposeModal(item);
        });
        body.appendChild(btn);
      }
      card.appendChild(img);
      card.appendChild(body);
      box.appendChild(card);
    });
  }

  function openProposeModal(listing) {
    var myListings = listings.filter(function (l) { return l.owner === currentUser && l.status === 'available'; });
    if (myListings.length === 0) {
      alert('Primero debes publicar al menos un libro disponible para poder proponer un intercambio.');
      return;
    }
    proposeTargetListing = listing;
    var preview = document.getElementById('proposeTargetPreview');
    preview.innerHTML = '';
    preview.appendChild(bookPreviewNode(listing.book));
    var select = document.getElementById('proposeSelect');
    select.innerHTML = '';
    myListings.forEach(function (l) {
      var opt = document.createElement('option');
      opt.value = l.id;
      opt.textContent = l.book.title;
      select.appendChild(opt);
    });
    document.getElementById('proposeMessage').value = '';
    openModal('proposeModal');
  }

  document.getElementById('submitProposeBtn').addEventListener('click', function () {
    var offeredId = document.getElementById('proposeSelect').value;
    var offeredListing = listings.find(function (l) { return l.id === offeredId; });
    if (!offeredListing) { alert('Selecciona un libro para ofrecer.'); return; }
    requests.unshift({
      id: uid(),
      listingId: proposeTargetListing.id,
      listingOwner: proposeTargetListing.owner,
      listingBook: proposeTargetListing.book,
      requesterName: currentUser,
      offeredListingId: offeredListing.id,
      offeredBook: offeredListing.book,
      message: document.getElementById('proposeMessage').value.trim(),
      status: 'pending',
      date: new Date().toISOString()
    });
    saveData('rl_requests', requests);
    closeModal('proposeModal');
    renderMyExchanges();
    alert('Propuesta enviada. Podrás ver su estado en "Mis Intercambios".');
  });

  function statusLabel(status) {
    if (status === 'pending') return 'Pendiente de aprobación';
    if (status === 'completed') return 'Intercambio aprobado';
    if (status === 'rejected') return 'Rechazado';
    return status;
  }

  function renderMyExchanges() {
    renderRequestList('receivedRequests', requests.filter(function (r) { return r.listingOwner === currentUser; }), true);
    renderRequestList('sentRequests', requests.filter(function (r) { return r.requesterName === currentUser; }), false);
  }

  function renderRequestList(containerId, list, isOwnerView) {
    var box = document.getElementById(containerId);
    box.innerHTML = '';
    if (list.length === 0) {
      var empty = document.createElement('p');
      empty.className = 'empty-msg';
      empty.textContent = 'No hay solicitudes por aquí todavía.';
      box.appendChild(empty);
      return;
    }
    list.forEach(function (req) {
      var card = document.createElement('div');
      card.className = 'request-card';
      var status = document.createElement('span');
      status.className = 'badge badge-' + req.status;
      status.textContent = statusLabel(req.status);
      card.appendChild(status);
      var row = document.createElement('div');
      row.className = 'request-books';
      var a = bookPreviewNode(req.offeredBook);
      var arrow = document.createElement('span');
      arrow.className = 'exchange-arrow';
      arrow.textContent = '⇄';
      var b = bookPreviewNode(req.listingBook);
      row.appendChild(a);
      row.appendChild(arrow);
      row.appendChild(b);
      card.appendChild(row);
      if (req.message) {
        var msg = document.createElement('p');
        msg.className = 'notes';
        msg.textContent = '"' + req.message + '"';
        card.appendChild(msg);
      }
      var info = document.createElement('p');
      info.className = 'meta';
      info.textContent = (isOwnerView ? ('Propuesto por ' + req.requesterName) : ('Le propusiste a ' + req.listingOwner)) + ' · ' + formatDate(req.date);
      card.appendChild(info);
      if (isOwnerView && req.status === 'pending') {
        var actions = document.createElement('div');
        actions.className = 'request-actions';
        var approveBtn = document.createElement('button');
        approveBtn.className = 'btn-primary';
        approveBtn.textContent = 'Aprobar intercambio';
        approveBtn.addEventListener('click', function () { approveRequest(req.id); });
        var rejectBtn = document.createElement('button');
        rejectBtn.className = 'btn-secondary';
        rejectBtn.textContent = 'Rechazar';
        rejectBtn.addEventListener('click', function () { rejectRequest(req.id); });
        actions.appendChild(approveBtn);
        actions.appendChild(rejectBtn);
        card.appendChild(actions);
      } else if (!isOwnerView && req.status === 'pending') {
        var cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn-secondary';
        cancelBtn.textContent = 'Cancelar propuesta';
        cancelBtn.addEventListener('click', function () {
          requests = requests.filter(function (r) { return r.id !== req.id; });
          saveData('rl_requests', requests);
          renderMyExchanges();
        });
        card.appendChild(cancelBtn);
      }
      box.appendChild(card);
    });
  }

  function approveRequest(reqId) {
    var req = requests.find(function (r) { return r.id === reqId; });
    if (!req) return;
    req.status = 'completed';
    listings.forEach(function (l) {
      if (l.id === req.listingId || l.id === req.offeredListingId) {
        l.status = 'completed';
      }
    });
    requests.forEach(function (r) {
      if (r.id !== req.id && r.status === 'pending' &&
        (r.listingId === req.listingId || r.offeredListingId === req.offeredListingId ||
          r.listingId === req.offeredListingId || r.offeredListingId === req.listingId)) {
        r.status = 'rejected';
      }
    });
    saveData('rl_requests', requests);
    saveData('rl_listings', listings);
    renderMyExchanges();
    renderCatalog();
  }

  function rejectRequest(reqId) {
    var req = requests.find(function (r) { return r.id === reqId; });
    if (!req) return;
    req.status = 'rejected';
    saveData('rl_requests', requests);
    renderMyExchanges();
  }

  renderReviews();
  renderCatalog();
  renderMyExchanges();
})();
