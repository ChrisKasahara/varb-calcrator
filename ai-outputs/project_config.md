# プロジェクト構成案 (Updated)

## 1. 基本方針
「Premium」かつ「Modern」なWebアプリケーションとして、最新のReactエコシステムを活用して構築します。Next.jsによる効率的な開発と、Tailwind CSSによる美しいUI実装を目指します。

## 2. 技術スタック

| カテゴリ | 採用技術 | 選定理由 |
| --- | --- | --- |
| **Framework** | **Next.js (React)** | モダンなWebアプリ開発のデファクトスタンダード。コンポーネント指向による高い保守性と拡張性。 |
| **Language** | **TypeScript** | 型安全性による品質担保。 |
| **Styling** | **Tailwind CSS** | ユーティリティファーストCSS。迅速なスタイリングと、モダンなデザインシステム（グラデーション、ブラー等）の容易な実装。 |
| **Icons** | **Lucide React** | 美しく統一感のあるアイコンセット。 |
| **Quality** | **ESLint + Prettier** | コード品質とフォーマットの統一。 |

## 3. ディレクトリ構成予定 (App Router)

```
/
├── src/
│   ├── app/
│   │   ├── page.tsx       # メインページ
│   │   └── layout.tsx     # グローバルレイアウト
│   ├── components/        # UIコンポーネント
│   │   ├── ui/            # ボタンなどの汎用コンポーネント
│   │   └── features/      # 計算機固有のコンポーネント
│   ├── lib/               # ユーティリティ関数・ロジック
│   │   └── calculator.ts  # 計算ロジック
│   └── styles/
│       └── globals.css    # Tailwind directives & global styles
├── public/                # 静的アセット
├── package.json
├── next.config.js
└── tailwind.config.ts
```

## 4. 実行環境
- 開発: `npm run dev`
- ビルド: `npm run build`
