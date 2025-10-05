(function () {
  'use strict';

  /**
   * State
   */
  const board = Array(9).fill('');
  let currentPlayer = 'X';
  let phase = 'placement'; // 'placement' | 'movement' | 'ended'
  const tokensPlaced = { X: 0, O: 0 };
  const tokensMax = 3;
  let selectedIndex = null; // for movement selection
  const scores = { X: 0, O: 0, tie: 0 };

  /**
   * Audio
   */
  let moveSound, winSound, tieSound;
  function initAudio() {
    try {
      moveSound = new Audio('assets/sounds/sound_move.mp3');
      moveSound.volume = 0.7;
    } catch {}
    try {
      winSound = new Audio('assets/sounds/sound_win.mp3');
      winSound.volume = 0.85;
    } catch {}
    try {
      tieSound = new Audio('assets/sounds/sound_tie.mp3');
      tieSound.volume = 0.75;
    } catch {}
  }

  /**
   * DOM
   */
  const welcomeScreen = document.getElementById('welcome-screen');
  const gameScreen = document.getElementById('game-screen');
  const startGameBtn = document.getElementById('start-game-btn');
  const boardEl = document.getElementById('board');
  const cells = Array.from(boardEl.querySelectorAll('.cell'));
  const statusEl = document.getElementById('status');
  const scoreXEl = document.getElementById('scoreXValue');
  const scoreOEl = document.getElementById('scoreOValue');
  const scoreTieEl = document.getElementById('scoreTieValue');
  const scoreXWrap = document.getElementById('score-x');
  const scoreOWrap = document.getElementById('score-o');
  const tokensXEl = document.getElementById('tokensX');
  const tokensOEl = document.getElementById('tokensO');
  const resetBtn = document.getElementById('resetBtn');
  const themeToggle = document.getElementById('themeToggle');
  const modeSelect = document.getElementById('mode');
  const musicEl = document.getElementById('bgMusic');
  const musicToggleBtn = document.getElementById('musicToggle');
  const musicNextBtn = document.getElementById('musicNext');
  const trackLabel = document.getElementById('trackLabel');

  /**
   * Utils
   */
  const winningCombos = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  function isBoardFull() {
    return board.every(Boolean);
  }

  function getWinner() {
    for (const [a, b, c] of winningCombos) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { player: board[a], line: [a, b, c] };
      }
    }
    return null;
  }

  function switchPlayer() {
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    updateActiveScoreIndicator();
  }

  function updateActiveScoreIndicator() {
    scoreXWrap.classList.toggle('active', currentPlayer === 'X' && phase !== 'ended');
    scoreOWrap.classList.toggle('active', currentPlayer === 'O' && phase !== 'ended');
  }

  function updateTokensUI() {
    const remainingX = Math.max(0, tokensMax - tokensPlaced.X);
    const remainingO = Math.max(0, tokensMax - tokensPlaced.O);
    tokensXEl.textContent = String(remainingX);
    tokensOEl.textContent = String(remainingO);
  }

  function updateStatus(message, cls) {
    statusEl.textContent = message;
    statusEl.classList.remove('player-x', 'player-o', 'victory');
    if (cls) statusEl.classList.add(cls);
  }

  function announceState() {
    if (phase === 'placement') {
      updateStatus(`Phase de Placement : C'est le tour du joueur ${currentPlayer}`, currentPlayer === 'X' ? 'player-x' : 'player-o');
    } else if (phase === 'movement') {
      updateStatus(`Phase de Déplacement : Joueur ${currentPlayer}, sélectionnez un jeton`, currentPlayer === 'X' ? 'player-x' : 'player-o');
    }
  }

  function renderBoard() {
    cells.forEach((cell, idx) => {
      cell.innerHTML = '';
      cell.classList.toggle('occupied', Boolean(board[idx]));
      const val = board[idx];
      if (val) {
        const piece = document.createElement('div');
        piece.className = `piece piece-${val.toLowerCase()}`;
        piece.setAttribute('aria-label', `Jeton ${val}`);
        if (phase === 'movement' && selectedIndex === idx) {
          piece.classList.add('selected');
        }
        cell.appendChild(piece);
      }
    });
  }

  function placePiece(index) {
    if (board[index]) return false;
    if (tokensPlaced[currentPlayer] >= tokensMax) return false;
    board[index] = currentPlayer;
    tokensPlaced[currentPlayer] += 1;
    try { moveSound && moveSound.play().catch(() => {}); } catch {}
    return true;
  }

  function getAdjacentIndices(i) {
    const row = Math.floor(i / 3);
    const col = i % 3;
    const result = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = row + dr;
        const c = col + dc;
        if (r >= 0 && r < 3 && c >= 0 && c < 3) {
          result.push(r * 3 + c);
        }
      }
    }
    return result;
  }

  function canMove(from, to) {
    if (!board[from] || board[to]) return false;
    // Allow adjacent moves (including diagonals) for smooth play
    return getAdjacentIndices(from).includes(to);
  }

  function movePiece(from, to) {
    if (!canMove(from, to)) return false;
    const pieceVal = board[from];

    // 3D smooth movement using WAAPI and a ghost element for ultra-fluidity
    const fromCell = cells[from];
    const toCell = cells[to];
    const pieceEl = fromCell.querySelector('.piece');
    if (pieceEl) {
      const fromRect = pieceEl.getBoundingClientRect();
      const toRect = toCell.getBoundingClientRect();
      const ghost = pieceEl.cloneNode(true);
      ghost.classList.add('ghost-piece', 'trail');
      ghost.style.left = `${fromRect.left}px`;
      ghost.style.top = `${fromRect.top}px`;
      ghost.style.width = `${fromRect.width}px`;
      ghost.style.height = `${fromRect.height}px`;
      ghost.style.transformOrigin = '50% 50%';
      document.body.appendChild(ghost);

      const deltaX = toRect.left - fromRect.left;
      const deltaY = toRect.top - fromRect.top;

      // Add brief depth-of-field blur to the scene
      const scene = document.querySelector('.app');
      if (scene) scene.classList.add('scene-blur');

      const anim = ghost.animate([
        { transform: 'translate3d(0,0,0) rotateX(0deg) rotateY(0deg) scale(1)', filter: 'brightness(1)' },
        { transform: `translate3d(${deltaX * 0.5}px, ${deltaY * 0.5}px, 20px) rotateX(5deg) rotateY(-5deg) scale(1.03)`, filter: 'brightness(1.02)' },
        { transform: `translate3d(${deltaX}px, ${deltaY}px, 0px) rotateX(0deg) rotateY(0deg) scale(1)`, filter: 'brightness(1)' }
      ], {
        duration: 250,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      });

      anim.addEventListener('finish', () => {
        ghost.remove();
        board[from] = '';
        board[to] = pieceVal;
        renderBoard();
        if (scene) scene.classList.remove('scene-blur');
        // particles at destination
        spawnParticlesAtCell(to);
      });
    } else {
      // Fallback without ghost
      board[from] = '';
      board[to] = pieceVal;
      renderBoard();
    }

    try { moveSound && moveSound.play().catch(() => {}); } catch {}
    return true;
  }

  function celebrateWin(line) {
    statusEl.classList.add('victory');
    line.forEach((idx) => {
      const cell = cells[idx];
      const piece = cell.querySelector('.piece');
      if (piece) {
        piece.style.animation = 'celebrate 0.6s ease-in-out 0s 3';
      }
    });
  }

  function endRound(winner) {
    phase = 'ended';
    if (winner) {
      scores[winner] += 1;
      (winner === 'X' ? scoreXEl : scoreOEl).textContent = String(scores[winner]);
      updateStatus(`Victoire du joueur Jàngalek{winner}! 🎉 (Ndanane bi amna ndam)`, 'victory');
      try { winSound && winSound.play().catch(() => {}); } catch {}
    } else {
      scores.tie += 1;
      scoreTieEl.textContent = String(scores.tie);
      updateStatus('Match nul! 🤝');
      try { tieSound && tieSound.play().catch(() => {}); } catch {}
    }
    updateActiveScoreIndicator();
    // Disable any further interaction
    cells.forEach((c) => c.setAttribute('disabled', 'true'));
  }

  function evaluateBoard(postMove = false) {
    const result = getWinner();
    if (result) {
      celebrateWin(result.line);
      endRound(result.player);
      return true;
    }
    if (postMove && phase === 'placement' && tokensPlaced.X === tokensMax && tokensPlaced.O === tokensMax) {
      phase = 'movement';
      announceState();
    }
    if (phase !== 'placement' && phase !== 'movement' && isBoardFull()) {
      endRound(null);
      return true;
    }
    return false;
  }

  function handleCellClick(e) {
    const index = Number(e.currentTarget.getAttribute('data-index'));
    if (phase === 'ended') return;

    if (phase === 'placement') {
      if (placePiece(index)) {
        renderBoard();
        const placedPiece = cells[index].querySelector('.piece');
        if (placedPiece) {
          // 3D spawn using WAAPI for ultra-fluid entrance
          placedPiece.animate([
            { transform: 'translateZ(-40px) rotateX(-10deg) rotateY(8deg) scale(0.3)', opacity: 0 },
            { transform: 'translateZ(15px) rotateX(2deg) rotateY(-2deg) scale(1.05)', opacity: 1 },
            { transform: 'translateZ(0) rotateX(0) rotateY(0) scale(1)', opacity: 1 }
          ], { duration: 200, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' });
          // dust
          spawnParticlesFromElement(placedPiece);
        }
        if (!evaluateBoard(true)) {
          switchPlayer();
          announceState();
          updateTokensUI();
        } else {
          updateTokensUI();
        }
      }
      return;
    }

    if (phase === 'movement') {
      const val = board[index];
      if (selectedIndex == null) {
        if (val === currentPlayer) {
          selectedIndex = index;
          renderBoard();
          updateStatus(`Phase de Déplacement : Jeton ${currentPlayer} sélectionné. Choisissez une destination.`, currentPlayer === 'X' ? 'player-x' : 'player-o');
        }
      } else {
        if (index === selectedIndex) {
          selectedIndex = null;
          renderBoard();
          announceState();
          return;
        }
        if (movePiece(selectedIndex, index)) {
          selectedIndex = null;
          renderBoard();
          if (!evaluateBoard()) {
            switchPlayer();
            announceState();
          }
        } else {
          // invalid move; brief feedback
          updateStatus(`Mouvement invalide. Choisissez une case adjacente vide.`, currentPlayer === 'X' ? 'player-x' : 'player-o');
        }
      }
    }
  }

  function resetGame(hard = false) {
    board.fill('');
    tokensPlaced.X = 0;
    tokensPlaced.O = 0;
    selectedIndex = null;
    phase = 'placement';
    currentPlayer = 'X';
    if (hard) {
      scores.X = 0; scores.O = 0; scores.tie = 0;
      scoreXEl.textContent = '0';
      scoreOEl.textContent = '0';
      scoreTieEl.textContent = '0';
    }
    updateTokensUI();
    updateActiveScoreIndicator();
    announceState();
    renderBoard();
    cells.forEach((c) => c.removeAttribute('disabled'));
  }

  // Keyboard navigation between cells
  function handleKeyNav(e) {
    const active = document.activeElement;
    const idx = cells.indexOf(active);
    if (idx === -1) return;
    let target = null;
    switch (e.key) {
      case 'ArrowUp': target = idx - 3; break;
      case 'ArrowDown': target = idx + 3; break;
      case 'ArrowLeft': target = idx - 1; break;
      case 'ArrowRight': target = idx + 1; break;
      case 'Escape': selectedIndex = null; renderBoard(); announceState(); return;
      default: return;
    }
    if (target != null && target >= 0 && target < 9) {
      cells[target].focus();
      e.preventDefault();
    }
  }

  function bindEvents() {
    cells.forEach((cell) => {
      cell.addEventListener('click', handleCellClick);
      cell.addEventListener('keydown', handleKeyNav);
    });
    resetBtn.addEventListener('click', () => resetGame(false));
    themeToggle.addEventListener('click', () => {
      const root = document.documentElement;
      const isLight = root.getAttribute('data-theme') === 'light';
      root.setAttribute('data-theme', isLight ? 'dark' : 'light');
    });
    modeSelect.addEventListener('change', () => {
      // Placeholder for future AI integration; keep PvP for now
    });

    // Music playlist with crossfade and label
    // Build from HTML <audio> sources if present, else fallback to defaults
   
    const audio = document.getElementById('bgMusic');
    const toggleBtn = document.getElementById('musicToggle');
    const nextBtn = document.getElementById('musicNext');
    const trackLabel = document.getElementById('trackLabel');
  
    const tracks = [
      'assets/sounds/Youssou_Ndour_-_Mbeug_l_Is_All_Version_Mbalax_Ch_rie_Coco_Ch_rie_Coco_(mp3.pm).mp3',
      'assets/sounds/Neneh_Cherry_and_Youssou_NDour_-_Seven_Second_(mp3.pm).mp3',
      'assets/sounds/Youssou_N_Dour_Le_Super_toile_De_Dakar_-_New_Africa_(mp3.pm).mp3',
      'assets/sounds/Youssou_NDour_Le_Super_Etoile_-_Xarit_(mp3.pm).mp3'
    ];
  
    let currentTrack = 0;
    audio.src = tracks[currentTrack];
  
    toggleBtn.addEventListener('click', () => {
      if (audio.paused) {
        audio.play().then(() => {
          toggleBtn.textContent = '⏸';
          trackLabel.textContent = `Lecture : ${tracks[currentTrack].split('/').pop()}`;
        }).catch(err => {
          console.log('Lecture bloquée :', err);
        });
      } else {
        audio.pause();
        toggleBtn.textContent = '▶️';
      }
    });
  
    nextBtn.addEventListener('click', () => {
      currentTrack = (currentTrack + 1) % tracks.length;
      audio.src = tracks[currentTrack];
      audio.play();
      trackLabel.textContent = `Lecture : ${tracks[currentTrack].split('/').pop()}`;
    });
  
  
    // Force start music immediately on page load
    setTimeout(() => {
      if (!isPlaying) {
        playCurrent();
      }
    }, 1000);

    // Attempt muted autoplay and lift volume on first interaction
    (function setupAutoplay() {
      const active = usingA ? audioA : audioB;
      try {
        active.volume = 0;
        active.play().then(() => { isPlaying = true; labelTrack(); }).catch(() => {});
      } catch {}

      function onFirstInteraction() {
        if (!isPlaying) {
          playCurrent();
        } else {
          const start = performance.now();
          function fadeUp(ts) {
            const t = Math.min(1, (ts - start) / 800);
            (usingA ? audioA : audioB).volume = 0.4 * t;
            if (t < 1) requestAnimationFrame(fadeUp);
          }
          requestAnimationFrame(fadeUp);
        }
        window.removeEventListener('pointerdown', onFirstInteraction);
        window.removeEventListener('keydown', onFirstInteraction);
        window.removeEventListener('touchstart', onFirstInteraction, { passive: true });
      }
      window.addEventListener('pointerdown', onFirstInteraction, { once: true });
      window.addEventListener('keydown', onFirstInteraction, { once: true });
      window.addEventListener('touchstart', onFirstInteraction, { once: true, passive: true });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && !isPlaying) {
          playCurrent();
        }
      });
    })();

    // Dynamic board tilt and shifting highlights following cursor
    let rafId = null;
    function handlePointerMove(ev) {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const rect = boardEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (ev.clientX - cx) / rect.width;
      const dy = (ev.clientY - cy) / rect.height;
      const rotX = dy * 6;
      const rotY = -dx * 6;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        boardEl.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
        // update highlights on pieces to simulate specular shift
        const pieces = boardEl.querySelectorAll('.piece');
        pieces.forEach((p) => {
          const pr = p.getBoundingClientRect();
          const px = (ev.clientX - pr.left) / pr.width; // 0..1
          const py = (ev.clientY - pr.top) / pr.height; // 0..1
          const hlx = Math.max(5, Math.min(75, px * 70 + 10));
          const hly = Math.max(5, Math.min(75, py * 70 + 10));
          p.style.setProperty('--hl-x', `${hlx}%`);
          p.style.setProperty('--hl-y', `${hly}%`);
        });
      });
    }
    function handlePointerLeave() {
      if (rafId) cancelAnimationFrame(rafId);
      boardEl.style.transform = '';
    }
    document.addEventListener('pointermove', handlePointerMove);
    boardEl.addEventListener('mouseleave', handlePointerLeave);
  }

  function showGame() {
    // Transition vers le jeu
    welcomeScreen.style.opacity = '0';
    welcomeScreen.style.transform = 'scale(0.9)';
    
    setTimeout(() => {
      welcomeScreen.style.display = 'none';
      gameScreen.style.display = 'block';
      gameScreen.style.opacity = '0';
      gameScreen.style.transform = 'scale(1.1)';
      
      // Animation d'entrée du jeu
      requestAnimationFrame(() => {
        gameScreen.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        gameScreen.style.opacity = '1';
        gameScreen.style.transform = 'scale(1)';
      });
      
      // Initialiser le jeu
      initGame();
    }, 800);
  }

  function initGame() {
    initAudio();
    updateTokensUI();
    updateActiveScoreIndicator();
    announceState();
    renderBoard();
    bindEvents();
  }

  function init() {
    // Gérer le bouton de démarrage
    if (startGameBtn) {
      startGameBtn.addEventListener('click', showGame);
    }
    
    // Si pas de page d'accueil, initialiser directement le jeu
    if (!welcomeScreen) {
      initGame();
    }
  }

  // Particle helpers
  function spawnParticlesFromElement(el) {
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    for (let i = 0; i < 10; i++) spawnParticle(x, y);
  }
  function spawnParticlesAtCell(index) {
    const cell = cells[index];
    const rect = cell.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    for (let i = 0; i < 12; i++) spawnParticle(x, y);
  }
  function spawnParticle(x, y) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    const angle = Math.random() * Math.PI * 2;
    const dist = 20 + Math.random() * 40;
    const tx = Math.cos(angle) * dist;
    const ty = Math.sin(angle) * dist;
    const scale = 0.6 + Math.random() * 0.9;
    document.body.appendChild(p);
    const anim = p.animate([
      { transform: 'translate(-50%,-50%) scale(0.4)', opacity: 0.9 },
      { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(${scale})`, opacity: 0 }
    ], { duration: 300, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' });
    anim.addEventListener('finish', () => p.remove());
  }
  /**
   * AI Engine (Minimax)
   */
  let gameMode = 'pvp'; // 'pvp', 'ai-easy', 'ai-expert'
  const aiPlayer = 'O';
  const humanPlayer = 'X';
  const MAX_DEPTH = 5; // Limite de profondeur pour le mode facile

  function getLegalMoves(currentBoard, player) {
    const moves = [];
    const playerTokens = currentBoard.reduce((acc, val, i) => {
      if (val === player) acc.push(i);
      return acc;
    }, []);

    // Phase de Placement
    if (tokensPlaced[player] < tokensMax) {
      currentBoard.forEach((val, index) => {
        if (!val) moves.push({ type: 'place', index: index });
      });
      return moves;
    }
    // Phase de Mouvement
    if (playerTokens.length === tokensMax) {
      playerTokens.forEach(from => {
        getAdjacentIndices(from).forEach(to => {
          if (!currentBoard[to]) {
            moves.push({ type: 'move', from: from, to: to });
          }
        });
      });
      return moves;
    }
    return moves;
  }

  function getScore(currentBoard) {
    const result = getWinner(currentBoard);
    if (result) {
      return result.player === aiPlayer ? 100 : -100;
    }
    // Pas de match nul pour l'instant car le plateau peut se vider
    return 0;
  }

  function applyMove(currentBoard, move, player) {
    const newBoard = [...currentBoard];
    if (move.type === 'place') {
      newBoard[move.index] = player;
    } else if (move.type === 'move') {
      newBoard[move.to] = newBoard[move.from];
      newBoard[move.from] = '';
    }
    return newBoard;
  }

  function minimax(currentBoard, depth, isMaximizing, currentTokensPlaced, maxDepth) {
    const score = getScore(currentBoard);

    if (score !== 0) return score;

    // Condition d'arrêt pour le mode 'easy' ou plateau plein
    if (depth === maxDepth) return 0;
    
    // Déterminer le joueur pour cette itération
    const player = isMaximizing ? aiPlayer : humanPlayer;
    const moves = getLegalMoves(currentBoard, player);

    // Fin de jeu par match nul (plus de coups légaux pour le joueur actuel)
    if (moves.length === 0) return 0;

    if (isMaximizing) {
      let bestScore = -Infinity;
      for (const move of moves) {
        const newBoard = applyMove(currentBoard, move, player);
        // Simuler le passage en phase de mouvement si on est à la fin du placement
        const newTokensPlaced = {...currentTokensPlaced};
        if (move.type === 'place') newTokensPlaced[player] += 1;
        
        const nextPhase = (newTokensPlaced[aiPlayer] === tokensMax && newTokensPlaced[humanPlayer] === tokensMax) ? 'movement' : 'placement';
        
        // La récursivité doit simuler le reste de la partie, mais sans les compteurs globaux pour le placement
        // Pour Minimax, on ne se soucie pas des compteurs après la phase de placement.
        const simulatedDepth = (nextPhase === 'placement' && depth < tokensMax * 2 - 1) ? depth + 1 : depth;

        const value = minimax(newBoard, simulatedDepth, false, newTokensPlaced, maxDepth);
        bestScore = Math.max(bestScore, value);
      }
      return bestScore;
    } else {
      let bestScore = Infinity;
      for (const move of moves) {
        const newBoard = applyMove(currentBoard, move, player);
        const newTokensPlaced = {...currentTokensPlaced};
        if (move.type === 'place') newTokensPlaced[player] += 1;

        const nextPhase = (newTokensPlaced[aiPlayer] === tokensMax && newTokensPlaced[humanPlayer] === tokensMax) ? 'movement' : 'placement';
        const simulatedDepth = (nextPhase === 'placement' && depth < tokensMax * 2 - 1) ? depth + 1 : depth;
        
        const value = minimax(newBoard, simulatedDepth, true, newTokensPlaced, maxDepth);
        bestScore = Math.min(bestScore, value);
      }
      return bestScore;
    }
  }

  function findBestMove() {
    let bestScore = -Infinity;
    let bestMove = null;
    const moves = getLegalMoves(board, aiPlayer);

    // Déterminer la profondeur maximale
    let maxDepth = (gameMode === 'ai-expert') ? Infinity : MAX_DEPTH;

    // Pour le mode facile, ajouter un élément d'aléatoire pour le rendre moins parfait
    const isEasy = gameMode === 'ai-easy';
    const easyThreshold = 0.3; // 30% de chance de choisir un coup aléatoire

    if (isEasy && Math.random() < easyThreshold) {
      bestMove = moves[Math.floor(Math.random() * moves.length)];
      console.log('IA (Facile) a choisi un coup aléatoire.');
      return bestMove;
    }

    for (const move of moves) {
      const newBoard = applyMove(board, move, aiPlayer);
      
      const newTokensPlaced = {...tokensPlaced};
      if (move.type === 'place') newTokensPlaced[aiPlayer] += 1;
      
      const score = minimax(newBoard, 0, false, newTokensPlaced, maxDepth);

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    return bestMove;
  }

  function makeAIMove() {
    updateStatus(`Réflexion de l'IA (O)...`, 'player-o');
    // Délai pour simuler la "réflexion" et permettre l'affichage du statut
    setTimeout(() => {
      const move = findBestMove();
      if (!move) {
        console.error("L'IA n'a pas trouvé de coup légal.");
        endRound(null); // Match nul si l'IA ne peut plus jouer
        return;
      }

      let success = false;
      if (move.type === 'place') {
        success = placePiece(move.index);
        if (success) {
          const placedPiece = cells[move.index].querySelector('.piece');
          if (placedPiece) {
            placedPiece.animate([
              { transform: 'translateZ(-40px) scale(0.3)', opacity: 0 },
              { transform: 'translateZ(0) scale(1)', opacity: 1 }
            ], { duration: 200, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' });
          }
        }
      } else if (move.type === 'move') {
        success = movePiece(move.from, move.to);
        // Note: movePiece gère déjà l'animation
      }

      if (success) {
        if (!evaluateBoard(true)) {
          switchPlayer();
          announceState();
          updateTokensUI();
          // L'IA a joué son coup, le tour passe à l'humain.
        } else {
          updateTokensUI();
        }
      } else {
        console.error('Erreur: Coup de l/IA invalide.', move);
      }
    }, 500); // Délai de 0.5s pour l'effet "pensée"
  }

  // DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();


