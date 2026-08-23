const avatarWidget = document.querySelector("[data-avatar]");

if (avatarWidget) {
  const toggleButton = avatarWidget.querySelector("[data-avatar-toggle]");
  const panel = avatarWidget.querySelector("[data-avatar-panel]");
  const closeButton = avatarWidget.querySelector("[data-avatar-close]");
  const scriptList = avatarWidget.querySelector("[data-avatar-scripts]");
  const caption = avatarWidget.querySelector("[data-avatar-caption]");
  const figure = avatarWidget.querySelector("[data-avatar-figure]");

  const audio = new Audio();
  audio.preload = "none";
  audio.crossOrigin = "anonymous";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let manifestPromise = null;
  let currentId = null;
  let analyser = null;
  let mouthFrame = null;

  function setState(state) {
    avatarWidget.dataset.state = state;
  }

  function setCaption(text) {
    caption.textContent = text;
  }

  function markActiveButton() {
    scriptList.querySelectorAll("button").forEach((button) => {
      const active = button.dataset.scriptId === currentId;
      button.classList.toggle("is-playing", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  // 音量から口の開き具合を作る。WebAudioが使えない環境では
  // CSSのループアニメーションにフォールバックする。
  function startLipSync() {
    if (reduceMotion.matches) return;

    if (!analyser) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        figure.classList.add("is-talking-fallback");
        return;
      }

      try {
        const context = new AudioContextClass();
        const source = context.createMediaElementSource(audio);
        analyser = context.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        analyser.connect(context.destination);
        analyser.context = context;
      } catch (error) {
        figure.classList.add("is-talking-fallback");
        return;
      }
    }

    if (analyser.context.state === "suspended") analyser.context.resume();

    const samples = new Uint8Array(analyser.fftSize);
    let smoothed = 0;

    const tick = () => {
      analyser.getByteTimeDomainData(samples);

      let sum = 0;
      for (let i = 0; i < samples.length; i += 1) {
        const deviation = (samples[i] - 128) / 128;
        sum += deviation * deviation;
      }

      const level = Math.min(1, Math.sqrt(sum / samples.length) * 4.5);
      smoothed += (level - smoothed) * 0.35;
      figure.style.setProperty("--mouth", smoothed.toFixed(3));
      mouthFrame = window.requestAnimationFrame(tick);
    };

    mouthFrame = window.requestAnimationFrame(tick);
  }

  function stopLipSync() {
    if (mouthFrame) window.cancelAnimationFrame(mouthFrame);
    mouthFrame = null;
    figure.classList.remove("is-talking-fallback");
    figure.style.setProperty("--mouth", "0");
  }

  function loadManifest() {
    if (!manifestPromise) {
      manifestPromise = fetch("/api/tts?manifest=1")
        .then((response) => {
          if (!response.ok) throw new Error(`manifest ${response.status}`);
          return response.json();
        })
        .catch((error) => {
          manifestPromise = null;
          throw error;
        });
    }

    return manifestPromise;
  }

  function renderScripts(manifest) {
    scriptList.textContent = "";

    manifest.scripts.forEach((script) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.scriptId = script.id;
      button.dataset.scriptText = script.text;
      button.textContent = script.label;
      button.setAttribute("aria-pressed", "false");
      item.append(button);
      scriptList.append(item);
    });
  }

  function stopSpeaking() {
    audio.pause();
    audio.removeAttribute("src");
    currentId = null;
    stopLipSync();
    markActiveButton();
    setState("idle");
  }

  async function speak(button) {
    const id = button.dataset.scriptId;

    if (currentId === id && !audio.paused) {
      stopSpeaking();
      setCaption("");
      return;
    }

    currentId = id;
    markActiveButton();
    setState("loading");
    setCaption(button.dataset.scriptText);

    audio.src = `/api/tts?id=${encodeURIComponent(id)}`;

    try {
      await audio.play();
      setState("speaking");
      startLipSync();
    } catch (error) {
      currentId = null;
      markActiveButton();
      setState("idle");
      setCaption("音声を再生できませんでした。時間をおいてお試しください。");
    }
  }

  async function openPanel() {
    avatarWidget.classList.add("is-open");
    toggleButton.setAttribute("aria-expanded", "true");

    if (scriptList.dataset.ready === "true") return;

    setCaption("音声を準備しています…");

    try {
      const manifest = await loadManifest();

      if (!manifest.voice) {
        setCaption("音声案内は現在準備中です。");
        return;
      }

      renderScripts(manifest);
      scriptList.dataset.ready = "true";
      setCaption("聞きたい内容をお選びください。");
    } catch (error) {
      setCaption("音声案内を読み込めませんでした。");
    }
  }

  function closePanel() {
    avatarWidget.classList.remove("is-open");
    toggleButton.setAttribute("aria-expanded", "false");
    stopSpeaking();
  }

  toggleButton.addEventListener("click", () => {
    if (avatarWidget.classList.contains("is-open")) {
      closePanel();
    } else {
      openPanel();
    }
  });

  closeButton.addEventListener("click", closePanel);

  scriptList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-script-id]");
    if (button) speak(button);
  });

  audio.addEventListener("ended", () => {
    stopSpeaking();
  });

  audio.addEventListener("error", () => {
    if (!audio.currentSrc) return;
    stopSpeaking();
    setCaption("音声を読み込めませんでした。時間をおいてお試しください。");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && avatarWidget.classList.contains("is-open")) {
      closePanel();
    }
  });

  setState("idle");
}
