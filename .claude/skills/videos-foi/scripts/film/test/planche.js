const { chromium } = require('playwright');
const path=require('path'); const fs=require('fs');
(async()=>{
  const [cas, out, cols, w, h] = [JSON.parse(fs.readFileSync(process.argv[2],'utf8')), process.argv[3], +(process.argv[4]||5), +(process.argv[5]||300), +(process.argv[6]||520)];
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:cols*w,height:Math.ceil(cas.length/cols)*h}});
  p.on('pageerror',e=>console.error('ERR',e.message)); p.on('console',m=>{ if(m.type()==='error') console.error(m.text()); });
  await p.goto('file://'+path.resolve(__dirname,'planche.html'));
  await p.evaluate(([c,co,ww,hh])=>window.dessinerPlanche(c,co,ww,hh),[cas,cols,w,h]);
  await p.screenshot({path:out}); await b.close();
})();
