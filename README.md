# Bloomé Body & Wellness LP

東京都調布市の女性専用プライベートサロン「Bloomé Body & Wellness」のランディングページです。

小顔、痩身、肩こり、姿勢、自律神経の悩みに対して、皮膚のねじれに着目した独自メソッドを紹介し、初回体験予約につなげる構成です。

## 技術構成

- HTML
- CSS
- Vanilla JavaScript
- Node.js 22
- 外部フロントエンドライブラリなし

## ローカル表示

任意の静的ファイルサーバーでプロジェクトルートを配信してください。

```bash
python3 -m http.server 4173
```

ブラウザで <http://127.0.0.1:4173/> を開きます。

## ビルド

```bash
npm install
npm run build
```

ビルド時にHTMLとCSS内のローカル参照を検証し、公開用ファイルを `dist/` に出力します。

## Vercelへのデプロイ

Vercelでは以下の設定が `vercel.json` から自動的に適用されます。

- Build Command: `npm run build`
- Output Directory: `dist`
- Node.js: `22.x`

GitHubリポジトリをVercelへ連携するか、Vercel CLIからデプロイしてください。

## しゃべるアバター（Fish Audio）

`/avatar` は、入力した文章を音声に合成してイラストのアバターに読み上げさせる
単体ページです。LP本体とは独立しており、LPからは参照していません。

- 音声合成: [Fish Audio](https://fish.audio/) の TTS API
- 口の動き: Web Audio API の AnalyserNode で音量を取得し、口の開き方に反映
- サンプル台本のボタンと、200文字までの自由入力の両方に対応

### 環境変数

`.env.example` をコピーして値を設定し、Vercelでは
Project Settings → Environment Variables に同じキーを登録してください。
**Production と Preview の両方**に設定し、追加後は再デプロイが必要です。

| 変数 | 必須 | 内容 |
| --- | --- | --- |
| `FISH_AUDIO_API_KEY` | 必須 | Fish AudioのAPIキー |
| `FISH_AUDIO_VOICE_ID` | 任意 | 声モデルの `reference_id`。未設定なら既定音声 |
| `FISH_AUDIO_MODEL` | 任意 | 合成モデル（既定: `s1`） |

APIキーが未設定でもページは表示され、その旨のメッセージが出るだけです。

### 課金の暴走を防ぐしくみ

公開URLから無制限に合成できると、従量課金を第三者に使われます。
`api/tts.js` で次の制限をかけています。

- 文字数は200文字まで（`MAX_TEXT_LENGTH`）
- 同一IPからの合成は1分あたり12回まで（超過すると429）
- APIキーはサーバー側の環境変数のみに置き、ブラウザには渡さない
- 同じ文章はCDNにキャッシュされ、再生のたびにAPIを呼ばない

サンプル台本の文面は `api/tts.js` の `SAMPLES` で編集できます。

### ローカルでの確認

`/api/tts` はVercelのサーバーレス関数なので、静的サーバーでは動きません。
音声まで確認する場合は Vercel CLI を使ってください。

```bash
vercel dev
```

## 主なファイル

```text
.
├── api/
│   └── tts.js        # Fish Audio TTSプロキシ（サーバーレス関数）
├── api/
│   └── tts.js        # Fish Audio TTSプロキシ（サーバーレス関数）
├── assets/           # サイト内画像
├── avatar/           # しゃべるアバター（単体ページ）
│   ├── index.html
│   ├── avatar.css
│   └── avatar.js
├── scripts/
│   └── build.mjs     # 検証・ビルド処理
├── index.html
├── style.css
├── script.js
├── avatar.js         # 音声ガイドのアバター制御
├── package.json
└── vercel.json
```

## 店舗情報

- 店舗名: Bloomé Body & Wellness
- 所在地: 〒182-0026 東京都調布市小島町1丁目29-11
- 営業形態: 女性専用・完全予約制プライベートサロン
