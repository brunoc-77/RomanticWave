/* ==========================================================================
   ROMANTICWAVE — script.js
   JavaScript puro, sem dependências externas.
   Organização:
     1. Referências ao DOM
     2. Estado da carta em edição
     3. Abrir / fechar editor
     4. Rotação 3D (arrastar) + virar frente/verso
     5. Personalização (papel, textura, tamanho, fonte, cor, alinhamento, estilo)
     6. Adesivos (adicionar / arrastar / remover)
     7. Foto (upload / remover)
     8. Salvar carta + galeria (localStorage)
     9. Inicialização
   ========================================================================== */

(() => {
  'use strict';

  /* ---------------------------------------------------------------------
     1. REFERÊNCIAS AO DOM
  --------------------------------------------------------------------- */
  const openEditorBtn  = document.getElementById('openEditorBtn');
  const heroCreateBtn  = document.getElementById('heroCreateBtn');
  const closeEditorBtn = document.getElementById('closeEditorBtn');
  const editor         = document.getElementById('editor');

  const flipBtn  = document.getElementById('flipBtn');
  const saveBtn  = document.getElementById('saveBtn');

  const stage   = document.getElementById('stage');
  const card3d  = document.getElementById('card3d');
  const stageScene = document.querySelector('.stage__scene');
  const frameFront = document.getElementById('frameFront');
  const frameBack  = document.getElementById('frameBack');
  const textFront  = document.getElementById('textFront');
  const textBack   = document.getElementById('textBack');

  const photoSlot = document.getElementById('photoSlot');
  const photoImg  = document.getElementById('photoImg');
  const photoInput = document.getElementById('photoInput');
  const removePhotoBtn = document.getElementById('removePhotoBtn');

  const stickerLayerFront = document.getElementById('stickerLayerFront');
  const stickerLayerBack  = document.getElementById('stickerLayerBack');

  const tabs = document.querySelectorAll('.tab');
  const tabPanels = document.querySelectorAll('.tab-panel');

  const paperColorBtns = document.querySelectorAll('#paperColors .swatch');
  const textureBtns    = document.querySelectorAll('#textures .option');
  const sizeBtns       = document.querySelectorAll('#sizes .option');
  const fontBtns       = document.querySelectorAll('#fonts .option');
  const textColorBtns  = document.querySelectorAll('#textColors .swatch');
  const fontSizeSlider = document.getElementById('fontSize');
  const alignBtns      = document.querySelectorAll('#aligns .option');
  const styleBtns      = document.querySelectorAll('#styles .style-card');
  const stickerPicker  = document.querySelectorAll('#stickerPicker .sticker-btn');

  const galleryGrid  = document.getElementById('galleryGrid');
  const galleryCount = document.getElementById('galleryCount');

  const FONT_MAP = {
    caveat: "'Caveat', cursive",
    serif:  "'Cormorant Garamond', serif",
    jost:   "'Jost', sans-serif"
  };

  /* ---------------------------------------------------------------------
     2. ESTADO DA CARTA EM EDIÇÃO
  --------------------------------------------------------------------- */
  let letter = createBlankLetter();
  let isFlipped = false;
  let editingId = null; // se estiver reeditando uma carta salva

  function createBlankLetter(){
    return {
      id: null,
      paperColor: '#FBF6F0',
      texture: 'liso',
      size: 'media',
      font: 'caveat',
      textColor: '#4A3B3B',
      fontSize: 20,
      align: 'left',
      style: 'romantico',
      textFrontHTML: '',
      textBackHTML: '',
      photo: null,
      stickersFront: [], // {emoji, x, y} em % relativo à carta
      stickersBack: [],
      createdAt: null
    };
  }

  /* ---------------------------------------------------------------------
     3. ABRIR / FECHAR EDITOR
  --------------------------------------------------------------------- */
  function openEditor(existingLetter){
    letter = existingLetter ? JSON.parse(JSON.stringify(existingLetter)) : createBlankLetter();
    editingId = existingLetter ? existingLetter.id : null;
    isFlipped = false;
    card3d.classList.remove('is-flipped');
    applyLetterToDOM();
    editor.classList.add('is-open');
    editor.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeEditor(){
    editor.classList.remove('is-open');
    editor.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  openEditorBtn.addEventListener('click', () => openEditor(null));
  heroCreateBtn.addEventListener('click', () => openEditor(null));
  closeEditorBtn.addEventListener('click', closeEditor);
  editor.addEventListener('click', (e) => {
    if (e.target === editor) closeEditor(); // clique fora do painel fecha
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && editor.classList.contains('is-open')) closeEditor();
  });

  /* ---------------------------------------------------------------------
     4. ROTAÇÃO 3D (ARRASTAR) + VIRAR FRENTE/VERSO
  --------------------------------------------------------------------- */
  let dragging = false;
  let startX = 0, startY = 0;
  let baseRotY = -22, baseRotX = 10; // rotação de "descanso" (efeito objeto real, bem perceptível em 3D)
  let currentRotY = baseRotY, currentRotX = baseRotX;
  let idleT = 0;
  let idleFrame = null;

  function setCardTransform(rotX, rotY, extraY = 0){
    card3d.style.transform = `translateY(${extraY}px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
  }

  // Animação "viva": a carta oscila suavemente em 3D quando ninguém a
  // está arrastando, deixando claro que é um objeto tridimensional real
  // (uma imagem estática de carta quase plana passa despercebida).
  function idleLoop(){
    idleT += 0.012;
    if (!dragging){
      const wobbleY = Math.sin(idleT) * 4;
      const floatY = Math.sin(idleT * 0.8) * 5;
      setCardTransform(baseRotX, (isFlipped ? baseRotY + 180 : baseRotY) + wobbleY, floatY);
    }
    idleFrame = requestAnimationFrame(idleLoop);
  }
  idleLoop();

  stageScene.addEventListener('pointerdown', (e) => {
    // não iniciar arraste se o clique for em um adesivo ou no texto editável
    if (e.target.closest('.sticker') || e.target.isContentEditable) return;
    dragging = true;
    card3d.classList.add('is-dragging');
    startX = e.clientX;
    startY = e.clientY;
    stageScene.setPointerCapture(e.pointerId);
  });

  stageScene.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    currentRotY = baseRotY + dx * 0.4 + (isFlipped ? 180 : 0);
    currentRotX = baseRotX - dy * 0.25;
    currentRotX = Math.max(-25, Math.min(25, currentRotX));
    setCardTransform(currentRotX, currentRotY);
  });

  function withTransition(fn){
    card3d.classList.add('is-transitioning');
    fn();
    setTimeout(() => card3d.classList.remove('is-transitioning'), 950);
  }

  function endDrag(){
    if (!dragging) return;
    dragging = false;
    // volta suavemente para o repouso, preservando o lado atual
    baseRotY = -22;
    baseRotX = 10;
    withTransition(() => setCardTransform(baseRotX, isFlipped ? baseRotY + 180 : baseRotY));
  }
  stageScene.addEventListener('pointerup', endDrag);
  stageScene.addEventListener('pointerleave', endDrag);

  function flipCard(){
    isFlipped = !isFlipped;
    withTransition(() => setCardTransform(baseRotX, isFlipped ? baseRotY + 180 : baseRotY));
  }
  flipBtn.addEventListener('click', flipCard);

  // define transform inicial
  setCardTransform(baseRotX, baseRotY);

  /* ---------------------------------------------------------------------
     5. PERSONALIZAÇÃO
  --------------------------------------------------------------------- */

  // --- abas ---
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('is-active'));
      tabPanels.forEach(p => p.classList.remove('is-active'));
      tab.classList.add('is-active');
      document.querySelector(`.tab-panel[data-panel="${tab.dataset.tab}"]`).classList.add('is-active');
    });
  });

  // --- cor do papel ---
  paperColorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      letter.paperColor = btn.dataset.color;
      setActive(paperColorBtns, btn);
      applyPaper();
    });
  });

  // --- textura ---
  textureBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      letter.texture = btn.dataset.texture;
      setActive(textureBtns, btn);
      applyPaper();
    });
  });

  // --- tamanho da carta ---
  sizeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      letter.size = btn.dataset.size;
      setActive(sizeBtns, btn);
      applySize();
    });
  });

  // --- fonte ---
  fontBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      letter.font = btn.dataset.font;
      setActive(fontBtns, btn);
      applyTextStyle();
    });
  });

  // --- cor do texto ---
  textColorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      letter.textColor = btn.dataset.color;
      setActive(textColorBtns, btn);
      applyTextStyle();
    });
  });

  // --- tamanho do texto ---
  fontSizeSlider.addEventListener('input', () => {
    letter.fontSize = Number(fontSizeSlider.value);
    applyTextStyle();
  });

  // --- alinhamento ---
  alignBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      letter.align = btn.dataset.align;
      setActive(alignBtns, btn);
      applyTextStyle();
    });
  });

  // --- estilo geral (preset) ---
  styleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      letter.style = btn.dataset.style;
      setActive(styleBtns, btn);
      applyStylePreset();
    });
  });

  function setActive(collection, active){
    collection.forEach(el => el.classList.remove('is-active'));
    active.classList.add('is-active');
  }

  function applyPaper(){
    [frameFront, frameBack].forEach(frame => {
      frame.parentElement.style.backgroundColor = letter.paperColor;
      frame.parentElement.classList.remove('paper--liso','paper--linho','paper--kraft','paper--vintage');
      frame.parentElement.classList.add(`paper--${letter.texture}`);
    });
  }

  function applySize(){
    stageScene.classList.remove('size--pequena','size--grande');
    if (letter.size === 'pequena') stageScene.classList.add('size--pequena');
    if (letter.size === 'grande') stageScene.classList.add('size--grande');
  }

  function applyTextStyle(){
    [textFront, textBack].forEach(el => {
      el.style.fontFamily = FONT_MAP[letter.font];
      el.style.color = letter.textColor;
      el.style.textAlign = letter.align;
    });
    textFront.style.fontSize = letter.fontSize + 'px';
    textBack.style.fontSize = Math.max(14, letter.fontSize - 2) + 'px';
  }

  function applyStylePreset(){
    const stage3d = document.getElementById('stage');
    stage3d.classList.remove('style--romantico','style--classico','style--vintage','style--minimalista');
    stage3d.classList.add(`style--${letter.style}`);
  }

  /* ---------------------------------------------------------------------
     6. ADESIVOS
  --------------------------------------------------------------------- */
  stickerPicker.forEach(btn => {
    btn.addEventListener('click', () => addSticker(btn.dataset.sticker));
  });

  function addSticker(emoji){
    const layer = isFlipped ? stickerLayerBack : stickerLayerFront;
    const list = isFlipped ? letter.stickersBack : letter.stickersFront;
    const data = { emoji, x: 50, y: 50 };
    list.push(data);
    renderSticker(layer, data, list);
  }

  function renderSticker(layer, data, list){
    const el = document.createElement('span');
    el.className = 'sticker';
    el.textContent = data.emoji;
    el.style.left = data.x + '%';
    el.style.top = data.y + '%';

    let dragging = false;
    el.addEventListener('pointerdown', (e) => {
      dragging = true;
      el.setPointerCapture(e.pointerId);
      e.stopPropagation();
    });
    el.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const rect = layer.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      data.x = Math.max(0, Math.min(100, x));
      data.y = Math.max(0, Math.min(100, y));
      el.style.left = data.x + '%';
      el.style.top = data.y + '%';
      e.stopPropagation();
    });
    el.addEventListener('pointerup', (e) => { dragging = false; e.stopPropagation(); });
    el.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      const idx = list.indexOf(data);
      if (idx > -1) list.splice(idx, 1);
      el.remove();
    });

    layer.appendChild(el);
  }

  function renderAllStickers(){
    stickerLayerFront.innerHTML = '';
    stickerLayerBack.innerHTML = '';
    letter.stickersFront.forEach(d => renderSticker(stickerLayerFront, d, letter.stickersFront));
    letter.stickersBack.forEach(d => renderSticker(stickerLayerBack, d, letter.stickersBack));
  }

  /* ---------------------------------------------------------------------
     7. FOTO
  --------------------------------------------------------------------- */
  photoInput.addEventListener('change', () => {
    const file = photoInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      letter.photo = e.target.result;
      applyPhoto();
    };
    reader.readAsDataURL(file);
  });

  removePhotoBtn.addEventListener('click', () => {
    letter.photo = null;
    applyPhoto();
  });

  function applyPhoto(){
    if (letter.photo){
      photoImg.src = letter.photo;
      photoSlot.hidden = false;
    } else {
      photoImg.src = '';
      photoSlot.hidden = true;
    }
  }

  /* ---------------------------------------------------------------------
     TEXTO (contenteditable) — mantém estado sincronizado
  --------------------------------------------------------------------- */
  textFront.addEventListener('input', () => { letter.textFrontHTML = textFront.innerHTML; });
  textBack.addEventListener('input',  () => { letter.textBackHTML  = textBack.innerHTML;  });

  /* ---------------------------------------------------------------------
     APLICAR TODO O ESTADO NO DOM (usado ao abrir/reabrir o editor)
  --------------------------------------------------------------------- */
  function applyLetterToDOM(){
    // papel
    setActiveByValue(paperColorBtns, 'color', letter.paperColor);
    setActiveByValue(textureBtns, 'texture', letter.texture);
    setActiveByValue(sizeBtns, 'size', letter.size);
    applyPaper();
    applySize();

    // texto
    setActiveByValue(fontBtns, 'font', letter.font);
    setActiveByValue(textColorBtns, 'color', letter.textColor);
    setActiveByValue(alignBtns, 'align', letter.align);
    fontSizeSlider.value = letter.fontSize;
    applyTextStyle();

    // estilo
    setActiveByValue(styleBtns, 'style', letter.style);
    applyStylePreset();

    // conteúdo
    textFront.innerHTML = letter.textFrontHTML || '';
    textBack.innerHTML = letter.textBackHTML || '';

    // foto
    applyPhoto();

    // adesivos
    renderAllStickers();
  }

  function setActiveByValue(collection, attr, value){
    collection.forEach(el => {
      el.classList.toggle('is-active', el.dataset[attr] === value);
    });
  }

  /* ---------------------------------------------------------------------
     8. SALVAR CARTA + GALERIA (localStorage)
  --------------------------------------------------------------------- */
  const STORAGE_KEY = 'romanticwave_letters';

  function loadLetters(){
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function persistLetters(letters){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(letters));
  }

  function saveLetter(){
    const letters = loadLetters();
    letter.textFrontHTML = textFront.innerHTML;
    letter.textBackHTML = textBack.innerHTML;

    if (editingId){
      const idx = letters.findIndex(l => l.id === editingId);
      letter.id = editingId;
      letter.createdAt = letters[idx] ? letters[idx].createdAt : Date.now();
      if (idx > -1) letters[idx] = letter; else letters.push(letter);
    } else {
      letter.id = 'letter_' + Date.now();
      letter.createdAt = Date.now();
      editingId = letter.id;
      letters.push(letter);
    }

    persistLetters(letters);
    renderGallery();
    flashSaved();
  }

  function flashSaved(){
    const original = saveBtn.innerHTML;
    saveBtn.innerHTML = '<span class="icon-btn__glyph">✓</span> Salvo';
    setTimeout(() => { saveBtn.innerHTML = original; }, 1400);
  }

  saveBtn.addEventListener('click', saveLetter);

  function renderGallery(){
    const letters = loadLetters().sort((a, b) => b.createdAt - a.createdAt);
    galleryCount.textContent = `${letters.length} salva${letters.length === 1 ? '' : 's'}`;

    if (letters.length === 0){
      galleryGrid.innerHTML = `<div class="gallery__empty">Nenhuma carta ainda. Clique em “+” e escreva a primeira.</div>`;
      return;
    }

    galleryGrid.innerHTML = '';
    letters.forEach(l => {
      const card = document.createElement('button');
      card.className = 'mini-card';
      card.style.backgroundColor = l.paperColor;
      card.style.textAlign = 'left';
      card.style.border = 'none';

      const preview = document.createElement('div');
      preview.className = 'mini-card__preview';
      preview.style.fontFamily = FONT_MAP[l.font] || FONT_MAP.caveat;
      preview.style.color = l.textColor;
      const tmp = document.createElement('div');
      tmp.innerHTML = l.textFrontHTML || '';
      preview.textContent = tmp.textContent || 'Carta em branco';

      const date = document.createElement('div');
      date.className = 'mini-card__date';
      date.textContent = new Date(l.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

      card.appendChild(preview);
      card.appendChild(date);
      card.addEventListener('click', () => openEditor(l));
      galleryGrid.appendChild(card);
    });
  }

  /* ---------------------------------------------------------------------
     9. INICIALIZAÇÃO
  --------------------------------------------------------------------- */
  applyLetterToDOM();
  renderGallery();

})();
