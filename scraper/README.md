# サイトセブン(データロボ) 狙い台スクレイパー

## これは何か
ゴールドラッシュ鳥栖店の全機種・全台を巡回し、「前日の最終ゲーム数(ハマり度)」を
取得して、期待値スコア順に並べた狙い台リストを作るスクリプト。

## セットアップ

```bash
npm install
npx playwright install --with-deps chromium
```

ローカルで試す場合:
```bash
export SITE7_EMAIL="あなたのメールアドレス"
export SITE7_PASSWORD="あなたのパスワード"
node scrape.js
```

## GitHub Actionsで自動実行する場合

1. このフォルダをGitHubリポジトリにpush
2. リポジトリの Settings → Secrets and variables → Actions で以下を登録
   - `SITE7_EMAIL`
   - `SITE7_PASSWORD`
3. `.github/workflows/scrape.yml` が毎日23:30(JST)に自動実行される
4. 実行結果は Actions の Artifacts から `result.json` としてダウンロード可能

## 現状、実機で確認が必要な箇所(未検証)

このコードは会話で見せてもらったスクショから構造を推測して書いたもので、
**まだ実際に動かして検証していない**。特に以下は動かしながら調整が必要:

1. **ログインフォームのセレクタ** (`login`関数)
   - input要素のname/id属性が実際は何なのか未確認
   - まずは `SITE7_EMAIL`/`SITE7_PASSWORD` をテスト用の値にして
     `node scrape.js` を実行し、エラーメッセージを見ながら調整するのが早い

2. **機種一覧のHTML構造** (`getModelList`関数)
   - `input[name="select"][onclick*="listClick"]` で全機種のボタンが
     取れる想定だが、機種名を取る部分(`row.querySelector('td')`)は
     実際のテーブル構造次第で調整が必要

3. **大当り一覧ページの「履歴」リンク抽出** (`getTablesForModel`関数)
   - `台番号`をどのセルから取るか、実際のHTML次第で微調整が必要

4. **最終ゲーム数の抽出正規表現** (`fetchLastGame`関数)
   - スクショで見た表構造(`--, --, --, ゲーム数, --`)を元にした正規表現。
     実際のHTMLの空白やタグの入れ方次第で外れる可能性があるので、
     一度 `console.log(html)` で該当箇所のHTMLを出力して確認するのが確実

## 次にやること

- 上記の検証をしながら動く状態に仕上げる
- 機種マスタ(`MODEL_MASTER`)に天井ゲーム数・当選確率を機種ごとに登録して
  スコア計算の精度を上げる
- 結果をUpstash RedisやDBに保存し、Next.jsの画面から見れるようにする
- 複数店舗・パチンコ機種(kind='01'など)にも対応を広げる
