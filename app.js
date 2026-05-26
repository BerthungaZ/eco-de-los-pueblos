
(function () {
  "use strict";

  const DATA = window.ECO_DATA || { artworks: [], artists: [], categories: [] };

  const LS = {
    cart: "eco_cart_v8",
    favorites: "eco_favorites_v8",
    orders: "eco_orders_v8",
    currentUser: "eco_current_user_v8",
    users: "eco_users_v8",
    artistProfiles: "eco_artist_profiles_v8",
    localArtworks: "eco_local_artworks_v8"
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

  const DEMO_USERS = [
    {
      id: "admin-demo",
      role: "admin",
      name: "Administrador Eco",
      email: "admin@ecodepueblos.com",
      password: "admin123",
      phone: "7820000000",
      avatar: null,
      createdAt: new Date().toISOString(),
      shipping: {
        name: "Administrador Eco",
        phone: "7820000000",
        zip: "93300",
        address: "Oficina central Eco de los Pueblos"
      }
    },
    {
      id: "cliente-demo",
      role: "cliente",
      name: "Cliente Demo",
      email: "cliente@demo.com",
      password: "cliente123",
      phone: "7821111111",
      avatar: null,
      createdAt: new Date().toISOString(),
      shipping: {
        name: "Cliente Demo",
        phone: "7821111111",
        zip: "93300",
        address: "Poza Rica, Veracruz"
      }
    },
    {
      id: "artista-demo",
      role: "artista",
      name: "Artista Demo",
      email: "artista@demo.com",
      password: "artista123",
      phone: "7822222222",
      avatar: null,
      origin: "Papantla, Veracruz",
      technique: "Pintura y escultura",
      bio: "Artista demo registrado para mostrar el panel de publicación de obras.",
      createdAt: new Date().toISOString(),
      shipping: {
        name: "Artista Demo",
        phone: "7822222222",
        zip: "93400",
        address: "Papantla, Veracruz"
      }
    }
  ];

  function read(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  }

  function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function uid(prefix = "id") {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function escapeHTML(text) {
    return String(text ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));
  }

  function initials(name = "EP") {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(word => word[0])
      .join("")
      .toUpperCase();
  }

  function currentUser() {
    return read(LS.currentUser, null);
  }

  function users() {
    return read(LS.users, []);
  }

  function setUsers(nextUsers) {
    save(LS.users, nextUsers);
  }

  function artistProfiles() {
    return read(LS.artistProfiles, []);
  }

  function setArtistProfiles(nextProfiles) {
    save(LS.artistProfiles, nextProfiles);
  }

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function findUserByEmail(email) {
    return users().find(user => normalizeEmail(user.email) === normalizeEmail(email));
  }

  function upsertUser(user) {
    const all = users();
    const index = all.findIndex(item => item.id === user.id || normalizeEmail(item.email) === normalizeEmail(user.email));
    if (index >= 0) all[index] = { ...all[index], ...user };
    else all.push(user);
    setUsers(all);
    return index >= 0 ? all[index] : user;
  }

  function syncCurrentUser(user) {
    if (!user) {
      localStorage.removeItem(LS.currentUser);
      return;
    }
    save(LS.currentUser, user);
    upsertUser(user);
  }

  function seedDemoData() {
    if (!localStorage.getItem(LS.users)) {
      setUsers(DEMO_USERS);
    }

    if (!localStorage.getItem(LS.artistProfiles)) {
      const artist = DEMO_USERS.find(user => user.role === "artista");
      setArtistProfiles([{
        id: artist.id,
        userId: artist.id,
        name: artist.name,
        email: artist.email,
        phone: artist.phone,
        origin: artist.origin,
        technique: artist.technique,
        bio: artist.bio,
        avatar: artist.avatar,
        createdAt: artist.createdAt
      }]);
    }
  }

  function toast(message) {
    const box = $("#toast");
    if (!box) return;
    box.textContent = message;
    box.classList.add("show");
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => box.classList.remove("show"), 2400);
  }

  function buildAvatar(user, klass = "avatar") {
    if (user?.avatar) {
      return `<img class="${klass} image" src="${user.avatar}" alt="Imagen de perfil de ${escapeHTML(user.name || "usuario")}">`;
    }
    return `<div class="${klass}">${initials(user?.name || "EP")}</div>`;
  }

  function handleAvatarUpload(input, onDone) {
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast("Selecciona una imagen válida");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => onDone(reader.result);
    reader.readAsDataURL(file);
  }

  function insertLoader() {
    if (sessionStorage.getItem("eco_loader_seen")) return;

    const loader = document.createElement("div");
    loader.className = "page-loader";
    loader.innerHTML = `
      <div class="loader-inner">
        <img src="logo-eco.png" alt="Eco de los Pueblos">
        <p>Eco de los pueblos: un espacio donde el arte, la historia y las tradiciones de México cobran vida.</p>
        <div class="loader-bar"><span></span></div>
      </div>
    `;
    document.body.prepend(loader);

    window.addEventListener("load", () => {
      sessionStorage.setItem("eco_loader_seen", "true");
      setTimeout(() => loader.classList.add("hide"), 500);
      setTimeout(() => loader.remove(), 1100);
    });
  }

  function allArtworks() {
    return [...DATA.artworks, ...read(LS.localArtworks, [])];
  }

  function allArtists() {
    const localArtists = artistProfiles().map(profile => ({
      id: profile.id,
      name: profile.name,
      origin: profile.origin || "México",
      technique: profile.technique || "Arte contemporáneo",
      avatar: profile.avatar || "artista-04.svg",
      bio: profile.bio || "Artista registrado en Eco de los Pueblos."
    }));

    const localIds = new Set(localArtists.map(artist => artist.id));
    return [
      ...DATA.artists.filter(artist => !localIds.has(artist.id)),
      ...localArtists
    ];
  }

  function getArtwork(id) {
    return allArtworks().find(item => item.id === id) || allArtworks()[0];
  }

  function updateCartCount() {
    const count = read(LS.cart, []).reduce((sum, item) => sum + item.qty, 0);
    const el = $("#cartCount");
    if (el) el.textContent = count;
  }

  function updateRoleUI() {
    const user = currentUser();

    document.body.classList.remove("role-guest", "role-client", "role-artist", "role-admin");

    if (!user) document.body.classList.add("role-guest");
    else if (user.role === "admin") document.body.classList.add("role-admin");
    else if (user.role === "artista") document.body.classList.add("role-artist");
    else document.body.classList.add("role-client");
  }

  function updateAccountNav() {
    const user = currentUser();
    const link = $(".nav-account");
    if (link) link.textContent = user ? `${initials(user.name)} · Cuenta` : "Mi cuenta";
  }

  function setActiveNav() {
    const file = location.pathname.split("/").pop().replace(".html", "") || "index";
    $$("[data-nav]").forEach(link => {
      const nav = link.getAttribute("data-nav");
      link.classList.toggle("active", nav === file);
      if (file === "producto" && nav === "catalogo") link.classList.add("active");
    });
  }

  function favorites() {
    return read(LS.favorites, []);
  }

  function toggleFavorite(id) {
    const fav = favorites();
    const exists = fav.includes(id);
    const next = exists ? fav.filter(x => x !== id) : [...fav, id];
    save(LS.favorites, next);
    toast(exists ? "Quitado de favoritos" : "Guardado en favoritos");
    renderCurrentPage();
  }

  function addToCart(id, qty = 1) {
    const user = currentUser();
    if (user?.role === "admin") {
      toast("El administrador no realiza compras desde este panel");
      return;
    }

    const artwork = getArtwork(id);
    if (!artwork) return;

    const cart = read(LS.cart, []);
    const item = cart.find(row => row.id === id);
    if (item) item.qty += qty;
    else cart.push({ id, qty });

    save(LS.cart, cart);
    updateCartCount();
    toast("Obra agregada al carrito");
  }

  function artworkCard(item) {
    const fav = favorites().includes(item.id);
    const isSoldOut = Number(item.stock || 0) <= 0;

    return `
      <article class="art-card motion-card ${isSoldOut ? "sold-out" : ""}">
        <a class="art-image" href="producto.html?id=${encodeURIComponent(item.id)}">
          <img src="${item.image}" alt="${escapeHTML(item.title)}">
          <span class="art-badge">${escapeHTML(item.category)}</span>
        </a>

        <button class="fav-button ${fav ? "active" : ""}" type="button" data-favorite="${item.id}" aria-label="Guardar favorito">
          ${fav ? "♥" : "♡"}
        </button>

        <div class="art-body">
          <div class="art-meta">
            <span>${escapeHTML(item.technique)}</span>
            <span>${item.certificate ? "Certificado" : "Sin certificado"}</span>
          </div>

          <h3><a href="producto.html?id=${encodeURIComponent(item.id)}">${escapeHTML(item.title)}</a></h3>
          <p>${escapeHTML(item.artistName)} · ${escapeHTML(item.origin)}</p>

          <div class="art-footer">
            <strong>${money.format(item.price)}</strong>
            <button class="small-cart" type="button" data-add="${item.id}" ${isSoldOut ? "disabled" : ""}>
              ${isSoldOut ? "Agotada" : "Agregar"}
            </button>
          </div>
        </div>
      </article>
    `;
  }

  document.addEventListener("click", event => {
    const add = event.target.closest("[data-add]");
    if (add) addToCart(add.getAttribute("data-add"));

    const fav = event.target.closest("[data-favorite]");
    if (fav) toggleFavorite(fav.getAttribute("data-favorite"));

    const remove = event.target.closest("[data-remove]");
    if (remove) removeCartItem(remove.getAttribute("data-remove"));

    const qty = event.target.closest("[data-qty]");
    if (qty) changeQty(qty.getAttribute("data-qty"), Number(qty.dataset.delta));

    const del = event.target.closest("[data-delete-local]");
    if (del) deleteLocalArtwork(del.getAttribute("data-delete-local"));

    const accountTab = event.target.closest("[data-account-tab]");
    if (accountTab) setAccountTab(accountTab.getAttribute("data-account-tab"));

    const adminTab = event.target.closest("[data-admin-tab]");
    if (adminTab) setAdminTab(adminTab.getAttribute("data-admin-tab"));
  });

  function renderFeatured() {
    const grid = $("#featuredGrid");
    if (!grid) return;

    const items = allArtworks().filter(item => item.featured).slice(0, 6);
    grid.innerHTML = items.map(artworkCard).join("");
  }

  function uniqueValues(field) {
    return [...new Set(allArtworks().map(item => item[field]).filter(Boolean))].sort();
  }

  function fillSelect(select, values) {
    if (!select || select.dataset.ready) return;

    values.forEach(value => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });

    select.dataset.ready = "true";
  }

  function resetExploreFilters(clearSearch = true) {
    ["#categoryFilter", "#artistFilter", "#techniqueFilter", "#originFilter"].forEach(selector => {
      const input = $(selector);
      if (input) input.value = "all";
    });

    if (clearSearch && $("#searchInput")) $("#searchInput").value = "";
    if ($("#minPriceFilter")) $("#minPriceFilter").value = "";
    if ($("#maxPriceFilter")) $("#maxPriceFilter").value = "";
    if ($("#sortFilter")) $("#sortFilter").value = "featured";
    if ($("#certificateFilter")) $("#certificateFilter").checked = false;
    if ($("#availableFilter")) $("#availableFilter").checked = false;
    if ($("#newFilter")) $("#newFilter").checked = false;

    const quickBox = $("#exploreQuickFilters");
    if (quickBox) {
      $$(".quick-filter", quickBox).forEach(btn => btn.classList.remove("active"));
      $("[data-quick='all']", quickBox)?.classList.add("active");
    }
  }

  function initFilters() {
    const grid = $("#catalogGrid");
    if (!grid) return;

    fillSelect($("#categoryFilter"), DATA.categories.map(c => c.name));
    fillSelect($("#artistFilter"), [...new Set(allArtworks().map(item => item.artistName).filter(Boolean))].sort());
    fillSelect($("#techniqueFilter"), uniqueValues("technique"));
    fillSelect($("#originFilter"), uniqueValues("origin"));

    const total = $("#exploreTotalArtworks");
    if (total) total.textContent = allArtworks().length;

    const params = new URLSearchParams(location.search);
    const initialCategory = params.get("categoria");
    const initialArtist = params.get("artista");
    if (initialCategory && $("#categoryFilter")) $("#categoryFilter").value = initialCategory;
    if (initialArtist && $("#artistFilter")) $("#artistFilter").value = initialArtist;

    [
      "#searchInput", "#categoryFilter", "#artistFilter", "#techniqueFilter", "#originFilter",
      "#minPriceFilter", "#maxPriceFilter", "#sortFilter", "#certificateFilter", "#availableFilter", "#newFilter"
    ].forEach(selector => {
      const input = $(selector);
      if (!input) return;
      input.addEventListener("input", renderCatalog);
      input.addEventListener("change", renderCatalog);
    });

    $("#heroSearchButton")?.addEventListener("click", renderCatalog);
    $("#clearFilters")?.addEventListener("click", () => {
      resetExploreFilters(true);
      renderCatalog();
    });

    const quickBox = $("#exploreQuickFilters");
    if (quickBox) {
      quickBox.addEventListener("click", event => {
        const button = event.target.closest(".quick-filter");
        if (!button) return;

        resetExploreFilters(false);
        $$(".quick-filter", quickBox).forEach(btn => btn.classList.remove("active"));
        button.classList.add("active");

        const category = button.dataset.category;
        const quick = button.dataset.quick;

        if (category && $("#categoryFilter")) $("#categoryFilter").value = category;
        if (quick === "certificate" && $("#certificateFilter")) $("#certificateFilter").checked = true;
        if (quick === "recent") {
          if ($("#newFilter")) $("#newFilter").checked = true;
          if ($("#sortFilter")) $("#sortFilter").value = "recent";
        }

        renderCatalog();
      });
    }

    renderCatalog();
  }

  function getFilters() {
    return {
      q: ($("#searchInput")?.value || "").trim().toLowerCase(),
      category: $("#categoryFilter")?.value || "all",
      artist: $("#artistFilter")?.value || "all",
      technique: $("#techniqueFilter")?.value || "all",
      origin: $("#originFilter")?.value || "all",
      minPrice: Number($("#minPriceFilter")?.value || 0),
      maxPrice: Number($("#maxPriceFilter")?.value || 0),
      sort: $("#sortFilter")?.value || "featured",
      certificate: Boolean($("#certificateFilter")?.checked),
      available: Boolean($("#availableFilter")?.checked),
      recentOnly: Boolean($("#newFilter")?.checked)
    };
  }

  function applyFilters(items, filters) {
    let result = [...items];

    if (filters.q) {
      result = result.filter(item => {
        const haystack = [
          item.title, item.artistName, item.category, item.technique, item.origin,
          item.description, ...(item.tags || [])
        ].join(" ").toLowerCase();
        return haystack.includes(filters.q);
      });
    }

    if (filters.category !== "all") result = result.filter(item => item.category === filters.category);
    if (filters.artist !== "all") result = result.filter(item => item.artistName === filters.artist);
    if (filters.technique !== "all") result = result.filter(item => item.technique === filters.technique);
    if (filters.origin !== "all") result = result.filter(item => item.origin === filters.origin);
    if (filters.certificate) result = result.filter(item => item.certificate);
    if (filters.available) result = result.filter(item => Number(item.stock || 0) > 0);
    if (filters.recentOnly) result = result.filter(item => Number(item.year || 0) >= new Date().getFullYear() - 1);
    if (filters.minPrice) result = result.filter(item => item.price >= filters.minPrice);
    if (filters.maxPrice) result = result.filter(item => item.price <= filters.maxPrice);

    const sorters = {
      featured: (a, b) => Number(b.featured) - Number(a.featured) || b.year - a.year,
      priceAsc: (a, b) => a.price - b.price,
      priceDesc: (a, b) => b.price - a.price,
      recent: (a, b) => b.year - a.year,
      az: (a, b) => a.title.localeCompare(b.title, "es")
    };

    return result.sort(sorters[filters.sort] || sorters.featured);
  }

  function renderActiveChips(filters) {
    const box = $("#activeChips");
    if (!box) return;

    const chips = [];
    if (filters.q) chips.push(`Búsqueda: ${filters.q}`);
    ["category", "artist", "technique", "origin"].forEach(key => {
      if (filters[key] && filters[key] !== "all") chips.push(filters[key]);
    });
    if (filters.minPrice) chips.push(`Desde ${money.format(filters.minPrice)}`);
    if (filters.maxPrice) chips.push(`Hasta ${money.format(filters.maxPrice)}`);
    if (filters.certificate) chips.push("Con certificado");
    if (filters.available) chips.push("Disponibles");
    if (filters.recentOnly) chips.push("Recientes");

    box.innerHTML = chips.length
      ? chips.map(chip => `<span>${escapeHTML(chip)}</span>`).join("")
      : `<span>Sin filtros activos</span>`;
  }

  function renderCatalog() {
    const grid = $("#catalogGrid");
    if (!grid) return;

    const filters = getFilters();
    const results = applyFilters(allArtworks(), filters);

    grid.innerHTML = results.map(artworkCard).join("");
    $("#resultCount").textContent = `${results.length} ${results.length === 1 ? "obra" : "obras"}`;

    const insight = $("#exploreInsight");
    if (insight) {
      const certified = results.filter(item => item.certificate).length;
      const available = results.filter(item => Number(item.stock || 0) > 0).length;
      insight.textContent = results.length
        ? `Mostrando ${results.length} obras. ${certified} con certificado y ${available} disponibles para compra.`
        : "No hay resultados con esta combinación. Limpia filtros o cambia la búsqueda.";
    }

    $("#emptyState")?.classList.toggle("visible", results.length === 0);
    renderActiveChips(filters);
  }

  function initProduct() {
    if (!$("#productPage")) return;

    const params = new URLSearchParams(location.search);
    const item = getArtwork(params.get("id") || "obra-05");
    if (!item) return;

    document.title = `${item.title} | Eco de los Pueblos`;

    $("#productImage").src = item.image;
    $("#productImage").alt = item.title;
    $("#productCategory").textContent = item.category;
    $("#productCertificate").textContent = item.certificate ? "Certificado" : "Sin certificado";
    $("#productOrigin").textContent = item.origin;
    $("#productTitle").textContent = `“${item.title}”`;
    $("#productArtist").textContent = `${item.artistName} · ${item.technique}`;
    $("#productDescription").textContent = item.description;
    $("#productPrice").textContent = money.format(item.price);

    const fav = favorites().includes(item.id);
    $("#productFavorite").textContent = fav ? "♥ Guardado" : "♡ Guardar";
    $("#productFavorite").classList.toggle("active", fav);
    $("#productFavorite").onclick = () => toggleFavorite(item.id);

    $("#productDetails").innerHTML = `
      <div><span>Año</span><strong>${item.year}</strong></div>
      <div><span>Medidas</span><strong>${escapeHTML(item.dimensions)}</strong></div>
      <div><span>Disponibles</span><strong>${item.stock}</strong></div>
      <div><span>Categoría</span><strong>${escapeHTML(item.category)}</strong></div>
    `;

    $("#addToCart").onclick = () => addToCart(item.id);
    $("#buyNow").onclick = () => {
      addToCart(item.id);
      if (currentUser()?.role !== "admin") location.href = "carrito.html";
    };

    const similar = allArtworks()
      .filter(other => other.id !== item.id && (other.category === item.category || other.artistId === item.artistId))
      .slice(0, 3);

    $("#similarGrid").innerHTML = similar.map(artworkCard).join("");
  }

  function initArtists() {
    const grid = $("#artistGrid");
    if (!grid) return;

    const render = () => {
      const q = ($("#artistSearch")?.value || "").toLowerCase();
      const artists = allArtists().filter(artist => {
        const haystack = [artist.name, artist.origin, artist.technique, artist.bio].join(" ").toLowerCase();
        return haystack.includes(q);
      });

      grid.innerHTML = artists.map(artist => {
        const count = allArtworks().filter(item => item.artistId === artist.id || item.artistName === artist.name).length;
        return `
          <article class="artist-card motion-card">
            <img src="${artist.avatar}" alt="${escapeHTML(artist.name)}">
            <div>
              <span class="pill small">${escapeHTML(artist.origin)}</span>
              <h2>${escapeHTML(artist.name)}</h2>
              <p>${escapeHTML(artist.bio)}</p>
              <div class="artist-data">
                <span>${escapeHTML(artist.technique)}</span>
                <span>${count} obras</span>
              </div>
              <a class="btn btn-soft" href="catalogo.html?artista=${encodeURIComponent(artist.name)}">Ver obras</a>
            </div>
          </article>
        `;
      }).join("");
    };

    $("#artistSearch")?.addEventListener("input", render);
    render();
  }

  function cartRows() {
    return read(LS.cart, []).map(row => ({ ...row, artwork: getArtwork(row.id) })).filter(row => row.artwork);
  }

  function renderCartSummary(rows) {
    const box = $("#cartSummary");
    if (!box) return;

    const subtotal = rows.reduce((sum, row) => sum + row.artwork.price * row.qty, 0);
    const shipping = subtotal ? 350 : 0;
    const protection = subtotal ? 250 : 0;
    const total = subtotal + shipping + protection;

    box.innerHTML = `
      <div><span>Subtotal</span><strong>${money.format(subtotal)}</strong></div>
      <div><span>Envío estimado</span><strong>${money.format(shipping)}</strong></div>
      <div><span>Protección de obra</span><strong>${money.format(protection)}</strong></div>
      <div class="total"><span>Total</span><strong>${money.format(total)}</strong></div>
    `;
  }

  function renderCart() {
    const box = $("#cartItems");
    if (!box) return;

    const rows = cartRows();

    if (!rows.length) {
      box.innerHTML = `
        <div class="empty-state visible">
          <h3>Tu carrito está vacío</h3>
          <p>Explora el catálogo y agrega una obra.</p>
          <a class="btn btn-primary" href="catalogo.html">Explorar obras</a>
        </div>
      `;
    } else {
      box.innerHTML = rows.map(row => `
        <article class="cart-row motion-card">
          <img src="${row.artwork.image}" alt="${escapeHTML(row.artwork.title)}">
          <div>
            <h3>${escapeHTML(row.artwork.title)}</h3>
            <p>${escapeHTML(row.artwork.artistName)} · ${escapeHTML(row.artwork.category)}</p>
            <strong>${money.format(row.artwork.price)}</strong>
          </div>

          <div class="qty-control">
            <button type="button" data-qty="${row.id}" data-delta="-1">−</button>
            <span>${row.qty}</span>
            <button type="button" data-qty="${row.id}" data-delta="1">+</button>
          </div>

          <button class="remove-btn" type="button" data-remove="${row.id}">Eliminar</button>
        </article>
      `).join("");
    }

    renderCartSummary(rows);
  }

  function changeQty(id, delta) {
    const cart = read(LS.cart, []);
    const item = cart.find(row => row.id === id);
    if (!item) return;

    item.qty += delta;
    save(LS.cart, cart.filter(row => row.qty > 0));
    updateCartCount();
    renderCart();
  }

  function removeCartItem(id) {
    save(LS.cart, read(LS.cart, []).filter(row => row.id !== id));
    updateCartCount();
    renderCart();
    toast("Obra eliminada del carrito");
  }

  function prefillCheckoutForm() {
    const form = $("#checkoutForm");
    const user = currentUser();
    if (!form || !user) return;

    const shipping = user.shipping || {};
    if (form.elements.name) form.elements.name.value = shipping.name || user.name || "";
    if (form.elements.phone) form.elements.phone.value = shipping.phone || user.phone || "";
    if (form.elements.zip) form.elements.zip.value = shipping.zip || user.zip || "";
    if (form.elements.address) form.elements.address.value = shipping.address || user.address || "";
  }

  function initCart() {
    if (!$("#checkoutForm")) return;

    const user = currentUser();
    if (user?.role === "admin") {
      $("#checkoutForm").closest(".checkout-panel").innerHTML = `
        <h2>Modo administrador</h2>
        <p>El administrador no realiza compras. Usa el panel administrador para revisar usuarios, artistas y pedidos.</p>
        <a class="btn btn-primary full" href="admin.html">Abrir panel administrador</a>
      `;
    }

    $("#emptyCart")?.addEventListener("click", () => {
      save(LS.cart, []);
      updateCartCount();
      renderCart();
    });

    $("#checkoutForm")?.addEventListener("submit", event => {
      event.preventDefault();

      const rows = cartRows();
      if (!rows.length) {
        toast("Agrega al menos una obra antes de comprar");
        return;
      }

      const user = currentUser();
      if (user?.role === "admin") {
        toast("El administrador no puede comprar desde esta vista");
        return;
      }

      const form = new FormData(event.target);
      const data = Object.fromEntries(form.entries());
      const subtotal = rows.reduce((sum, row) => sum + row.artwork.price * row.qty, 0);
      const total = subtotal + 600;
      const code = `EP-${Date.now().toString().slice(-6)}`;

      const order = {
        code,
        createdAt: new Date().toISOString(),
        monthKey: new Date().toISOString().slice(0, 7),
        customerId: user?.id || null,
        customerName: data.name || user?.name || "Cliente sin cuenta",
        customerEmail: user?.email || "",
        customerPhone: data.phone || user?.phone || "",
        shipping: {
          name: data.name || "",
          phone: data.phone || "",
          zip: data.zip || "",
          address: data.address || ""
        },
        items: rows.map(row => ({
          id: row.id,
          qty: row.qty,
          title: row.artwork.title,
          price: row.artwork.price,
          artistId: row.artwork.artistId || "",
          artistName: row.artwork.artistName || "Artista"
        })),
        total,
        status: 2
      };

      save(LS.orders, [order, ...read(LS.orders, [])]);

      if (user) {
        const updated = {
          ...user,
          phone: data.phone || user.phone || "",
          shipping: {
            name: data.name || user.name || "",
            phone: data.phone || user.phone || "",
            zip: data.zip || "",
            address: data.address || ""
          }
        };
        syncCurrentUser(updated);
      }

      save(LS.cart, []);
      updateCartCount();
      renderCart();

      $("#orderSuccess").innerHTML = `
        <div class="success-card">
          <h3>Compra simulada generada</h3>
          <p>Tu código de pedido es:</p>
          <strong>${code}</strong>
          <a class="btn btn-primary full" href="envios.html?pedido=${encodeURIComponent(code)}">Rastrear pedido</a>
        </div>
      `;

      event.target.reset();
      prefillCheckoutForm();
      toast("Pedido creado correctamente");
    });

    renderCart();
    prefillCheckoutForm();
  }

  function renderRecentOrders() {
    const box = $("#recentOrders");
    if (!box) return;

    const orders = read(LS.orders, []).slice(0, 5);
    box.innerHTML = orders.length
      ? `
        <h3>Pedidos recientes</h3>
        ${orders.map(order => `<button type="button" data-track="${order.code}">${order.code} · ${money.format(order.total)}</button>`).join("")}
      `
      : `<p>Aún no hay pedidos guardados.</p>`;

    $$("[data-track]", box).forEach(button => {
      button.addEventListener("click", () => {
        $("#trackingCode").value = button.dataset.track;
        renderTracking(button.dataset.track);
      });
    });
  }

  function renderTracking(code) {
    const box = $("#trackingResult");
    if (!box) return;

    const order = read(LS.orders, []).find(item => item.code.toLowerCase() === String(code).toLowerCase());
    if (!order) {
      box.innerHTML = `
        <div class="empty-state visible">
          <h3>Pedido no encontrado</h3>
          <p>Revisa el código o genera una compra desde el carrito.</p>
        </div>
      `;
      return;
    }

    const steps = ["Pedido confirmado", "Obra protegida", "En camino", "Entregado"];

    box.innerHTML = `
      <div class="tracking-card motion-card">
        <span class="pill small">Pedido ${order.code}</span>
        <h2>${money.format(order.total)}</h2>
        <p>${new Date(order.createdAt).toLocaleString("es-MX")}</p>

        <div class="timeline">
          ${steps.map((step, index) => `
            <div class="timeline-item ${index <= order.status ? "done" : ""}">
              <span>${index <= order.status ? "✓" : index + 1}</span>
              <div>
                <h3>${step}</h3>
                <p>${index <= order.status ? "Completado" : "Pendiente"}</p>
              </div>
            </div>
          `).join("")}
        </div>

        <div class="order-items">
          ${order.items.map(item => `<span>${item.qty} × ${escapeHTML(item.title)}</span>`).join("")}
        </div>
      </div>
    `;
  }

  function initTracking() {
    if (!$("#trackingForm")) return;

    const params = new URLSearchParams(location.search);
    const code = params.get("pedido");
    if (code) {
      $("#trackingCode").value = code;
      renderTracking(code);
    }

    $("#trackingForm").addEventListener("submit", event => {
      event.preventDefault();
      renderTracking($("#trackingCode").value.trim());
    });

    renderRecentOrders();
  }

  function loginUser(email, password) {
    const user = findUserByEmail(email);
    if (!user || user.password !== password) {
      toast("Correo o contraseña incorrectos");
      return false;
    }

    save(LS.currentUser, user);
    updateRoleUI();
    updateAccountNav();
    toast(`Bienvenido, ${user.name}`);
    renderAccount();
    initAdmin();
    return true;
  }

  function demoLogin(role) {
    const user = users().find(item => item.role === role);
    if (!user) return;
    save(LS.currentUser, user);
    updateRoleUI();
    updateAccountNav();
    toast(`Entraste como ${role}`);
    renderAccount();
    initAdmin();
  }

  let currentAccountTab = "perfil";

  function renderAccount() {
    const box = $("#accountState");
    if (!box) return;

    const user = currentUser();

    if (!user) {
      box.innerHTML = `
        <div class="account-access">
          <section class="account-login motion-card">
            <span class="pill small">Acceso</span>
            <h2>Iniciar sesión</h2>
            <p>Entra con una cuenta existente o usa una cuenta demo para presentación.</p>

            <form id="loginForm" class="login-form">
              <label>Correo electrónico
                <input name="email" type="email" placeholder="correo@ejemplo.com" required>
              </label>

              <label>Contraseña
                <input name="password" type="password" placeholder="••••••••" required>
              </label>

              <button class="btn btn-primary full" type="submit">Iniciar sesión</button>
            </form>

            <div class="demo-logins">
              <button type="button" data-demo-login="cliente">Demo cliente</button>
              <button type="button" data-demo-login="artista">Demo artista</button>
              <button type="button" data-demo-login="admin">Demo admin</button>
            </div>
          </section>

          <section class="account-choice motion-card">
            <span class="pill small">Registro</span>
            <h2>Crear cuenta</h2>
            <p>Elige el tipo de acceso según tu función dentro de la galería.</p>
            <a class="btn btn-primary full" href="registro-usuario.html">Crear cuenta de cliente</a>
            <a class="btn btn-soft full" href="registro-artista.html">Crear cuenta de artista</a>
          </section>
        </div>
      `;

      $("#loginForm").addEventListener("submit", event => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.target).entries());
        loginUser(data.email, data.password);
      });

      $$("[data-demo-login]").forEach(button => {
        button.addEventListener("click", () => demoLogin(button.dataset.demoLogin));
      });

      return;
    }

    const orders = read(LS.orders, []);
    const myOrders = user.role === "admin"
      ? orders
      : orders.filter(order => order.customerId === user.id || normalizeEmail(order.customerEmail) === normalizeEmail(user.email));

    const favItems = favorites().map(getArtwork).filter(Boolean);
    const isArtist = user.role === "artista";
    const isAdmin = user.role === "admin";

    box.innerHTML = `
      <div class="dashboard">
        <aside class="profile-card motion-card">
          <div class="avatar-slot">${buildAvatar(user)}</div>
          <h2>${escapeHTML(user.name)}</h2>
          <p>${escapeHTML(user.email)}</p>
          <span class="role-badge ${user.role}">${roleLabel(user.role)}</span>

          <label class="avatar-upload">
            <input id="accountAvatarInput" type="file" accept="image/*">
            Subir imagen de perfil
          </label>

          <button class="btn btn-soft full" id="logoutBtn" type="button">Cerrar sesión local</button>
        </aside>

        <section class="dashboard-main">
          <div class="stat-grid">
            <article class="motion-card"><span>${myOrders.length}</span><p>Pedidos</p></article>
            <article class="motion-card"><span>${favItems.length}</span><p>Favoritos</p></article>
            <article class="motion-card"><span>${cartRows().length}</span><p>En carrito</p></article>
          </div>

          <div class="account-tabs">
            <button data-account-tab="perfil" type="button">Perfil</button>
            <button data-account-tab="envio" type="button">Datos de envío</button>
            <button data-account-tab="pedidos" type="button">Pedidos</button>
            <button data-account-tab="favoritos" type="button">Favoritos</button>
            ${isArtist ? '<button data-account-tab="artista" type="button">Perfil artista</button>' : ""}
            ${isAdmin ? '<button data-account-tab="admin" type="button">Administración</button>' : ""}
          </div>

          <div class="tab-content" id="accountTabContent"></div>
        </section>
      </div>
    `;

    $("#logoutBtn").onclick = () => {
      localStorage.removeItem(LS.currentUser);
      toast("Sesión cerrada");
      updateRoleUI();
      updateAccountNav();
      renderAccount();
    };

    $("#accountAvatarInput")?.addEventListener("change", event => {
      handleAvatarUpload(event.target, dataUrl => {
        const updated = { ...currentUser(), avatar: dataUrl };
        syncCurrentUser(updated);

        if (updated.role === "artista") {
          const profiles = artistProfiles();
          const index = profiles.findIndex(profile => profile.userId === updated.id || normalizeEmail(profile.email) === normalizeEmail(updated.email));
          if (index >= 0) {
            profiles[index] = { ...profiles[index], avatar: dataUrl };
            setArtistProfiles(profiles);
          }
        }

        toast("Imagen de perfil actualizada");
        updateAccountNav();
        renderAccount();
        renderCurrentPage();
      });
    });

    setAccountTab(currentAccountTab);
  }

  function roleLabel(role) {
    if (role === "admin") return "Administrador";
    if (role === "artista") return "Artista";
    return "Cliente";
  }

  function setAccountTab(tab) {
    currentAccountTab = tab;

    const box = $("#accountTabContent");
    if (!box) return;

    const user = currentUser() || {};
    $$(".account-tabs button").forEach(button => {
      button.classList.toggle("active", button.dataset.accountTab === tab);
    });

    const allOrders = read(LS.orders, []);
    const myOrders = user.role === "admin"
      ? allOrders
      : allOrders.filter(order => order.customerId === user.id || normalizeEmail(order.customerEmail) === normalizeEmail(user.email));

    const favItems = favorites().map(getArtwork).filter(Boolean);
    const artist = artistProfiles().find(profile => profile.userId === user.id || normalizeEmail(profile.email) === normalizeEmail(user.email));

    if (tab === "perfil") {
      box.innerHTML = `
        <div class="info-card motion-card">
          <h3>Datos personales</h3>
          <form id="profileEdit" class="mini-form">
            <label>Nombre
              <input name="name" value="${escapeHTML(user.name || "")}" required>
            </label>
            <label>Correo
              <input name="email" value="${escapeHTML(user.email || "")}" required>
            </label>
            <label>Teléfono
              <input name="phone" value="${escapeHTML(user.phone || "")}">
            </label>
            <label>Rol
              <input value="${roleLabel(user.role)}" disabled>
            </label>
            <button class="btn btn-primary" type="submit">Guardar cambios</button>
          </form>
        </div>
      `;

      $("#profileEdit").onsubmit = event => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.target).entries());
        const updated = { ...user, ...data };
        syncCurrentUser(updated);
        toast("Perfil actualizado");
        updateAccountNav();
        renderAccount();
      };
    }

    if (tab === "envio") {
      const shipping = user.shipping || {};
      box.innerHTML = `
        <div class="info-card motion-card">
          <h3>Datos de envío</h3>
          <p>Estos datos se rellenarán automáticamente cuando finalices una compra.</p>

          <form id="shippingEdit" class="mini-form">
            <label>Nombre de quien recibe
              <input name="name" value="${escapeHTML(shipping.name || user.name || "")}" required>
            </label>
            <label>Teléfono
              <input name="phone" value="${escapeHTML(shipping.phone || user.phone || "")}" required>
            </label>
            <label>Código postal
              <input name="zip" value="${escapeHTML(shipping.zip || "")}" required>
            </label>
            <label>Domicilio completo
              <input name="address" value="${escapeHTML(shipping.address || "")}" required>
            </label>
            <label>Ciudad / Estado
              <input name="city" value="${escapeHTML(shipping.city || "")}">
            </label>
            <label>Referencias
              <input name="references" value="${escapeHTML(shipping.references || "")}">
            </label>
            <button class="btn btn-primary" type="submit">Guardar datos de envío</button>
          </form>
        </div>
      `;

      $("#shippingEdit").onsubmit = event => {
        event.preventDefault();
        const shippingData = Object.fromEntries(new FormData(event.target).entries());
        const updated = { ...user, phone: shippingData.phone || user.phone, shipping: shippingData };
        syncCurrentUser(updated);
        toast("Datos de envío guardados");
        renderAccount();
      };
    }

    if (tab === "pedidos") {
      box.innerHTML = myOrders.length
        ? `
          <div class="order-list">
            ${myOrders.map(order => `
              <a href="envios.html?pedido=${order.code}">
                <strong>${order.code}</strong>
                <span>${money.format(order.total)}</span>
                <small>${new Date(order.createdAt).toLocaleDateString("es-MX")}</small>
              </a>
            `).join("")}
          </div>
        `
        : `<div class="empty-state visible"><h3>No tienes pedidos</h3><p>Cuando compres una obra aparecerá aquí.</p></div>`;
    }

    if (tab === "favoritos") {
      box.innerHTML = favItems.length
        ? `<div class="art-grid compact">${favItems.map(artworkCard).join("")}</div>`
        : `<div class="empty-state visible"><h3>Sin favoritos</h3><p>Guarda obras desde el catálogo con el botón de corazón.</p></div>`;
    }

    if (tab === "artista") {
      box.innerHTML = artist
        ? `
          <div class="info-card motion-card">
            <div class="artist-account-header">
              <div class="avatar-slot small">${buildAvatar(artist, "avatar small")}</div>
              <div>
                <h3>${escapeHTML(artist.name)}</h3>
                <p>${escapeHTML(artist.origin)} · ${escapeHTML(artist.technique)}</p>
              </div>
            </div>

            <p>${escapeHTML(artist.bio || "")}</p>

            <label class="avatar-upload inline-upload">
              <input id="artistAvatarInput" type="file" accept="image/*">
              Cambiar logo / imagen del artista
            </label>

            <a class="btn btn-primary" href="panel-artista.html">Abrir panel de artista</a>
          </div>
        `
        : `<div class="info-card motion-card"><h3>Perfil de artista no encontrado</h3></div>`;

      $("#artistAvatarInput")?.addEventListener("change", event => {
        handleAvatarUpload(event.target, dataUrl => {
          const profiles = artistProfiles();
          const index = profiles.findIndex(profile => profile.userId === user.id || normalizeEmail(profile.email) === normalizeEmail(user.email));
          if (index >= 0) {
            profiles[index] = { ...profiles[index], avatar: dataUrl };
            setArtistProfiles(profiles);
          }

          const updated = { ...user, avatar: dataUrl };
          syncCurrentUser(updated);
          toast("Imagen del artista actualizada");
          renderAccount();
          renderCurrentPage();
        });
      });
    }

    if (tab === "admin") {
      box.innerHTML = `
        <div class="info-card motion-card">
          <h3>Panel administrador</h3>
          <p>Desde aquí puedes consultar usuarios, clientes, artistas, pedidos y abrir WhatsApp Web para comunicarte.</p>
          <a class="btn btn-primary" href="admin.html">Abrir panel administrador</a>
        </div>
      `;
    }
  }

  function initRegisterForms() {
    const userForm = $("#userRegisterForm");
    if (userForm) {
      userForm.addEventListener("submit", event => {
        event.preventDefault();

        const data = Object.fromEntries(new FormData(userForm).entries());
        if (findUserByEmail(data.email)) {
          toast("Ese correo ya está registrado");
          return;
        }

        const user = {
          id: uid("cliente"),
          role: "cliente",
          name: data.name,
          email: data.email,
          password: data.password,
          phone: data.phone,
          avatar: null,
          createdAt: new Date().toISOString(),
          shipping: {
            name: data.name,
            phone: data.phone,
            zip: data.zip,
            address: data.address || ""
          }
        };

        syncCurrentUser(user);
        toast("Cuenta de cliente creada");
        setTimeout(() => location.href = "cuenta.html", 500);
      });
    }

    const artistForm = $("#artistRegisterForm");
    if (artistForm) {
      artistForm.addEventListener("submit", event => {
        event.preventDefault();

        const data = Object.fromEntries(new FormData(artistForm).entries());
        if (findUserByEmail(data.email)) {
          toast("Ese correo ya está registrado");
          return;
        }

        const id = uid("artista");
        const user = {
          id,
          role: "artista",
          name: data.name,
          email: data.email,
          password: data.password || "artista123",
          phone: data.phone,
          avatar: null,
          origin: data.origin,
          technique: data.technique,
          bio: data.bio,
          createdAt: new Date().toISOString(),
          shipping: {
            name: data.name,
            phone: data.phone,
            zip: "",
            address: data.origin || ""
          }
        };

        const profile = {
          id,
          userId: id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          origin: data.origin,
          technique: data.technique,
          rfc: data.rfc || "",
          studies: data.studies || "",
          bio: data.bio,
          avatar: null,
          createdAt: new Date().toISOString()
        };

        syncCurrentUser(user);
        setArtistProfiles([profile, ...artistProfiles()]);
        toast("Cuenta de artista creada");
        setTimeout(() => location.href = "cuenta.html", 500);
      });
    }
  }

  function renderArtistIntro() {
    const box = $("#artistPanelIntro");
    if (!box) return;

    const user = currentUser();
    const profile = artistProfiles().find(item => item.userId === user?.id || normalizeEmail(item.email) === normalizeEmail(user?.email));

    if (!user || user.role !== "artista" || !profile) {
      box.innerHTML = `
        <h2>Acceso para artistas</h2>
        <p>Solo las cuentas de artista pueden publicar y administrar obras.</p>
        <a class="btn btn-primary full" href="registro-artista.html">Crear cuenta de artista</a>
      `;
      return;
    }

    box.innerHTML = `
      <div class="avatar-slot">${buildAvatar(profile)}</div>
      <h2>${escapeHTML(profile.name)}</h2>
      <p>${escapeHTML(profile.origin)} · ${escapeHTML(profile.technique)}</p>
      <p>${escapeHTML(profile.bio)}</p>
      <a class="btn btn-soft full" href="catalogo.html">Ver catálogo</a>
    `;
  }

  function renderMyArtworks() {
    const grid = $("#myArtworks");
    if (!grid) return;

    const user = currentUser();
    const profile = artistProfiles().find(item => item.userId === user?.id || normalizeEmail(item.email) === normalizeEmail(user?.email));
    const local = read(LS.localArtworks, []).filter(item => !profile || item.artistId === profile.id);

    $("#myArtworkCount").textContent = `${local.length} obras`;
    grid.innerHTML = local.length
      ? local.map(item => `
        <article class="art-card motion-card">
          <a class="art-image" href="producto.html?id=${item.id}">
            <img src="${item.image}" alt="${escapeHTML(item.title)}">
            <span class="art-badge">${escapeHTML(item.category)}</span>
          </a>

          <div class="art-body">
            <h3>${escapeHTML(item.title)}</h3>
            <p>${escapeHTML(item.technique)}</p>
            <div class="art-footer">
              <strong>${money.format(item.price)}</strong>
              <button class="remove-btn" type="button" data-delete-local="${item.id}">Eliminar</button>
            </div>
          </div>
        </article>
      `).join("")
      : `<div class="empty-state visible"><h3>Aún no publicas obras</h3><p>Usa el formulario para agregar tu primera pieza.</p></div>`;
  }

  function deleteLocalArtwork(id) {
    save(LS.localArtworks, read(LS.localArtworks, []).filter(item => item.id !== id));
    renderMyArtworks();
    toast("Obra eliminada");
  }

  function initArtistPanel() {
    if (!$("#artworkForm")) return;

    renderArtistIntro();
    renderMyArtworks();

    const user = currentUser();
    if (!user || user.role !== "artista") {
      $("#artworkForm").closest(".panel-card").innerHTML = `
        <h2>Función exclusiva para artistas</h2>
        <p>Para publicar obras necesitas iniciar sesión o registrarte como artista.</p>
        <a class="btn btn-primary full" href="registro-artista.html">Crear cuenta de artista</a>
      `;
      return;
    }

    $("#artworkForm").addEventListener("submit", event => {
      event.preventDefault();

      const profile = artistProfiles().find(item => item.userId === user.id || normalizeEmail(item.email) === normalizeEmail(user.email));
      if (!profile) {
        toast("Primero registra tu perfil de artista");
        return;
      }

      const form = Object.fromEntries(new FormData(event.target).entries());
      const artwork = {
        id: uid("obra"),
        title: form.title,
        artistId: profile.id,
        artistName: profile.name,
        category: form.category,
        price: Number(form.price),
        technique: form.technique,
        dimensions: form.dimensions,
        year: new Date().getFullYear(),
        origin: form.origin,
        certificate: Boolean(form.certificate),
        stock: 1,
        featured: false,
        image: form.image,
        tags: [form.category.toLowerCase(), form.technique.toLowerCase()],
        description: form.description
      };

      save(LS.localArtworks, [artwork, ...read(LS.localArtworks, [])]);
      event.target.reset();
      renderMyArtworks();
      toast("Obra publicada en el catálogo");
    });
  }

  function monthKey(date = new Date()) {
    return date.toISOString().slice(0, 7);
  }

  function whatsappLink(phone, message = "") {
    const clean = String(phone || "").replace(/\D/g, "");
    if (!clean) return "#";
    const withCountry = clean.startsWith("52") ? clean : `52${clean}`;
    return `https://web.whatsapp.com/send?phone=${withCountry}&text=${encodeURIComponent(message)}`;
  }

  function userOrders(user) {
    const all = read(LS.orders, []);
    return all.filter(order => order.customerId === user.id || normalizeEmail(order.customerEmail) === normalizeEmail(user.email));
  }

  function artistOrders(profile) {
    return read(LS.orders, []).filter(order =>
      order.items.some(item => item.artistId === profile.id || normalizeEmail(item.artistName) === normalizeEmail(profile.name))
    );
  }

  let currentAdminTab = "resumen";

  function adminGuard() {
    return currentUser()?.role === "admin";
  }

  function initAdmin() {
    if (!$("#adminShell")) return;

    const state = $("#adminState");
    const dashboard = $("#adminDashboard");

    if (!adminGuard()) {
      if (dashboard) dashboard.style.display = "none";
      state.innerHTML = `
        <div class="access-denied motion-card">
          <h2>Acceso exclusivo para administradores</h2>
          <p>Inicia sesión como administrador para consultar usuarios, artistas, clientes y pedidos.</p>
          <a class="btn btn-primary" href="cuenta.html">Ir a iniciar sesión</a>
          <button class="btn btn-soft" type="button" id="adminDemoButton">Entrar como admin demo</button>
        </div>
      `;

      $("#adminDemoButton")?.addEventListener("click", () => demoLogin("admin"));
      return;
    }

    state.innerHTML = "";
    if (dashboard) dashboard.style.display = "grid";

    $("#adminSearch")?.addEventListener("input", renderAdminContent);
    $("#adminRoleFilter")?.addEventListener("change", renderAdminContent);

    renderAdminStats();
    setAdminTab(currentAdminTab);
  }

  function setAdminTab(tab) {
    currentAdminTab = tab;
    $$("#adminTabs button").forEach(button => {
      button.classList.toggle("active", button.dataset.adminTab === tab);
    });
    renderAdminContent();
  }

  function adminSearchText() {
    return ($("#adminSearch")?.value || "").trim().toLowerCase();
  }

  function renderAdminStats() {
    const box = $("#adminStats");
    if (!box || !adminGuard()) return;

    const allUsers = users();
    const profiles = artistProfiles();
    const orders = read(LS.orders, []);
    const currentMonth = monthKey();
    const monthOrders = orders.filter(order => order.monthKey === currentMonth || String(order.createdAt || "").startsWith(currentMonth));
    const monthTotal = monthOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);

    box.innerHTML = `
      <article class="admin-stat motion-card"><span>${allUsers.length}</span><p>Usuarios</p></article>
      <article class="admin-stat motion-card"><span>${allUsers.filter(user => user.role === "cliente").length}</span><p>Clientes</p></article>
      <article class="admin-stat motion-card"><span>${allUsers.filter(user => user.role === "artista").length}</span><p>Artistas</p></article>
      <article class="admin-stat motion-card"><span>${orders.length}</span><p>Pedidos totales</p></article>
      <article class="admin-stat motion-card"><span>${monthOrders.length}</span><p>Pedidos del mes</p></article>
      <article class="admin-stat motion-card wide"><span>${money.format(monthTotal)}</span><p>Ventas del mes</p></article>
    `;
  }

  function filterUsersForAdmin(list) {
    const q = adminSearchText();
    const role = $("#adminRoleFilter")?.value || "all";

    return list.filter(user => {
      const matchesRole = role === "all" || user.role === role;
      const haystack = [user.name, user.email, user.phone, user.role, user.shipping?.address].join(" ").toLowerCase();
      return matchesRole && (!q || haystack.includes(q));
    });
  }

  function renderAdminContent() {
    const box = $("#adminContent");
    if (!box || !adminGuard()) return;

    renderAdminStats();

    if (currentAdminTab === "resumen") {
      renderAdminResumen(box);
    }

    if (currentAdminTab === "usuarios") {
      renderAdminUsuarios(box, filterUsersForAdmin(users()));
    }

    if (currentAdminTab === "clientes") {
      renderAdminClientes(box, filterUsersForAdmin(users().filter(user => user.role === "cliente")));
    }

    if (currentAdminTab === "artistas") {
      renderAdminArtistas(box);
    }

    if (currentAdminTab === "pedidos") {
      renderAdminPedidos(box);
    }
  }

  function renderAdminResumen(box) {
    const allUsers = users();
    const orders = read(LS.orders, []);
    const latest = orders.slice(0, 5);

    box.innerHTML = `
      <div class="admin-panel-card motion-card">
        <h2>Resumen operativo</h2>
        <p>Vista general del movimiento de la plataforma.</p>

        <div class="admin-resume-grid">
          <div>
            <h3>Usuarios recientes</h3>
            ${allUsers.slice(-5).reverse().map(user => `
              <div class="admin-mini-row">
                ${buildAvatar(user, "avatar tiny")}
                <div>
                  <strong>${escapeHTML(user.name)}</strong>
                  <span>${roleLabel(user.role)} · ${escapeHTML(user.email)}</span>
                </div>
              </div>
            `).join("")}
          </div>

          <div>
            <h3>Pedidos recientes</h3>
            ${latest.length ? latest.map(order => `
              <div class="admin-mini-row">
                <div class="mini-code">${escapeHTML(order.code)}</div>
                <div>
                  <strong>${money.format(order.total)}</strong>
                  <span>${escapeHTML(order.customerName || "Cliente")} · ${new Date(order.createdAt).toLocaleDateString("es-MX")}</span>
                </div>
              </div>
            `).join("") : "<p>Aún no hay pedidos.</p>"}
          </div>
        </div>
      </div>
    `;
  }

  function renderAdminUsuarios(box, list) {
    box.innerHTML = `
      <div class="admin-panel-card motion-card">
        <h2>Usuarios registrados</h2>
        <p>Filtra por cliente, artista o administrador. Puedes abrir WhatsApp Web desde cada registro.</p>
        ${renderUserTable(list)}
      </div>
    `;
  }

  function renderUserTable(list) {
    if (!list.length) {
      return `<div class="empty-state visible"><h3>No hay usuarios con esos filtros</h3></div>`;
    }

    return `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Correo</th>
              <th>Teléfono</th>
              <th>Registro</th>
              <th>WhatsApp</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(user => `
              <tr>
                <td>
                  <div class="table-user">
                    ${buildAvatar(user, "avatar tiny")}
                    <strong>${escapeHTML(user.name)}</strong>
                  </div>
                </td>
                <td><span class="role-pill ${user.role}">${roleLabel(user.role)}</span></td>
                <td>${escapeHTML(user.email)}</td>
                <td>${escapeHTML(user.phone || "Sin teléfono")}</td>
                <td>${user.createdAt ? new Date(user.createdAt).toLocaleDateString("es-MX") : "Sin fecha"}</td>
                <td>
                  ${user.phone ? `<a class="whatsapp-btn" target="_blank" href="${whatsappLink(user.phone, `Hola ${user.name}, te contactamos de Eco de los Pueblos.`)}">WhatsApp</a>` : "Sin teléfono"}
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderAdminClientes(box, list) {
    if (!list.length) {
      box.innerHTML = `<div class="empty-state visible"><h3>No hay clientes con esos filtros</h3></div>`;
      return;
    }

    box.innerHTML = `
      <div class="admin-grid-list">
        ${list.map(client => {
          const orders = userOrders(client);
          const currentMonth = monthKey();
          const monthOrders = orders.filter(order => order.monthKey === currentMonth || String(order.createdAt || "").startsWith(currentMonth));
          const total = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);

          return `
            <article class="admin-client-card motion-card">
              <div class="admin-person-head">
                ${buildAvatar(client, "avatar small")}
                <div>
                  <h3>${escapeHTML(client.name)}</h3>
                  <p>${escapeHTML(client.email)}</p>
                  <span class="role-pill cliente">Cliente</span>
                </div>
              </div>

              <div class="admin-person-stats">
                <span><strong>${orders.length}</strong> compras</span>
                <span><strong>${monthOrders.length}</strong> este mes</span>
                <span><strong>${money.format(total)}</strong> total</span>
              </div>

              <p><strong>Envío:</strong> ${escapeHTML(client.shipping?.address || "Sin dirección guardada")}</p>

              <a class="whatsapp-btn full" target="_blank" href="${whatsappLink(client.phone, `Hola ${client.name}, te contactamos de Eco de los Pueblos sobre tus compras.`)}">Contactar por WhatsApp</a>
            </article>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderAdminArtistas(box) {
    const q = adminSearchText();
    const artistUsers = filterUsersForAdmin(users().filter(user => user.role === "artista"));

    const filteredProfiles = artistProfiles().filter(profile => {
      const haystack = [profile.name, profile.email, profile.phone, profile.origin, profile.technique, profile.bio].join(" ").toLowerCase();
      return !q || haystack.includes(q);
    });

    const merged = filteredProfiles.map(profile => {
      const user = artistUsers.find(item => item.id === profile.userId || normalizeEmail(item.email) === normalizeEmail(profile.email));
      return { profile, user };
    }).filter(item => {
      const role = $("#adminRoleFilter")?.value || "all";
      return role === "all" || role === "artista";
    });

    if (!merged.length) {
      box.innerHTML = `<div class="empty-state visible"><h3>No hay artistas con esos filtros</h3></div>`;
      return;
    }

    box.innerHTML = `
      <div class="admin-grid-list">
        ${merged.map(({ profile, user }) => {
          const orders = artistOrders(profile);
          const currentMonth = monthKey();
          const monthOrders = orders.filter(order => order.monthKey === currentMonth || String(order.createdAt || "").startsWith(currentMonth));
          const total = orders.reduce((sum, order) => {
            const artistItems = order.items.filter(item => item.artistId === profile.id || normalizeEmail(item.artistName) === normalizeEmail(profile.name));
            return sum + artistItems.reduce((itemSum, item) => itemSum + Number(item.price || 0) * Number(item.qty || 1), 0);
          }, 0);
          const works = allArtworks().filter(item => item.artistId === profile.id || normalizeEmail(item.artistName) === normalizeEmail(profile.name));

          return `
            <article class="admin-client-card motion-card">
              <div class="admin-person-head">
                ${buildAvatar(profile, "avatar small")}
                <div>
                  <h3>${escapeHTML(profile.name)}</h3>
                  <p>${escapeHTML(profile.origin || "México")} · ${escapeHTML(profile.technique || "Arte")}</p>
                  <span class="role-pill artista">Artista</span>
                </div>
              </div>

              <div class="admin-person-stats">
                <span><strong>${works.length}</strong> obras</span>
                <span><strong>${orders.length}</strong> pedidos</span>
                <span><strong>${monthOrders.length}</strong> este mes</span>
                <span><strong>${money.format(total)}</strong> vendido</span>
              </div>

              <p>${escapeHTML(profile.bio || "Sin biografía registrada.")}</p>

              <a class="whatsapp-btn full" target="_blank" href="${whatsappLink(profile.phone || user?.phone, `Hola ${profile.name}, te contactamos de Eco de los Pueblos sobre tus obras.`)}">Contactar por WhatsApp</a>
            </article>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderAdminPedidos(box) {
    const q = adminSearchText();
    let orders = read(LS.orders, []);

    if (q) {
      orders = orders.filter(order => {
        const haystack = [
          order.code, order.customerName, order.customerEmail, order.customerPhone,
          ...order.items.flatMap(item => [item.title, item.artistName])
        ].join(" ").toLowerCase();
        return haystack.includes(q);
      });
    }

    if (!orders.length) {
      box.innerHTML = `<div class="empty-state visible"><h3>No hay pedidos registrados</h3><p>Cuando se simulen compras aparecerán aquí.</p></div>`;
      return;
    }

    box.innerHTML = `
      <div class="admin-panel-card motion-card">
        <h2>Pedidos</h2>
        <p>Consulta pedidos, cliente, obras, artistas y contacto directo.</p>

        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Obras</th>
                <th>Total</th>
                <th>Fecha</th>
                <th>WhatsApp</th>
              </tr>
            </thead>

            <tbody>
              ${orders.map(order => `
                <tr>
                  <td><strong>${escapeHTML(order.code)}</strong></td>
                  <td>
                    ${escapeHTML(order.customerName || "Cliente")}<br>
                    <small>${escapeHTML(order.customerEmail || "")}</small>
                  </td>
                  <td>
                    ${order.items.map(item => `<span class="table-chip">${escapeHTML(item.title)} · ${escapeHTML(item.artistName || "Artista")}</span>`).join("")}
                  </td>
                  <td>${money.format(order.total)}</td>
                  <td>${new Date(order.createdAt).toLocaleDateString("es-MX")}</td>
                  <td>
                    ${order.customerPhone ? `<a class="whatsapp-btn" target="_blank" href="${whatsappLink(order.customerPhone, `Hola ${order.customerName}, te contactamos de Eco de los Pueblos sobre tu pedido ${order.code}.`)}">Cliente</a>` : "Sin teléfono"}
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderCurrentPage() {
    renderFeatured();
    if ($("#catalogGrid")) renderCatalog();
    if ($("#productPage")) initProduct();
    if ($("#accountState")) renderAccount();
    if ($("#artistGrid")) initArtists();
    if ($("#myArtworks")) renderMyArtworks();
    if ($("#adminShell")) renderAdminContent();
  }

  function boot() {
    seedDemoData();
    insertLoader();
    setActiveNav();
    updateCartCount();
    updateRoleUI();
    updateAccountNav();

    renderFeatured();
    initFilters();
    initProduct();
    initArtists();
    initCart();
    initTracking();
    renderAccount();
    initRegisterForms();
    initArtistPanel();
    initAdmin();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
