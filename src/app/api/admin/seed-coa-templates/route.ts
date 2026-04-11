import { NextRequest, NextResponse } from 'next/server'
import { seedCoaTemplates } from '@/lib/coa/templates'

export async function POST(req: NextRequest) {
  if (req.headers.get('x-admin-key') !== process.env.ADMIN_SEED_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const count = await seedCoaTemplates()
    return NextResponse.json({ ok: true, rows_inserted: count })
  } catch (err) {
    console.error('Seed error:', err)
    return NextResponse.json({ error: 'Seed failed', detail: String(err) }, { status: 500 })
  }
}
