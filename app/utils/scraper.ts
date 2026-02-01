// // Setup type definitions for built-in Supabase Runtime APIs
// import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
// import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';
// import cheerio from 'npm:cheerio@1.0.0-rc.12';

// const corsHeaders = {
//   'Access-Control-Allow-Origin': '*',
//   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
//   'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
// };

// const BASE_URL = 'https://www.lotto-8.com/malaysia/listltoTOTO58.asp';

// // Create admin (service role) client
// function supabaseAdmin(): SupabaseClient {
//   const url = Deno.env.get('SUPABASE_URL') ?? '';
//   const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
//   return createClient(url, key);
// }

// // Fetch page HTML with timeout
// async function fetchPageHtml(
//   pageIndex: number,
//   timeoutMs = 15000
// ): Promise<string | null> {
//   const url = `${BASE_URL}?indexpage=${pageIndex}&orderby=new`;

//   try {
//     const controller = new AbortController();
//     const timer = setTimeout(() => controller.abort(), timeoutMs);

//     const res = await fetch(url, {
//       headers: {
//         'User-Agent':
//           'Mozilla/5.0 (compatible; SupabaseEdgeFunction/1.0; +https://supabase.com)',
//       },
//       signal: controller.signal,
//     });

//     clearTimeout(timer);

//     if (!res.ok) {
//       console.warn(`Fetch page ${pageIndex} failed: HTTP ${res.status}`);
//       return null;
//     }

//     return await res.text();
//   } catch (err) {
//     console.warn(`Fetch page ${pageIndex} error`, err);
//     return null;
//   }
// }

// // Parse page HTML into structured rows
// function parsePageResults(html: string, sourcePage: number) {
//   const $ = cheerio.load(html);
//   const results: Array<any> = [];

//   // Helper to parse draw date in dd/mmyy format
//   const parseDrawDate = (dateText: string): string | null => {
//     const match = dateText.match(/(\d{1,2})\/(\d{2})(\d{2})/);
//     if (!match) return null;

//     const [, d, m, yy] = match;
//     const y = '20' + yy; // convert "24" -> "2024"
//     return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
//   };

//   $('#ltotable tr').each((i, row) => {
//     if (i === 0) return; // skip header row

//     const cols = $(row)
//       .find('td')
//       .map((_, el) => $(el).text().trim())
//       .get();

//     if (!cols || cols.length < 2) return;

//     const dateText = cols[0];
//     const numbersText = cols[1];

//     const matches = numbersText.match(/\d+/g);
//     if (!matches || matches.length < 6) return;

//     const numbers = matches.slice(0, 6).map((n) => parseInt(n, 10));

//     let special: number | null = null;
//     if (matches.length > 6) {
//       const s = parseInt(matches[6], 10);
//       if (!isNaN(s)) special = s;
//     }

//     const drawDate = parseDrawDate(dateText);

//     results.push({
//       draw_date: drawDate,
//       numbers,       // store numbers as-is
//       special,
//       source_page: sourcePage,
//       source_row: i,
//       raw_text: cols.join(' | '),
//     });
//   });

//   return results;
// }

// // Insert results using database-enforced uniqueness on draw_date + numbers
// async function upsertResultsToDb(
//   supabase: SupabaseClient,
//   rows: Array<any>
// ) {
//   const toInsert = rows
//     .filter((r) => r.draw_date !== null)
//     .map((r) => ({
//       draw_date: r.draw_date,
//       numbers: r.numbers,
//       special: r.special ?? null,
//       source_page: r.source_page,
//       source_row: r.source_row,
//       raw_text: r.raw_text,
//     }));

//   if (!toInsert.length) return { inserted: 0 };

//   const { error } = await supabase
//     .from('supreme_toto_6_58')
//     .upsert(toInsert, {
//       onConflict: ['draw_date', 'numbers'], // uniqueness constraint matches table
//       ignoreDuplicates: true,
//     });

//   if (error) {
//     console.error('Upsert error', error);
//     throw error;
//   }

//   return { inserted: toInsert.length };
// }

// // Main handler
// Deno.serve(async (req: Request) => {
//   if (req.method === 'OPTIONS') {
//     return new Response('ok', { headers: corsHeaders });
//   }

//   if (req.method !== 'POST') {
//     return new Response(
//       JSON.stringify({ error: 'Only POST allowed' }),
//       {
//         status: 405,
//         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
//       }
//     );
//   }

//   try {
//     const body = await req.json().catch(() => ({}));
//     const startPage = Number(body.startPage ?? 1);
//     const maxPages = Number(body.maxPages ?? 10);
//     const pageDelayMs = Number(body.pageDelayMs ?? 1500);

//     const admin = supabaseAdmin();
//     const allParsed: Array<any> = [];

//     let consecutiveEmpty = 0;
//     const maxConsecutiveEmpty = 3;

//     for (let page = startPage; page < startPage + maxPages; page++) {
//       const html = await fetchPageHtml(page);
//       if (!html) {
//         consecutiveEmpty++;
//         if (consecutiveEmpty >= maxConsecutiveEmpty) break;
//         await new Promise((r) => setTimeout(r, pageDelayMs));
//         continue;
//       }

//       const pageResults = parsePageResults(html, page);
//       if (!pageResults.length) {
//         consecutiveEmpty++;
//       } else {
//         consecutiveEmpty = 0;
//         allParsed.push(...pageResults);
//       }

//       await new Promise((r) => setTimeout(r, pageDelayMs));
//       if (consecutiveEmpty >= maxConsecutiveEmpty) break;
//     }

//     const insertTask = (async () => {
//       try {
//         const res = await upsertResultsToDb(admin, allParsed);
//         console.log('Insert result', res);
//       } catch (err) {
//         console.error('Background insert error', err);
//       }
//     })();

//     EdgeRuntime.waitUntil(insertTask);

//     return new Response(
//       JSON.stringify({
//         message: 'Scrape completed',
//         parsedCount: allParsed.length,
//         sample: allParsed.slice(0, 5),
//       }),
//       {
//         status: 200,
//         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
//       }
//     );
//   } catch (err: any) {
//     console.error('Handler error', err);
//     return new Response(
//       JSON.stringify({ error: err?.message ?? String(err) }),
//       {
//         status: 500,
//         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
//       }
//     );
//   }
// });
