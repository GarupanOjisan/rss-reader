# RSS Reader

モダンなWebベースのRSSリーダーアプリケーションです。ローカルストレージを使用してデータを保存し、OPML形式でのインポート/エクスポートに対応しています。

## 機能

- 📰 RSSフィードの登録と管理
- 📅 更新日時順での記事表示
- 🔄 無限スクロールによる記事読み込み
- 📁 OPML形式でのフィードインポート/エクスポート
- 💾 ローカルストレージでのデータ永続化
- 🎨 モダンでレスポンシブなUI
- 🔗 記事クリックで外部リンクを別タブで開く

## 技術スタック

- **フロントエンド**: React 18 + TypeScript
- **ビルドツール**: Vite
- **スタイリング**: Tailwind CSS
- **RSS解析**: rss-parser
- **データ保存**: localStorage

## 開発環境のセットアップ

### 前提条件

- Node.js 16以上
- npm または yarn

### インストール

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# ビルド
npm run build

# プレビュー
npm run preview
```

---

### プロキシサーバー（CORS Anywhere）の起動手順

RSSフィードのCORS制限を回避するため、ローカルでCORSプロキシサーバー（CORS Anywhere）を起動する必要があります。

#### 1. CORS Anywhereのインストール

```bash
git clone https://github.com/Rob--W/cors-anywhere.git
cd cors-anywhere
npm install
```

#### 2. サーバーの起動

```bash
npm start
```

デフォルトでは `http://localhost:8080/` でプロキシが起動します。

#### 3. RSSリーダーの設定

アプリは自動的に `http://localhost:8080/` を最優先プロキシとして利用します。特別な設定は不要です。

## 使用方法

1. **フィードの追加**
   - 「フィード管理」ボタンをクリック
   - RSSフィードのURLを入力して追加

2. **OPMLファイルのインポート**
   - フィード管理画面で「OPMLファイルをインポート」をクリック
   - OPMLファイルを選択

3. **記事の閲覧**
   - トップページに最新記事が表示されます
   - スクロールで過去の記事を読み込み
   - 記事をクリックすると外部リンクが別タブで開きます

4. **フィードの更新**
   - ヘッダーの「更新」ボタンで全フィードを更新

## アーキテクチャ

### 全体設計

このRSS Readerは、モダンなReactアプリケーションとして設計されており、以下のアーキテクチャパターンに従っています：

- **コンポーネントベース設計**: 再利用可能なReactコンポーネントによるUI構築
- **状態管理**: React Hooks（useState, useEffect）によるローカル状態管理
- **データ永続化**: localStorageによるクライアントサイドデータ保存
- **型安全性**: TypeScriptによる完全な型定義
- **モジュラー設計**: 機能別に分離されたユーティリティモジュール

### 技術スタック詳細

#### フロントエンド
- **React 19.1.0**: 最新のReact HooksとConcurrent Features
- **TypeScript 5.8.3**: 厳密な型チェックと開発体験の向上
- **Vite 7.0.4**: 高速な開発サーバーとビルドツール

#### スタイリング
- **Tailwind CSS 3.4.17**: ユーティリティファーストのCSSフレームワーク
- **PostCSS 8.5.6**: CSS処理と最適化
- **Autoprefixer 10.4.21**: ベンダープレフィックスの自動追加

#### 開発ツール
- **ESLint 9.30.1**: コード品質と一貫性の確保
- **TypeScript ESLint**: TypeScript固有のルール
- **React Hooks ESLint**: React Hooksのルール適用

### データフロー

```
RSSフィード → RSS解析 → データ正規化 → localStorage保存 → UI表示
     ↑                                                      ↓
OPMLインポート ← フィード管理 ← ユーザー操作 ← 記事クリック → 外部リンク
```

### コアモジュール

#### 1. データ層（`src/utils/`）

**`storage.ts`** - データ永続化管理
- localStorageの抽象化
- フィード・記事のCRUD操作
- ストレージ容量管理（5MB制限対応）
- 重複データの自動クリーンアップ

**`rss.ts`** - RSS処理エンジン
- RSS 2.0 / Atom フィード解析
- CORS回避のためのプロキシサービス統合
- OPML形式のインポート/エクスポート
- 並行フィード取得処理
- エラーハンドリングとフォールバック

#### 2. 型定義（`src/types/`）

**`index.ts`** - アプリケーション全体の型定義
- `RSSFeed`: フィード情報の型
- `RSSItem`: 記事データの型
- `OPMLData`: OPML形式の型
- `AppState`: アプリケーション状態の型

#### 3. UI層（`src/components/`）

**`App.tsx`** - アプリケーションのルートコンポーネント
- グローバル状態管理
- コンポーネント間の連携
- エラーハンドリング
- 初期化処理

**`Header.tsx`** - ナビゲーションとアクション
- フィード更新機能
- フィード管理画面の切り替え
- ローディング状態の表示

**`FeedManager.tsx`** - フィード管理インターフェース
- フィードの追加・削除
- OPMLファイルのインポート/エクスポート
- フィード一覧の表示

**`ArticleList.tsx`** - 記事一覧表示
- 無限スクロール実装
- 記事の並び替え（日付順）
- パフォーマンス最適化

**`ArticleCard.tsx`** - 個別記事の表示
- 記事メタデータの表示
- 外部リンクへの遷移
- レスポンシブデザイン



**`LoadingSpinner.tsx`** - ローディング表示
- 統一されたローディングUI

### 状態管理パターン

#### グローバル状態
```typescript
// App.tsx内の主要状態
const [feeds, setFeeds] = useState<RSSFeed[]>([]);
const [articles, setArticles] = useState<RSSItem[]>([]);
const [filteredArticles, setFilteredArticles] = useState<RSSItem[]>([]);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

#### データ永続化
- **localStorage**: フィード・記事・設定の永続化
- **自動クリーンアップ**: 30日以上古い記事の自動削除
- **容量管理**: ストレージ制限への対応

### パフォーマンス最適化

#### 1. データ管理
- 当日分記事の優先保存
- 過去記事の制限（500件）
- 重複データの自動除去

#### 2. UI最適化
- 無限スクロールによる段階的読み込み
- コンポーネントの適切な分割
- 不要な再レンダリングの防止

#### 3. ネットワーク最適化
- 並行フィード取得
- プロキシサービスのフォールバック
- エラー時の適切なリトライ

### セキュリティ考慮事項

- **CORS回避**: プロキシサービスによる安全な外部アクセス
- **XSS対策**: XML解析時の適切なエスケープ処理
- **データ検証**: 入力データの型チェックと検証

### 設定ファイル

#### ビルド設定
- **`vite.config.ts`**: Viteの基本設定
- **`tsconfig.json`**: TypeScript設定（ES2022ターゲット）
- **`tailwind.config.js`**: Tailwind CSS設定
- **`eslint.config.js`**: ESLint設定（React + TypeScript）

#### 開発環境
- **Node.js 16以上**が必要
- **ES2022**ターゲットでモダンなJavaScript機能を活用
- **Strict Mode**による厳密な型チェック

## プロジェクト構造

```
src/
├── components/          # Reactコンポーネント
│   ├── Header.tsx      # ヘッダーコンポーネント
│   ├── FeedManager.tsx # フィード管理コンポーネント
│   ├── ArticleList.tsx # 記事一覧コンポーネント
│   ├── ArticleCard.tsx # 記事カードコンポーネント
│   └── LoadingSpinner.tsx # ローディングスピナー
├── types/              # TypeScript型定義
│   └── index.ts        # アプリケーション全体の型定義
├── utils/              # ユーティリティ関数
│   ├── storage.ts      # ローカルストレージ管理
│   └── rss.ts          # RSS解析・OPML処理
├── assets/             # 静的アセット
│   └── react.svg       # Reactロゴ
├── App.tsx             # メインアプリケーション
├── main.tsx            # アプリケーションエントリーポイント
└── index.css           # グローバルスタイル
```

## ライセンス

MIT License
