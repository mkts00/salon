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

## 主なファイル

```text
.
├── assets/           # サイト内画像
├── scripts/
│   └── build.mjs     # 検証・ビルド処理
├── index.html
├── style.css
├── script.js
├── package.json
└── vercel.json
```

## 店舗情報

- 店舗名: Bloomé Body & Wellness
- 所在地: 〒182-0026 東京都調布市小島町1丁目29-11
- 営業形態: 女性専用・完全予約制プライベートサロン
