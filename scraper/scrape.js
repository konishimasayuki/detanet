/**
 * データロボサイトセブン スクレイパー
 * ゴールドラッシュ鳥栖店の全機種・全台の「最終ゲーム数(ハマり)」を取得し、
 * 期待値計算用の狙い台リストを出力する。
 *
 * 実行: node scrape.js
 */

const { chromium } = require('playwright');
const { Redis } = require('@upstash/redis');
const fs = require('fs');

// --- Upstash接続情報(Vercelの環境変数ページから同じ値をここに転記) ---
const UPSTASH_URL = 'https://absolute-ibex-40607.upstash.io';
const UPSTASH_TOKEN = 'AZ6fAAIgcDE0YjA4YjhiZWQ4MmY0MjZiOTcwNDdiYTY3YjM1YjRiNw';

const redis = new Redis({
  url: UPSTASH_URL,
  token: UPSTASH_TOKEN,
});

// --- サイトセブン ログイン情報 ---
const EMAIL = 'ninjin.konishi@gmail.com';
const PASSWORD = 'masa0224';
const HALLCODE = 'ba4b622a8bc31dc181da4cc498b86113'; // ゴールドラッシュ鳥栖店

// 機種ごとの設定(天井・期待収支・ゲーム単価)は、Next.js側の「設定」画面から
// Upstashの settings:${HALLCODE} キーに保存される。ここではその値を読むだけ。
async function loadSettings(hallcode) {
  try {
    const settings = await redis.get(`settings:${hallcode}`);
    return settings || {};
  } catch (e) {
    console.error('設定の読み込みに失敗しました:', e.message);
    return {};
  }
}

async function login(page) {
  await page.goto('https://www.d-deltanet.com/pc/MypageLoginTop.do', {
    waitUntil: 'networkidle',
    timeout: 60000,
  }).catch(() => {
    // networkidleが取れない場合もあるので、失敗しても続行する
  });

  try {
    // メールアドレス欄: 「メールアドレス」というテキストの近くにある入力欄を優先的に探す
    let emailInput = page.locator('input').filter({ hasNot: page.locator('[type="password"]') }).first();

    // ページ内に複数の input[type=text] がある可能性が高いので、
    // 「メールアドレス」というラベルの直後の input を優先して探す
    const byLabel = page.getByText('メールアドレス', { exact: false }).locator('xpath=following::input[1]');
    if (await byLabel.count() > 0) {
      emailInput = byLabel.first();
    }

    const passwordInput = page.locator('input[type="password"]').first();

    await emailInput.waitFor({ state: 'visible', timeout: 20000 });
    await emailInput.fill(EMAIL);
    await passwordInput.fill(PASSWORD);

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {}),
      page.getByRole('button', { name: /ログイン/ }).first().click({ timeout: 10000 }).catch(async () => {
        await page.locator('input[type="submit"], input[value*="ログイン"], button:has-text("ログイン")').first().click();
      }),
    ]);
  } catch (e) {
    // 失敗時にスクリーンショットとHTMLを保存(GitHub ActionsのArtifactで確認できるようにする)
    await page.screenshot({ path: 'login-error.png', fullPage: true }).catch(() => {});
    const html = await page.content().catch(() => '(取得失敗)');
    fs.writeFileSync('login-error.html', html, 'utf-8');
    console.error('ログイン処理でエラー:', e.message);
    throw e;
  }

  const url = page.url();
  if (url.includes('MypageLoginTop.do')) {
    await page.screenshot({ path: 'login-error.png', fullPage: true }).catch(() => {});
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

async function fetchDayInfo(context, tableInfo, day) {
  const url = `https://www.d-deltanet.com/pc/TableHistory.do?hallcode=${tableInfo.hallcode}&tablenum=${tableInfo.tablenum}&day=${day}&sort=2&sortcond=2&uritanka=${tableInfo.uritanka}&modelcode=${tableInfo.modelcode}`;

  const res = await context.request.get(url);
  const html = await res.text();

  // 一番上の行の「ゲーム」列(=その日の終了時点での最終ゲーム数)
  const gMatch = html.match(
    /<td[^>]*>--<\/td>\s*<td[^>]*>--<\/td>\s*<td[^>]*>--<\/td>\s*<td[^>]*>(\d+)<\/td>/
  );
  // 「前日 大当り回数：2回」「2日前 大当り回数：0回」等からその日の大当り回数を取得
  const hitMatch = html.match(/大当り回数[：:]\s*(\d+)\s*回/);

  return {
    g: gMatch ? parseInt(gMatch[1], 10) : null,
    hits: hitMatch ? parseInt(hitMatch[1], 10) : null,
  };
}

/**
 * 「1日前が大当り0回なら2日前(以前)から宵越しで続く」ロジック。
 * 大当りがあった日に到達するまで、日を遡ってゲーム数を合算する(最大7日前まで)。
 */
async function computeHamari(context, tableInfo) {
  const days = [];
  let hamariG = 0;

  for (let day = 1; day <= 7; day++) {
    const info = await fetchDayInfo(context, tableInfo, day);
    if (info.g === null) break;

    days.push({ day, g: info.g, hits: info.hits });
    hamariG += info.g;

    // その日に大当りがあれば、そこでハマりは切れているので遡るのを止める
    if (info.hits === null || info.hits > 0) break;
  }

  return { hamariG, days };
}

function calcExpectedValue(hamariG, modelName, settings) {
  const conf = (settings && settings[modelName]) || null;

  if (!conf || !conf.tenjyo) {
    // 設定が無い機種はざっくり平均ゲーム数超過分だけの参考値
    const avgGames = 300;
    return { expectedValue: Math.round((hamariG - avgGames) * 20), tenjyoUsed: null };
  }

  const remaining = Math.max(conf.tenjyo - hamariG, 0);
  const costPerGame = conf.costPerGameYen ?? 20;
  const payout = conf.payoutYen ?? 0;
  const expectedValue = Math.round(payout - remaining * costPerGame);

  return { expectedValue, tenjyoUsed: conf.tenjyo };
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const settings = await loadSettings(HALLCODE);

  await login(page);
  const models = await getModelList(page, HALLCODE);

  const results = [];

  for (const model of models) {
    try {
      const tables = await getTablesForModel(page, model);
      for (const t of tables) {
        const { hamariG, days } = await computeHamari(context, t);
        if (hamariG === 0 && days.length === 0) continue;

        const { expectedValue, tenjyoUsed } = calcExpectedValue(hamariG, model.name, settings);

        results.push({
          modelName: model.name,
          modelcode: t.modelcode,
          tableNumber: t.tableNumber,
          hamariG,
          day1G: days[0] ? days[0].g : null,
          day2G: days[1] ? days[1].g : null,
          tenjyoUsed,
          expectedValue,
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

  // 期待値(円)降順にソート
  results.sort((a, b) => b.expectedValue - a.expectedValue);

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
