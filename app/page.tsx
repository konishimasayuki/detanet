import { redis } from '@/lib/redis';

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

export const dynamic = 'force-dynamic'; // 常に最新データを取得

export default async function Home() {
  const data = await redis.get<StoredData>('goldrush-tosu:latest');

  if (!data) {
    return (
      <main style={{ padding: 40, fontFamily: 'sans-serif' }}>
        <h1>データがまだありません</h1>
        <p>スクレイパーがまだ一度も実行されていません。</p>
      </main>
    );
  }

  const top = data.results.slice(0, 30);

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20 }}>狙い台リスト</h1>
      <p style={{ color: '#666', fontSize: 13 }}>
        最終更新: {new Date(data.updatedAt).toLocaleString('ja-JP')}
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
        <thead>
          <tr style={{ background: '#333', color: '#fff' }}>
            <th style={cellStyle}>順位</th>
            <th style={cellStyle}>機種名</th>
            <th style={cellStyle}>台番号</th>
            <th style={cellStyle}>最終ゲーム</th>
            <th style={cellStyle}>平均</th>
            <th style={cellStyle}>スコア</th>
          </tr>
        </thead>
        <tbody>
          {top.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#fafafa' : '#fff' }}>
              <td style={cellStyle}>{i + 1}</td>
              <td style={cellStyle}>{row.modelName ?? '(不明)'}</td>
              <td style={cellStyle}>{row.tableNumber ?? '-'}</td>
              <td style={cellStyle}>{row.lastGame}</td>
              <td style={cellStyle}>{row.avgGames}</td>
              <td style={{ ...cellStyle, fontWeight: 600 }}>{row.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

const cellStyle: React.CSSProperties = {
  border: '1px solid #ddd',
  padding: '6px 10px',
  fontSize: 13,
  textAlign: 'left',
};
