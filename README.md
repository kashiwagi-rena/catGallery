# 🐱 Cat Photo Gallery

猫の写真を保存・閲覧できるシンプルなWebアプリケーション

## 🎯 プロジェクト概要

このアプリは猫の写真をアップロード・保存し、ギャラリー形式で表示するWebアプリケーションです。
完全無料で運用でき、6時間程度で構築可能な設計になっています。

## 🛠️ 技術スタック

- **フロントエンド**: Nuxt 4 + Vue 3
- **ランタイム**: Deno
- **リンター/フォーマッター**: Biome
- **ストレージ**: Supabase Storage (無料枠)
- **認証**: Supabase Auth (オプション)
- **デプロイ**: Vercel (無料枠)

## ✨ 機能

- ✅ 猫の写真アップロード
- ✅ 写真ギャラリー表示（グリッドレイアウト）
- ✅ 写真の削除
- ✅ レスポンシブデザイン
- 🔐 認証機能（オプション）

## 📋 前提条件

以下がインストールされていること：

- [Deno](https://deno.land/) v1.40以降
- [Git](https://git-scm.com/)
- GitHubアカウント
- Vercelアカウント（無料）
- Supabaseアカウント（無料）

## 🚀 セットアップ手順

### 1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com/)にアクセスしてサインアップ
2. 新規プロジェクトを作成
   - Project Name: `cat-photo-gallery`（任意）
   - Database Password: 安全なパスワードを設定
   - Region: 最寄りのリージョンを選択（例: Northeast Asia (Tokyo)）
3. プロジェクトが作成されるまで待機（約2分）

### 2. Supabase Storageの設定

1. Supabaseダッシュボードで「Storage」を選択
2. 「Create a new bucket」をクリック
3. バケット設定：
   - Name: `cat-photos`
   - Public bucket: ✅ チェックを入れる（写真を公開表示するため）
4. 「Create bucket」をクリック

### 3. Supabase接続情報の取得

Supabaseダッシュボード > Settings > API で以下を確認：

- `Project URL` → これが `SUPABASE_URL`
- `anon` `public` キー → これが `SUPABASE_ANON_KEY`

### 4. プロジェクトのクローンとセットアップ

```bash
# リポジトリをクローン
git clone https://github.com/YOUR_USERNAME/cat-photo-gallery.git
cd cat-photo-gallery

# 環境変数ファイルを作成
cp .env.example .env

# .envファイルを編集してSupabase情報を設定
# SUPABASE_URL=your_supabase_url
# SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. 依存関係のインストールと起動

```bash
# 依存関係のインストール
deno install

# 開発サーバーの起動
deno task dev
```

ブラウザで `http://localhost:3000` にアクセス

## 🌐 デプロイ（Vercel）

### Vercelへのデプロイ手順

1. [Vercel](https://vercel.com/)にGitHubアカウントでログイン
2. 「Add New Project」をクリック
3. GitHubリポジトリを選択
4. 環境変数を設定：
   - `SUPABASE_URL`: SupabaseプロジェクトのURL
   - `SUPABASE_ANON_KEY`: Supabaseの匿名キー
5. 「Deploy」をクリック

デプロイ完了後、自動的に公開URLが発行されます。

## 📁 プロジェクト構成

```
cat-photo-gallery/
├── .vscode/              # VS Code設定
├── app/
│   ├── components/       # Vueコンポーネント
│   │   ├── PhotoUpload.vue    # 写真アップロード
│   │   └── PhotoGallery.vue   # ギャラリー表示
│   ├── composables/      # Composable関数
│   │   └── useSupabase.ts     # Supabaseクライアント
│   └── pages/
│       └── index.vue     # メインページ
├── public/               # 静的ファイル
├── server/               # サーバーサイド（必要に応じて）
├── .env                  # 環境変数（.gitignoreに追加）
├── .env.example          # 環境変数のサンプル
├── .gitignore
├── biome.json            # Biome設定
├── deno.json             # Deno設定
├── nuxt.config.ts        # Nuxt設定
└── README.md
```

## 🔧 開発コマンド

```bash
# 開発サーバー起動
deno task dev

# ビルド
deno task build

# プロダクションプレビュー
deno task preview

# リント＆フォーマット
deno task lint
deno task format

# 型チェック
deno task typecheck
```

## 🔒 セキュリティに関する注意事項

### ⚠️ 重要：本番環境での推奨設定

**現在の構成（開発用）：**
- Supabase Storageバケットは公開設定
- 認証なしで誰でもアップロード可能

**本番環境で推奨する対策：**

1. **Row Level Security (RLS) の有効化**
   ```sql
   -- Supabase SQL Editorで実行
   -- アップロードを認証ユーザーのみに制限
   CREATE POLICY "認証済みユーザーのみアップロード可能"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'cat-photos');
   ```

2. **ファイルサイズ制限の実装**
   - クライアント側: 5MB以下に制限
   - 大量アップロード対策も検討

3. **ファイルタイプの検証**
   - 画像ファイル（jpg, png, webp）のみ許可
   - MIMEタイプチェックを実装

4. **レート制限**
   - Vercel Edge Functionsでレート制限を追加
   - 悪意のあるアップロード対策

### 教育ポイント

**なぜこれらが重要か：**
- 無制限アップロードは無料枠を即座に消費する可能性があります
- 不適切なコンテンツのアップロードを防ぐ必要があります
- ストレージコストは予想以上に高額になる可能性があります

**段階的な実装をお勧めします：**
1. まず動くものを作る（現在の構成）
2. 基本的な制限を追加（ファイルサイズ、タイプ）
3. 認証機能を追加（Supabase Auth）
4. RLSポリシーで保護を強化

## 📊 無料枠の制限

### Supabase無料枠
- ストレージ: 1GB
- データベース: 500MB
- 帯域幅: 5GB/月
- API リクエスト: 無制限（合理的な使用範囲内）

### Vercel無料枠
- デプロイ: 無制限
- 帯域幅: 100GB/月
- 実行時間: 100時間/月

**監視方法：**
- Supabaseダッシュボードで使用量を定期的に確認
- 80%到達時にアラート設定を推奨

## 🐛 トラブルシューティング

### よくある問題

**1. 画像がアップロードできない**
```
エラー: "new row violates row-level security policy"
→ Storageバケットの公開設定を確認
→ RLSポリシーを確認
```

**2. 画像が表示されない**
```
→ バケット名が正しいか確認（cat-photos）
→ バケットが公開設定になっているか確認
→ ブラウザのコンソールでエラーを確認
```

**3. Deno実行エラー**
```
→ Denoのバージョンを確認: deno --version
→ キャッシュをクリア: deno cache --reload
```

## 📚 参考リンク

- [Nuxt 4 Documentation](https://nuxt.com/)
- [Supabase Documentation](https://supabase.com/docs)
- [Deno Manual](https://deno.land/manual)
- [Biome Documentation](https://biomejs.dev/)

## 🤝 コントリビューション

プルリクエストを歓迎します！大きな変更の場合は、まずIssueを開いて変更内容を議論してください。

## 📝 ライセンス

MIT

## 👨‍💻 開発者向けメモ

### 今後の拡張案

- [ ] 画像の編集機能（クロップ、リサイズ）
- [ ] タグ付け機能
- [ ] 検索・フィルター機能
- [ ] お気に入り機能
- [ ] 画像の共有機能
- [ ] PWA対応（オフライン閲覧）

### パフォーマンス最適化

- [ ] 画像の遅延読み込み（Lazy Loading）
- [ ] サムネイル生成（Supabase Functions）
- [ ] CDN活用（Vercel Edge Network）
- [ ] 画像フォーマットの最適化（WebP変換）

---

**作成時間目安: 6時間**
- セットアップ: 1時間
- 基本機能実装: 4時間
- デプロイ＆調整: 1時間

Happy Coding! 🐱✨
