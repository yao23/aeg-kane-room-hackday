// Deterministic English search for Hack Day: no model call, no external index.
const stop = new Set([
  'a','an','and','are','as','at','be','because','but','by','can','could','did','do','does','for','from','had','has','have',
  'how','i','if','in','into','is','it','its','me','my','of','on','or','our','should','so','that','the','their','then','there',
  'they','this','to','was','we','were','what','when','where','which','who','why','will','with','would','you','your','kane','cli','room'
]);

const aliases = new Map(Object.entries({
  finished:'completion', finish:'completion', finishes:'completion', completed:'completion', complete:'completion', completes:'completion', done:'completion',
  successful:'pass', succeeded:'pass', success:'pass', passed:'pass', passing:'pass', passes:'pass',
  failed:'fail', failure:'fail', failures:'fail', failing:'fail', errors:'error',
  clicking:'click', clicked:'click', clicks:'click',
  screenshots:'screenshot', logs:'log', logging:'log',
  sharing:'share', shared:'share',
  uploads:'upload', uploaded:'upload', uploading:'upload',
  evidencepack:'evidence', artifacts:'evidence', artifact:'evidence',
  browsers:'browser', tests:'test', testing:'test', tested:'test', assertion:'test', assertions:'test',
  commands:'command', versions:'version', environments:'environment',
  agents:'agent', codingagent:'agent',
  credits:'credit'
}));

function stem(word) {
  if (word.length > 5 && word.endsWith('ies')) return word.slice(0,-3) + 'y';
  if (word.length > 5 && word.endsWith('ing')) return word.slice(0,-3);
  if (word.length > 4 && word.endsWith('ed')) return word.slice(0,-2);
  if (word.length > 4 && word.endsWith('es')) return word.slice(0,-2);
  if (word.length > 3 && word.endsWith('s')) return word.slice(0,-1);
  return word;
}
export function terms(input) {
  const words = String(input ?? '').toLowerCase()
    .replace(/evidence\s+pack/g,'evidencepack')
    .replace(/coding\s+agent/g,'codingagent')
    .match(/[a-z0-9][a-z0-9._-]*/g) || [];
  const normalized = words.map(w => aliases.get(w) || aliases.get(stem(w)) || stem(w)).filter(w => w.length > 1 && !stop.has(w));
  return [...new Set(normalized)];
}
function searchableParts(thread) {
  return [
    { weight:6, text:thread.title },
    { weight:4, text:thread.body },
    { weight:3, text:thread.environment },
    { weight:3, text:thread.source },
    ...(thread.replies || []).map(r => ({weight:2,text:r.body})),
    ...(thread.events || []).map(e => ({weight:2,text:e.note}))
  ];
}
export function searchThreads(threads, query, limit = 10) {
  const queryTerms = terms(query);
  if (!queryTerms.length) return { query:String(query ?? ''), query_terms:[], results:[] };
  const scored = threads.map(thread => {
    const matched = new Set();
    let score = 0;
    for (const part of searchableParts(thread)) {
      const set = new Set(terms(part.text));
      for (const term of queryTerms) if (set.has(term)) {
        matched.add(term);
        score += part.weight;
      }
    }
    // Reward broad coverage but allow a strong partial match for long natural-language questions.
    const coverage = matched.size / queryTerms.length;
    score += Math.round(coverage * 8);
    if (matched.size >= 2) score += 4;
    return { thread, score, coverage, matched_terms:[...matched] };
  }).filter(x => x.matched_terms.length && (x.coverage >= 0.2 || x.matched_terms.length >= 2))
    .sort((a,b) => b.score - a.score || b.thread.updatedAt.localeCompare(a.thread.updatedAt))
    .slice(0, limit);
  return {
    query:String(query ?? ''),
    query_terms:queryTerms,
    results:scored.map(({thread,score,coverage,matched_terms}) => ({
      id:thread.id,
      title:thread.title,
      body:thread.body,
      environment:thread.environment || '',
      status:thread.status,
      updatedAt:thread.updatedAt,
      reply_count:(thread.replies || []).length,
      score,
      coverage:Number(coverage.toFixed(3)),
      matched_terms
    }))
  };
}
