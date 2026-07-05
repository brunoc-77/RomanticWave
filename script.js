(() => {
  const STORAGE_KEYS = {
    draft: "romanticwave_draft_v1",
    sent: "romanticwave_sent_v1",
    inboxPrefix: "romanticwave_inbox_",
  };

  const PALETTES = {
    cream: "var(--paper-cream)",
    rose: "var(--paper-rose)",
    lilac: "var(--paper-lilac)",
    sand: "var(--paper-sand)",
    slate: "var(--paper-slate)",
  };

  const FONTS = {
    handwriting: '"Segoe Script", "Snell Roundhand", "Brush Script MT", cursive',
    serif: 'Georgia, "Times New Roman", serif',
    elegant: '"Palatino Linotype", Palatino, "Book Antiqua", serif',
    minimal: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
    ink: '"Comic Sans MS", "Trebuchet MS", sans-serif',
  };

  const THEMES = {
    romantic: {
      paperColor: PALETTES.rose,
      textColor: "#6f4a53",
      texture: "soft",
      fontFamily: "handwriting",
      align: "left",
    },
    classic: {
      paperColor: PALETTES.cream,
      textColor: "#594744",
      texture: "clean",
      fontFamily: "serif",
      align: "justify",
    },
    vintage: {
      paperColor: PALETTES.sand,
      textColor: "#6a553f",
      texture: "vintage",
      fontFamily: "elegant",
      align: "left",
    },
    minimal: {
      paperColor: PALETTES.slate,
      textColor: "#4f4f4f",
      texture: "clean",
      fontFamily: "minimal",
      align: "left",
    },
  };

  const STICKERS = [
    { type: "♡", label: "coração" },
    { type: "✿", label: "flor" },
    { type: "❀", label: "flor 2" },
    { type: "☾", label: "lua" },
    { type: "✦", label: "estrela" },
    { type: "❦", label: "ornamento" },
    { type: "✉", label: "envelope" },
    { type: "∞", label: "infinito" },
    { type: "♥", label: "amor" },
  ];

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clone = (obj) => JSON.parse(JSON.stringify(obj));

  const els = {
    appShell: $("#appShell"),
    homeScreen: $("#homeScreen"),
    editorScreen: $("#editorScreen"),
    mailboxScreen: $("#mailboxScreen"),
    menuDrawer: $("#menuDrawer"),
    modal: $("#sendModal"),
    toast: $("#toast"),

    openMenuBtn: $("#openMenuBtn"),
    closeMenuBtn: $("#closeMenuBtn"),
    startNewLetterBtn: $("#startNewLetterBtn"),
    resumeLastBtn: $("#resumeLastBtn"),
    drawerNewBtn: $("#drawerNewBtn"),
    drawerDraftBtn: $("#drawerDraftBtn"),
    drawerInboxBtn: $("#drawerInboxBtn"),

    openInboxBtn: $("#openInboxBtn"),
    inboxIdInput: $("#inboxIdInput"),
    inboxList: $("#inboxList"),

    closeEditorBtn: $("#closeEditorBtn"),
    saveDraftBtn: $("#saveDraftBtn"),
    sendLetterBtn: $("#sendLetterBtn"),
    frontViewBtn: $("#frontViewBtn"),
    backViewBtn: $("#backViewBtn"),
    backHomeFromMailboxBtn: $("#backHomeFromMailboxBtn"),

    recipientId: $("#recipientId"),
    recipientName: $("#recipientName"),
    frontText: $("#frontText"),
    backText: $("#backText"),
    paperColor: $("#paperColor"),
    paperTexture: $("#paperTexture"),
    paperSize: $("#paperSize"),
    fontFamily: $("#fontFamily"),
    textColor: $("#textColor"),
    textAlign: $("#textAlign"),
    editorTitle: $("#editorTitle"),
    previewHeading: $("#previewHeading"),

    paperCard: $("#paperCard"),
    paperFront: $("#paperFront"),
    paperBack: $("#paperBack"),
    paperRecipient: $("#paperRecipient"),
    paperState: $("#paperState"),
    frontPreviewText: $("#frontPreviewText"),
    backPreviewText: $("#backPreviewText"),
    frontElements: $("#frontElements"),
    backElements: $("#backElements"),
    backRecipientName: $("#backRecipientName"),
    backRecipientId: $("#backRecipientId"),
    frontSignatureLine: $("#frontSignatureLine"),

    stickerPalette: $("#stickerPalette"),
    photoInput: $("#photoInput"),

    sendSummary: $("#sendSummary"),
    sendIdInput: $("#sendIdInput"),
    sendNoteInput: $("#sendNoteInput"),
    closeSendModalBtn: $("#closeSendModalBtn"),
    confirmSendBtn: $("#confirmSendBtn"),
    copyShareBtn: $("#copyShareBtn"),
    mailboxTitle: $("#mailboxTitle"),
    mailboxList: $("#mailboxList"),
  };

  const defaultDraft = {
    version: 1,
    activeSide: "front",
    recipientId: "ana_01",
    recipientName: "Ana",
    frontText: "Meu amor,\n\nEscrevo esta carta como quem deixa o coração repousar em papel.\nQue cada linha carregue a delicadeza do que sinto por você.\n\nCom carinho,\n[Seu nome]",
    backText: "Com ternura,\n[Seu nome]",
    paperColor: PALETTES.cream,
    paperTexture: "soft",
    paperSize: "medium",
    fontFamily: "handwriting",
    textColor: "#5f4a47",
    textAlign: "left",
    theme: "romantic",
    note: "entregue com carinho",
    elements: {
      front: [],
      back: [],
    },
    counters: { sticker: 0, photo: 0 },
  };

  const state = {
    ui: {
      menuOpen: false,
      editorOpen: false,
      mailboxOpen: false,
      sendModalOpen: false,
      selectedSide: "front",
      activeInboxId: "",
      selectedElementId: null,
      drag: null,
    },
    draft: clone(defaultDraft),
    sent: [],
  };

  function safeParse(raw, fallback) {
    try {
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function loadAll() {
    const savedDraft = safeParse(localStorage.getItem(STORAGE_KEYS.draft), null);
    if (savedDraft && typeof savedDraft === "object") {
      state.draft = normalizeDraft(savedDraft);
    }
    state.sent = safeParse(localStorage.getItem(STORAGE_KEYS.sent), []);
    if (!Array.isArray(state.sent)) state.sent = [];
  }

  function normalizeDraft(input) {
    const merged = clone(defaultDraft);
    const source = input || {};
    Object.assign(merged, source);
    merged.elements = {
      front: Array.isArray(source.elements?.front) ? source.elements.front : [],
      back: Array.isArray(source.elements?.back) ? source.elements.back : [],
    };
    merged.counters = {
      sticker: Number(source.counters?.sticker || 0),
      photo: Number(source.counters?.photo || 0),
    };
    merged.activeSide = source.activeSide === "back" ? "back" : "front";
    return merged;
  }

  function saveDraft() {
    localStorage.setItem(STORAGE_KEYS.draft, JSON.stringify(state.draft));
  }

  function saveSent() {
    localStorage.setItem(STORAGE_KEYS.sent, JSON.stringify(state.sent));
  }

  function setRootVars() {
    document.documentElement.style.setProperty("--paper-color", state.draft.paperColor);
    document.documentElement.style.setProperty("--paper-font", FONTS[state.draft.fontFamily] || FONTS.handwriting);
    document.documentElement.style.setProperty("--text-color", state.draft.textColor);
    document.documentElement.style.setProperty("--text-align", state.draft.textAlign);
    document.documentElement.style.setProperty("--paper-size", state.draft.paperSize);

    const sizeMap = {
      small: ["540px", "650px"],
      medium: ["620px", "760px"],
      large: ["720px", "860px"],
    };
    const [w, h] = sizeMap[state.draft.paperSize] || sizeMap.medium;
    document.documentElement.style.setProperty("--paper-width", w);
    document.documentElement.style.setProperty("--paper-height", h);
  }

  function fillPalette() {
    els.paperColor.innerHTML = `
      <option value="${PALETTES.cream}">Creme</option>
      <option value="${PALETTES.rose}">Rosa suave</option>
      <option value="${PALETTES.lilac}">Lilás suave</option>
      <option value="${PALETTES.sand}">Areia</option>
      <option value="${PALETTES.slate}">Cinza quente</option>
    `;
  }

  function renderStickerPalette() {
    els.stickerPalette.innerHTML = STICKERS.map((item) => `
      <button class="sticker-btn" type="button" data-sticker="${item.type}" title="${item.label}">${item.type}</button>
    `).join("");
  }

  function elementHTML(element, side) {
    const baseStyle = `
      left:${element.x}px;
      top:${element.y}px;
      transform: translate(${element.rotate ? `0` : `0`}) rotate(${element.rotate || 0}deg) scale(${element.scale || 1});
    `;

    if (element.type === "photo") {
      return `
        <div class="element photo" data-id="${element.id}" data-kind="photo" style="${baseStyle}; width:${element.w}px; height:${element.h}px; background-image:url('${element.src}')">
          <div class="element-actions">
            <button class="element-btn" data-action="delete" type="button">×</button>
          </div>
        </div>
      `;
    }

    return `
      <div class="element sticker" data-id="${element.id}" data-kind="sticker" style="${baseStyle}; font-size:${element.size || 1.35}rem;">
        ${element.symbol}
        <div class="element-actions">
          <button class="element-btn" data-action="delete" type="button">×</button>
        </div>
      </div>
    `;
  }

  function renderElements(side) {
    const list = state.draft.elements[side] || [];
    return list.map((el) => elementHTML(el, side)).join("");
  }

  function currentSideText() {
    return state.ui.selectedSide === "back" ? state.draft.backText : state.draft.frontText;
  }

  function renderPreview() {
    setRootVars();

    els.recipientId.value = state.draft.recipientId;
    els.recipientName.value = state.draft.recipientName;
    els.frontText.value = state.draft.frontText;
    els.backText.value = state.draft.backText;
    els.paperColor.value = state.draft.paperColor;
    els.paperTexture.value = state.draft.paperTexture;
    els.paperSize.value = state.draft.paperSize;
    els.fontFamily.value = state.draft.fontFamily;
    els.textColor.value = state.draft.textColor;
    els.textAlign.value = state.draft.textAlign;

    els.paperCard.dataset.texture = state.draft.paperTexture;
    els.paperCard.dataset.size = state.draft.paperSize;
    els.paperCard.dataset.side = state.ui.selectedSide;

    els.paperRecipient.textContent = `Para: ${state.draft.recipientName || "destinatário"}`;
    els.paperState.textContent = state.ui.selectedSide === "front" ? "Carta viva" : "Verso preparado";
    els.backRecipientName.textContent = state.draft.recipientName || "Nome aqui";
    els.backRecipientId.textContent = state.draft.recipientId || "ID aqui";

    els.frontPreviewText.textContent = state.draft.frontText;
    els.backPreviewText.textContent = state.draft.backText;
    els.frontPreviewText.classList.toggle("is-empty", !state.draft.frontText.trim());
    els.backPreviewText.classList.toggle("is-empty", !state.draft.backText.trim());

    els.frontSignatureLine.style.display = state.draft.frontText.trim() ? "block" : "none";

    els.frontElements.innerHTML = renderElements("front");
    els.backElements.innerHTML = renderElements("back");

    els.paperFront.classList.toggle("is-visible", state.ui.selectedSide === "front");
    els.paperBack.classList.toggle("is-visible", state.ui.selectedSide === "back");
    els.previewHeading.textContent = state.ui.selectedSide === "front" ? "Frente da carta" : "Verso da carta";

    $$(".tab-btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.side === state.ui.selectedSide);
    });

    $$(".chip").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.theme === state.draft.theme);
    });

    saveDraft();
  }

  function openScreen(screen) {
    [els.homeScreen, els.editorScreen, els.mailboxScreen].forEach((el) => el.classList.remove("is-active"));
    screen.classList.add("is-active");
  }

  function closeAllOverlays() {
    els.menuDrawer.classList.remove("is-open");
    els.menuDrawer.setAttribute("aria-hidden", "true");
    els.modal.classList.add("is-hidden");
    els.modal.setAttribute("aria-hidden", "true");
  }

  function openMenu() {
    state.ui.menuOpen = true;
    els.menuDrawer.classList.add("is-open");
    els.menuDrawer.setAttribute("aria-hidden", "false");
  }

  function closeMenu() {
    state.ui.menuOpen = false;
    els.menuDrawer.classList.remove("is-open");
    els.menuDrawer.setAttribute("aria-hidden", "true");
  }

  function openEditor() {
    state.ui.editorOpen = true;
    state.ui.mailboxOpen = false;
    closeAllOverlays();
    openScreen(els.editorScreen);
    els.editorScreen.setAttribute("aria-hidden", "false");
    document.body.classList.add("editor-open");
    renderPreview();
    window.requestAnimationFrame(() => els.frontText.focus());
  }

  function closeEditor() {
    state.ui.editorOpen = false;
    document.body.classList.remove("editor-open");
    openScreen(els.homeScreen);
    els.editorScreen.setAttribute("aria-hidden", "true");
    closeAllOverlays();
    renderInboxOnHome();
  }

  function openMailbox(id) {
    const cleanId = String(id || "").trim();
    if (!cleanId) {
      showToast("Digite um ID para abrir a caixa.");
      return;
    }
    state.ui.activeInboxId = cleanId;
    state.ui.mailboxOpen = true;
    openScreen(els.mailboxScreen);
    renderMailbox(cleanId);
  }

  function renderInboxOnHome() {
    const currentId = String(els.inboxIdInput.value || "").trim();
    if (!currentId) {
      els.inboxList.innerHTML = `
        <div class="inbox-card">
          <div>
            <strong>Sem ID ainda</strong>
            <span>Digite um ID para testar o recebimento de cartas.</span>
          </div>
        </div>
      `;
      return;
    }
    const items = getInboxItems(currentId);
    if (!items.length) {
      els.inboxList.innerHTML = `
        <div class="inbox-card">
          <div>
            <strong>Nenhuma carta encontrada</strong>
            <span>O ID <strong>${escapeHTML(currentId)}</strong> ainda não recebeu cartas no navegador.</span>
          </div>
        </div>
      `;
      return;
    }

    els.inboxList.innerHTML = items.slice(0, 3).map(renderMiniInboxItem).join("");
  }

  function getInboxItems(id) {
    const cleanId = String(id || "").trim().toLowerCase();
    return state.sent
      .filter((entry) => String(entry.recipientId || "").trim().toLowerCase() === cleanId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  function renderMiniInboxItem(item) {
    return `
      <div class="inbox-card">
        <div>
          <strong>${escapeHTML(item.recipientName || item.recipientId || "Carta enviada")}</strong>
          <span>${escapeHTML(item.note || "Sem recado")} • ${formatDate(item.createdAt)}</span>
        </div>
        <button class="secondary-btn" type="button" data-open-inbox="${escapeHTML(item.recipientId)}">Abrir</button>
      </div>
    `;
  }

  function renderMailbox(id) {
    const items = getInboxItems(id);
    els.mailboxTitle.textContent = `Cartas enviadas para ${id}`;
    if (!items.length) {
      els.mailboxList.innerHTML = `
        <div class="mailbox-item">
          <strong>Nenhuma carta encontrada</strong>
          <p>Esse ID ainda não recebeu cartas salvas neste navegador.</p>
        </div>
      `;
      return;
    }

    els.mailboxList.innerHTML = items.map((item) => `
      <article class="mailbox-item">
        <div class="mailbox-item-head">
          <div>
            <strong>${escapeHTML(item.title || "Carta romântica")}</strong>
            <p>${escapeHTML(item.note || "sem recado")} • ${formatDate(item.createdAt)}</p>
          </div>
          <button class="secondary-btn" type="button" data-restore-card="${item.id}">Ver</button>
        </div>
        <p><strong>Remetente:</strong> ${escapeHTML(item.recipientName || "—")}<br />
           <strong>ID:</strong> ${escapeHTML(item.recipientId || "—")}<br />
           <strong>Resumo:</strong> ${escapeHTML(truncate(item.frontText, 130))}
        </p>
      </article>
    `).join("");
  }

  function showSendModal() {
    const payload = buildSharePayload();
    els.sendSummary.innerHTML = `
      <strong>Resumo do envio</strong><br />
      Destinatário: <strong>${escapeHTML(payload.recipientName || "—")}</strong><br />
      ID: <strong>${escapeHTML(payload.recipientId || "—")}</strong><br />
      Lado atual: <strong>${payload.activeSide === "front" ? "Frente" : "Verso"}</strong><br />
      Código local: <strong>${escapeHTML(payload.code)}</strong>
    `;
    els.sendIdInput.value = state.draft.recipientId || "";
    els.sendNoteInput.value = state.draft.note || "entregue com carinho";
    els.modal.classList.remove("is-hidden");
    els.modal.setAttribute("aria-hidden", "false");
    state.ui.sendModalOpen = true;
    window.requestAnimationFrame(() => els.sendIdInput.focus());
  }

  function hideSendModal() {
    els.modal.classList.add("is-hidden");
    els.modal.setAttribute("aria-hidden", "true");
    state.ui.sendModalOpen = false;
  }

  function buildSharePayload() {
    const token = [
      "RW",
      slug(state.draft.recipientId || "id"),
      Date.now().toString(36),
      Math.random().toString(36).slice(2, 7),
    ].join("-");
    return {
      code: token,
      recipientId: state.draft.recipientId,
      recipientName: state.draft.recipientName,
      activeSide: state.draft.activeSide,
    };
  }

  function createShareableRecord() {
    const payload = buildSharePayload();
    const record = {
      id: payload.code,
      title: state.draft.activeSide === "back" ? "Carta — verso" : "Carta romântica",
      recipientId: state.draft.recipientId,
      recipientName: state.draft.recipientName,
      note: state.draft.note,
      frontText: state.draft.frontText,
      backText: state.draft.backText,
      theme: state.draft.theme,
      paperColor: state.draft.paperColor,
      paperTexture: state.draft.paperTexture,
      paperSize: state.draft.paperSize,
      fontFamily: state.draft.fontFamily,
      textColor: state.draft.textColor,
      textAlign: state.draft.textAlign,
      elements: clone(state.draft.elements),
      createdAt: Date.now(),
    };
    return record;
  }

  function confirmSend() {
    const newRecipientId = String(els.sendIdInput.value || state.draft.recipientId || "").trim();
    if (!newRecipientId) {
      showToast("Digite um ID válido para enviar.");
      return;
    }

    state.draft.recipientId = newRecipientId;
    state.draft.recipientName = String(els.recipientName.value || state.draft.recipientName || "").trim() || newRecipientId;
    state.draft.note = String(els.sendNoteInput.value || "entregue com carinho").trim();

    const record = createShareableRecord();
    state.sent.unshift(record);
    saveSent();

    const inboxKey = STORAGE_KEYS.inboxPrefix + slug(newRecipientId);
    const inboxPayload = safeParse(localStorage.getItem(inboxKey), []);
    inboxPayload.unshift(record);
    localStorage.setItem(inboxKey, JSON.stringify(inboxPayload.slice(0, 20)));

    const link = buildShareLink(record);
    navigator.clipboard?.writeText(link).catch(() => {});
    hideSendModal();
    showToast(`Carta enviada para ${newRecipientId}. Link copiado.`);
    renderInboxOnHome();
    openMailbox(newRecipientId);
  }

  function buildShareLink(record) {
    const payload = btoa(unescape(encodeURIComponent(JSON.stringify({
      id: record.id,
      recipientId: record.recipientId,
      recipientName: record.recipientName,
      note: record.note,
      frontText: record.frontText,
      backText: record.backText,
      theme: record.theme,
      paperColor: record.paperColor,
      paperTexture: record.paperTexture,
      paperSize: record.paperSize,
      fontFamily: record.fontFamily,
      textColor: record.textColor,
      textAlign: record.textAlign,
      elements: record.elements,
      createdAt: record.createdAt,
    }))));
    return `${location.origin}${location.pathname}?letter=${payload}`;
  }

  function openSharedLetter() {
    const params = new URLSearchParams(location.search);
    const payload = params.get("letter");
    if (!payload) return false;
    try {
      const data = JSON.parse(decodeURIComponent(escape(atob(payload))));
      state.draft = normalizeDraft({
        ...defaultDraft,
        ...data,
        elements: data.elements || { front: [], back: [] },
      });
      state.draft.activeSide = "front";
      openEditor();
      showToast("Carta importada do link compartilhado.");
      return true;
    } catch (error) {
      console.warn(error);
      return false;
    }
  }

  function addSticker(symbol) {
    const side = state.ui.selectedSide;
    const list = state.draft.elements[side];
    const id = `sticker_${Date.now()}_${state.draft.counters.sticker++}`;
    list.push({
      id,
      type: "sticker",
      symbol,
      x: 42 + Math.random() * 180,
      y: 70 + Math.random() * 220,
      rotate: Math.round((Math.random() * 24) - 12),
      scale: 1,
      size: 1.35 + Math.random() * 0.15,
    });
    renderPreview();
    saveDraft();
  }

  function addPhoto(src) {
    const side = state.ui.selectedSide;
    const list = state.draft.elements[side];
    const id = `photo_${Date.now()}_${state.draft.counters.photo++}`;
    list.push({
      id,
      type: "photo",
      src,
      x: 72 + Math.random() * 160,
      y: 110 + Math.random() * 190,
      rotate: Math.round((Math.random() * 10) - 5),
      scale: 1,
      w: 130,
      h: 130,
    });
    renderPreview();
    saveDraft();
  }

  function deleteElement(id) {
    const side = state.ui.selectedSide;
    const list = state.draft.elements[side];
    const idx = list.findIndex((el) => el.id === id);
    if (idx >= 0) {
      list.splice(idx, 1);
      state.ui.selectedElementId = null;
      renderPreview();
      saveDraft();
    }
  }

  function getSideElements(side) {
    return side === "back" ? els.backElements : els.frontElements;
  }

  function findElementById(id) {
    const side = state.ui.selectedSide;
    const list = state.draft.elements[side] || [];
    return list.find((el) => el.id === id);
  }

  function bindDrag(container, side) {
    container.addEventListener("pointerdown", (event) => {
      const card = event.target.closest(".element");
      if (!card) return;

      const id = card.dataset.id;
      const element = (state.draft.elements[side] || []).find((el) => el.id === id);
      if (!element) return;

      const actionBtn = event.target.closest("[data-action='delete']");
      if (actionBtn) {
        event.preventDefault();
        event.stopPropagation();
        deleteElement(id);
        return;
      }

      state.ui.selectedElementId = id;
      $$(`.element`, container).forEach((node) => node.classList.toggle("is-selected", node.dataset.id === id));

      const cardRect = $("#paperCard").getBoundingClientRect();
      const startX = event.clientX;
      const startY = event.clientY;
      const startLeft = element.x;
      const startTop = element.y;

      state.ui.drag = {
        id,
        side,
        pointerId: event.pointerId,
        startX,
        startY,
        startLeft,
        startTop,
        containerRect: cardRect,
      };

      card.setPointerCapture(event.pointerId);
    });
  }

  function updateDraggedElement(clientX, clientY) {
    const drag = state.ui.drag;
    if (!drag) return;
    const card = $("#paperCard").getBoundingClientRect();
    const el = findElementById(drag.id);
    if (!el) return;

    const dx = clientX - drag.startX;
    const dy = clientY - drag.startY;
    const maxX = card.width - 120;
    const maxY = card.height - 120;

    el.x = clamp(drag.startLeft + dx, 8, Math.max(8, maxX));
    el.y = clamp(drag.startTop + dy, 8, Math.max(8, maxY));

    renderPreview();
  }

  function stopDrag() {
    if (!state.ui.drag) return;
    state.ui.drag = null;
    saveDraft();
  }

  function updateElementSelectionClasses() {
    const selectedId = state.ui.selectedElementId;
    [els.frontElements, els.backElements].forEach((container) => {
      $$(".element", container).forEach((node) => {
        node.classList.toggle("is-selected", node.dataset.id === selectedId);
      });
    });
  }

  function applyTheme(name) {
    const theme = THEMES[name];
    if (!theme) return;
    state.draft.theme = name;
    state.draft.paperColor = theme.paperColor;
    state.draft.textColor = theme.textColor;
    state.draft.paperTexture = theme.texture;
    state.draft.fontFamily = theme.fontFamily;
    state.draft.textAlign = theme.align;
    renderPreview();
  }

  function hydrateFromInputs() {
    state.draft.recipientId = String(els.recipientId.value || "").trim();
    state.draft.recipientName = String(els.recipientName.value || "").trim();
    state.draft.frontText = els.frontText.value;
    state.draft.backText = els.backText.value;
    state.draft.paperColor = els.paperColor.value;
    state.draft.paperTexture = els.paperTexture.value;
    state.draft.paperSize = els.paperSize.value;
    state.draft.fontFamily = els.fontFamily.value;
    state.draft.textColor = els.textColor.value;
    state.draft.textAlign = els.textAlign.value;
  }

  function restoreLastDraft() {
    loadAll();
    renderPreview();
    showToast("Rascunho restaurado.");
  }

  function initInputs() {
    fillPalette();
    renderStickerPalette();
    els.paperTexture.value = state.draft.paperTexture;
    els.paperSize.value = state.draft.paperSize;
    els.fontFamily.value = state.draft.fontFamily;
    els.textAlign.value = state.draft.textAlign;
    els.textColor.value = state.draft.textColor;
    els.sendNoteInput.value = state.draft.note || "entregue com carinho";
  }

  function bindEvents() {
    els.openMenuBtn.addEventListener("click", () => {
      if (state.ui.menuOpen) closeMenu(); else openMenu();
    });
    els.closeMenuBtn.addEventListener("click", closeMenu);

    els.startNewLetterBtn.addEventListener("click", () => {
      state.draft = clone(defaultDraft);
      state.ui.selectedSide = "front";
      state.ui.selectedElementId = null;
      state.draft.note = "entregue com carinho";
      openEditor();
    });

    els.resumeLastBtn.addEventListener("click", () => {
      restoreLastDraft();
      openEditor();
    });

    els.drawerNewBtn.addEventListener("click", () => {
      state.draft = clone(defaultDraft);
      state.ui.selectedSide = "front";
      state.ui.selectedElementId = null;
      state.draft.note = "entregue com carinho";
      closeMenu();
      openEditor();
    });

    els.drawerDraftBtn.addEventListener("click", () => {
      closeMenu();
      restoreLastDraft();
      openEditor();
    });

    els.drawerInboxBtn.addEventListener("click", () => {
      closeMenu();
      const val = String(els.inboxIdInput.value || els.recipientId.value || "").trim();
      if (val) openMailbox(val);
      else showToast("Digite um ID na caixa de teste.");
    });

    els.openInboxBtn.addEventListener("click", () => openMailbox(els.inboxIdInput.value));
    els.backHomeFromMailboxBtn.addEventListener("click", () => {
      openScreen(els.homeScreen);
      renderInboxOnHome();
    });

    els.closeEditorBtn.addEventListener("click", () => closeEditor());

    els.saveDraftBtn.addEventListener("click", () => {
      hydrateFromInputs();
      saveDraft();
      showToast("Rascunho salvo.");
    });

    els.sendLetterBtn.addEventListener("click", () => {
      hydrateFromInputs();
      showSendModal();
      renderPreview();
    });

    els.closeSendModalBtn.addEventListener("click", hideSendModal);
    els.confirmSendBtn.addEventListener("click", () => {
      hydrateFromInputs();
      confirmSend();
    });

    els.copyShareBtn.addEventListener("click", async () => {
      hydrateFromInputs();
      const rec = createShareableRecord();
      const link = buildShareLink(rec);
      try {
        await navigator.clipboard.writeText(link);
        showToast("Link copiado.");
      } catch {
        showToast("Não foi possível copiar automaticamente.");
      }
    });

    els.frontViewBtn.addEventListener("click", () => {
      state.ui.selectedSide = "front";
      renderPreview();
    });

    els.backViewBtn.addEventListener("click", () => {
      state.ui.selectedSide = "back";
      renderPreview();
    });

    els.recipientId.addEventListener("input", () => {
      hydrateFromInputs();
      renderPreview();
    });
    els.recipientName.addEventListener("input", () => {
      hydrateFromInputs();
      renderPreview();
    });
    els.frontText.addEventListener("input", () => {
      state.draft.frontText = els.frontText.value;
      renderPreview();
    });
    els.backText.addEventListener("input", () => {
      state.draft.backText = els.backText.value;
      renderPreview();
    });
    els.paperColor.addEventListener("change", () => {
      state.draft.paperColor = els.paperColor.value;
      state.draft.theme = "custom";
      renderPreview();
    });
    els.paperTexture.addEventListener("change", () => {
      state.draft.paperTexture = els.paperTexture.value;
      renderPreview();
    });
    els.paperSize.addEventListener("change", () => {
      state.draft.paperSize = els.paperSize.value;
      renderPreview();
    });
    els.fontFamily.addEventListener("change", () => {
      state.draft.fontFamily = els.fontFamily.value;
      renderPreview();
    });
    els.textColor.addEventListener("input", () => {
      state.draft.textColor = els.textColor.value;
      state.draft.theme = "custom";
      renderPreview();
    });
    els.textAlign.addEventListener("change", () => {
      state.draft.textAlign = els.textAlign.value;
      renderPreview();
    });

    $$(".chip").forEach((btn) => {
      btn.addEventListener("click", () => applyTheme(btn.dataset.theme));
    });

    $$(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.ui.selectedSide = btn.dataset.side;
        renderPreview();
      });
    });

    els.stickerPalette.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-sticker]");
      if (!btn) return;
      addSticker(btn.dataset.sticker);
    });

    els.photoInput.addEventListener("change", () => {
      const file = els.photoInput.files && els.photoInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        addPhoto(String(reader.result || ""));
        els.photoInput.value = "";
        showToast("Foto adicionada à carta.");
      };
      reader.readAsDataURL(file);
    });

    ["frontElements", "backElements"].forEach((key) => {
      bindDrag(els[key], key === "frontElements" ? "front" : "back");
    });

    document.addEventListener("pointermove", (event) => {
      if (!state.ui.drag) return;
      updateDraggedElement(event.clientX, event.clientY);
    });
    document.addEventListener("pointerup", () => {
      stopDrag();
      updateElementSelectionClasses();
    });
    document.addEventListener("pointercancel", stopDrag);

    document.addEventListener("click", (event) => {
      const inboxBtn = event.target.closest("[data-open-inbox]");
      if (inboxBtn) {
        openMailbox(inboxBtn.dataset.openInbox);
      }

      const restoreBtn = event.target.closest("[data-restore-card]");
      if (restoreBtn) {
        const id = restoreBtn.dataset.restoreCard;
        const item = state.sent.find((entry) => entry.id === id);
        if (item) {
          state.draft = normalizeDraft({
            ...defaultDraft,
            ...item,
            activeSide: "front",
          });
          renderPreview();
          openEditor();
          showToast("Carta restaurada para edição.");
        }
      }

      if (event.target === els.modal) hideSendModal();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (state.ui.sendModalOpen) return hideSendModal();
        if (state.ui.menuOpen) return closeMenu();
        if (state.ui.editorOpen) return closeEditor();
      }
      if (event.ctrlKey && event.key === "Enter" && state.ui.editorOpen) {
        hydrateFromInputs();
        showSendModal();
      }
    });

    els.inboxIdInput.addEventListener("input", renderInboxOnHome);
  }

  function formatDate(ts) {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(ts));
  }

  function truncate(text, max = 100) {
    const str = String(text || "");
    return str.length <= max ? str : str.slice(0, max - 1) + "…";
  }

  function slug(text) {
    return String(text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function escapeHTML(str) {
    return String(str || "").replace(/[&<>"']/g, (s) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[s]));
  }

  function clamp(v, min, max) {
    return Math.min(Math.max(v, min), max);
  }

  let toastTimer = null;
  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove("is-visible"), 2200);
  }

  function hydrateFromQuery() {
    const params = new URLSearchParams(location.search);
    const inbox = params.get("inbox");
    if (inbox) {
      els.inboxIdInput.value = inbox;
      openMailbox(inbox);
      return true;
    }
    return false;
  }

  function init() {
    loadAll();
    initInputs();
    bindEvents();
    renderPreview();
    renderInboxOnHome();

    const openedShared = openSharedLetter();
    const openedInbox = openedShared ? true : hydrateFromQuery();

    closeMenu();
    closeAllOverlays();

    if (!openedShared && !openedInbox) {
      openScreen(els.homeScreen);
    }
  }

  init();
})();
