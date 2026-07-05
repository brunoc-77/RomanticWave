/* ==========================================================================
   ROMANTICWAVE — script.js
   JavaScript puro, sem dependências externas.

   Organização:
     1. Utilidades gerais (ids, storage, toast)
     2. Motor de rotação 3D (mouse + toque, livre, sem "chute" de volta)
     3. Referências ao DOM
     4. Estado da carta em edição
     5. Abrir / fechar editor
     6. Personalização (papel, textura, tamanho, fonte, cor, alinhamento, estilo)
     7. Adesivos
     8. Foto
     9. Salvar carta + "Minhas cartas" (drawer)
    10. Sistema de envio por ID + Correio (caixa de entrada)
    11. Visualizador de carta recebida (envelope -> carta 3D somente leitura)
    12. Inicialização
   ========================================================================== */

(() => {
  'use strict';

  /* ---------------------------------------------------------------------
     1. UTILIDADES GERAIS
  --------------------------------------------------------------------- */
  const STORAGE = {
    MY_ID:   'rw_my_id',
    LETTERS: 'rw_letters',   // cartas que EU criei (rascunho/enviada)
    MAILBOX: 'rw_mailbox'    // caixas de entrada simuladas, por ID de destinatário
  };

  function uid(prefix){
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function generateHumanId(){
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem caracteres ambíguos
    let code = '';
    for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return 'RW-' + code;
  }

  function getMyId(){
    let id = localStorage.getItem(STORAGE.MY_ID);
    if (!id){
      id = generateHumanId();
      localStorage.setItem(STORAGE.MY_ID, id);
    }
    return id;
  }

  function readJSON(key, fallback){
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }
  function writeJSON(key, value){
    localStorage.setItem(key, JSON.stringify(value));
  }

  let toastTimer = null;
  function showToast(msg){
    const toastEl = document.getElementById('toast');
    toastEl.textContent = msg;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 2600);
  }

  function formatDate(ts){
    return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  /* ---------------------------------------------------------------------
     2. MOTOR DE ROTAÇÃO 3D — mouse + toque, 100% livre
     ---------------------------------------------------------------------
     Ideia central: a carta deve poder ser arrastada de QUALQUER ponto
     (inclusive sobre o texto), sem resetar de volta ao soltar — exatamente
     como girar um objeto físico na mão. Para não atrapalhar quem quer
     apenas tocar para escrever, usamos um limiar de movimento: se o dedo/
     mouse mover pouco, é um toque normal (foca o texto); se mover além do
     limiar, viramos rotação e cancelamos qualquer seleção de texto.
  --------------------------------------------------------------------- */
  function createRotator(sceneEl, cardEl, { initialX = 10, initialY = -22, clampX = 62 } = {}){
    let rotX = initialX;
    let rotY = initialY;
    let dragging = false;
    let movedEnough = false;
    let pointerId = null;
    let startX = 0, startY = 0, lastX = 0, lastY = 0;
    let isFlipping = false;
    let idleRAF = null;
    let destroyed = false;
    let enabled = true;

    function apply(extraX = 0, extraY = 0){
      cardEl.style.transform = `rotateX(${rotX + extraX}deg) rotateY(${rotY + extraY}deg)`;
    }

    function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }

    function onPointerDown(e){
      if (!enabled) return;
      if (e.target.closest('.sticker')) return; // adesivos cuidam do próprio arraste
      if (pointerId !== null) return; // já existe um ponteiro ativo (evita multitoque)
      pointerId = e.pointerId;
      dragging = true;
      movedEnough = false;
      startX = lastX = e.clientX;
      startY = lastY = e.clientY;
      cardEl.classList.add('is-grabbing');
      try { sceneEl.setPointerCapture(pointerId); } catch {}
    }

    function onPointerMove(e){
      if (!dragging || e.pointerId !== pointerId) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;

      if (!movedEnough){
        const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
        if (dist > 6){
          movedEnough = true;
          // começou a girar de verdade: cancela seleção/foco de texto
          if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
          const sel = window.getSelection && window.getSelection();
          if (sel) sel.removeAllRanges();
        }
      }

      if (movedEnough){
        e.preventDefault();
        rotY += dx * 0.4;
        rotX = clamp(rotX - dy * 0.32, -clampX, clampX);
        apply();
      }
      lastX = e.clientX;
      lastY = e.clientY;
    }

    function endDrag(e){
      if (pointerId === null || (e && e.pointerId !== pointerId)) return;
      try { sceneEl.releasePointerCapture(pointerId); } catch {}
      dragging = false;
      pointerId = null;
      cardEl.classList.remove('is-grabbing');
      // sem "chute" de volta: a carta permanece exatamente onde foi solta
    }

    sceneEl.addEventListener('pointerdown', onPointerDown);
    sceneEl.addEventListener('pointermove', onPointerMove);
    sceneEl.addEventListener('pointerup', endDrag);
    sceneEl.addEventListener('pointercancel', endDrag);
    sceneEl.addEventListener('lostpointercapture', endDrag);

    // animação viva: pequena oscilação contínua quando ninguém toca a carta,
    // deixando óbvio que é um objeto 3D real mesmo parado.
    function idleLoop(t){
      if (destroyed) return;
      if (!dragging && !isFlipping && enabled){
        const wobY = Math.sin(t / 1700) * 3;
        const wobX = Math.sin(t / 2500) * 1.4;
        apply(wobX, wobY);
      }
      idleRAF = requestAnimationFrame(idleLoop);
    }
    idleRAF = requestAnimationFrame(idleLoop);

    apply();

    return {
      flip(){
        isFlipping = true;
        cardEl.classList.add('is-transitioning');
        rotY += 180;
        apply();
        setTimeout(() => {
          cardEl.classList.remove('is-transitioning');
          isFlipping = false;
        }, 950);
      },
      reset(x = initialX, y = initialY){
        isFlipping = true;
        cardEl.classList.add('is-transitioning');
        rotX = x; rotY = y; apply();
        setTimeout(() => {
          cardEl.classList.remove('is-transitioning');
          isFlipping = false;
        }, 950);
      },
      setEnabled(v){
        enabled = v;
        if (!v){ dragging = false; cardEl.classList.remove('is-grabbing'); }
      },
      getFacing(){
        const norm = ((rotY % 360) + 360) % 360;
        return (norm > 90 && norm < 270) ? 'back' : 'front';
      },
      destroy(){
        destroyed = true;
        if (idleRAF) cancelAnimationFrame(idleRAF);
        sceneEl.removeEventListener('pointerdown', onPointerDown);
        sceneEl.removeEventListener('pointermove', onPointerMove);
        sceneEl.removeEventListener('pointerup', endDrag);
        sceneEl.removeEventListener('pointercancel', endDrag);
        sceneEl.removeEventListener('lostpointercapture', endDrag);
      }
    };
  }

  /* ---------------------------------------------------------------------
     2b. CONTROLADOR DO ENVELOPE 3D — carta e envelope como um único objeto
     ---------------------------------------------------------------------
     Nunca usa display/hidden para trocar carta <-> envelope: apenas duas
     classes de estado no mesmo elemento (.has-envelope / .is-sealed),
     e o CSS cuida da transição de encaixe/abertura com profundidade real.
  --------------------------------------------------------------------- */
  function createEnvelopeController(root, hooks = {}){
    const { onActivate, onDeactivate, onSeal, onUnseal } = hooks;
    let active = false;
    let sealed = false;
    let animating = false;

    function activate(){
      if (active) return;
      active = true;
      root.classList.add('has-envelope');
      onActivate && onActivate();
    }

    function deactivate(){
      if (!active) return;
      const finish = () => {
        active = false;
        root.classList.remove('has-envelope');
        onDeactivate && onDeactivate();
      };
      if (sealed) unseal(finish); else finish();
    }

    function seal(cb){
      if (!active || sealed || animating){ cb && cb(); return; }
      animating = true;
      activate();
      root.classList.add('is-sealed');
      sealed = true;
      onSeal && onSeal();
      setTimeout(() => { animating = false; cb && cb(); }, 1060);
    }

    function unseal(cb){
      if (!sealed || animating){ cb && cb(); return; }
      animating = true;
      root.classList.remove('is-sealed');
      sealed = false;
      onUnseal && onUnseal();
      setTimeout(() => { animating = false; cb && cb(); }, 950);
    }

    function toggleSeal(){
      if (animating) return;
      if (sealed) unseal(); else seal();
    }

    function reset(){
      active = false; sealed = false; animating = false;
      root.classList.remove('has-envelope', 'is-sealed');
    }

    function setInstant(activeVal, sealedVal){
      active = activeVal; sealed = sealedVal; animating = false;
      root.classList.toggle('has-envelope', activeVal);
      root.classList.toggle('is-sealed', sealedVal);
    }

    return {
      activate, deactivate, seal, unseal, toggleSeal, reset, setInstant,
      isActive: () => active,
      isSealed: () => sealed
    };
  }

  /* ---------------------------------------------------------------------
     3. REFERÊNCIAS AO DOM
  --------------------------------------------------------------------- */
  const openEditorBtn  = document.getElementById('openEditorBtn');
  const openDrawerBtn  = document.getElementById('openDrawerBtn');
  const closeEditorBtn = document.getElementById('closeEditorBtn');
  const editor         = document.getElementById('editor');
  const editorTitleText = document.getElementById('editorTitleText');

  const flipBtn  = document.getElementById('flipBtn');
  const saveBtn  = document.getElementById('saveBtn');
  const sendBtn  = document.getElementById('sendBtn');

  const stage = document.getElementById('stage');
  const stageHint = document.getElementById('stageHint');
  const stageScene = document.getElementById('stageScene');
  const letterObject = document.getElementById('letterObject');
  const env3dBack = document.getElementById('env3dBack');
  const env3dFlap = document.getElementById('env3dFlap');
  const envelopeToggle = document.getElementById('envelopeToggle');
  const sealToggleBtn = document.getElementById('sealToggleBtn');
  const card3d  = document.getElementById('card3d');
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
  const envelopeColorBtns = document.querySelectorAll('#envelopeColors .swatch');
  const fontBtns       = document.querySelectorAll('#fonts .option');
  const textColorBtns  = document.querySelectorAll('#textColors .swatch');
  const fontSizeSlider = document.getElementById('fontSize');
  const alignBtns      = document.querySelectorAll('#aligns .option');
  const styleBtns      = document.querySelectorAll('#styles .style-card');
  const shapeBtns      = document.querySelectorAll('#shapes .shape-card');
  const stickerPicker  = document.querySelectorAll('#stickerPicker .sticker-btn');
  const drawColorBtns  = document.querySelectorAll('#drawColors .swatch');
  const drawSizeSlider = document.getElementById('drawSize');
  const clearDrawBtn   = document.getElementById('clearDrawBtn');
  const drawLayerFront = document.getElementById('drawLayerFront');
  const drawLayerBack  = document.getElementById('drawLayerBack');

  // correio (home)
  const myIdValue  = document.getElementById('myIdValue');
  const copyIdBtn  = document.getElementById('copyIdBtn');
  const inboxGrid  = document.getElementById('inboxGrid');

  // drawer
  const drawer = document.getElementById('drawer');
  const drawerScrim = document.getElementById('drawerScrim');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');
  const drawerNewBtn = document.getElementById('drawerNewBtn');
  const myLettersList = document.getElementById('myLettersList');

  // modal de envio
  const sendModal = document.getElementById('sendModal');
  const sendModalScrim = document.getElementById('sendModalScrim');
  const recipientIdInput = document.getElementById('recipientIdInput');
  const cancelSendBtn = document.getElementById('cancelSendBtn');
  const confirmSendBtn = document.getElementById('confirmSendBtn');

  // animação de envio
  const sendFx = document.getElementById('sendFx');
  const sendFxMsg = document.getElementById('sendFxMsg');

  // visualizador
  const viewer = document.getElementById('viewer');
  const closeViewerBtn = document.getElementById('closeViewerBtn');
  const viewerHint = document.getElementById('viewerHint');
  const viewerStage = document.getElementById('viewerStage');
  const viewerScene = document.getElementById('viewerScene');
  const viewerLetterObject = document.getElementById('viewerLetterObject');
  const viewerEnvBack = document.getElementById('viewerEnvBack');
  const viewerEnvFlap = document.getElementById('viewerEnvFlap');
  const viewerCard3d = document.getElementById('viewerCard3d');
  const viewerFrameFront = document.getElementById('viewerFrameFront');
  const viewerFrameBack  = document.getElementById('viewerFrameBack');
  const viewerTextFront  = document.getElementById('viewerTextFront');
  const viewerTextBack   = document.getElementById('viewerTextBack');
  const viewerPhotoSlot  = document.getElementById('viewerPhotoSlot');
  const viewerPhotoImg   = document.getElementById('viewerPhotoImg');
  const viewerDrawFront  = document.getElementById('viewerDrawFront');
  const viewerDrawBack   = document.getElementById('viewerDrawBack');
  const viewerStickerLayerFront = document.getElementById('viewerStickerLayerFront');
  const viewerStickerLayerBack  = document.getElementById('viewerStickerLayerBack');
  const viewerFlipBtn = document.getElementById('viewerFlipBtn');

  const FONT_MAP = {
    caveat: "'Caveat', cursive",
    serif:  "'Cormorant Garamond', serif",
    jost:   "'Jost', sans-serif"
  };

  /* ---------------------------------------------------------------------
     4. ESTADO DA CARTA EM EDIÇÃO
  --------------------------------------------------------------------- */
  let letter = createBlankLetter();
  let editingId = null;
  let editorRotator = null;
  let viewerRotator = null;

  const DEFAULT_STAGE_HINT = 'arraste em qualquer ponto da carta para girá-la livremente em 3D';
  const SEALED_STAGE_HINT  = 'carta selada — toque no envelope para abrir';

  function updateSealUI(isSealed){
    sealToggleBtn.textContent = isSealed ? '✉ Abrir carta' : '✉ Selar carta';
    stageHint.textContent = isSealed ? SEALED_STAGE_HINT : DEFAULT_STAGE_HINT;
  }

  const editorEnvelope = createEnvelopeController(letterObject, {
    onActivate(){ envelopeToggle.checked = true; sealToggleBtn.disabled = false; },
    onDeactivate(){ envelopeToggle.checked = false; sealToggleBtn.disabled = true; updateSealUI(false); },
    onSeal(){ if (editorRotator) editorRotator.setEnabled(false); updateSealUI(true); },
    onUnseal(){ if (editorRotator) editorRotator.setEnabled(true); updateSealUI(false); }
  });

  envelopeToggle.addEventListener('change', () => {
    if (envelopeToggle.checked) editorEnvelope.activate();
    else editorEnvelope.deactivate();
  });
  sealToggleBtn.addEventListener('click', () => editorEnvelope.toggleSeal());
  env3dFlap.addEventListener('click', () => editorEnvelope.toggleSeal());
  env3dBack.addEventListener('click', () => { if (editorEnvelope.isActive()) editorEnvelope.toggleSeal(); });

  function createBlankLetter(){
    return {
      id: null,
      paperColor: '#FBF6F0',
      texture: 'liso',
      size: 'media',
      shape: 'classico',
      envelopeColor: '#D9C2A6',
      font: 'caveat',
      textColor: '#4A3B3B',
      fontSize: 20,
      align: 'left',
      style: 'romantico',
      textFrontHTML: '',
      textBackHTML: '',
      photo: null,
      stickersFront: [],
      stickersBack: [],
      drawFront: null,
      drawBack: null,
      createdAt: null,
      status: 'rascunho',   // 'rascunho' | 'enviada'
      recipientId: null,
      sentAt: null
    };
  }

  /* ---------------------------------------------------------------------
     5. ABRIR / FECHAR EDITOR
  --------------------------------------------------------------------- */
  function openEditor(existingLetter){
    letter = existingLetter ? JSON.parse(JSON.stringify(existingLetter)) : createBlankLetter();
    editingId = existingLetter ? existingLetter.id : null;
    editorTitleText.textContent = existingLetter ? 'Editar carta' : 'Nova carta';

    if (editorRotator) editorRotator.destroy();
    editorRotator = createRotator(stageScene, card3d);

    // sempre reabre com o envelope desativado e a carta fora dele, para
    // não herdar o estado de uma sessão de edição anterior
    editorEnvelope.reset();
    envelopeToggle.checked = false;
    sealToggleBtn.disabled = true;
    updateSealUI(false);
    letterObject.style.setProperty('--env-color', letter.envelopeColor);

    // sempre reabre na aba "Papel", com o desenho desativado, para não
    // herdar um estado de "modo desenho" de uma sessão de edição anterior
    tabs.forEach(t => t.classList.remove('is-active'));
    tabPanels.forEach(p => p.classList.remove('is-active'));
    document.querySelector('.tab[data-tab="papel"]').classList.add('is-active');
    document.querySelector('.tab-panel[data-panel="papel"]').classList.add('is-active');
    drawLayerFront.classList.remove('is-drawable');
    drawLayerBack.classList.remove('is-drawable');

    applyLetterToDOM();
    editor.classList.add('is-open');
    editor.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    closeDrawer();
  }

  function closeEditor(){
    editor.classList.remove('is-open');
    editor.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (editorRotator){ editorRotator.destroy(); editorRotator = null; }
    editorEnvelope.reset();
  }

  openEditorBtn.addEventListener('click', () => openEditor(null));
  drawerNewBtn.addEventListener('click', () => openEditor(null));
  closeEditorBtn.addEventListener('click', closeEditor);
  editor.addEventListener('click', (e) => {
    if (e.target === editor) closeEditor();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (editor.classList.contains('is-open')) closeEditor();
    if (drawer.classList.contains('is-open')) closeDrawer();
    if (sendModal.classList.contains('is-open')) closeSendModal();
    if (viewer.classList.contains('is-open')) closeViewer();
  });

  flipBtn.addEventListener('click', () => editorRotator && editorRotator.flip());

  /* ---------------------------------------------------------------------
     6. PERSONALIZAÇÃO
  --------------------------------------------------------------------- */
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('is-active'));
      tabPanels.forEach(p => p.classList.remove('is-active'));
      tab.classList.add('is-active');
      document.querySelector(`.tab-panel[data-panel="${tab.dataset.tab}"]`).classList.add('is-active');

      const isDrawing = tab.dataset.tab === 'desenhar';
      drawLayerFront.classList.toggle('is-drawable', isDrawing);
      drawLayerBack.classList.toggle('is-drawable', isDrawing);
      if (editorRotator){
        editorRotator.setEnabled(!isDrawing);
        if (isDrawing) editorRotator.reset(0, 0); // achata a carta de frente pra desenhar com precisão
      }
    });
  });

  paperColorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      letter.paperColor = btn.dataset.color;
      setActive(paperColorBtns, btn);
      applyPaper();
    });
  });

  textureBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      letter.texture = btn.dataset.texture;
      setActive(textureBtns, btn);
      applyPaper();
    });
  });

  sizeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      letter.size = btn.dataset.size;
      setActive(sizeBtns, btn);
      applySize();
      resizeDrawCanvases(); // a área de desenho precisa se ajustar ao novo tamanho
    });
  });

  shapeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      letter.shape = btn.dataset.shape;
      setActive(shapeBtns, btn);
      applyShape();
    });
  });

  envelopeColorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      letter.envelopeColor = btn.dataset.envcolor;
      setActive(envelopeColorBtns, btn);
      letterObject.style.setProperty('--env-color', letter.envelopeColor);
    });
  });

  fontBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      letter.font = btn.dataset.font;
      setActive(fontBtns, btn);
      applyTextStyle();
    });
  });

  textColorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      letter.textColor = btn.dataset.color;
      setActive(textColorBtns, btn);
      applyTextStyle();
    });
  });

  fontSizeSlider.addEventListener('input', () => {
    letter.fontSize = Number(fontSizeSlider.value);
    applyTextStyle();
  });

  alignBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      letter.align = btn.dataset.align;
      setActive(alignBtns, btn);
      applyTextStyle();
    });
  });

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

  function applyShape(){
    card3d.classList.remove('shape--classico','shape--pergaminho','shape--coracao');
    card3d.classList.add(`shape--${letter.shape}`);
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
    document.getElementById('stage').classList.remove('style--romantico','style--classico','style--vintage','style--minimalista');
    document.getElementById('stage').classList.add(`style--${letter.style}`);
  }

  /* ---------------------------------------------------------------------
     7. ADESIVOS
  --------------------------------------------------------------------- */
  stickerPicker.forEach(btn => {
    btn.addEventListener('click', () => addSticker(btn.dataset.sticker));
  });

  function addSticker(emoji){
    const facing = editorRotator ? editorRotator.getFacing() : 'front';
    const layer = facing === 'back' ? stickerLayerBack : stickerLayerFront;
    const list = facing === 'back' ? letter.stickersBack : letter.stickersFront;
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

    let draggingSticker = false;
    el.addEventListener('pointerdown', (e) => {
      draggingSticker = true;
      el.setPointerCapture(e.pointerId);
      e.stopPropagation();
    });
    el.addEventListener('pointermove', (e) => {
      if (!draggingSticker) return;
      const rect = layer.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      data.x = Math.max(0, Math.min(100, x));
      data.y = Math.max(0, Math.min(100, y));
      el.style.left = data.x + '%';
      el.style.top = data.y + '%';
      e.stopPropagation();
    });
    el.addEventListener('pointerup', (e) => { draggingSticker = false; e.stopPropagation(); });
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
     7b. DESENHAR — canvas livre sobre a carta (mouse + toque)
     ---------------------------------------------------------------------
     Enquanto a aba "Desenhar" está aberta, a rotação fica travada e a
     carta se acomoda de frente (ver setEnabled/reset acima), então as
     coordenadas de tela mapeiam direto para o canvas, sem distorção de
     perspectiva 3D — essencial para o traço acompanhar o dedo/mouse
     com precisão.
  --------------------------------------------------------------------- */
  let currentDrawColor = '#4A3B3B';
  let currentDrawSize = 3;

  drawColorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      currentDrawColor = btn.dataset.drawcolor;
      setActive(drawColorBtns, btn);
    });
  });
  drawSizeSlider.addEventListener('input', () => {
    currentDrawSize = Number(drawSizeSlider.value);
  });

  function fitCanvas(canvas){
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const dpr = window.devicePixelRatio || 1;

    let prevDataURL = null;
    if (canvas.width > 0 && canvas.height > 0 && canvas.dataset.hasInk === '1'){
      prevDataURL = canvas.toDataURL();
    }

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (prevDataURL){
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = prevDataURL;
    }
  }

  function resizeDrawCanvases(){
    fitCanvas(drawLayerFront);
    fitCanvas(drawLayerBack);
  }

  function loadDrawingInto(canvas, dataURL){
    if (!dataURL) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
      canvas.dataset.hasInk = '1';
    };
    img.src = dataURL;
  }

  function setupFreehandDrawing(canvas, field){
    let drawing = false;
    let lastX = 0, lastY = 0;
    let pointerId = null;

    function toLocal(e){
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    canvas.addEventListener('pointerdown', (e) => {
      if (!canvas.classList.contains('is-drawable')) return;
      e.stopPropagation();
      e.preventDefault();
      drawing = true;
      pointerId = e.pointerId;
      canvas.setPointerCapture(pointerId);
      const p = toLocal(e);
      lastX = p.x; lastY = p.y;
      // ponto único (toque sem arrastar) já deixa uma marca
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = currentDrawColor;
      ctx.beginPath();
      ctx.arc(p.x, p.y, currentDrawSize / 2, 0, Math.PI * 2);
      ctx.fill();
      canvas.dataset.hasInk = '1';
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!drawing || e.pointerId !== pointerId) return;
      e.stopPropagation();
      e.preventDefault();
      const p = toLocal(e);
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = currentDrawColor;
      ctx.lineWidth = currentDrawSize;
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      lastX = p.x; lastY = p.y;
    });

    function endStroke(e){
      if (!drawing || (e && e.pointerId !== pointerId)) return;
      drawing = false;
      try { canvas.releasePointerCapture(pointerId); } catch {}
      pointerId = null;
      letter[field] = canvas.toDataURL('image/png');
    }
    canvas.addEventListener('pointerup', endStroke);
    canvas.addEventListener('pointercancel', endStroke);
  }
  setupFreehandDrawing(drawLayerFront, 'drawFront');
  setupFreehandDrawing(drawLayerBack, 'drawBack');

  clearDrawBtn.addEventListener('click', () => {
    const facing = editorRotator ? editorRotator.getFacing() : 'front';
    const canvas = facing === 'back' ? drawLayerBack : drawLayerFront;
    const field = facing === 'back' ? 'drawBack' : 'drawFront';
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    canvas.dataset.hasInk = '0';
    letter[field] = null;
  });

  /* ---------------------------------------------------------------------
     8. FOTO
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

  textFront.addEventListener('input', () => { letter.textFrontHTML = textFront.innerHTML; });
  textBack.addEventListener('input',  () => { letter.textBackHTML  = textBack.innerHTML;  });

  function applyLetterToDOM(){
    setActiveByValue(paperColorBtns, 'color', letter.paperColor);
    setActiveByValue(textureBtns, 'texture', letter.texture);
    setActiveByValue(sizeBtns, 'size', letter.size);
    setActiveByValue(shapeBtns, 'shape', letter.shape || 'classico');
    setActiveByValue(envelopeColorBtns, 'envcolor', letter.envelopeColor);
    applyPaper();
    applySize();
    applyShape();
    letterObject.style.setProperty('--env-color', letter.envelopeColor);

    setActiveByValue(fontBtns, 'font', letter.font);
    setActiveByValue(textColorBtns, 'color', letter.textColor);
    setActiveByValue(alignBtns, 'align', letter.align);
    fontSizeSlider.value = letter.fontSize;
    applyTextStyle();

    setActiveByValue(styleBtns, 'style', letter.style);
    applyStylePreset();

    textFront.innerHTML = letter.textFrontHTML || '';
    textBack.innerHTML = letter.textBackHTML || '';

    applyPhoto();
    renderAllStickers();

    // reseta e reajusta as camadas de desenho para o tamanho atual da carta,
    // depois recarrega o traço salvo (se houver) em cada face
    drawLayerFront.dataset.hasInk = '0';
    drawLayerBack.dataset.hasInk = '0';
    resizeDrawCanvases();
    setTimeout(() => {
      loadDrawingInto(drawLayerFront, letter.drawFront);
      loadDrawingInto(drawLayerBack, letter.drawBack);
    }, 60);
  }

  function setActiveByValue(collection, attr, value){
    collection.forEach(el => {
      el.classList.toggle('is-active', el.dataset[attr] === value);
    });
  }

  /* ---------------------------------------------------------------------
     9. SALVAR CARTA + "MINHAS CARTAS" (drawer)
  --------------------------------------------------------------------- */
  function loadLetters(){ return readJSON(STORAGE.LETTERS, []); }
  function persistLetters(letters){ writeJSON(STORAGE.LETTERS, letters); }

  function saveLetter(silent){
    const letters = loadLetters();
    letter.textFrontHTML = textFront.innerHTML;
    letter.textBackHTML = textBack.innerHTML;

    if (editingId){
      const idx = letters.findIndex(l => l.id === editingId);
      letter.id = editingId;
      letter.createdAt = letters[idx] ? letters[idx].createdAt : Date.now();
      if (idx > -1) letters[idx] = letter; else letters.push(letter);
    } else {
      letter.id = uid('letter');
      letter.createdAt = Date.now();
      editingId = letter.id;
      letters.push(letter);
    }

    persistLetters(letters);
    renderMyLetters();
    if (!silent) flashSaved();
    return letter;
  }

  function flashSaved(){
    const original = saveBtn.innerHTML;
    saveBtn.innerHTML = '<span class="icon-btn__glyph">✓</span> Salvo';
    setTimeout(() => { saveBtn.innerHTML = original; }, 1400);
  }

  saveBtn.addEventListener('click', () => saveLetter(false));

  function renderMyLetters(){
    const letters = loadLetters().sort((a, b) => b.createdAt - a.createdAt);

    if (letters.length === 0){
      myLettersList.innerHTML = `<div class="drawer__empty">Você ainda não criou nenhuma carta.</div>`;
      return;
    }

    myLettersList.innerHTML = '';
    letters.forEach(l => {
      const item = document.createElement('button');
      item.className = 'my-letter-item';

      const swatch = document.createElement('span');
      swatch.className = 'my-letter-item__swatch';
      swatch.style.backgroundColor = l.paperColor;

      const body = document.createElement('span');
      body.className = 'my-letter-item__body';

      const preview = document.createElement('div');
      preview.className = 'my-letter-item__preview';
      const tmp = document.createElement('div');
      tmp.innerHTML = l.textFrontHTML || '';
      preview.textContent = tmp.textContent || 'Carta em branco';

      const meta = document.createElement('div');
      meta.className = 'my-letter-item__meta';
      meta.textContent = formatDate(l.createdAt);

      body.appendChild(preview);
      body.appendChild(meta);

      const tag = document.createElement('span');
      tag.className = 'status-tag ' + (l.status === 'enviada' ? 'status-tag--enviada' : 'status-tag--rascunho');
      tag.textContent = l.status === 'enviada' ? `Enviada · ${l.recipientId}` : 'Rascunho';

      item.appendChild(swatch);
      item.appendChild(body);
      item.appendChild(tag);
      item.addEventListener('click', () => openEditor(l));
      myLettersList.appendChild(item);
    });
  }

  function openDrawer(){
    renderMyLetters();
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
  }
  function closeDrawer(){
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
  }
  openDrawerBtn.addEventListener('click', openDrawer);
  closeDrawerBtn.addEventListener('click', closeDrawer);
  drawerScrim.addEventListener('click', closeDrawer);

  /* ---------------------------------------------------------------------
     10. ENVIO POR ID + CORREIO (caixa de entrada)
     ---------------------------------------------------------------------
     Sem servidor, o "envio" é simulado dentro do próprio navegador: a
     carta é guardada em uma caixa de correio compartilhada (localStorage),
     indexada pelo ID do destinatário. Funciona de verdade para testar o
     fluxo completo — inclusive enviando para o seu próprio ID — e já
     deixa a estrutura pronta para, no futuro, trocar essa gravação local
     por uma chamada de API real sem mudar o resto do app.
  --------------------------------------------------------------------- */
  function loadMailbox(){ return readJSON(STORAGE.MAILBOX, {}); }
  function persistMailbox(box){ writeJSON(STORAGE.MAILBOX, box); }

  let pendingSendLetter = null;

  function openSendModal(){
    pendingSendLetter = saveLetter(true); // garante que a versão mais recente seja enviada
    recipientIdInput.value = '';
    sendModal.classList.add('is-open');
    sendModal.setAttribute('aria-hidden', 'false');
    setTimeout(() => recipientIdInput.focus(), 250);
  }
  function closeSendModal(){
    sendModal.classList.remove('is-open');
    sendModal.setAttribute('aria-hidden', 'true');
  }
  sendBtn.addEventListener('click', openSendModal);
  cancelSendBtn.addEventListener('click', closeSendModal);
  sendModalScrim.addEventListener('click', closeSendModal);
  recipientIdInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmSendBtn.click();
  });

  confirmSendBtn.addEventListener('click', () => {
    const recipientId = recipientIdInput.value.trim().toUpperCase();
    if (!recipientId){
      recipientIdInput.focus();
      return;
    }
    closeSendModal();
    playSendAnimation(() => finalizeSend(recipientId));
  });

  function playSendAnimation(onDone){
    sendFx.classList.add('is-active');
    sendFx.classList.remove('is-flying');
    sendFxMsg.textContent = 'fechando o envelope…';
    document.getElementById('sendEnvelope').style.setProperty('--env-color', letter.envelopeColor);

    setTimeout(() => {
      sendFxMsg.textContent = 'enviando com carinho…';
      sendFx.classList.add('is-flying');
    }, 700);

    setTimeout(() => {
      sendFx.classList.remove('is-active', 'is-flying');
      onDone();
    }, 1700);
  }

  function finalizeSend(recipientId){
    const letters = loadLetters();
    const idx = letters.findIndex(l => l.id === editingId);
    if (idx > -1){
      letters[idx].status = 'enviada';
      letters[idx].recipientId = recipientId;
      letters[idx].sentAt = Date.now();
      persistLetters(letters);

      const mailbox = loadMailbox();
      if (!mailbox[recipientId]) mailbox[recipientId] = [];
      mailbox[recipientId].push({
        mailId: uid('mail'),
        fromId: getMyId(),
        deliveredAt: Date.now(),
        read: false,
        letter: JSON.parse(JSON.stringify(letters[idx]))
      });
      persistMailbox(mailbox);
    }

    renderMyLetters();
    renderInbox();
    closeEditor();
    showToast(`Carta enviada para ${recipientId} ✦`);
  }

  function renderInbox(){
    const mailbox = loadMailbox();
    const myId = getMyId();
    const items = (mailbox[myId] || []).slice().sort((a, b) => b.deliveredAt - a.deliveredAt);

    if (items.length === 0){
      inboxGrid.innerHTML = `<div class="correio__empty">Nenhuma carta chegou ainda.<br>Compartilhe seu ID (acima) para receber a primeira ♡</div>`;
      return;
    }

    inboxGrid.innerHTML = '';
    items.forEach(entry => {
      const btn = document.createElement('button');
      btn.className = 'mail-item';

      const envPreview = document.createElement('span');
      envPreview.className = 'mail-item__env';
      envPreview.style.background = entry.letter.envelopeColor || '#D9C2A6';

      const from = document.createElement('span');
      from.className = 'mail-item__from';
      from.textContent = `de ${entry.fromId}`;

      const date = document.createElement('span');
      date.className = 'mail-item__date';
      date.textContent = formatDate(entry.deliveredAt);

      btn.appendChild(envPreview);
      btn.appendChild(from);
      btn.appendChild(date);

      if (!entry.read){
        const dot = document.createElement('span');
        dot.className = 'mail-item__unread';
        btn.appendChild(dot);
      }

      btn.addEventListener('click', () => openViewer(entry));
      inboxGrid.appendChild(btn);
    });
  }

  copyIdBtn.addEventListener('click', () => {
    const id = getMyId();
    if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(id).then(() => showToast('ID copiado: ' + id));
    } else {
      showToast('Seu ID é ' + id);
    }
  });

  /* ---------------------------------------------------------------------
     11. VISUALIZADOR DE CARTA RECEBIDA (envelope -> carta 3D somente leitura)
  --------------------------------------------------------------------- */
  let currentMailEntry = null;

  const VIEWER_SEALED_HINT = 'toque no envelope para abrir';

  function updateViewerSealUI(isSealed){
    viewerHint.textContent = isSealed
      ? `carta de ${currentMailEntry ? currentMailEntry.fromId : ''} • ${VIEWER_SEALED_HINT}`
      : 'arraste para girar';
    viewerFlipBtn.hidden = isSealed;
  }

  const viewerEnvelope = createEnvelopeController(viewerLetterObject, {
    onSeal(){
      if (viewerRotator){ viewerRotator.destroy(); viewerRotator = null; }
      updateViewerSealUI(true);
    },
    onUnseal(){
      markCurrentMailRead();
      if (viewerRotator) viewerRotator.destroy();
      viewerRotator = createRotator(viewerScene, viewerCard3d);
      updateViewerSealUI(false);
    }
  });

  function markCurrentMailRead(){
    if (!currentMailEntry || currentMailEntry.read) return;
    currentMailEntry.read = true;
    const mailbox = loadMailbox();
    const myId = getMyId();
    const arr = mailbox[myId] || [];
    const idx = arr.findIndex(m => m.mailId === currentMailEntry.mailId);
    if (idx > -1){ arr[idx].read = true; mailbox[myId] = arr; persistMailbox(mailbox); }
    renderInbox();
  }

  function openViewer(entry){
    currentMailEntry = entry;
    const l = entry.letter;

    viewer.classList.add('is-open');
    viewer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // a carta chega sempre selada; o próprio envelope, no mesmo palco,
    // é o que o destinatário abre — sem trocar de painel
    if (viewerRotator){ viewerRotator.destroy(); viewerRotator = null; }
    viewerLetterObject.style.setProperty('--env-color', l.envelopeColor || '#D9C2A6');
    viewerEnvelope.setInstant(true, true);
    updateViewerSealUI(true);

    populateViewerCard(l);
  }

  function populateViewerCard(l){
    [viewerFrameFront, viewerFrameBack].forEach(frame => {
      frame.parentElement.style.backgroundColor = l.paperColor;
      frame.parentElement.classList.remove('paper--liso','paper--linho','paper--kraft','paper--vintage');
      frame.parentElement.classList.add(`paper--${l.texture}`);
    });

    viewerScene.classList.remove('size--pequena','size--grande');
    if (l.size === 'pequena') viewerScene.classList.add('size--pequena');
    if (l.size === 'grande') viewerScene.classList.add('size--grande');

    viewerCard3d.classList.remove('shape--classico','shape--pergaminho','shape--coracao');
    viewerCard3d.classList.add(`shape--${l.shape || 'classico'}`);

    [viewerTextFront, viewerTextBack].forEach(el => {
      el.style.fontFamily = FONT_MAP[l.font];
      el.style.color = l.textColor;
      el.style.textAlign = l.align;
    });
    viewerTextFront.style.fontSize = l.fontSize + 'px';
    viewerTextBack.style.fontSize = Math.max(14, l.fontSize - 2) + 'px';
    viewerTextFront.innerHTML = l.textFrontHTML || '';
    viewerTextBack.innerHTML = l.textBackHTML || '';

    if (l.photo){
      viewerPhotoImg.src = l.photo;
      viewerPhotoSlot.hidden = false;
    } else {
      viewerPhotoImg.src = '';
      viewerPhotoSlot.hidden = true;
    }

    if (l.drawFront){ viewerDrawFront.src = l.drawFront; viewerDrawFront.hidden = false; }
    else { viewerDrawFront.src = ''; viewerDrawFront.hidden = true; }
    if (l.drawBack){ viewerDrawBack.src = l.drawBack; viewerDrawBack.hidden = false; }
    else { viewerDrawBack.src = ''; viewerDrawBack.hidden = true; }

    viewerStickerLayerFront.innerHTML = '';
    viewerStickerLayerBack.innerHTML = '';
    (l.stickersFront || []).forEach(d => renderStaticSticker(viewerStickerLayerFront, d));
    (l.stickersBack || []).forEach(d => renderStaticSticker(viewerStickerLayerBack, d));

    document.getElementById('viewerStage').classList.remove('style--romantico','style--classico','style--vintage','style--minimalista');
    document.getElementById('viewerStage').classList.add(`style--${l.style}`);
  }

  function renderStaticSticker(layer, data){
    const el = document.createElement('span');
    el.className = 'sticker';
    el.style.left = data.x + '%';
    el.style.top = data.y + '%';
    el.style.cursor = 'default';
    el.textContent = data.emoji;
    layer.appendChild(el);
  }

  viewerEnvFlap.addEventListener('click', () => viewerEnvelope.toggleSeal());
  viewerEnvBack.addEventListener('click', () => viewerEnvelope.toggleSeal());

  viewerFlipBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (viewerRotator) viewerRotator.flip();
  });

  function closeViewer(){
    viewer.classList.remove('is-open');
    viewer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (viewerRotator){ viewerRotator.destroy(); viewerRotator = null; }
    currentMailEntry = null;
  }
  closeViewerBtn.addEventListener('click', closeViewer);

  /* ---------------------------------------------------------------------
     12. INICIALIZAÇÃO
  --------------------------------------------------------------------- */
  myIdValue.textContent = getMyId();
  applyLetterToDOM();
  renderMyLetters();
  renderInbox();

})();
