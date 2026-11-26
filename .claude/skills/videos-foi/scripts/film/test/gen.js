const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
(async()=>{
  const [items, out, w, h] = [JSON.parse(fs.readFileSync(process.argv[2],'utf8')), process.argv[3], +(process.argv[4]||1080), +(process.argv[5]||1920)];
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:w,height:h}});
  p.on('pageerror',e=>console.error('ERR',e.message)); p.on('console',m=>{ if(m.type()==='error') console.error(m.text()); });
  await p.goto('file://'+path.resolve(__dirname,'gen.html'));
  await p.evaluate(([c,ww,hh])=>window.dessiner(c,ww,hh),[items,w,h]);
  await p.screenshot({path:out}); await b.close();
})();
