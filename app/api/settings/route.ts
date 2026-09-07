import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

const HALLCODE = 'ba4b622a8bc31dc181da4cc498b86113'; // ゴールドラッシュ鳥栖店

export async function GET() {
  const settings = (await redis.get(`settings:${HALLCODE}`)) || {};
  return NextResponse.json({ settings });
}

export async function POST(req: Request) {
  const body = await req.json();
  // body: { modelName: string, tenjyo: number|null, payoutYen: number|null, costPerGameYen: number|null }
  const { modelName, tenjyo, payoutYen, costPerGameYen } = body;

  if (!modelName) {
    return NextResponse.json({ ok: false, error: '機種名が必要です' }, { status: 400 });
  }

  const current = ((await redis.get(`settings:${HALLCODE}`)) as Record<string, unknown>) || {};
  current[modelName] = { tenjyo, payoutYen, costPerGameYen };

  await redis.set(`settings:${HALLCODE}`, current);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { modelName } = await req.json();
  const current = ((await redis.get(`settings:${HALLCODE}`)) as Record<string, unknown>) || {};
  delete current[modelName];
  await redis.set(`settings:${HALLCODE}`, current);
  return NextResponse.json({ ok: true });
}
