import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_LOTTERY_ID, getLotteryConfig } from '@/lib/lotteryConfig';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || DEFAULT_LOTTERY_ID;
  const page = parseInt(searchParams.get('page') || '0');
  const pageSize = 1000;
  const tableName = getLotteryConfig(type).tableName;

  try {
    const { count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('draw_date', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      data: data || [], 
      count, 
      page, 
      hasMore: ((page + 1) * pageSize) < (count || 0) 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch data' }, { status: 500 });
  }
}
