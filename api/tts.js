"use strict";

/**
 * Fish Audio TTS proxy.
 *
 * ブラウザからはスクリプトID（`id`）だけを受け取り、読み上げる本文と
 * APIキーはサーバー側に置く。公開LPから任意のテキストを合成できると
 * 従量課金を第三者に使われるため、読み上げ内容はこのカタログに限定する。
 *
 * 環境変数
 * - FISH_AUDIO_API_KEY  必須。Fish AudioのAPIキー。
 * - FISH_AUDIO_VOICE_ID 任意。声モデルのreference_id。未設定時は既定音声。
 * - FISH_AUDIO_MODEL    任意。合成モデル（既定: s1）。
 */

const FISH_AUDIO_ENDPOINT = "https://api.fish.audio/v1/tts";

const SCRIPTS = {
  greeting: {
    label: "サロンのご紹介",
    text: "Bloomé Body & Wellnessへようこそ。調布市の女性専用、完全予約制のプライベートサロンです。小顔、痩身、肩こり、姿勢のお悩みに、顔と身体を分けずに全身から向き合います。",
  },
  method: {
    label: "独自メソッドについて",
    text: "当サロンは、皮膚のねじれに着目した独自の技術で施術を行います。強く押して終わるのではなく、皮膚の動きから今の状態を読み取り、その方に合う方法を丁寧に組み立てていきます。",
  },
  firstvisit: {
    label: "初回体験の流れ",
    text: "初回体験では、はじめにお悩みと体調を伺い、施術内容をご説明します。オーナーの小林が最初から最後まで一対一で担当し、施術のあとはご自宅での過ごし方までお伝えします。",
  },
  reservation: {
    label: "ご予約について",
    text: "施術は完全予約制です。無理な勧誘や押し売りは行いませんので、何から相談すればよいか分からない方も、どうぞ気負わずお越しください。ご予約はページ内のボタンからお進みください。",
  },
};

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

  // 音声ボタンの一覧と字幕テキストはここから配信する（本文の二重管理を避ける）。
  if (url.searchParams.get("manifest") !== null) {
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=86400");
    return sendJson(res, 200, {
      voice: Boolean(process.env.FISH_AUDIO_API_KEY),
      scripts: Object.entries(SCRIPTS).map(([id, script]) => ({
        id,
        label: script.label,
        text: script.text,
      })),
    });
  }

  const id = url.searchParams.get("id");
  const script = Object.prototype.hasOwnProperty.call(SCRIPTS, id) ? SCRIPTS[id] : null;

  if (!script) {
    return sendJson(res, 400, { error: "unknown_script_id" });
  }

  const apiKey = process.env.FISH_AUDIO_API_KEY;

  if (!apiKey) {
    return sendJson(res, 503, { error: "voice_not_configured" });
  }

  const payload = {
    text: script.text,
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

  // 台詞は固定なのでCDNに長期キャッシュさせ、再生のたびに課金されないようにする。
  res.statusCode = 200;
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Content-Length", String(audio.length));
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=31536000, immutable");
  res.end(req.method === "HEAD" ? undefined : audio);
};
