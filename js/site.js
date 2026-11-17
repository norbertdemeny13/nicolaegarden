(function () {
  const C = window.CATALOG;

  const NOTES = {
    "pomi-fructiferi": "Măr, păr, prun, cireș, vișin, cais, nectarin, gutui și nuc.",
    "arbusti-fructiferi": "Arbuști pentru fructe de grădină.",
    "trandafiri": "Pitici, teahibrid, urcători și pomișor.",
    "plante-ornamentale": "Arbuști decorativi și plante perene.",
    "flori-de-sezon": "Flori de primăvară, vară și toamnă.",
    "brazi-si-conifere": "Brazi, tuia și alte conifere.",
    "aranjamente": "Aranjamente cu Calluna, conifere și plante ornamentale.",
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const queryParams = () => new URLSearchParams(location.search);

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[ch]));
  }

  function fold(value) {
    return String(value || "")
      .toLowerCase()
      .replaceAll("ă", "a")
      .replaceAll("â", "a")
      .replaceAll("î", "i")
      .replaceAll("ș", "s")
      .replaceAll("ş", "s")
      .replaceAll("ț", "t")
      .replaceAll("ţ", "t");
  }

  function catById(id) {
    return C.categories.find((cat) => cat.id === id);
  }

  function catBySlug(slug) {
    return C.categories.find((cat) => cat.slug === slug);
  }

  function childrenOf(id) {
    return C.categories.filter((cat) => cat.parent === id);
  }

  function topOf(cat) {
    if (!cat || !cat.parent) return cat;
    return catById(cat.parent) || cat;
  }

  function inCategory(product, cat) {
    if (!cat) return true;
    if (cat.parent) return product.categories.includes(cat.id);
    const ids = new Set([cat.id, ...childrenOf(cat.id).map((child) => child.id)]);
    return product.categories.some((id) => ids.has(id));
  }

  function countFor(cat) {
    return C.products.filter((product) => inCategory(product, cat)).length;
  }

  function labelFor(product) {
    const cats = product.categories.map(catById).filter(Boolean);
    return cats.find((cat) => cat.parent) || cats[0];
  }

  function root() {
    return document.body.dataset.root || "";
  }

  function asset(path) {
    return `${root()}${String(path || "").replace(/^\//, "")}`;
  }

  function uniqueByPath(list) {
    const seen = new Set();
    return list.filter((product) => {
      const key = product.path || product.slug;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function plantCard(product) {
    const cat = labelFor(product);
    const href = product.path ? asset(product.path) : `produs.html?p=${encodeURIComponent(product.slug)}`;
    return `<a class="pcard" href="${href}">
      <img src="${esc(asset(product.image))}" alt="${esc(product.title)}" loading="lazy" decoding="async">
      <strong>${esc(product.title)}</strong>
      <span class="bar">${esc(cat ? cat.name : "Detalii")}</span>
    </a>`;
  }

  function setupNav() {
    const button = $(".nav-toggle");
    const nav = $("#nav");
    if (!button || !nav) return;
    button.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      button.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  function renderHome() {
    const cats = $("#category-grid");
    if (cats) {
      const tops = C.categoryOrder.map(catBySlug).filter(Boolean);
      cats.innerHTML = tops.map((cat, index) => {
        const count = countFor(cat);
        const href = cat.path ? asset(cat.path) : `catalog.html?c=${encodeURIComponent(cat.slug)}`;
        return `<a class="cat" href="${href}">
          <span class="cat-index">${String(index + 1).padStart(2, "0")}</span>
          <span class="cat-name">${esc(cat.name)}</span>
          <span class="cat-note">${count} plante · ${esc(NOTES[cat.slug] || "")}</span>
        </a>`;
      }).join("");
    }
    const featured = $("#featured-grid");
    if (featured) {
      const byId = new Map(C.products.map((product) => [product.id, product]));
      featured.innerHTML = C.featured.map((id) => byId.get(id)).filter(Boolean).map(plantCard).join("");
    }
  }

  function matchesQuery(product, query) {
    if (!query) return true;
    const hay = fold(`${product.title} ${product.text}`);
    return fold(query).split(/\s+/).every((word) => word && hay.includes(word));
  }

  function renderCatalog() {
    const grid = $("#catalog-grid");
    if (!grid) return;
    const params = queryParams();
    const selected = catBySlug(document.body.dataset.category || params.get("c") || "");
    const parent = topOf(selected);
    const pretty = Boolean(document.body.dataset.category);
    const query = pretty ? ($("#search")?.value || "").trim() : (params.get("q") || "");
    const tops = C.categoryOrder.map(catBySlug).filter(Boolean);

    const filters = $("#filters");
    const allHref = pretty || query
      ? `${asset("catalog.html")}${!pretty && query ? `?q=${encodeURIComponent(query)}` : ""}`
      : asset("catalog.html");
    filters.innerHTML = [`<a href="${allHref}" class="${selected ? "" : "is-on"}">Toate</a>`]
      .concat(tops.map((cat) => {
        const on = parent && parent.id === cat.id;
        const href = cat.path
          ? asset(cat.path)
          : `${asset("catalog.html")}?c=${encodeURIComponent(cat.slug)}${!pretty && query ? `&q=${encodeURIComponent(query)}` : ""}`;
        return `<a href="${href}" class="${on ? "is-on" : ""}">${esc(cat.name)} <span>${countFor(cat)}</span></a>`;
      })).join("");

    const sub = $("#subfilters");
    const kids = parent ? childrenOf(parent.id).filter((cat) => countFor(cat)) : [];
    sub.hidden = kids.length === 0;
    sub.innerHTML = kids.map((cat) => {
      const href = cat.path ? asset(cat.path) : `${asset("catalog.html")}?c=${encodeURIComponent(cat.slug)}`;
      const on = selected && selected.id === cat.id;
      return `<a class="chip${on ? " is-on" : ""}" href="${href}">${esc(cat.name)} ${countFor(cat)}</a>`;
    }).join("");

    const input = $("#search");
    if (input && !pretty && input.value !== query) input.value = query;

    const list = uniqueByPath(C.products.filter((product) => inCategory(product, selected) && matchesQuery(product, query)));
    $("#result-count").textContent = `${list.length} ${list.length === 1 ? "plantă" : "plante"}`;
    if (!list.length) {
      grid.innerHTML = "";
      $("#empty").hidden = false;
      return;
    }
    $("#empty").hidden = true;
    grid.classList.add("pcard-grid");
    grid.innerHTML = list.map(plantCard).join("");
    if (window.revealIn) window.revealIn(grid);
  }

  function bindSearch() {
    const input = $("#search");
    if (!input) return;
    let timer = 0;
    input.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const next = new URLSearchParams(location.search);
        const value = input.value.trim();
        if (value) next.set("q", value);
        else next.delete("q");
        if (!document.body.dataset.category) {
          const qs = next.toString();
          history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
        }
        renderCatalog();
      }, 120);
    });
  }

  function renderProduct() {
    const root = $("#product");
    if (!root) return;
    const slug = document.body.dataset.product || queryParams().get("p") || "";
    const product = C.products.find((item) => item.slug === slug);
    if (!product) {
      root.innerHTML = `<div class="empty"><h1>Planta nu este în catalog</h1><p><a href="${asset("catalog.html")}">Înapoi la catalog</a></p></div>`;
      return;
    }
    document.title = `${product.title} | Nicolae Garden`;
    const cat = labelFor(product);
    const parent = topOf(cat);
    const paragraphs = product.text.split("\n").filter(Boolean).map((line) => `<p>${esc(line)}</p>`).join("");
    const crumbs = [`<a href="${asset("index.html")}">Acasă</a>`];
    if (parent && parent.path) crumbs.push(`<a href="${asset(parent.path)}">${esc(parent.name)}</a>`);
    if (cat && parent && cat.id !== parent.id && cat.path) crumbs.push(`<a href="${asset(cat.path)}">${esc(cat.name)}</a>`);
    const crumb = crumbs.join(" / ");
    const photos = (product.images && product.images.length ? product.images : [product.image]).filter(Boolean);
    const thumbs = photos.length > 1
      ? `<div class="product-thumbs">${photos.map((src, index) => (
        `<button type="button" class="${index === 0 ? "is-on" : ""}" data-photo="${esc(asset(src))}" aria-label="Fotografia ${index + 1}"><img src="${esc(asset(src))}" alt="" loading="lazy" decoding="async"></button>`
      )).join("")}</div>`
      : "";
    root.innerHTML = `
      <figure class="product-photo">
        <img id="product-main" src="${esc(asset(photos[0]))}" alt="${esc(product.title)}" fetchpriority="high">
        ${thumbs}
      </figure>
      <article>
        <p class="crumb">${crumb}</p>
        <h1>${esc(product.title)}</h1>
        <div class="body">${paragraphs}</div>
        <p class="note">Disponibil în pepinieră. Prețul se stabilește la fața locului. Nu vindem online.</p>
        <p class="product-cta">
          <a class="btn btn-dark" href="https://wa.me/call/40741763416">Sună pentru disponibilitate</a>
          <a class="btn btn-lime" href="${asset("locatie/")}">Vezi locația</a>
        </p>
      </article>`;
    root.querySelectorAll("[data-photo]").forEach((button) => {
      button.addEventListener("click", () => {
        const main = $("#product-main", root);
        if (main) main.src = button.dataset.photo;
        root.querySelectorAll("[data-photo]").forEach((item) => item.classList.toggle("is-on", item === button));
      });
    });

    const related = $("#related-grid");
    if (!related || !cat) return;
    const same = C.products.filter((item) => item.path !== product.path && item.categories.includes(cat.id));
    const more = C.products.filter((item) => item.path !== product.path && !same.includes(item) && inCategory(item, topOf(cat)));
    const others = uniqueByPath(same.concat(more)).slice(0, 4);
    related.innerHTML = others.map(plantCard).join("");
    $("#related").hidden = others.length === 0;
    if (window.revealIn) window.revealIn(related);
  }

  function renderList() {
    const body = $("#sheet-body");
    const search = $("#sheet-search");
    const select = $("#sheet-cat");
    const count = $("#sheet-count");
    if (!body || !search || !select || !count) return;

    const tops = C.categories.filter((cat) => !cat.parent && countFor(cat) > 0);
    select.innerHTML = `<option value="">Toate categoriile</option>${tops.map((cat) => (
      `<option value="${esc(cat.slug)}">${esc(cat.name)}</option>`
    )).join("")}`;

    const rows = C.products.map((product) => {
      const cats = product.categories.map(catById).filter(Boolean);
      const child = cats.find((cat) => cat.parent) || null;
      const parent = child ? (catById(child.parent) || child) : (cats[0] || null);
      return { product, parent, child };
    });

    let sortKey = "category";
    let sortDir = 1;
    const heads = document.querySelectorAll("[data-sort]");

    const draw = () => {
      const words = fold(search.value).split(/\s+/).filter(Boolean);
      const cat = catBySlug(select.value);
      const shown = rows.filter(({ product, parent, child }) => {
        if (cat && !inCategory(product, cat)) return false;
        if (!words.length) return true;
        const hay = fold(`${product.title} ${product.text} ${parent ? parent.name : ""} ${child ? child.name : ""}`);
        return words.every((word) => hay.includes(word));
      }).sort((a, b) => {
        const value = (row) => (
          sortKey === "category"
            ? `${row.parent ? row.parent.name : ""} ${row.child ? row.child.name : ""} ${row.product.title}`
            : row.product.title
        );
        return value(a).localeCompare(value(b), "ro") * sortDir;
      });

      count.textContent = shown.length === C.products.length
        ? `${shown.length} plante`
        : `${shown.length} din ${C.products.length} plante`;
      body.innerHTML = shown.length
        ? shown.map(({ product, parent, child }, index) => {
          const blurb = String(product.text || "").replace(/\s+/g, " ").trim();
          const short = blurb.length > 180 ? `${blurb.slice(0, 177)}…` : blurb;
          return `<tr>
            <td class="num">${index + 1}</td>
            <td class="shot"><img src="${esc(product.image)}" alt=""></td>
            <td class="name"><a href="produs.html?p=${encodeURIComponent(product.slug)}">${esc(product.title)}</a></td>
            <td>${esc(parent ? parent.name : "—")}</td>
            <td>${esc(child ? child.name : "—")}</td>
            <td class="blurb">${esc(short || "—")}</td>
          </tr>`;
        }).join("")
        : `<tr><td class="blurb" colspan="6">Nicio plantă nu se potrivește.</td></tr>`;
      heads.forEach((head) => {
        const active = head.dataset.sort === sortKey;
        head.setAttribute("aria-sort", active ? (sortDir === 1 ? "ascending" : "descending") : "none");
      });
    };

    search.addEventListener("input", draw);
    select.addEventListener("change", draw);
    heads.forEach((head) => {
      head.addEventListener("click", () => {
        if (sortKey === head.dataset.sort) sortDir *= -1;
        else {
          sortKey = head.dataset.sort;
          sortDir = 1;
        }
        draw();
      });
    });
    draw();
  }

  function setupHome() {
    const hero = document.querySelector("#hero-img");
    document.querySelectorAll("[data-hero]").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelectorAll("[data-hero]").forEach((item) => item.classList.toggle("is-on", item === button));
        if (!hero || hero.getAttribute("src") === button.dataset.hero) return;
        hero.classList.add("is-fading");
        window.setTimeout(() => {
          hero.src = button.dataset.hero;
          hero.alt = button.dataset.alt || "";
          hero.classList.remove("is-fading");
        }, 220);
      });
    });

    document.querySelectorAll("[data-loc]").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelectorAll("[data-loc]").forEach((item) => item.classList.toggle("is-on", item === button));
        document.querySelectorAll(".panel").forEach((panel) => {
          panel.hidden = panel.id !== button.dataset.loc;
        });
      });
    });

    const form = document.querySelector("#contact-form");
    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const data = new FormData(form);
        const body = [
          `Nume: ${data.get("nume") || ""}`,
          `E-mail: ${data.get("email") || ""}`,
          `Telefon: ${data.get("telefon") || ""}`,
          "",
          data.get("mesaj") || "",
        ].join("\n");
        window.location.href = `mailto:gardennicolae@gmail.com?subject=${encodeURIComponent("Mesaj de pe site")}&body=${encodeURIComponent(body)}`;
      });
    }

    const xmas = document.querySelector("#xmas");
    const close = document.querySelector("#xmas-close");
    if (xmas && sessionStorage.getItem("ng-xmas") === "off") xmas.hidden = true;
    if (close && xmas) {
      close.addEventListener("click", () => {
        xmas.hidden = true;
        sessionStorage.setItem("ng-xmas", "off");
      });
    }
  }

  function setupMotion() {
    const header = document.querySelector(".site-header");
    const markHeader = () => header && header.classList.toggle("is-scrolled", window.scrollY > 8);
    markHeader();
    window.addEventListener("scroll", markHeader, { passive: true });
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const seen = new WeakSet();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12 });

    window.revealIn = (root = document) => {
      root.querySelectorAll(".section, .cat-card, .trust p, .pcard, .plant").forEach((node, index) => {
        if (seen.has(node)) return;
        seen.add(node);
        node.classList.add("reveal");
        if (node.matches(".cat-card, .trust p, .pcard, .plant")) {
          node.style.transitionDelay = `${Math.min(index, 8) * 50}ms`;
        }
        observer.observe(node);
      });
    };
    window.revealIn();
  }

  setupNav();
  setupHome();
  setupMotion();
  if (!C) return;
  const page = document.body.dataset.page;
  if (page === "home") renderHome();
  if (page === "catalog") {
    const params = queryParams();
    const selected = catBySlug(params.get("c") || "");
    if (!document.body.dataset.category && selected && selected.path && !params.get("q")) {
      location.replace(asset(selected.path));
      return;
    }
    bindSearch();
    renderCatalog();
  }
  if (page === "product") {
    if (!document.body.dataset.product) {
      const product = C.products.find((item) => item.slug === queryParams().get("p"));
      if (product && product.path) {
        location.replace(asset(product.path));
        return;
      }
    }
    renderProduct();
  }
  if (page === "list") renderList();
})();
