export const runtime = 'edge';

import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    const scatterRes = await fetch('https://api.scatter.art/v1/mint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!scatterRes.ok) {
      const errorData = await scatterRes.text()
      console.error('Scatter API error:', errorData);
      return NextResponse.json({ error: errorData }, { status: 500 });
    }
    const data = await scatterRes.json();
    return NextResponse.json(data.mintTransaction);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 