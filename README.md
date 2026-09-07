# ログインゲート付きシステム

## 仕組み
- `/login` にアクセスすると「ログイン」とだけ表示された画面が出る(システム名は表示されない)
- ID/パスワードが合っていればCookieがセットされ、以後どのページも見れる
- **ID/パスワードはコードのどこにも書かれていない。** Vercelの環境変数にのみ存在する

## Vercelでの設定手順

1. Vercelのプロジェクト → Settings → Environment Variables
2. 以下の2つを追加

   | Key | Value |
   |---|---|
   | `APP_LOGIN_ID` | `gold` |
   | `APP_LOGIN_PASSWORD` | `1234` |

3. 再デプロイすれば反映される

環境変数はVercelの管理画面上でしか見えず、GitHub上のコードには一切残らない。
