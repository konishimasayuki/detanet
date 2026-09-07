import { redis } from '@/lib/redis';
import './dashboard.css';

type TableResult = {
  modelName: string | null;
  modelcode: string;
  tableNumber: string | null;
  lastGame: number;
  avgGames: number;
  tenjyo: number | null;
  score: number;
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
    { modelName: 'L 東京喰種', modelcode: '120279', tableNumber: '866', lastGame: 1926, avgGames: 300, tenjyo: null, score: 1626 },
    { modelName: 'L 真打吉宗', modelcode: '120310', tableNumber: '837', lastGame: 1422, avgGames: 300, tenjyo: null, score: 1122 },
    { modelName: 'スマスロ 北斗の拳 転生の章2', modelcode: '120354', tableNumber: '772', lastGame: 1198, avgGames: 300, tenjyo: null, score: 898 },
    { modelName: 'マイジャグラーV', modelcode: '120401', tableNumber: '312', lastGame: 987, avgGames: 300, tenjyo: null, score: 687 },
    { modelName: 'ファンキージャグラー2 KT', modelcode: '120402', tableNumber: '298', lastGame: 855, avgGames: 300, tenjyo: null, score: 555 },
    { modelName: 'L からくりサーカス2', modelcode: '120403', tableNumber: '451', lastGame: 720, avgGames: 300, tenjyo: null, score: 420 },
    { modelName: '沖ドキ！ゴージャス(30Φ)', modelcode: '120404', tableNumber: '188', lastGame: 640, avgGames: 300, tenjyo: null, score: 340 },
    { modelName: 'ハッピージャグラーVIII', modelcode: '120405', tableNumber: '502', lastGame: 590, avgGames: 300, tenjyo: null, score: 290 },
  ],
};

export default async function Home() {
  let data: StoredData | null = null;
  try {
    data = await redis.get<StoredData>('goldrush-tosu:latest');
  } catch {
    data = null;
  }
  const isDemo = !data;
  const shown = data ?? DEMO_DATA;

  const top = shown.results.slice(0, 20);
  const maxScore = Math.max(...top.map((r) => r.score), 1);

  return (
    <main className="board">
      <header className="board-header">
        <div>
          <p className="board-eyebrow">GOLDRUSH TOSU</p>
          <h1 className="board-title">狙い台リスト</h1>
        </div>
        <div className="board-meta mono">
          <span>更新 {new Date(shown.updatedAt).toLocaleString('ja-JP')}</span>
          {isDemo && <span className="board-demo-tag">仮データ表示中</span>}
        </div>
      </header>

      <div className="board-columns mono">
        <span className="col-rank">順位</span>
        <span className="col-name">機種 / 台番号</span>
        <span className="col-game">最終ゲーム</span>
        <span className="col-score">スコア</span>
      </div>

      <ol className="board-list">
        {top.map((row, i) => {
          const intensity = row.score / maxScore;
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
              <span className="col-game mono">{row.lastGame.toLocaleString()}</span>
              <span className="col-score">
                <span className="score-bar">
                  <span className="score-bar-fill" style={{ width: `${intensity * 100}%` }} />
                </span>
                <span className="score-value mono">{row.score.toLocaleString()}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
