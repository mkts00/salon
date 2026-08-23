"use strict";

/**
 * Fish Audio TTS proxy.
 *
 * APIキーはこのサーバー側だけに置き、ブラウザには渡さない。
 * 公開URLから無制限に合成できると従量課金を第三者に使われるため、
 * 文字数の上限とIPごとの回数制限をかけている。
 *
 * 環境変数
 * - FISH_AUDIO_API_KEY  必須。Fish AudioのAPIキー。
 * - FISH_AUDIO_VOICE_ID 任意。声モデルのreference_id。未設定時は既定音声。
 * - FISH_AUDIO_MODEL    任意。合成モデル（既定: s1）。
 */

const FISH_AUDIO_ENDPOINT = "https://api.fish.audio/v1/tts";

const MAX_TEXT_LENGTH = 200;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 12;

const SAMPLES = {
  greeting: {
    label: "あいさつ",
    text: "こんにちは。私はイラストのアバターです。入力した文章を、そのまま声にして読み上げます。",
  },
  weather: {
    label: "今日の天気",
    text: "今日はよく晴れています。日中は少し暑くなりそうなので、こまめに水分をとってお過ごしください。",
  },
  tongue: {
    label: "早口ことば",
    text: "生麦、生米、生卵。隣の客はよく柿食う客だ。東京特許許可局。",
  },
  intro: {
    label: "しくみの説明",
    text: "この声は、フィッシュオーディオという音声合成のサービスで作っています。音の大きさに合わせて、口の開き方を変えています。",
  },
};

// サーバーレス関数のインスタンスごとの簡易レートリミット。
// 完全ではないが、1つのブラウザからの連打を止めるには十分。
const requestLog = new Map();

function isRateLimited(key) {
  const now = Date.now();
  const recent = (requestLog.get(key) || []).filter(
    (time) => now - time < RATE_LIMIT_WINDOW_MS
  );

  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    requestLog.set(key, recent);
    return true;
  }

  recent.push(now);
  requestLog.set(key, recent);

  // 古いエントリが溜まり続けないように、たまに掃除する。
  if (requestLog.size > 500) {
    for (const [loggedKey, times] of requestLog) {
      if (times.every((time) => now - time >= RATE_LIMIT_WINDOW_MS)) {
        requestLog.delete(loggedKey);
      }
    }
  }

  return false;
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return sendJson(res, 405, { error: "method_not_allowed" });
  }

  const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);

  // 一時的な診断用。値は返さず、変数名と環境の判定だけを返す。
  if (url.searchParams.get("debug") !== null) {
    res.setHeader("Cache-Control", "no-store");
    return sendJson(res, 200, {
      vercelEnv: process.env.VERCEL_ENV || null,
      branch: process.env.VERCEL_GIT_COMMIT_REF || null,
      hasApiKey: Boolean(process.env.FISH_AUDIO_API_KEY),
      apiKeyLength: (process.env.FISH_AUDIO_API_KEY || "").length,
      matchingVarNames: Object.keys(process.env)
        .filter((name) => /fish|audio|tts/i.test(name))
        .sort(),
    });
  }

  if (url.searchParams.get("manifest") !== null) {
    res.setHeader("Cache-Control", "public, max-age=60");
    return sendJson(res, 200, {
      voice: Boolean(process.env.FISH_AUDIO_API_KEY),
      maxLength: MAX_TEXT_LENGTH,
      samples: Object.entries(SAMPLES).map(([id, sample]) => ({
        id,
        label: sample.label,
        text: sample.text,
      })),
    });
  }

  const id = url.searchParams.get("id");
  const freeText = url.searchParams.get("text");
  let text = null;
  let cacheable = false;

  if (id !== null) {
    const sample = Object.prototype.hasOwnProperty.call(SAMPLES, id) ? SAMPLES[id] : null;
    if (!sample) return sendJson(res, 400, { error: "unknown_sample_id" });
    text = sample.text;
    cacheable = true;
  } else if (freeText !== null) {
    text = freeText.trim();
    if (!text) return sendJson(res, 400, { error: "empty_text" });
    if (text.length > MAX_TEXT_LENGTH) {
      return sendJson(res, 413, { error: "text_too_long", maxLength: MAX_TEXT_LENGTH });
    }
  } else {
    return sendJson(res, 400, { error: "missing_text" });
  }

  const apiKey = process.env.FISH_AUDIO_API_KEY;
  if (!apiKey) return sendJson(res, 503, { error: "voice_not_configured" });

  const clientKey =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  if (isRateLimited(clientKey)) {
    res.setHeader("Retry-After", "60");
    return sendJson(res, 429, { error: "rate_limited" });
  }

  const payload = {
    text,
    format: "mp3",
    mp3_bitrate: 128,
    normalize: true,
    latency: "normal",
  };

  const voiceId = process.env.FISH_AUDIO_VOICE_ID;
  if (voiceId) payload.reference_id = voiceId;

  let upstream;

  try {
    upstream = await fetch(FISH_AUDIO_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        model: process.env.FISH_AUDIO_MODEL || "s1",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Fish Audio request failed:", error);
    return sendJson(res, 502, { error: "upstream_unreachable" });
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    console.error(`Fish Audio responded ${upstream.status}: ${detail.slice(0, 500)}`);
    return sendJson(res, 502, { error: "upstream_failed", status: upstream.status });
  }

  const audio = Buffer.from(await upstream.arrayBuffer());

  res.statusCode = 200;
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Content-Length", String(audio.length));
  // 固定の台本はURLが変わらないのでCDNに長期キャッシュさせる。
  // 自由入力も同じ文章ならCDNヒットするが、短めの期限にしておく。
  res.setHeader(
    "Cache-Control",
    cacheable
      ? "public, max-age=3600, s-maxage=31536000, immutable"
      : "public, max-age=600, s-maxage=86400"
  );
  res.end(req.method === "HEAD" ? undefined : audio);
};
