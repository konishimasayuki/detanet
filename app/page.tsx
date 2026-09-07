import { redis } from '@/lib/redis';
import NavMenu from './components/NavMenu';
import './dashboard.css';

type TableResult = {
  modelName: string | null;
  modelcode: string;
  tableNumber: string | null;
  hamariG: number;
  day1G: number | null;
  day2G: number | null;
  tenjyoUsed: number | null;
  expectedValue: number;
};

type StoredData = {
  updatedAt: string;
  results: TableResult[];
};

export const dynamic = 'force-dynamic';

// スクレイパーがまだ本稼働してない間、画面の見た目を確認するための仮データ
const DEMO_DATA: StoredData = {
  updatedAt: new Date().toISOString(),
  results: [
    { modelName: 'L 東京喰種', modelcode: '120279', tableNumber: '866', hamariG: 1926, day1G: 1926, day2G: null, tenjyoUsed: 1500, expectedValue: 3200 },
    { modelName: 'L 真打吉宗', modelcode: '120310', tableNumber: '837', hamariG: 1140, day1G: 851, day2G: 289, tenjyoUsed: 1000, expectedValue: 1800 },
    { modelName: 'スマスロ 北斗の拳 転生の章2', modelcode: '120354', tableNumber: '772', hamariG: 1198, day1G: 1198, day2G: null, tenjyoUsed: null, expectedValue: 950 },
    { modelName: 'マイジャグラーV', modelcode: '120401', tableNumber: '312', hamariG: 987, day1G: 987, day2G: null, tenjyoUsed: null, expectedValue: 400 },
    { modelName: 'ファンキージャグラー2 KT', modelcode: '120402', tableNumber: '298', hamariG: 855, day1G: 855, day2G: null, tenjyoUsed: null, expectedValue: 210 },
    { modelName: 'L からくりサーカス2', modelcode: '120403', tableNumber: '451', hamariG: 720, day1G: 720, day2G: null, tenjyoUsed: null, expectedValue: -120 },
    { modelName: '沖ドキ！ゴージャス(30Φ)', modelcode: '120404', tableNumber: '188', hamariG: 640, day1G: 640, day2G: null, tenjyoUsed: null, expectedValue: -260 },
    { modelName: 'ハッピージャグラーVIII', modelcode: '120405', tableNumber: '502', hamariG: 590, day1G: 590, day2G: null, tenjyoUsed: null, expectedValue: -340 },
  ],
};

function formatYen(v: number) {
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toLocaleString()}円`;
}

export default async function Home() {
  let data: StoredData | null = null;
  try {
    data = await redis.get<StoredData>('goldrush-tosu:latest');
  } catch {
    data = null;
  }
  const isDemo = !data;
  const shown = data ?? DEMO_DATA;

  const top = shown.results.slice(0, 30);
  const maxAbs = Math.max(...top.map((r) => Math.abs(r.expectedValue)), 1);

  return (
    <main className="board">
      <header className="board-header">
        <div>
          <p className="board-eyebrow">GOLDRUSH TOSU</p>
          <h1 className="board-title">狙い台リスト</h1>
        </div>
        <div className="board-header-right">
          <div className="board-meta mono">
            <span>更新 {new Date(shown.updatedAt).toLocaleString('ja-JP')}</span>
            {isDemo && <span className="board-demo-tag">仮データ表示中</span>}
          </div>
          <NavMenu />
        </div>
      </header>

      <div className="board-columns mono">
        <span className="col-rank">順位</span>
        <span className="col-name">機種 / 台番号</span>
        <span className="col-hamari">ハマりG</span>
        <span className="col-day">1日前</span>
        <span className="col-day">2日前</span>
        <span className="col-value">期待値</span>
      </div>

      <ol className="board-list">
        {top.map((row, i) => {
          const intensity = Math.max(row.expectedValue, 0) / maxAbs;
          const isPositive = row.expectedValue > 0;
          return (
            <li
              key={i}
              className={`board-row${i === 0 ? ' board-row--top' : ''}`}
              style={{ '--intensity': intensity } as React.CSSProperties}
            >
              <span className="col-rank mono">{String(i + 1).padStart(2, '0')}</span>
              <span className="col-name">
                <span className="row-model">{row.modelName ?? '(不明)'}</span>
                <span className="row-table mono">#{row.tableNumber ?? '-'}</span>
              </span>
              <span className="col-hamari mono">{row.hamariG.toLocaleString()}</span>
              <span className="col-day mono">{row.day1G !== null ? row.day1G.toLocaleString() : '-'}</span>
              <span className="col-day mono">{row.day2G !== null ? row.day2G.toLocaleString() : '-'}</span>
              <span className={`col-value mono${isPositive ? ' value-positive' : ' value-negative'}`}>
                {formatYen(row.expectedValue)}
              </span>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
