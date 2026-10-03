# Monster Chorochoro

- Crazy Arcade（クレイジーアーケード）風のウェブオンライン対戦ゲーム
- pnpm workspaces による monorepo 構成
- 全パッケージ TypeScript、lint / format は Biome

## 構成

- `apps/web/` — Next.js (App Router) 製のゲームクライアント
- `apps/game/` — Node.js + `ws` 製のリアルタイム WebSocket ゲームサーバー
- `packages/common/` — クライアント・サーバー共通の関数・定数（`@monster-chorochoro/common`）

## 必要環境

- Node.js 22 以上
- pnpm 10（`corepack enable` で `packageManager` のバージョンが使われる）

## コマンド（ルートで実行）

- `pnpm install` — 依存関係のインストール
- `pnpm dev` — web とゲームサーバーを同時に起動
- `pnpm dev:web` / `pnpm dev:game` — 個別に起動
- `pnpm build` — 全パッケージをビルド
- `pnpm typecheck` — 全パッケージの型チェック
- `pnpm check` / `pnpm check:fix` — Biome による lint + format チェック / 自動修正

## エディタ

- VS Code では `monster-chorochoro.code-workspace` を開く
- 推奨拡張機能 Biome (`biomejs.biome`) を入れると保存時に自動で format・lint 修正・import 整理が行われる
