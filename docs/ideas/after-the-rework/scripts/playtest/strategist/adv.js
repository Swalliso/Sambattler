const sec = Number(process.env.SEC || 5);
const r = await h.advance(sec);
const out = await (new Function('page','h', 'return (async()=>{' + require('fs').readFileSync(__dirname + '/u.js','utf8') + '})()'))(page, h);
out.r = r; return out;
