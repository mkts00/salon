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

## 音声ガイド（Fish Audio）

画面右下のアバターから、サロン案内を音声で再生できます。音声は
[Fish Audio](https://fish.audio/) のTTS APIで合成し、再生中は音量に合わせて
アバターの口が動きます（WebAudioのAnalyserで振幅を取得）。

### 環境変数

`.env.example` をコピーして値を設定し、Vercelでは
Project Settings → Environment Variables に同じキーを登録してください。

| 変数 | 必須 | 内容 |
| --- | --- | --- |
| `FISH_AUDIO_API_KEY` | 必須 | Fish AudioのAPIキー |
| `FISH_AUDIO_VOICE_ID` | 任意 | 声モデルの `reference_id`。未設定なら既定音声 |
| `FISH_AUDIO_MODEL` | 任意 | 合成モデル（既定: `s1`） |

APIキーが未設定の場合、パネルには「音声案内は現在準備中です。」と表示され、
ページのほかの機能には影響しません。

### 読み上げ内容の編集

読み上げるテキストは `api/tts.js` の `SCRIPTS` に定義しています。
ブラウザからは台本のID（`greeting` など）しか送れないため、公開ページから
任意の文章を合成されて課金が発生することはありません。台本の追加・修正は
このオブジェクトを編集するだけで、フロント側の変更は不要です。

合成した音声はCDNに長期キャッシュされるため、同じ台本の再生でAPIが
繰り返し呼ばれることはありません。**台本を変更したときは、その台本の
`id` を変えるか、Vercelのキャッシュをパージしてください。**

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
├── assets/           # サイト内画像
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
