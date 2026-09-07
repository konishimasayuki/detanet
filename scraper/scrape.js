/**
 * データロボサイトセブン スクレイパー
 * ゴールドラッシュ鳥栖店の全機種・全台の「最終ゲーム数(ハマり)」を取得し、
 * 期待値計算用の狙い台リストを出力する。
 *
 * 実行: node scrape.js
 * 必要な環境変数: SITE7_EMAIL, SITE7_PASSWORD
 */

const { chromium } = require('playwright');
const { Redis } = require('@upstash/redis');
const fs = require('fs');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const EMAIL = process.env.SITE7_EMAIL;
const PASSWORD = process.env.SITE7_PASSWORD;
const HALLCODE = 'ba4b622a8bc31dc181da4cc498b86113'; // ゴールドラッシュ鳥栖店

if (!EMAIL || !PASSWORD) {
  console.error('SITE7_EMAIL / SITE7_PASSWORD が設定されていません');
  process.exit(1);
}

// ---- 機種マスタ(後で拡張。天井ゲーム数と当選確率の目安) ----
// modelcode をキーに、天井と参考確率を持たせる。無ければデフォルト値で計算。
const MODEL_MASTER = {
  // 例: '120279': { name: 'L東京喰種', tenjyo: 1500, prob: 1 / 400 },
};
const DEFAULT_MODEL = { tenjyo: null, prob: 1 / 300 };

async function login(page) {
  await page.goto('https://www.d-deltanet.com/pc/MypageLoginTop.do', {
    waitUntil: 'domcontentloaded',
  });

  // ラベル基準で入力欄を探す(name属性が不明でも動くようにする)
  const emailInput = page.locator('input[type="text"], input[type="email"]').first();
  const passwordInput = page.locator('input[type="password"]').first();

  await emailInput.fill(EMAIL);
  await passwordInput.fill(PASSWORD);

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {}),
    page.getByRole('button', { name: /ログイン/ }).first().click().catch(async () => {
      // ボタンが<input type="submit">の場合のフォールバック
      await page.locator('input[type="submit"], input[value*="ログイン"]').first().click();
    }),
  ]);

  const url = page.url();
  if (url.includes('MypageLoginTop.do')) {
    throw new Error('ログインに失敗した可能性があります。認証情報を確認してください。');
  }
  console.log('ログイン成功:', url);
}

async function getModelList(page, hallcode) {
  await page.goto(
    `https://www.d-deltanet.com/pc/HallSelectLink.do?hallcode=${hallcode}`,
    { waitUntil: 'domcontentloaded' }
  );

  // onclick="listClick('03','120279','1','8','2173');" 形式のボタンを全部拾う
  const models = await page.$$eval('input[name="select"][onclick*="listClick"]', (inputs) =>
    inputs.map((el) => {
      const m = el.getAttribute('onclick').match(/listClick\('([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)'\)/);
      // 機種名はテーブル行内の直前テキストから拾う(構造に依存するため要調整)
      const row = el.closest('tr');
      const nameEl = row ? row.querySelector('td') : null;
      return {
        kind: m ? m[1] : null,
        modelcode: m ? m[2] : null,
        param3: m ? m[3] : null,
        param4: m ? m[4] : null,
        uritanka: m ? m[5] : null,
        name: nameEl ? nameEl.textContent.trim().split('\n')[0] : null,
      };
    }).filter((x) => x.modelcode)
  );

  console.log(`機種数: ${models.length}`);
  return models;
}

async function getTablesForModel(page, model) {
  // listClick関数を直接呼び出して遷移させる(実際のクリックと同じ挙動)
  await page.evaluate((m) => {
    if (typeof listClick === 'function') {
      listClick(m.kind, m.modelcode, m.param3, m.param4, m.uritanka);
    }
  }, model);
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(500);

  // 大当り一覧ページの「履歴」リンクから tablenum を全部抽出
  const tables = await page.$$eval('a[href*="TableHistory.do"]', (links) =>
    links
      .filter((a) => a.textContent.includes('履歴'))
      .map((a) => {
        const url = new URL(a.href);
        const row = a.closest('tr');
        const tableNumText = row ? row.querySelector('td, th')?.textContent.trim() : null;
        return {
          href: a.href,
          hallcode: url.searchParams.get('hallcode'),
          tablenum: url.searchParams.get('tablenum'),
          modelcode: url.searchParams.get('modelcode'),
          uritanka: url.searchParams.get('uritanka'),
          tableNumber: tableNumText,
        };
      })
  );

  return tables;
}

async function fetchLastGame(context, tableInfo, day = 1) {
  const url = `https://www.d-deltanet.com/pc/TableHistory.do?hallcode=${tableInfo.hallcode}&tablenum=${tableInfo.tablenum}&day=${day}&sort=2&sortcond=2&uritanka=${tableInfo.uritanka}&modelcode=${tableInfo.modelcode}`;

  const res = await context.request.get(url);
  const html = await res.text();

  // 一番上の行の「ゲーム」列(=最終ゲーム数)を正規表現で抽出
  // 表構造: 大当り回数 | 種類 | 時間 | ゲーム | 獲得数
  // 最初の行は "--","--","--", <ゲーム数>, "--"
  const match = html.match(
    /<td[^>]*>--<\/td>\s*<td[^>]*>--<\/td>\s*<td[^>]*>--<\/td>\s*<td[^>]*>(\d+)<\/td>/
  );
  return match ? parseInt(match[1], 10) : null;
}

function calcScore(lastGame, modelcode) {
  const master = MODEL_MASTER[modelcode] || DEFAULT_MODEL;
  // シンプルな期待値スコア: 平均当選ゲーム数を超えた分をスコア化
  const avgGames = 1 / master.prob;
  const score = lastGame - avgGames;
  return { score: Math.round(score), avgGames: Math.round(avgGames), tenjyo: master.tenjyo };
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await login(page);
  const models = await getModelList(page, HALLCODE);

  const results = [];

  for (const model of models) {
    try {
      const tables = await getTablesForModel(page, model);
      for (const t of tables) {
        const lastGame = await fetchLastGame(context, t, 1); // 1 = 前日
        if (lastGame === null) continue;
        const { score, avgGames, tenjyo } = calcScore(lastGame, t.modelcode);
        results.push({
          modelName: model.name,
          modelcode: t.modelcode,
          tableNumber: t.tableNumber,
          lastGame,
          avgGames,
          tenjyo,
          score,
        });
      }
      // 機種一覧ページに戻る(次の機種のlistClickのため)
      await page.goto(
        `https://www.d-deltanet.com/pc/HallSelectLink.do?hallcode=${HALLCODE}`,
        { waitUntil: 'domcontentloaded' }
      );
    } catch (e) {
      console.error(`機種 ${model.name} の取得でエラー:`, e.message);
    }
  }

  // スコア降順(ハマり度が高い順)にソート
  results.sort((a, b) => b.score - a.score);

  fs.writeFileSync('result.json', JSON.stringify(results, null, 2), 'utf-8');
  console.log(`完了。${results.length}台分のデータを result.json に保存しました。`);
  console.log('狙い目TOP10:');
  console.table(results.slice(0, 10));

  // Upstashに保存(Next.js側の画面がここから読む)
  try {
    await redis.set('goldrush-tosu:latest', {
      updatedAt: new Date().toISOString(),
      results,
    });
    console.log('Upstashへの保存に成功しました。');
  } catch (e) {
    console.error('Upstashへの保存に失敗しました:', e.message);
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
