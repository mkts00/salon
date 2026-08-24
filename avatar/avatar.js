const stage = document.querySelector(".avatar-stage");
const figure = document.querySelector("[data-avatar-figure]");
const status = document.querySelector("[data-avatar-status]");
const sampleList = document.querySelector("[data-avatar-samples]");
const form = document.querySelector("[data-avatar-form]");
const textarea = document.querySelector("[data-avatar-text]");
const counter = document.querySelector("[data-avatar-counter]");
const speakButton = document.querySelector("[data-avatar-speak]");
const stopButton = document.querySelector("[data-avatar-stop]");

const audio = new Audio();
audio.preload = "none";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let maxLength = 200;
let analyser = null;
let mouthFrame = null;
let activeSampleId = null;

const ERROR_MESSAGES = {
  voice_not_configured: "サーバーにAPIキーが設定されていません。",
  text_too_long: "文字数が上限を超えています。",
  empty_text: "文章を入力してください。",
  rate_limited: "短時間に多く再生しすぎました。少し待ってからお試しください。",
  invalid_api_key: "APIキーが無効と判定されました。キーが途中で欠けていないか確認してください。",
  insufficient_credit: "Fish Audio の API クレジットが不足しています。",
  upstream_failed: "音声合成サービスからエラーが返りました。",
  upstream_unreachable: "音声合成サービスに接続できませんでした。",
};

function setStatus(message) {
  status.textContent = message;
}

function setState(state) {
  stage.dataset.state = state;
}

function markActiveSample() {
  sampleList.querySelectorAll("button").forEach((button) => {
    const active = button.dataset.sampleId === activeSampleId;
    button.classList.toggle("is-playing", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

/* 音量から口の開き具合を作る */
function startLipSync() {
  if (reduceMotion.matches) return;

  if (!analyser) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      stage.classList.add("is-talking-fallback");
      return;
    }

    try {
      const context = new AudioContextClass();
      const source = context.createMediaElementSource(audio);
      analyser = context.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyser.connect(context.destination);
    } catch (error) {
      stage.classList.add("is-talking-fallback");
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
    stage.style.setProperty("--mouth", smoothed.toFixed(3));
    mouthFrame = window.requestAnimationFrame(tick);
  };

  mouthFrame = window.requestAnimationFrame(tick);
}

function stopLipSync() {
  if (mouthFrame) window.cancelAnimationFrame(mouthFrame);
  mouthFrame = null;
  stage.classList.remove("is-talking-fallback");
  stage.style.setProperty("--mouth", "0");
}

function stopSpeaking() {
  audio.pause();
  audio.removeAttribute("src");
  activeSampleId = null;
  markActiveSample();
  stopLipSync();
  stopButton.hidden = true;
  speakButton.disabled = false;
  setState("idle");
}

async function describeError(response) {
  try {
    const body = await response.json();
    return ERROR_MESSAGES[body.error] || `エラーが発生しました（${response.status}）。`;
  } catch (error) {
    return `エラーが発生しました（${response.status}）。`;
  }
}

async function speak(endpoint, caption, sampleId = null) {
  stopSpeaking();

  activeSampleId = sampleId;
  markActiveSample();
  setState("loading");
  setStatus("音声を合成しています…");
  speakButton.disabled = true;

  let response;

  try {
    response = await fetch(endpoint);
  } catch (error) {
    setStatus("通信に失敗しました。接続を確認してください。");
    stopSpeaking();
    return;
  }

  if (!response.ok) {
    setStatus(await describeError(response));
    stopSpeaking();
    return;
  }

  const blob = await response.blob();
  audio.src = URL.createObjectURL(blob);

  try {
    await audio.play();
  } catch (error) {
    setStatus("再生できませんでした。もう一度お試しください。");
    stopSpeaking();
    return;
  }

  setState("speaking");
  setStatus(caption);
  stopButton.hidden = false;
  startLipSync();
}

function updateCounter() {
  const length = textarea.value.length;
  counter.textContent = `${length} / ${maxLength}`;
  counter.classList.toggle("is-over", length > maxLength);
}

function renderSamples(samples) {
  sampleList.textContent = "";

  samples.forEach((sample) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.sampleId = sample.id;
    button.dataset.sampleText = sample.text;
    button.textContent = sample.label;
    button.setAttribute("aria-pressed", "false");
    item.append(button);
    sampleList.append(item);
  });
}

sampleList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-sample-id]");
  if (!button) return;

  speak(
    `/api/tts?id=${encodeURIComponent(button.dataset.sampleId)}`,
    button.dataset.sampleText,
    button.dataset.sampleId
  );
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = textarea.value.trim();

  if (!text) {
    setStatus("文章を入力してください。");
    return;
  }

  if (text.length > maxLength) {
    setStatus(`${maxLength}文字以内で入力してください。`);
    return;
  }

  speak(`/api/tts?text=${encodeURIComponent(text)}`, text);
});

textarea.addEventListener("input", updateCounter);
stopButton.addEventListener("click", stopSpeaking);
audio.addEventListener("ended", stopSpeaking);

async function init() {
  setState("idle");
  updateCounter();

  try {
    const response = await fetch("/api/tts?manifest=1");
    if (!response.ok) throw new Error(String(response.status));

    const manifest = await response.json();
    maxLength = manifest.maxLength || maxLength;
    textarea.maxLength = maxLength;
    updateCounter();
    renderSamples(manifest.samples);

    if (manifest.voice) {
      setStatus("サンプルを選ぶか、文章を入力して「喋らせる」を押してください。");
    } else {
      setStatus("サーバーにAPIキーが設定されていないため、音声を再生できません。");
      speakButton.disabled = true;
    }
  } catch (error) {
    setStatus("音声機能を読み込めませんでした。ページを再読み込みしてください。");
    speakButton.disabled = true;
  }
}

init();
