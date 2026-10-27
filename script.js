/* ===================== utilidades ===================== */
var $  = function(s,r){ return (r||document).querySelector(s); };
var $$ = function(s,r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); };
var Store = {
  get:function(k,d){ try{ var v=localStorage.getItem('smx.'+k); return v==null?d:JSON.parse(v); }catch(e){ return d; } },
  set:function(k,v){ try{ localStorage.setItem('smx.'+k,JSON.stringify(v)); }catch(e){} }
};
function pad(n,l){ l=l||3; return String(Math.max(0,Math.min(n,Math.pow(10,l)-1))).padStart(l,'0'); }
function mmss(s){ return pad(Math.floor(s/60),2)+':'+pad(s%60,2); }
function shuffle(a){ for(var i=a.length-1;i>0;i--){ var j=(Math.random()*(i+1))|0,t=a[i];a[i]=a[j];a[j]=t; } return a; }
function rr(c,x,y,w,h,r){ r=Math.min(r,w/2,h/2); c.beginPath(); c.moveTo(x+r,y);
  c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }

/* ===================== sonido ===================== */
var Snd = (function(){
  var ctx=null, on=Store.get('snd',true);
  function boot(){ if(!ctx){ try{ ctx=new (window.AudioContext||window.webkitAudioContext); }catch(e){} } if(ctx&&ctx.state==='suspended') ctx.resume(); }
  function tone(f,d,type,v,slide){ d=d||.08; type=type||'square'; v=v||.05;
    if(!on||!ctx) return; var t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();
    o.type=type; o.frequency.setValueAtTime(f,t); if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(40,f+slide),t+d);
    g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.0001,t+d);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t+d+.02); }
  function seq(notes,step,type,v){ step=step||.07; type=type||'square'; v=v||.05;
    notes.forEach(function(f,i){ setTimeout(function(){ tone(f,step*1.6,type,v); }, i*step*1000); }); }
  window.addEventListener('pointerdown',boot,{once:true});
  window.addEventListener('keydown',boot,{once:true});
  return { tone:tone, seq:seq, boot:boot,
    get on(){ return on; },
    toggle:function(){ on=!on; Store.set('snd',on); return on; } };
})();
var S = {
  click:function(){ Snd.tone(660,.05,'square',.035); },
  eat:function(){ Snd.seq([620,880],.055,'square',.05); },
  hit:function(){ Snd.tone(120,.32,'sawtooth',.07,-70); },
  place:function(){ Snd.tone(420,.05,'triangle',.045); },
  bad:function(){ Snd.seq([180,140],.08,'sawtooth',.06); },
  flag:function(){ Snd.tone(980,.05,'square',.04); },
  clear:function(n){ Snd.seq(n>=4?[523,659,784,1046]:[440,587],.06,'square',.055); },
  win:function(){ Snd.seq([523,659,784,1046,1318],.09,'triangle',.06); }
};

/* ===================== núcleo ===================== */
var GAMES = {};
var current = 'snake';

function refreshBests(){
  var fmt=function(o){ var v=Object.keys(o).map(function(k){return o[k];}).filter(Boolean).sort(function(a,b){return a-b;}); return v.length?mmss(v[0]):'—'; };
  var set=function(k,v){ var el=$('[data-best="'+k+'"]'); if(el) el.textContent=v; };
  set('snake', Store.get('snake.best',0));
  set('tetris', Store.get('tetris.best',0));
  set('breakout', Store.get('breakout.best',0));
  set('flappy', Store.get('flappy.best',0));
  set('mines', fmt(Store.get('mines.best',{})));
  set('sudoku', fmt(Store.get('sudoku.best',{})));
}
function setAccent(view){
  var r=document.documentElement;
  if(view.getAttribute('data-acc')) r.style.setProperty('--acc',view.getAttribute('data-acc'));
  if(view.getAttribute('data-rgb')) r.style.setProperty('--acc-rgb',view.getAttribute('data-rgb'));
}
function safe(fn,label){ try{ fn(); }catch(e){ console.error('['+label+']',e); } }
function go(id){
  if(id===current || !GAMES[id]) return;
  safe(function(){ GAMES[current].blur && GAMES[current].blur(); }, current+'.blur');
  current=id;
  $$('.cart').forEach(function(c){ c.setAttribute('aria-current', String(c.getAttribute('data-goto')===id)); });
  $$('.view').forEach(function(v){ v.classList.toggle('on', v.id==='view-'+id); });
  var view=$('#view-'+id); setAccent(view);
  var g=GAMES[id];
  $('#kicker').textContent=g.kicker; $('#title').textContent=g.title; $('#sub').textContent=g.sub;
  $('#legend').innerHTML=g.legend.map(function(p){ return '<span class="key"><kbd>'+p[0]+'</kbd>'+p[1]+'</span>'; }).join('');
  $('#rules').innerHTML=g.rules; $('#rules').classList.remove('open');
  $('#btnPause').disabled=!g.canPause;
  if(!g._i){ safe(function(){ g.init(); g._i=1; }, id+'.init'); }
  if(!g._s){ safe(function(){ g.start(); g._s=true; }, id+'.start'); }
  safe(function(){ g.resume && g.resume(); }, id+'.resume');
}
$$('.cart').forEach(function(c){ c.addEventListener('click',function(){ go(c.getAttribute('data-goto')); Snd.boot(); }); });
$('#btnReset').addEventListener('click',function(){ safe(function(){ GAMES[current].start(); }, current+'.start'); S.click(); });
$('#btnPause').addEventListener('click',function(){ GAMES[current].pause && GAMES[current].pause(); });
$('#btnRules').addEventListener('click',function(){ $('#rules').classList.toggle('open'); S.click(); });
$('#snd').addEventListener('click',function(e){ var on=Snd.toggle(); e.currentTarget.innerHTML='SONIDO <b>'+(on?'ON':'OFF')+'</b>'; if(on) S.click(); });
$('#snd').innerHTML='SONIDO <b>'+(Snd.on?'ON':'OFF')+'</b>';
document.addEventListener('keydown',function(e){ if(e.metaKey||e.ctrlKey||e.altKey) return; var g=GAMES[current]; g.key && safe(function(){ g.key(e); }, current+'.key'); });
document.addEventListener('keyup',function(e){ var g=GAMES[current]; g.keyUp && g.keyUp(e); });
document.addEventListener('visibilitychange',function(){
  var g=GAMES[current];
  if(document.hidden){ g.blur && safe(function(){ g.blur(); }, current+'.blur'); }
  else if(!g.canPause){ g.resume && safe(function(){ g.resume(); }, current+'.resume'); }
});

function fit(cv){
  var r=cv.getBoundingClientRect();
  if(r.width<2||r.height<2) return null;
  var d=Math.min(2,window.devicePixelRatio||1);
  cv.width=Math.round(r.width*d); cv.height=Math.round(r.height*d);
  var c=cv.getContext('2d'); c.setTransform(d,0,0,d,0,0);
  return { c:c, w:r.width, h:r.height };
}
function fitNow(owner,el,apply){
  var g=fit(el);
  if(g){ apply(g); return; }
  if(owner._fit) return;
  owner._fit=true; var tries=0;
  (function poll(){
    var g2=fit(el);
    if(g2){ owner._fit=false; apply(g2); return; }
    if(++tries>900){ owner._fit=false; return; }
    requestAnimationFrame(poll);
  })();
}

/* ===================== 01 · SNAKE ===================== */
GAMES.snake={
  title:'Snake', kicker:'Máquina 01 · reflejos', sub:'Come, crece y no te muerdas la cola.',
  canPause:true, N:21,
  legend:[['↑ ↓ ← →','mover'],['W A S D','alternativo'],['Espacio','pausa'],['R','reiniciar']],
  rules:'La serpiente <b>acelera</b> con cada fruto. Los muros matan, la cola también. En móvil usa la cruceta verde.',
  init:function(){
    this.cv=$('#snCanvas'); this.board=$('#snBoard'); this.veil=$('#snVeil');
    if(window.ResizeObserver) new ResizeObserver(this.geom.bind(this)).observe(this.board);
    $$('.dpad button[data-dir]').forEach(function(b){
      b.addEventListener('click',function(){ var d=b.getAttribute('data-dir').split(','); GAMES.snake.push(+d[0],+d[1]); });
    });
    $('#snAgain').addEventListener('click',function(){ GAMES.snake.start(); });
    this.geom();
  },
  geom:function(){ var self=this;
    fitNow(this,this.cv,function(g){ self.c=g.c; self.px=g.w; self.s=g.w/self.N; self.draw(); });
  },
  placeFood:function(){ var p; do{ p={x:(Math.random()*this.N)|0,y:(Math.random()*this.N)|0}; }
    while(this.body.some(function(b){return b.x===p.x&&b.y===p.y;})); this.food=p;
  },
  push:function(x,y){ if(!this.alive) return; var l=this.q.length?this.q[this.q.length-1]:{x:this.dx,y:this.dy};
    if(x===-l.x&&y===-l.y) return; if(x===l.x&&y===l.y) return; this.q.push({x:x,y:y}); },
  key:function(e){ var k=e.key.toLowerCase();
    if(['arrowup','arrowdown','arrowleft','arrowright',' '].indexOf(k)>=0||'wasd'.indexOf(k)>=0) e.preventDefault();
    if(k==='arrowup'||k==='w') this.push(0,-1); else if(k==='arrowdown'||k==='s') this.push(0,1);
    else if(k==='arrowleft'||k==='a') this.push(-1,0); else if(k==='arrowright'||k==='d') this.push(1,0);
    else if(k==='r') this.start(); else if(k===' ') this.pause(); },
  pause:function(){ if(!this.alive) return; this.paused=!this.paused; $('#btnPause').textContent=this.paused?'Seguir':'Pausa';
    if(this.paused) this.veilOn('PAUSA','La máquina espera.'); else this.veil.classList.remove('on'); },
  resume:function(){ if(this.paused&&this.alive){ this.paused=false; $('#btnPause').textContent='Pausa'; this.veil.classList.remove('on'); } },
  blur:function(){ if(this.alive&&!this.paused){ this.paused=true; $('#btnPause').textContent='Seguir'; this.veilOn('PAUSA','Vuelve cuando quieras.'); } },
  veilOn:function(t,p){ $('#snVeilTxt').textContent=p; $('#snVeil h3').textContent=t; this.veil.classList.add('on'); },
  die:function(){ this.alive=false; S.hit(); this.board.classList.add('shake');
    var b=this.board; setTimeout(function(){ b.classList.remove('shake'); },400);
    if(this.score>Store.get('snake.best',0)){ Store.set('snake.best',this.score); refreshBests(); }
    this.veilOn('GAME OVER','Longitud '+this.body.length+' · '+this.score+' puntos'); this.draw(); },
  hud:function(){ $('#snScore').textContent=this.score; $('#snLen').textContent=this.body.length;
    $('#snSpd').textContent=1+Math.floor((150-this.step)/12); },
  tick:function(dt){ if(!this._i) return; this.draw(); if(!this.alive||this.paused) return;
    this.acc+=dt; while(this.acc>=this.step){ this.acc-=this.step; this.move(); } },
  move:function(){
    if(this.q.length){ var n=this.q.shift(); this.dx=n.x; this.dy=n.y; }
    var h={x:this.body[0].x+this.dx,y:this.body[0].y+this.dy};
    if(h.x<0||h.y<0||h.x>=this.N||h.y>=this.N) return this.die();
    for(var i=0;i<this.body.length-1;i++){ if(this.body[i].x===h.x&&this.body[i].y===h.y) return this.die(); }
    this.body.unshift(h);
    if(h.x===this.food.x&&h.y===this.food.y){
      this.eaten++; this.score+=10+Math.floor(this.eaten/5); this.step=Math.max(62,this.step-3);
      S.eat(); this.burst(h); this.placeFood();
    } else this.body.pop();
    this.hud();
  },
  start:function(){
    this.body=[{x:10,y:10},{x:9,y:10},{x:8,y:10}]; this.dx=1; this.dy=0; this.q=[];
    this.score=0; this.eaten=0; this.step=150; this.acc=0; this.alive=true; this.paused=false; this.parts=[];
    $('#btnPause').textContent='Pausa'; this.veil.classList.remove('on'); this.placeFood(); this.hud(); this.draw();
  },
  burst:function(h){ var c=h.x*this.s+this.s/2,d=h.y*this.s+this.s/2;
    for(var i=0;i<14;i++){ var a=Math.random()*6.283,v=(Math.random()*2+1)*this.s*.06;
      this.parts.push({x:c,y:d,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l:1}); } },
  draw:function(){ var c=this.c,s=this.s,N=this.N,p=this.px; if(!c||!p||!this.food||!this.body) return;
    c.clearRect(0,0,p,p);
    var g=c.createLinearGradient(0,0,0,p); g.addColorStop(0,'#0b1a24'); g.addColorStop(1,'#071018'); c.fillStyle=g; c.fillRect(0,0,p,p);
    c.strokeStyle='rgba(120,170,210,.07)'; c.lineWidth=1;
    for(var i=1;i<N;i++){ c.beginPath(); c.moveTo(i*s+.5,0); c.lineTo(i*s+.5,p); c.stroke(); c.beginPath(); c.moveTo(0,i*s+.5); c.lineTo(p,i*s+.5); c.stroke(); }
    if(this.alive){ var t=performance.now()/420,r=s*.30+Math.sin(t)*s*.045,fx=this.food.x*s+s/2,fy=this.food.y*s+s/2;
      c.save(); c.shadowColor='rgba(255,107,107,.9)'; c.shadowBlur=s*.9; c.fillStyle='#ff6b6b';
      c.beginPath(); c.arc(fx,fy,r,0,6.283); c.fill(); c.restore();
      c.fillStyle='rgba(255,255,255,.75)'; c.beginPath(); c.arc(fx-r*.32,fy-r*.34,r*.24,0,6.283); c.fill(); }
    for(var q=this.parts.length-1;q>=0;q--){ var pp=this.parts[q]; pp.x+=pp.vx; pp.y+=pp.vy; pp.vy+=.05; pp.l-=.035;
      if(pp.l<=0){ this.parts.splice(q,1); continue; } c.fillStyle='rgba(168,224,99,'+pp.l+')'; c.fillRect(pp.x-1.5,pp.y-1.5,3,3); }
    var L=this.body.length;
    for(var b=L-1;b>=0;b--){ var seg=this.body[b],tt=b/Math.max(1,L-1);
      var col=b===0?'#d6f79b':'rgb('+Math.round(168-40*tt)+','+Math.round(224-60*tt)+','+Math.round(99+40*tt)+')';
      c.save(); if(b===0){ c.shadowColor='rgba(168,224,99,.85)'; c.shadowBlur=s*.7; }
      c.fillStyle=col; rr(c,seg.x*s+1.2,seg.y*s+1.2,s-2.4,s-2.4,s*(b===0?.42:.30)); c.fill(); c.restore(); }
    if(L){ var hd=this.body[0],ex=hd.x*s+s/2,ey=hd.y*s+s/2,o=s*.19,ox=this.dy!==0?o:0,oy=this.dx!==0?o:0;
      c.fillStyle='#08130c';
      c.beginPath(); c.arc(ex+this.dx*s*.18-ox,ey+this.dy*s*.18-oy,s*.10,0,6.283); c.fill();
      c.beginPath(); c.arc(ex+this.dx*s*.18+ox,ey+this.dy*s*.18+oy,s*.10,0,6.283); c.fill(); } }
};

/* ===================== 02 · BUSCAMINAS ===================== */
GAMES.mines={
  title:'Buscaminas', kicker:'Máquina 02 · lógica', sub:'El primer clic nunca mata.',
  canPause:false, LV:[{n:9,m:10},{n:12,m:22},{n:16,m:45}],
  legend:[['Clic','descubrir'],['Clic dcho.','bandera'],['Nº + banderas','corona'],['R','reiniciar']],
  rules:'Descubre todas las casillas sin minas. Un número indica minas en las <b>8 vecinas</b>. Con las banderas puestas en el número exacto, púlsalo para abrir el resto (<b>corona</b>).',
  init:function(){
    this.el=$('#msGrid'); this.li=0; this.flagMode=false;
    var self=this;
    this.el.addEventListener('click',function(e){ var c=e.target.closest('.cell'); if(c) self.click(+c.getAttribute('data-i')); });
    this.el.addEventListener('contextmenu',function(e){ e.preventDefault(); var c=e.target.closest('.cell'); if(c) self.flag(+c.getAttribute('data-i')); });
    var lp; this.el.addEventListener('touchstart',function(e){ var c=e.target.closest('.cell'); if(!c) return; lp=setTimeout(function(){ self.flag(+c.getAttribute('data-i')); lp=null; },420); },{passive:true});
    this.el.addEventListener('touchend',function(){ clearTimeout(lp); });
    $$('#msDiff button').forEach(function(b){ b.addEventListener('click',function(){
      $$('#msDiff button').forEach(function(x){ x.classList.remove('on'); }); b.classList.add('on'); self.li=+b.getAttribute('data-l'); self.start(); }); });
    $('#msFace').addEventListener('click',function(){ self.start(); });
    $('#msFlag').addEventListener('click',function(e){ self.flagMode=!self.flagMode; e.currentTarget.classList.toggle('on',self.flagMode); S.click(); });
  },
  start:function(){ clearInterval(this.t); this.t=null; var L=this.LV[this.li]; this.n=L.n; this.m=L.m;
    this.N=L.n*L.n; this.mine=new Array(this.N).fill(0); this.adj=new Array(this.N).fill(0); this.st=new Array(this.N).fill(0);
    this.placed=false; this.dead=false; this.win=false; this.time=0; this.opened=0; this.flags=0;
    $('#msFace').textContent='🙂'; this.el.style.setProperty('--n',this.n); this.render(); this.hud(); },
  blur:function(){ clearInterval(this.t); this.t=null; },
  resume:function(){ if(this.placed&&!this.dead&&!this.win) this.clock(); },
  hud:function(){ $('#msMines').textContent=pad(this.m-this.flags); $('#msTime').textContent=pad(this.time); },
  clock:function(){ var self=this; if(this.t) return; this.t=setInterval(function(){ self.time++; self.hud(); },1000); },
  nb:function(i){ var n=this.n,x=i%n,y=(i/n)|0,o=[];
    for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++){ if(!dx&&!dy) continue; var nx=x+dx,ny=y+dy; if(nx>=0&&ny>=0&&nx<n&&ny<n) o.push(ny*n+nx); } return o; },
  plant:function(safeI){ var bad={},put=0,self=this;
    [safeI].concat(this.nb(safeI)).forEach(function(i){ bad[i]=1; });
    while(put<this.m){ var i=(Math.random()*this.N)|0; if(this.mine[i]||bad[i]) continue; this.mine[i]=1; put++; }
    for(var j=0;j<this.N;j++){ var a=0,nb=this.nb(j); for(var k=0;k<nb.length;k++) if(this.mine[nb[k]]) a++; this.adj[j]=a; } },
  click:function(i){ if(this.dead||this.win||this.st[i]===2) return;
    if(!this.placed){ this.placed=true; this.plant(i); this.clock(); }
    if(this.flagMode&&this.st[i]===0) return this.flag(i);
    if(this.st[i]===1){ this.chord(i); return; }
    if(this.mine[i]){ this.boom(i); return; }
    this.flood(i); S.place(); this.render(); this.check(); },
  flag:function(i){ if(this.dead||this.win||this.st[i]===1) return;
    this.st[i]=this.st[i]===2?0:2; this.flags+=this.st[i]?1:-1; S.flag(); this.render(); this.hud(); },
  flood:function(i){ var st=[i]; while(st.length){ var j=st.pop(); if(this.st[j]) continue; this.st[j]=1; this.opened++;
    if(this.adj[j]===0){ var nb=this.nb(j); for(var k=0;k<nb.length;k++) if(!this.st[nb[k]]) st.push(nb[k]); } }
    if(this.opened===this.N-this.m) this.victory(); },
  chord:function(i){ if(this.st[i]!==1||!this.adj[i]) return; var self=this, nb=this.nb(i), f=0;
    nb.forEach(function(j){ if(self.st[j]===2) f++; }); if(f!==this.adj[i]) return;
    var boom=false; nb.forEach(function(j){ if(self.st[j]===0){ if(self.mine[j]){ self.boom(j); boom=true; } else self.flood(j); } });
    if(!boom){ S.place(); this.render(); this.check(); } },
  boom:function(i){ this.dead=true; this.blur(); $('#msFace').textContent='😵'; this.render(); },
  check:function(){ if(this.opened===this.N-this.m) this.victory(); },
  victory:function(){ if(this.win) return; this.win=true; this.blur(); S.win(); $('#msFace').textContent='😎';
    var b=Store.get('mines.best',{}),k=this.n+'x'+this.n; if(!b[k]||this.time<b[k]){ b[k]=this.time; Store.set('mines.best',b); refreshBests(); } },
  svgMine:function(){ return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5.6" fill="#ffd9d9"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2.2 2.2M16.8 16.8L19 19M19 5l-2.2 2.2M7.2 16.8L5 19" stroke="#ffd9d9" stroke-width="2" stroke-linecap="round"/></svg>'; },
  svgFlag:function(){ return '<svg viewBox="0 0 24 24"><path d="M6 21V3M6 3h11l-2.6 4.2L17 12H6" fill="#ff6b6b" stroke="#ff6b6b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'; },
  render:function(){ var f=document.createDocumentFragment();
    for(var i=0;i<this.N;i++){ var d=document.createElement('div'); d.className='cell'; d.setAttribute('data-i',i); var s=this.st[i];
      if(s===1){ d.classList.add('op'); if(this.mine[i]) d.classList.add('boom'); else if(this.adj[i]){ d.textContent=this.adj[i]; d.classList.add('c'+this.adj[i]); } }
      else if(s===2) d.innerHTML=this.svgFlag();
      else if(this.dead&&this.mine[i]) d.innerHTML=this.svgMine();
      f.appendChild(d); }
    this.el.innerHTML=''; this.el.appendChild(f); },
  key:function(e){ var k=e.key.toLowerCase(); if(k==='r'){ this.start(); return; }
    if(k==='f'){ this.flagMode=!this.flagMode; $('#msFlag').classList.toggle('on',this.flagMode); S.click(); } }
};

/* ===================== 03 · TETRIS ===================== */
GAMES.tetris={
  title:'Tetris', kicker:'Máquina 03 · velocidad', sub:'Rotar, encajar, limpiar.',
  canPause:true, COLS:10, ROWS:20,
  SH:{I:[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],J:[[1,0,0],[1,1,1],[0,0,0]],L:[[0,0,1],[1,1,1],[0,0,0]],
      O:[[1,1],[1,1]],S:[[0,1,1],[1,1,0],[0,0,0]],T:[[0,1,0],[1,1,1],[0,0,0]],Z:[[1,1,0],[0,1,1],[0,0,0]]},
  CO:{I:'#3ddad7',J:'#7aa2ff',L:'#ff9e57',O:'#ffc45e',S:'#a8e063',T:'#c58bff',Z:'#ff6b6b'},
  legend:[['← →','mover'],['↓','suave'],['↑ / X','rotar'],['Z','rotar ⇄'],['Espacio','caída'],['C','reserva'],['P','pausa']],
  rules:'Bolsa de 7 piezas. 4 líneas a la vez = <b>Tetris</b>. Cada 10 líneas sube nivel y la gravedad aprieta. <b>C</b> reserva una pieza.',
  init:function(){
    this.cv=$('#ttCanvas'); this.nc=$('#ttNext'); this.hc=$('#ttHold'); this.veil=$('#ttVeil');
    if(window.ResizeObserver) new ResizeObserver(this.geom.bind(this)).observe(this.cv);
    this.geom();
    var self=this;
    $('#ttAgain').addEventListener('click',function(){ self.start(); });
    this.hc.parentNode.style.cursor='pointer';
    this.hc.parentNode.addEventListener('click',function(){ self.holdP(); });
    $$('[data-tt]').forEach(function(b){ b.addEventListener('click',function(){ var a=b.getAttribute('data-tt');
      if(a==='left') self.shift(-1); if(a==='right') self.shift(1); if(a==='rot') self.rot2(1); if(a==='drop') self.hard(); }); });
  },
  geom:function(){ var self=this;
    fitNow(this,this.cv,function(g){ self.c=g.c; self.W=g.w; self.H=g.h; self.cs=g.w/self.COLS; self.draw(); self.panels(); });
  },
  start:function(){
    this.b=[]; for(var y=0;y<this.ROWS;y++) this.b.push(new Array(this.COLS).fill(null));
    this.bag=[]; this.next=[]; this.hold=null; this.canHold=true; this.soft=false;
    this.score=0; this.lines=0; this.level=1; this.acc=0; this.over=false; this.paused=false; this.clearing=null; this.ct=0; this.frozen=false;
    $('#btnPause').textContent='Pausa'; this.veil.classList.remove('on');
    while(this.next.length<4) this.next.push(this.pull());
    this.spawn(); this.hud(); this.draw(); this.pDirty=true; this.panels();
  },
  pull:function(){ if(!this.bag.length) this.bag=shuffle(Object.keys(this.SH)); return this.bag.pop(); },
  spawn:function(){ if(!this.next.length) this.next.push(this.pull());
    this.k=this.next.shift(); this.next.push(this.pull());
    this.p={k:this.k,m:this.SH[this.k].map(function(r){return r.slice();}),x:this.k==='I'?3:2,y:0};
    this.pDirty=true;
    if(this.hit(this.p.m,this.p.x,this.p.y)) this.die();
    this.canHold=true; },
  cw:function(m){ var n=m.length,o=[]; for(var a=0;a<n;a++) o.push(new Array(n).fill(0));
    for(var y=0;y<n;y++)for(var x=0;x<n;x++) o[x][n-1-y]=m[y][x]; return o; },
  ccw:function(m){ var n=m.length,o=[]; for(var a=0;a<n;a++) o.push(new Array(n).fill(0));
    for(var y=0;y<n;y++)for(var x=0;x<n;x++) o[n-1-x][y]=m[y][x]; return o; },
  hit:function(m,x,y){ for(var r=0;r<m.length;r++)for(var c=0;c<m.length;c++) if(m[r][c]){
      var bx=x+c,by=y+r; if(bx<0||bx>=this.COLS||by>=this.ROWS) return true; if(by>=0&&this.b[by][bx]) return true; } return false; },
  shift:function(d){ if(this.frozen||this.over) return; if(!this.hit(this.p.m,this.p.x+d,this.p.y)){ this.p.x+=d; Snd.tone(300,.02,'square',.02); } },
  rot2:function(d){ if(this.frozen||this.over) return; var m=d>0?this.cw(this.p.m):this.ccw(this.p.m);
    var kicks=[0,-1,1,-2,2]; for(var i=0;i<kicks.length;i++) if(!this.hit(m,this.p.x+kicks[i],this.p.y)){ this.p.m=m; this.p.x+=kicks[i]; Snd.tone(520,.03,'square',.03); return; } },
  hard:function(){ if(this.frozen||this.over) return; var d=0; while(!this.hit(this.p.m,this.p.x,this.p.y+1)){ this.p.y++; d++; }
    this.score+=d*2; Snd.tone(180,.07,'square',.05); this.lock(); },
  holdP:function(){ if(!this.canHold||this.over||this.frozen) return; var k=this.hold;
    this.hold=this.p.k; this.canHold=false; this.pDirty=true; S.click();
    if(k){ this.p={k:k,m:this.SH[k].map(function(r){return r.slice();}),x:k==='I'?3:2,y:0};
      if(this.hit(this.p.m,this.p.x,this.p.y)) return this.die(); }
    else this.spawn(); },
  lock:function(){ for(var r=0;r<this.p.m.length;r++)for(var c=0;c<this.p.m.length;c++) if(this.p.m[r][c]){
      var by=this.p.y+r; if(by>=0) this.b[by][this.p.x+c]=this.CO[this.p.k]; }
    this.soft=false; var full=[]; for(var y=0;y<this.ROWS;y++) if(this.b[y].every(function(v){return v;})) full.push(y);
    if(full.length){ this.clearing=full; this.ct=0; this.frozen=true; S.clear(full.length); } else this.spawn(); },
  settle:function(){ var f=this.clearing; f.forEach(function(y){ this.b.splice(y,1); this.b.unshift(new Array(this.COLS).fill(null)); }.bind(this));
    var n=f.length; this.score+=[0,100,300,500,800][n]*this.level; this.lines+=n; this.level=1+Math.floor(this.lines/10);
    this.clearing=null; this.frozen=false; this.hud(); this.spawn(); },
  hud:function(){ $('#ttScore').textContent=this.score; $('#ttLines').textContent=this.lines+' · '+this.level; },
  die:function(){ this.over=true; this.frozen=true; S.hit();
    if(this.score>Store.get('tetris.best',0)){ Store.set('tetris.best',this.score); refreshBests(); }
    $('#ttVeilTxt').textContent=this.lines+' líneas · '+this.score+' puntos'; $('#ttVeil h3').textContent='FIN DE PARTIDA'; this.veil.classList.add('on'); },
  pause:function(){ if(this.over) return; this.paused=!this.paused; $('#btnPause').textContent=this.paused?'Seguir':'Pausa';
    if(this.paused){ $('#ttVeilTxt').textContent='La pila te espera.'; $('#ttVeil h3').textContent='PAUSA'; this.veil.classList.add('on'); } else this.veil.classList.remove('on'); },
  resume:function(){ if(this.paused&&!this.over){ this.paused=false; $('#btnPause').textContent='Pausa'; this.veil.classList.remove('on'); } },
  blur:function(){ if(!this.over&&!this.paused){ this.paused=true; $('#btnPause').textContent='Seguir'; $('#ttVeilTxt').textContent='Vuelve pronto.'; $('#ttVeil h3').textContent='PAUSA'; this.veil.classList.add('on'); } },
  speed:function(){ return Math.max(65,505-(this.level-1)*42); },
  key:function(e){ var k=e.key.toLowerCase();
    if(['arrowleft','arrowright','arrowdown','arrowup',' '].indexOf(k)>=0) e.preventDefault();
    if(k==='p'){ this.pause(); return; } if(k==='r'){ this.start(); return; }
    if(this.paused||this.over) return;
    if(k==='arrowleft') this.shift(-1); else if(k==='arrowright') this.shift(1);
    else if(k==='arrowdown') this.soft=true;
    else if(k==='arrowup'||k==='x') this.rot2(1); else if(k==='z') this.rot2(-1);
    else if(k==='c') this.holdP(); else if(e.key===' ') this.hard(); },
  keyUp:function(e){ if(e.key.toLowerCase()==='arrowdown') this.soft=false; },
  tick:function(dt){ if(!this._i) return;
    if(this.pDirty){ this.panels(); this.pDirty=false; }
    if(this.clearing){ this.ct+=dt; this.draw(); if(this.ct>280) this.settle(); return; }
    if(this.over||this.paused){ this.draw(); return; }
    this.acc+=dt; var sp=this.soft?Math.min(50,this.speed()):this.speed();
    while(this.acc>=sp){ this.acc-=sp; if(!this.hit(this.p.m,this.p.x,this.p.y+1)){ this.p.y++; if(this.soft) this.score++; } else { this.lock(); break; } }
    this.draw(); },
  block:function(c,x,y,s,col,ghost){
    if(ghost){ c.save(); c.globalAlpha=.24; c.fillStyle=col; rr(c,x+1.5,y+1.5,s-3,s-3,s*.18); c.fill();
      c.globalAlpha=.8; c.strokeStyle=col; c.lineWidth=1.6; rr(c,x+2,y+2,s-4,s-4,s*.18); c.stroke(); c.restore(); return; }
    c.fillStyle=col; rr(c,x+1,y+1,s-2,s-2,s*.18); c.fill();
    c.fillStyle='rgba(255,255,255,.30)'; rr(c,x+2.5,y+2.5,s-5,s*.30,s*.13); c.fill();
    c.fillStyle='rgba(0,0,0,.28)'; rr(c,x+2.5,y+s*.62,s-5,s*.30,s*.13); c.fill(); },
  draw:function(){ var c=this.c,s=this.cs,W=this.W,H=this.H; if(!c||!s||!this.b) return;
    c.clearRect(0,0,W,H);
    var g=c.createLinearGradient(0,0,0,H); g.addColorStop(0,'#0b1622'); g.addColorStop(1,'#060c14'); c.fillStyle=g; c.fillRect(0,0,W,H);
    c.strokeStyle='rgba(120,170,210,.075)'; c.lineWidth=1;
    for(var x=1;x<this.COLS;x++){ c.beginPath(); c.moveTo(x*s,0); c.lineTo(x*s,H); c.stroke(); }
    for(var y=1;y<this.ROWS;y++){ c.beginPath(); c.moveTo(0,y*s); c.lineTo(W,y*s); c.stroke(); }
    for(var yy=0;yy<this.ROWS;yy++)for(var xx=0;xx<this.COLS;xx++) if(this.b[yy][xx]) this.block(c,xx*s,yy*s,s,this.b[yy][xx]);
    if(this.clearing){ c.fillStyle='rgba(255,255,255,'+(.75*(1-this.ct/280))+')'; this.clearing.forEach(function(y){ c.fillRect(0,y*s,W,s); }); }
    if(this.p&&!this.over&&!this.clearing){
      var gy=this.p.y; while(!this.hit(this.p.m,this.p.x,gy+1)) gy++;
      if(gy!==this.p.y) for(var r=0;r<this.p.m.length;r++)for(var k=0;k<this.p.m.length;k++) if(this.p.m[r][k]) this.block(c,(this.p.x+k)*s,(gy+r)*s,s,this.CO[this.p.k],true);
      for(var r2=0;r2<this.p.m.length;r2++)for(var k2=0;k2<this.p.m.length;k2++) if(this.p.m[r2][k2]&&this.p.y+r2>=0) this.block(c,(this.p.x+k2)*s,(this.p.y+r2)*s,s,this.CO[this.p.k]);
    }
    c.strokeStyle='rgba(61,218,215,.25)'; c.lineWidth=2; c.strokeRect(1,1,W-2,H-2); },
  mini:function(cv,list,single){ var r=cv.getBoundingClientRect(); if(r.width<2||r.height<2) return;
    var d=Math.min(2,window.devicePixelRatio||1);
    var bw=Math.round(r.width*d), bh=Math.round(r.height*d);
    if(cv.width!==bw||cv.height!==bh){ cv.width=bw; cv.height=bh; }
    var c=cv.getContext('2d'); c.setTransform(d,0,0,d,0,0); c.clearRect(0,0,r.width,r.height);
    var self=this;
    var slots = single ? [{k:this.hold,x:0,y:0,w:r.width,h:r.height}]
      : list.map(function(k,i){ return {k:k,x:0,y:i*(r.height/list.length),w:r.width,h:r.height/list.length}; });
    slots.forEach(function(sl){ if(!sl.k) return; var m=self.SH[sl.k],a=9,b=-1,cy=9,dy=-1;
      m.forEach(function(row,yy){ row.forEach(function(v,xx){ if(v){ a=Math.min(a,xx); b=Math.max(b,xx); cy=Math.min(cy,yy); dy=Math.max(dy,yy); } }); });
      if(b<0) return; var w=b-a+1,h=dy-cy+1,size=Math.min(sl.w/(w+1),sl.h/(h+1)),ox=sl.x+(sl.w-w*size)/2,oy=sl.y+(sl.h-h*size)/2;
      for(var yy=cy;yy<=dy;yy++)for(var xx=a;xx<=b;xx++) if(m[yy][xx]) self.block(c,ox+(xx-a)*size,oy+(yy-cy)*size,size,self.CO[sl.k]); }); },
  panels:function(){ this.mini(this.nc,this.next.slice(0,3),false); this.mini(this.hc,null,true); }
};

/* ===================== 04 · SUDOKU ===================== */
GAMES.sudoku={
  title:'Sudoku', kicker:'Máquina 04 · calma', sub:'Nueve casas, nueve dígitos, cero prisas.',
  canPause:false, clues:38,
  legend:[['1 – 9','escribir'],['← ↑ → ↓','mover'],['Supr','borrar'],['N','notas'],['H','pista']],
  rules:'Cada fila, columna y bloque 3×3 con el 1–9 sin repetir. Solución única verificada. <b>Notas</b> para candidatos, <b>3 pistas</b> por partida.',
  init:function(){
    this.el=$('#sdGrid'); this.keys=$('#sdKey'); var self=this;
    this.keys.innerHTML=[1,2,3,4,5,6,7,8,9].map(function(v){ return '<button data-v="'+v+'">'+v+'<small>9</small></button>'; }).join('');
    this.keys.addEventListener('click',function(e){ var b=e.target.closest('button'); if(b) self.input(+b.getAttribute('data-v')); });
    this.el.addEventListener('click',function(e){ var c=e.target.closest('.sd-cell'); if(c) self.selectCell(+c.getAttribute('data-i')); });
    $('#sdNotes').addEventListener('click',function(){ self.notes=!self.notes; $('#sdNotes').classList.toggle('on',self.notes); S.click(); });
    $('#sdErase').addEventListener('click',function(){ self.input(0); });
    $('#sdHint').addEventListener('click',function(){ self.hint(); });
    $('#sdNew').addEventListener('click',function(){ self.start(); });
    $$('#sdDiff button').forEach(function(b){ b.addEventListener('click',function(){
      $$('#sdDiff button').forEach(function(x){ x.classList.remove('on'); }); b.classList.add('on'); self.clues=+b.getAttribute('data-d'); self.start(); }); });
  },
  isValid:function(g,i,v){ var x=i%9,y=(i/9)|0,k,a,b;
    for(k=0;k<9;k++){ if(g[y*9+k]===v||g[k*9+x]===v) return false; }
    var bx=(x/3|0)*3,by=(y/3|0)*3;
    for(a=0;a<3;a++)for(b=0;b<3;b++) if(g[(by+a)*9+bx+b]===v) return false;
    return true;
  },
  fillGrid:function(g,i){ if(i===81) return true; var nums=shuffle([1,2,3,4,5,6,7,8,9]);
    for(var k=0;k<9;k++){ var v=nums[k]; if(this.isValid(g,i,v)){ g[i]=v; if(this.fillGrid(g,i+1)) return true; g[i]=0; } }
    return false;
  },
  countSolutions:function(g){ var self=this, sol=0;
    function best(){ var bi=-1,bc=10,empty=false;
      for(var i=0;i<81;i++){ if(g[i]) continue; empty=true;
        var cnt=0; for(var v=1;v<=9;v++) if(self.isValid(g,i,v)) cnt++;
        if(cnt===0) return {dead:true,i:-1};
        if(cnt<bc){ bc=cnt; bi=i; if(cnt===1) break; } }
      return empty?{i:bi}:{done:true}; }
    function bt(){ var b=best(); if(b.done){ sol++; return; } if(b.dead) return;
      for(var v=1;v<=9;v++){ if(self.isValid(g,b.i,v)){ g[b.i]=v; bt(); g[b.i]=0; if(sol>1) return; } } }
    bt(); return sol;
  },
  generate:function(clues){ var sol=new Array(81).fill(0); this.fillGrid(sol,0);
    var puz=sol.slice(), order=shuffle(Array.from({length:81},function(_,i){return i;})),
        holes=0, min=81-clues;
    for(var t=0;t<order.length && holes<min;t++){ var i=order[t], keep=puz[i]; puz[i]=0;
      if(this.countSolutions(puz)===1) holes++; else puz[i]=keep; }
    if(holes<min){ var rest=[]; for(var j=0;j<81;j++) if(puz[j]) rest.push(j); rest=shuffle(rest);
      for(var r=0;r<rest.length && holes<min;r++){ puz[rest[r]]=0; holes++; } }
    return {sol:sol,puz:puz,holes:holes};
  },
  start:function(){ this.blur(); var gen=this.generate(this.clues);
    this.sol=gen.sol; this.given=gen.puz.map(function(v){return v?1:0;}); this.val=gen.puz.slice();
    this.notesSet=[]; for(var i=0;i<81;i++) this.notesSet.push(new Set());
    this.undo=[]; this.cell=-1; this.time=0; this.err=0; this.hints=3; this.running=false; this.live=false; this.notes=false;
    $('#sdNotes').classList.remove('on'); this.render(); this.hud(); },
  blur:function(){ clearInterval(this.t); this.t=null; this.running=false; },
  resume:function(){ if(this.live) this.clock(); },
  selectCell:function(i){ this.cell=i; this.mark(); },
  mark:function(){ var self=this; $$('.sd-cell',this.el).forEach(function(c,i){ c.classList.remove('sel','peer','same');
    if(self.cell<0) return; if(i===self.cell){ c.classList.add('sel'); return; }
    var sx=self.cell%9,sy=(self.cell/9)|0,x=i%9,y=(i/9)|0;
    if(x===sx||y===sy||((x/3|0)===(sx/3|0)&&(y/3|0)===(sy/3|0))) c.classList.add('peer');
    var v=self.val[self.cell]; if(v&&self.val[i]===v) c.classList.add('same'); }); },
  clock:function(){ var self=this; if(this.running) return; this.running=true; this.live=true;
    this.t=setInterval(function(){ self.time++; $('#sdTime').textContent=mmss(self.time); },1000); },
  hud:function(){ $('#sdTime').textContent=mmss(this.time); $('#sdErr').textContent=this.err+' · '+this.hints;
    var cnt=new Array(10).fill(0); this.val.forEach(function(v){ cnt[v]++; });
    $$('button',this.keys).forEach(function(b){ var r=9-cnt[+b.getAttribute('data-v')]; b.classList.toggle('done',r<=0); b.querySelector('small').textContent=Math.max(0,r); }); },
  render:function(){ var f=document.createDocumentFragment();
    for(var i=0;i<81;i++){ var x=i%9,y=(i/9)|0,d=document.createElement('div');
      d.className='sd-cell'+(this.given[i]?' given':'')+(x===2||x===5?' br':'')+(y===2||y===5?' bb':''); d.setAttribute('data-i',i);
      var v=this.val[i];
      if(v) d.textContent=v; else { var ns=this.notesSet[i]; if(ns.size){ var w=document.createElement('div'); w.className='sd-notes';
        for(var k=1;k<=9;k++){ var s=document.createElement('i'); if(ns.has(k)) s.textContent=k; w.appendChild(s); } d.appendChild(w); } }
      f.appendChild(d); }
    this.el.innerHTML=''; this.el.appendChild(f); this.mark(); },
  input:function(v){ if(this.cell<0) return; var i=this.cell; if(this.given[i]) return; this.clock();
    this.undo.push({i:i,v:this.val[i],n:new Set(this.notesSet[i])});
    if(this.notes&&v){ this.notesSet[i].has(v)?this.notesSet[i].delete(v):this.notesSet[i].add(v); S.click(); this.render(); this.hud(); return; }
    this.notesSet[i].clear();
    if(v===0){ this.val[i]=0; S.click(); this.render(); this.hud(); return; }
    if(v===this.sol[i]){ this.val[i]=v; S.place();
      var x=i%9,y=(i/9)|0,bx=(x/3|0)*3,by=(y/3|0)*3;
      for(var k=0;k<9;k++){ this.notesSet[y*9+k].delete(v); this.notesSet[k*9+x].delete(v); this.notesSet[(by+(k/3|0))*9+bx+(k%3)].delete(v); }
      this.render(); var el=$$('.sd-cell',this.el)[i]; if(el) el.classList.add('good'); this.hud(); this.win();
    } else { this.val[i]=v; this.err++; S.bad(); this.render(); var e2=$$('.sd-cell',this.el)[i]; if(e2) e2.classList.add('bad');
      setTimeout(function(){ var e3=$$('.sd-cell',GAMES.sudoku.el)[i]; if(e3) e3.classList.remove('bad'); },700); this.hud(); } },
  undoStep:function(){ var u=this.undo.pop(); if(!u) return; this.val[u.i]=u.v; this.notesSet[u.i]=u.n; S.click(); this.render(); },
  hint:function(){ if(this.hints<=0) return; var i=this.cell;
    if(i<0||this.given[i]||this.val[i]===this.sol[i]){ var empt=[]; for(var k=0;k<81;k++) if(!this.given[k]&&this.val[k]!==this.sol[k]) empt.push(k);
      if(!empt.length) return; i=empt[(Math.random()*empt.length)|0]; }
    this.hints--; this.given[i]=1; this.val[i]=this.sol[i]; this.notesSet[i].clear(); S.clear(4); this.clock(); this.render();
    var el=$$('.sd-cell',this.el)[i]; if(el) el.classList.add('good'); this.hud(); this.win(); },
  win:function(){ for(var i=0;i<81;i++) if(this.val[i]!==this.sol[i]) return;
    this.live=false; this.blur(); S.win(); var b=Store.get('sudoku.best',{}),k=this.clues;
    if(!b[k]||this.time<b[k]){ b[k]=this.time; Store.set('sudoku.best',b); refreshBests(); } },
  key:function(e){ var k=e.key;
    if(k>='1'&&k<='9'){ this.input(+k); e.preventDefault(); return; }
    if(k==='Backspace'||k==='Delete'||k==='0'){ this.input(0); e.preventDefault(); return; }
    var l=k.toLowerCase(); if(l==='n'){ $('#sdNotes').click(); return; } if(l==='h'){ $('#sdHint').click(); return; } if(l==='u'){ this.undoStep(); return; }
    var x=this.cell<0?4:this.cell%9,y=this.cell<0?4:(this.cell/9)|0;
    if(k==='ArrowLeft'){ x=(x+8)%9; e.preventDefault(); } else if(k==='ArrowRight'){ x=(x+1)%9; e.preventDefault(); }
    else if(k==='ArrowUp'){ y=(y+8)%9; e.preventDefault(); } else if(k==='ArrowDown'){ y=(y+1)%9; e.preventDefault(); } else return;
    this.cell=y*9+x; this.mark(); }
};

/* ===================== 05 · BREAKOUT ===================== */
GAMES.breakout={
  title:'Breakout', kicker:'Máquina 05 · puntería', sub:'Devuélvela con rabia y no dejes ni un ladrillo.',
  canPause:true, COL:'#ff5da2', MW:640, MH:480,
  TOP:10, CX:26, TY:64, GAP:6, BROW:18, PITCH:24,
  PAL:['#ff5da2','#ff8f6b','#ffc45e','#a8e063','#3ddad7','#7aa2ff','#c58bff'],
  PW:{
    E:{c:'#a8e063',n:'PANEL XL', w:22,f:function(g){ g.fx.expand=14; }},
    L:{c:'#ff5da2',n:'LÁSER',    w:22,f:function(g){ g.fx.laser=11; }},
    S:{c:'#3ddad7',n:'LENTO',    w:16,f:function(g){ g.fx.slow=11; }},
    M:{c:'#7aa2ff',n:'MULTI',    w:24,f:function(g){ g.split(); }},
    H:{c:'#ffc45e',n:'VIDA +1',  w:8, f:function(g){ g.lives=Math.min(6,g.lives+1); g.hud(); }}
  },
  legend:[['← → / A D','mover'],['Ratón / dedo','mover'],['Espacio','sacar'],['P','pausa'],['R','reiniciar']],
  rules:'La bola sale rebotada según el <b>punto de impacto</b> en el panel: pégala a un lado para abrir ángulo. Cada golpe sin tocar el panel sube el <b>combo</b>. Los ladrillos agrietados necesitan dos golpes. Cae power-ups: <b>E</b> panel XL, <b>L</b> láser automático, <b>S</b> bola lenta, <b>M</b> multibola, <b>H</b> vida extra.',
  init:function(){
    this.cv=$('#boCanvas'); this.board=$('#boBoard'); this.veil=$('#boVeil'); this.pwEl=$('#boPw');
    if(window.ResizeObserver) new ResizeObserver(this.geom.bind(this)).observe(this.board);
    this.geom();
    var self=this;
    $('#boAgain').addEventListener('click',function(){ self.start(); });
    var aim=function(e){ var r=self.cv.getBoundingClientRect(); if(r.width<2) return;
      var x=(e.clientX-r.left)/r.width*self.MW;
      self.pad.tx=Math.max(self.pad.w/2,Math.min(self.MW-self.pad.w/2,x)); self.pointer=true; };
    this.cv.addEventListener('pointermove',aim);
    this.cv.addEventListener('pointerdown',function(e){ aim(e); self.serve(); });
  },
  geom:function(){ var self=this;
    fitNow(this,this.cv,function(g){ self.c=g.c; self.k=g.w/self.MW; g.c.scale(self.k,self.k); self.draw(); });
  },
  build:function(n){
    var cols=12, pat=(n-1)%6, rows=5+Math.min(2,Math.floor(n/3)), self=this;
    var bw=(this.MW-2*this.CX-(cols-1)*this.GAP)/cols;
    this.bricks=[];
    var ok=function(r,c){
      switch(pat){
        case 0: return true;
        case 1: return (r+c)%2===0;
        case 2: return (c+r)%6<3;
        case 3: return c>=r && c<=cols-1-r;
        case 4: return r===0||r===rows-1||c===0||c===cols-1;
        default: return c%2===0;
      }};
    for(var r=0;r<rows;r++)for(var c=0;c<cols;c++){
      if(!ok(r,c)) continue;
      var hp=1;
      if(n>=3 && r===0) hp=2;
      if(n>=6 && r===1) hp=2;
      self.bricks.push({x:self.CX+c*(bw+self.GAP), y:self.TY+r*this.PITCH, w:bw, h:self.BROW,
                        hp:hp, max:hp, row:r, col:self.PAL[r%self.PAL.length], pts:(rows-r)*10});
    }
  },
  curSpeed:function(){ var v=Math.min(560,300+(this.level-1)*20); return this.fx.slow>0? v*0.72 : v; },
  resetFx:function(){ this.fx.expand=0; this.fx.laser=0; this.fx.slow=0; this.laserCd=0; },
  serve:function(){
    if(this.state!=='serve'||this.paused||this.over) return;
    var a=-Math.PI/2+(Math.random()*0.6-0.3), sp=this.curSpeed();
    this.balls=[{x:this.pad.x,y:this.pad.y-this.r-2,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:this.r,trail:[]}];
    this.state='play';
  },
  split:function(){
    var base=this.balls.slice(0,2), sp=this.curSpeed(), self=this;
    base.forEach(function(b){
      [-0.45,0.45].forEach(function(d){
        if(self.balls.length>=6) return;
        var a=Math.atan2(b.vy,b.vx)+d;
        self.balls.push({x:b.x,y:b.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:self.r,trail:[]});
      });
    });
  },
  start:function(){
    this.lives=3; this.score=0; this.level=1; this.combo=0; this.best=0;
    this.pad={x:this.MW/2,tx:this.MW/2,w:88,h:12,y:this.MH-34};
    this.r=7; this.drops=[]; this.shots=[]; this.parts=[]; this.shake=0;
    this.fx={expand:0,laser:0,slow:0}; this.laserCd=0; this.msg={t:'',l:0}; this.lvlT=0;
    this.paused=false; this.over=false; this.kl=false; this.kr=false; this.pointer=false;
    $('#btnPause').textContent='Pausa'; this.veil.classList.remove('on');
    this.build(1); this.state='serve'; this.balls=[];
    this.hud(); this.draw();
  },
  hud:function(){
    $('#boScore').textContent=this.score; $('#boLevel').textContent=this.level;
    $('#boLives').textContent=this.lives>0? new Array(this.lives+1).join('♥') : '—';
  },
  pwHud:function(){
    var sig='', self=this, html='';
    ['expand','laser','slow'].forEach(function(k){ if(self.fx[k]>0) html+='<b style="--c:'+self.PW[k==='expand'?'E':k==='laser'?'L':'S'].c+'">'+self.PW[k==='expand'?'E':k==='laser'?'L':'S'].n+' '+Math.ceil(self.fx[k])+'s</b>'; });
    sig=html;
    if(sig!==this._pwSig){ this._pwSig=sig; this.pwEl.innerHTML=sig; }
  },
  veilOn:function(t,p){ $('#boVeilTxt').textContent=p; $('#boVeil h3').textContent=t; this.veil.classList.add('on'); },
  pause:function(){ if(this.over) return; this.paused=!this.paused; $('#btnPause').textContent=this.paused?'Seguir':'Pausa';
    if(this.paused) this.veilOn('PAUSA','La bola flota, respira.'); else this.veil.classList.remove('on'); },
  resume:function(){ if(this.paused&&!this.over){ this.paused=false; $('#btnPause').textContent='Pausa'; this.veil.classList.remove('on'); } },
  blur:function(){ if(!this.over&&!this.paused){ this.paused=true; $('#btnPause').textContent='Seguir'; this.veilOn('PAUSA','Vuelve cuando quieras.'); } },
  die:function(){
    this.over=true; S.hit();
    if(this.score>Store.get('breakout.best',0)){ Store.set('breakout.best',this.score); refreshBests(); }
    this.veilOn('GAME OVER','Nivel '+this.level+' · '+this.score+' puntos'); this.draw();
  },
  loseLife:function(){
    this.lives--; this.combo=0; this.resetFx(); this.drops=[]; this.shots=[];
    this.hud();
    if(this.lives<=0) return this.die();
    Snd.tone(170,.34,'sawtooth',.07,-100);
    this.state='serve'; this.balls=[]; this.pad.x=this.pad.tx=this.MW/2;
    this.msg={t:'VIDA PERDIDA',l:1.1};
  },
  nextLevel:function(){
    this.score+=250*this.level; this.level++; this.hud();
    S.win(); this.state='level'; this.lvlT=1.5; this.msg={t:'NIVEL '+this.level,l:1.5};
    this.resetFx(); this.drops=[]; this.shots=[];
  },
  burst:function(x,y,col,n){
    for(var i=0;i<(n||10);i++){ var a=Math.random()*6.283,v=(Math.random()*2+1)*90;
      this.parts.push({x:x,y:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l:1,c:col}); }
    if(this.parts.length>240) this.parts.splice(0,this.parts.length-240);
  },
  hitBrick:function(k,i){
    k.hp--; this.combo++; this.best=Math.max(this.best,this.combo);
    this.shake=Math.max(this.shake,2.2);
    var cx=k.x+k.w/2, cy=k.y+k.h/2;
    if(k.hp>0){ Snd.tone(360+Math.min(this.combo,12)*30,.03,'square',.035); this.burst(cx,cy,k.col,5); return; }
    this.score+=k.pts+this.combo*5; this.hud();
    Snd.tone(300+Math.min(this.combo,16)*38,.035,'square',.05);
    this.burst(cx,cy,k.col,14);
    this.bricks.splice(i,1);
    var rest=this.bricks.some(function(b){ return b.row===k.row; });
    if(!rest && this.bricks.length){ this.score+=100*this.level; this.hud(); this.msg={t:'FILA +'+(100*this.level),l:.9}; Snd.seq([700,900,1100],.05,'triangle',.05); }
    var roll=Math.random(); if(roll<0.14) this.drop(cx,cy);
    if(!this.bricks.length) this.nextLevel();
  },
  drop:function(x,y){
    var pool=[], self=this;
    Object.keys(this.PW).forEach(function(t){ for(var i=0;i<self.PW[t].w;i++) pool.push(t); });
    this.drops.push({x:x,y:y,v:132,t:pool[(Math.random()*pool.length)|0]});
  },
  collide:function(b){
    var M=this.MW, p=this.pad, sp=this.curSpeed();
    if(b.x-b.r<0){ b.x=b.r; b.vx=Math.abs(b.vx); Snd.tone(240,.02,'square',.025); }
    else if(b.x+b.r>M){ b.x=M-b.r; b.vx=-Math.abs(b.vx); Snd.tone(240,.02,'square',.025); }
    if(b.y-b.r<this.TOP){ b.y=this.TOP+b.r; b.vy=Math.abs(b.vy); Snd.tone(280,.02,'square',.025); }
    if(b.vy>0 && b.y+b.r>=p.y && b.y-b.r<p.y+p.h && b.x>=p.x-p.w/2-b.r && b.x<=p.x+p.w/2+b.r){
      b.y=p.y-b.r;
      var off=Math.max(-1,Math.min(1,(b.x-p.x)/(p.w/2)));
      var a=-Math.PI/2+off*1.05;
      b.vx=Math.cos(a)*sp; b.vy=Math.sin(a)*sp;
      if(this.combo){ this.msg={t:'COMBO ×'+this.combo,l:.7}; }
      this.combo=0; Snd.tone(200,.04,'square',.05); this.burst(b.x,p.y,'#e9f1f8',4); return true;
    }
    for(var i=this.bricks.length-1;i>=0;i--){ var k=this.bricks[i];
      var dx=b.x-(k.x+k.w/2), dy=b.y-(k.y+k.h/2);
      var px=(k.w/2+b.r)-Math.abs(dx), py=(k.h/2+b.r)-Math.abs(dy);
      if(px<=0||py<=0) continue;
      if(px<py){ b.x+=dx<0?-px:px; b.vx=dx<0?-Math.abs(b.vx):Math.abs(b.vx); }
      else     { b.y+=dy<0?-py:py; b.vy=dy<0?-Math.abs(b.vy):Math.abs(b.vy); }
      this.hitBrick(k,i); return true;
    }
    return false;
  },
  moveBall:function(b,s){
    var sp=this.curSpeed();
    var m=Math.hypot(b.vx,b.vy)||1; b.vx=b.vx/m*sp; b.vy=b.vy/m*sp;
    if(Math.abs(b.vy)<sp*0.24){ var sg=b.vy>=0?1:-1; b.vy=sg*sp*0.24; b.vx=(b.vx>=0?1:-1)*Math.sqrt(Math.max(1,sp*sp-b.vy*b.vy)); }
    var steps=Math.max(1,Math.min(6,Math.ceil(sp*s/(b.r*0.8)))), dead=false;
    for(var i=0;i<steps;i++){
      b.x+=b.vx*s/steps; b.y+=b.vy*s/steps;
      if(this.collide(b)) break;
      if(b.y-b.r>this.MH){ dead=true; break; }
    }
    b.trail.push({x:b.x,y:b.y}); if(b.trail.length>9) b.trail.shift();
    return dead;
  },
  tick:function(dt){
    if(!this._i) return;
    var s=Math.min(dt,50)/1000;
    if(!this.paused&&!this.over){
      if(!this.pointer){ var dir=(this.kr?1:0)-(this.kl?1:0); if(dir) this.pad.tx+=dir*620*s; }
      var tw=this.fx.expand>0?132:88;
      this.pad.w+=(tw-this.pad.w)*Math.min(1,s*9);
      this.pad.tx=Math.max(this.pad.w/2,Math.min(this.MW-this.pad.w/2,this.pad.tx));
      this.pad.x+=(this.pad.tx-this.pad.x)*Math.min(1,s*20);
      for(var e in this.fx){ if(this.fx[e]>0) this.fx[e]=Math.max(0,this.fx[e]-s); }
      if(this.fx.laser>0){ this.laserCd-=s;
        if(this.laserCd<=0){ this.laserCd=.38; Snd.tone(1250,.04,'square',.03,-700);
          this.shots.push({x:this.pad.x-(this.pad.w/2-9),y:this.pad.y-4},{x:this.pad.x+(this.pad.w/2-9),y:this.pad.y-4}); } }
      if(this.state==='level'){ this.lvlT-=s; if(this.lvlT<=0){ this.build(this.level); this.state='serve'; this.balls=[]; } }
      else if(this.state==='play'){
        for(var i=this.balls.length-1;i>=0;i--){ if(this.moveBall(this.balls[i],s)) this.balls.splice(i,1); }
        if(!this.balls.length) this.loseLife();
      } else if(this.state==='serve' && this.balls.length===0){
        this.balls=[{x:this.pad.x,y:this.pad.y-this.r-2,vx:0,vy:0,r:this.r,trail:[]}];
      }
      if(this.state==='serve'){ this.balls.forEach(function(b){ b.x=this.pad.x; b.y=this.pad.y-b.r-2; b.trail.length=0; }.bind(this)); }
      for(var q=this.shots.length-1;q>=0;q--){ var sh=this.shots[q]; sh.y-=640*s;
        var gone=sh.y<this.TOP;
        if(!gone) for(var z=this.bricks.length-1;z>=0;z--){ var k=this.bricks[z];
          if(sh.x>k.x&&sh.x<k.x+k.w&&sh.y<k.y+k.h&&sh.y>k.y-6){ this.hitBrick(k,z); gone=true; break; } }
        if(gone) this.shots.splice(q,1); }
      var p=this.pad;
      for(var d=this.drops.length-1;d>=0;d--){ var dp=this.drops[d]; dp.y+=dp.v*s;
        if(dp.y+7>=p.y&&dp.y-7<=p.y+p.h&&dp.x>=p.x-p.w/2-11&&dp.x<=p.x+p.w/2+11){
          this.PW[dp.t].f(this); this.hud(); Snd.seq([660,990,1320],.05,'triangle',.05);
          this.burst(dp.x,dp.y,this.PW[dp.t].c,12); this.drops.splice(d,1); continue; }
        if(dp.y>this.MH+20) this.drops.splice(d,1); }
      if(this.msg.l>0) this.msg.l-=s;
      if(this.shake>0) this.shake=Math.max(0,this.shake-s*14);
      this.pwHud();
    }
    for(var pp=this.parts.length-1;pp>=0;pp--){ var o=this.parts[pp];
      o.x+=o.vx*s; o.y+=o.vy*s; o.vy+=520*s; o.l-=s*1.7;
      if(o.l<=0) this.parts.splice(pp,1); }
    this.draw();
  },
  draw:function(){
    var c=this.c,M=this.MW,H=this.MH; if(!c) return;
    c.save();
    if(this.shake>0) c.translate((Math.random()-.5)*this.shake,(Math.random()-.5)*this.shake);
    var g=c.createLinearGradient(0,0,0,H); g.addColorStop(0,'#101d2b'); g.addColorStop(.6,'#0a1420'); g.addColorStop(1,'#070d15');
    c.fillStyle=g; c.fillRect(-8,-8,M+16,H+16);
    c.strokeStyle='rgba(120,170,210,.05)'; c.lineWidth=1;
    for(var x=0;x<=M;x+=40){ c.beginPath(); c.moveTo(x,0); c.lineTo(x,H); c.stroke(); }
    for(var y=0;y<=H;y+=40){ c.beginPath(); c.moveTo(0,y); c.lineTo(M,y); c.stroke(); }
    var tg=c.createLinearGradient(0,0,M,0); tg.addColorStop(0,'rgba(255,93,162,.55)'); tg.addColorStop(.5,'rgba(255,196,94,.45)'); tg.addColorStop(1,'rgba(61,218,215,.55)');
    c.fillStyle=tg; c.fillRect(0,this.TOP-4,M,4);
    c.strokeStyle='rgba(255,93,162,.22)'; c.lineWidth=2; c.strokeRect(1,1,M-2,H-2);
    var self=this;
    this.bricks&&this.bricks.forEach(function(k){
      c.save();
      c.globalAlpha=k.hp<k.max?.85:1;
      c.fillStyle=k.col; rr(c,k.x,k.y,k.w,k.h,4); c.fill();
      c.fillStyle='rgba(255,255,255,.24)'; rr(c,k.x+2,k.y+2,k.w-4,k.h*.30,3); c.fill();
      c.fillStyle='rgba(0,0,0,.26)'; rr(c,k.x+2,k.y+k.h*.62,k.w-4,k.h*.30,3); c.fill();
      if(k.hp<k.max){ c.strokeStyle='rgba(255,255,255,.55)'; c.lineWidth=1.3;
        var mx=k.x+k.w/2,my=k.y+k.h/2;
        c.beginPath(); c.moveTo(mx-8,my-5); c.lineTo(mx-1,my-1); c.lineTo(mx-5,my+2); c.lineTo(mx+3,my+6); c.stroke(); }
      c.restore();
    });
    this.drops&&this.drops.forEach(function(d){ var P=self.PW[d.t];
      c.save(); c.shadowColor=P.c; c.shadowBlur=12; c.fillStyle=P.c; rr(c,d.x-13,d.y-8,26,16,5); c.fill(); c.restore();
      c.fillStyle='#08111a'; c.font='700 11px '+'IBM Plex Mono, monospace'; c.textAlign='center'; c.textBaseline='middle';
      c.fillText(d.t,d.x,d.y+.5); });
    this.shots&&this.shots.forEach(function(s2){ c.save(); c.shadowColor='#ff5da2'; c.shadowBlur=10;
      c.fillStyle='#ffd9e8'; c.fillRect(s2.x-1.5,s2.y-16,3,16); c.restore(); });
    this.balls&&this.balls.forEach(function(b){
      for(var t=0;t<b.trail.length;t++){ var a=(t+1)/b.trail.length;
        c.fillStyle='rgba(255,220,235,'+(a*.22)+')'; c.beginPath(); c.arc(b.trail[t].x,b.trail[t].y,b.r*a*.9,0,6.283); c.fill(); }
      c.save(); c.shadowColor='rgba(255,93,162,.95)'; c.shadowBlur=16;
      c.fillStyle='#fff'; c.beginPath(); c.arc(b.x,b.y,b.r,0,6.283); c.fill(); c.restore();
    });
    var p=this.pad, px=p.x-p.w/2;
    c.save(); c.shadowColor='rgba(255,93,162,.8)'; c.shadowBlur=this.fx.laser>0?22:14;
    var pg=c.createLinearGradient(0,p.y,0,p.y+p.h); pg.addColorStop(0,'#ffd0e2'); pg.addColorStop(.45,'#ff5da2'); pg.addColorStop(1,'#c23a75');
    c.fillStyle=pg; rr(c,px,p.y,p.w,p.h,6); c.fill(); c.restore();
    c.fillStyle='rgba(255,255,255,.5)'; rr(c,px+3,p.y+2,p.w-6,3,2); c.fill();
    if(this.fx.laser>0){ c.fillStyle='#0a1018'; c.fillRect(px+5,p.y+3,4,p.h-6); c.fillRect(px+p.w-9,p.y+3,4,p.h-6); }
    this.parts&&this.parts.forEach(function(o){ c.globalAlpha=Math.max(0,o.l); c.fillStyle=o.c; c.fillRect(o.x-2,o.y-2,4,4); });
    c.globalAlpha=1;
    c.font='700 13px IBM Plex Mono, monospace'; c.textAlign='right'; c.textBaseline='top';
    c.fillStyle='rgba(139,164,193,.35)'; c.fillText('NIVEL '+this.level+'  ·  COMBO ×'+this.combo, M-12, this.TOP+8);
    if(this.msg&&this.msg.l>0){ var a=Math.min(1,this.msg.l/.35);
      c.save(); c.globalAlpha=a; c.textAlign='center'; c.textBaseline='middle';
      c.font='700 '+(/NIVEL|VIDA/.test(this.msg.t)?'44px':'24px')+' Bungee, sans-serif';
      c.shadowColor='rgba(255,93,162,.8)'; c.shadowBlur=24; c.fillStyle='#fff';
      c.fillText(this.msg.t,M/2,this.TY+120); c.restore(); }
    if(this.state==='serve'&&!this.paused&&!this.over){
      c.save(); c.globalAlpha=.55+Math.sin(performance.now()/280)*.35; c.textAlign='center';
      c.font='600 15px IBM Plex Mono, monospace'; c.fillStyle='#e9f1f8';
      c.fillText('PULSA ESPACIO O TOCA PARA SACAR', M/2, p.y-40); c.restore(); }
    c.restore();
  },
  key:function(e){
    var k=e.key.toLowerCase();
    if(['arrowleft','arrowright','arrowup','arrowdown',' '].indexOf(k)>=0) e.preventDefault();
    if(k==='p'){ this.pause(); return; } if(k==='r'){ this.start(); return; }
    if(k==='arrowleft'||k==='a'){ this.kl=true; this.pointer=false; }
    else if(k==='arrowright'||k==='d'){ this.kr=true; this.pointer=false; }
    else if(k===' '||k==='arrowup'){ this.serve(); }
  },
  keyUp:function(e){ var k=e.key.toLowerCase();
    if(k==='arrowleft'||k==='a') this.kl=false;
    if(k==='arrowright'||k==='d') this.kr=false; }
};

/* ===================== 06 · FLAPPY ===================== */
GAMES.flappy={
  title:'Flappy', kicker:'Máquina 06 · pulso', sub:'Un toque, un aleteo. Un choque y se acabó.',
  canPause:true, MW:420, MH:600,
  r:13, px:110, TW:58, G:1500, JUMP:-430, GAPX:210,
  legend:[['Espacio / ↑ / W','volar'],['Toque / clic','volar'],['P','pausa'],['R','reiniciar']],
  rules:'Pulsa para dar un <b>aleteo</b>: la gravedad hace el resto. Cruza el hueco entre tuberías para sumar. Cada 5 puntos sube nivel: más rápido y con hueco más estrecho. <b>Un choque acaba la partida</b>, como en Snake.',
  init:function(){
    this.cv=$('#flCanvas'); this.board=$('#flBoard'); this.veil=$('#flVeil');
    if(window.ResizeObserver) new ResizeObserver(this.geom.bind(this)).observe(this.board);
    this.geom();
    var self=this;
    $('#flAgain').addEventListener('click',function(){ self.start(); });
    this.cv.addEventListener('pointerdown',function(e){ e.preventDefault(); self.flap(); });
  },
  geom:function(){ var self=this;
    fitNow(this,this.cv,function(g){ self.c=g.c; self.k=g.w/self.MW; g.c.scale(self.k,self.k); self.draw(); });
  },
  speed:function(){ return Math.min(280, 150+(this.level-1)*14); },
  gapH:function(){ return Math.max(120, 185-(this.level-1)*9); },
  circleRect:function(cx,cy,r,rx,ry,rw,rh){
    var nx=Math.max(rx,Math.min(cx,rx+rw)), ny=Math.max(ry,Math.min(cy,ry+rh));
    var dx=cx-nx, dy=cy-ny; return dx*dx+dy*dy < r*r;
  },
  spawnTube:function(){
    var gapH=this.gapH(), minY=70+gapH/2, maxY=this.MH-70-gapH/2;
    var gapY=minY+Math.random()*(maxY-minY);
    this.tubes.push({x:this.MW+this.TW, gapY:gapY, gapH:gapH, passed:false});
  },
  flap:function(){
    if(this.state==='over') return;
    if(this.state==='ready'){ this.state='play'; this.vy=this.JUMP; Snd.tone(520,.06,'square',.04,140); return; }
    if(this.state==='play'){ this.vy=this.JUMP; Snd.tone(480,.05,'square',.04,150); }
  },
  start:function(){
    this.score=0; this.level=1; this.best=Store.get('flappy.best',0);
    this.py=this.MH/2; this.vy=0; this.state='ready'; this.tubes=[]; this.parts=[];
    this.clouds=[]; for(var i=0;i<4;i++) this.clouds.push({x:Math.random()*this.MW,y:40+Math.random()*170,s:.5+Math.random()*.6});
    this.shake=0; this.over=false; this.paused=false;
    $('#btnPause').textContent='Pausa'; this.veil.classList.remove('on');
    this.hud(); this.draw();
  },
  hud:function(){
    $('#flScore').textContent=this.score; $('#flBest').textContent=this.best; $('#flLevel').textContent=this.level;
  },
  burst:function(){
    for(var i=0;i<18;i++){ var a=Math.random()*6.283,v=(Math.random()*2+1)*120;
      this.parts.push({x:this.px,y:this.py,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l:1,c:Math.random()<.5?'#ffe066':'#ff8f6b'}); }
  },
  hit:function(){ this.shake=9; S.hit(); this.burst(); this.gameOver(); },
  gameOver:function(){
    this.state='over'; this.over=true;
    if(this.score>Store.get('flappy.best',0)){ Store.set('flappy.best',this.score); }
    this.best=Store.get('flappy.best',0); refreshBests(); this.hud();
    this.veilOn('GAME OVER', this.score+' puntos · Mejor '+this.best);
    this.draw();
  },
  veilOn:function(t,p){ $('#flVeilTxt').textContent=p; $('#flVeil h3').textContent=t; this.veil.classList.add('on'); },
  pause:function(){ if(this.over) return; this.paused=!this.paused; $('#btnPause').textContent=this.paused?'Seguir':'Pausa';
    if(this.paused) this.veilOn('PAUSA','El pájaro se queda quieto.'); else this.veil.classList.remove('on'); },
  resume:function(){ if(this.paused&&!this.over){ this.paused=false; $('#btnPause').textContent='Pausa'; this.veil.classList.remove('on'); } },
  blur:function(){ if(!this.over&&!this.paused){ this.paused=true; $('#btnPause').textContent='Seguir'; this.veilOn('PAUSA','Vuelve cuando quieras.'); } },
  key:function(e){
    var k=e.key.toLowerCase();
    if(['arrowup','arrowdown','arrowleft','arrowright',' '].indexOf(k)>=0||'wasd'.indexOf(k)>=0) e.preventDefault();
    if(k==='p'){ this.pause(); return; } if(k==='r'){ this.start(); return; }
    if(k===' '||k==='arrowup'||k==='w') this.flap();
  },
  tick:function(dt){
    if(!this._i) return;
    var s=Math.min(dt,50)/1000;
    if(this.paused||this.over){ this.updateParts(s); this.draw(); return; }
    var cs=this.speed()*0.22;
    for(var ci=0;ci<this.clouds.length;ci++){ var cl=this.clouds[ci]; cl.x-=cs*s*cl.s; if(cl.x<-90){ cl.x=this.MW+40; cl.y=40+Math.random()*170; } }
    if(this.state==='ready'){ this.py=this.MH/2+Math.sin(performance.now()/300)*8; this.updateParts(s); this.draw(); return; }
    this.vy+=this.G*s; this.py+=this.vy*s;
    if(this.py<this.r){ this.py=this.r; this.vy=0; }
    var sp=this.speed();
    for(var i=this.tubes.length-1;i>=0;i--){ var t=this.tubes[i]; t.x-=sp*s;
      if(!t.passed && t.x+this.TW<this.px){ t.passed=true; this.score++; if(this.score%5===0) this.level++; this.hud(); Snd.tone(300+Math.min(this.score,40)*12,.03,'square',.04); }
      if(t.x+this.TW<-10) this.tubes.splice(i,1);
    }
    var last=this.tubes[this.tubes.length-1];
    if(!last || (this.MW-last.x)>=this.GAPX) this.spawnTube();
    if(this.py+this.r>=this.MH){ this.py=this.MH-this.r; this.hit(); this.updateParts(s); this.draw(); return; }
    for(var j=0;j<this.tubes.length;j++){ var k=this.tubes[j];
      var topH=k.gapY-k.gapH/2, botY=k.gapY+k.gapH/2;
      if(this.circleRect(this.px,this.py,this.r, k.x,0,this.TW,topH) || this.circleRect(this.px,this.py,this.r, k.x,botY,this.TW,this.MH-botY)){ this.hit(); break; }
    }
    this.updateParts(s); this.draw();
  },
  updateParts:function(s){ for(var i=this.parts.length-1;i>=0;i--){ var o=this.parts[i]; o.x+=o.vx*s; o.y+=o.vy*s; o.vy+=520*s; o.l-=s*1.7; if(o.l<=0) this.parts.splice(i,1); } },
  draw:function(){
    var c=this.c; if(!c) return; var MW=this.MW,MH=this.MH;
    c.save();
    if(this.shake>0){ this.shake=Math.max(0,this.shake-0.6); c.translate((Math.random()-.5)*this.shake,(Math.random()-.5)*this.shake); }
    var g=c.createLinearGradient(0,0,0,MH); g.addColorStop(0,'#12314a'); g.addColorStop(.7,'#0c1e30'); g.addColorStop(1,'#0a1622');
    c.fillStyle=g; c.fillRect(-8,-8,MW+16,MH+16);
    c.save(); c.globalAlpha=.07; c.fillStyle='#e9f1f8';
    for(var ci=0;ci<this.clouds.length;ci++){ var cl=this.clouds[ci]; c.beginPath();
      c.arc(cl.x,cl.y,22*cl.s,0,6.283); c.arc(cl.x+20*cl.s,cl.y+6*cl.s,16*cl.s,0,6.283); c.arc(cl.x-18*cl.s,cl.y+8*cl.s,14*cl.s,0,6.283); c.fill(); }
    c.restore();
    for(var i=0;i<this.tubes.length;i++) this.drawTube(this.tubes[i]);
    c.fillStyle='#16321f'; c.fillRect(-8,MH-6,MW+16,14);
    c.strokeStyle='rgba(94,196,106,.5)'; c.lineWidth=2; c.beginPath(); c.moveTo(0,MH-6); c.lineTo(MW,MH-6); c.stroke();
    this.drawBird();
    for(var pi=0;pi<this.parts.length;pi++){ var o=this.parts[pi]; c.globalAlpha=Math.max(0,o.l); c.fillStyle=o.c; c.fillRect(o.x-2,o.y-2,4,4); }
    c.globalAlpha=1;
    c.save(); c.textAlign='center'; c.textBaseline='top'; c.font='700 42px Bungee, sans-serif';
    c.lineWidth=4; c.strokeStyle='rgba(0,0,0,.5)'; c.strokeText(this.score,MW/2,26);
    c.fillStyle='#fff'; c.fillText(this.score,MW/2,26); c.restore();
    if(this.state==='ready'&&!this.paused){
      c.save(); c.globalAlpha=.55+Math.sin(performance.now()/280)*.35; c.textAlign='center'; c.font='600 16px IBM Plex Mono, monospace'; c.fillStyle='#e9f1f8'; c.fillText('PULSA PARA VOLAR',MW/2,this.py+46); c.restore(); }
    c.restore();
  },
  drawTube:function(k){
    var c=this.c, topH=k.gapY-k.gapH/2, botY=k.gapY+k.gapH/2;
    this.tubeBody(k.x,0,this.TW,topH,'top');
    this.tubeBody(k.x,botY,this.TW,this.MH-botY,'bottom');
  },
  tubeBody:function(x,y,w,h,side){
    if(h<=0) return; var c=this.c;
    var g=c.createLinearGradient(x,0,x+w,0); g.addColorStop(0,'#2f7d3c'); g.addColorStop(.5,'#5ec46a'); g.addColorStop(1,'#2f7d3c');
    c.fillStyle=g; c.fillRect(x+2,y,w-4,h);
    c.strokeStyle='#173f22'; c.lineWidth=2; c.strokeRect(x+2,y,w-4,h);
    var capH=18, cy=side==='top'? y+h-capH : y;
    c.fillStyle=g; c.fillRect(x-3,cy,w+6,capH); c.strokeRect(x-3,cy,w+6,capH);
  },
  drawBird:function(){
    var c=this.c, x=this.px, y=this.py, r=this.r;
    var ang=Math.max(-0.5,Math.min(1.3,this.vy/620));
    c.save(); c.translate(x,y); c.rotate(ang);
    c.save(); c.shadowColor='rgba(255,224,102,.6)'; c.shadowBlur=12; c.fillStyle='#ffe066';
    c.beginPath(); c.arc(0,0,r,0,6.283); c.fill(); c.restore();
    var flap=Math.sin(performance.now()/70)*0.5+0.5;
    c.fillStyle='#f5c542'; c.beginPath(); c.ellipse(-2,2,r*0.7,r*0.45,-0.4-flap*0.6,0,6.283); c.fill();
    c.fillStyle='#fff'; c.beginPath(); c.arc(r*0.42,-r*0.3,r*0.32,0,6.283); c.fill();
    c.fillStyle='#0a1018'; c.beginPath(); c.arc(r*0.52,-r*0.3,r*0.15,0,6.283); c.fill();
    c.fillStyle='#ff8f6b'; c.beginPath(); c.moveTo(r*0.7,-r*0.1); c.lineTo(r*1.35,r*0.1); c.lineTo(r*0.7,r*0.35); c.closePath(); c.fill();
    c.restore();
  }
};

/* ===================== arranque ===================== */
function boot(){
  var g=GAMES.snake;
  safe(function(){ g.init(); g._i=1; g.start(); g._s=true; }, 'snake.boot');
  setAccent($('#view-snake'));
  $('#kicker').textContent=g.kicker; $('#title').textContent=g.title; $('#sub').textContent=g.sub;
  $('#legend').innerHTML=g.legend.map(function(p){ return '<span class="key"><kbd>'+p[0]+'</kbd>'+p[1]+'</span>'; }).join('');
  $('#rules').innerHTML=g.rules; refreshBests();
  var idle=window.requestIdleCallback||function(f){ setTimeout(f,300); };
  idle(function(){ ['mines','tetris','sudoku','breakout','flappy'].forEach(function(id){ safe(function(){ GAMES[id].init(); GAMES[id]._i=1; }, id+'.idle'); }); });
}
var last=0;
(function loop(t){ var dt=Math.min(70,t-last); last=t;
  if(!document.hidden){ var g=GAMES[current]; g.tick && safe(function(){ g.tick(dt); }, current+'.tick'); }
  requestAnimationFrame(loop); })(0);

if(document.readyState==='complete') boot(); else window.addEventListener('load',boot);
