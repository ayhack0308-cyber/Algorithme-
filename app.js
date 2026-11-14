const $=id=>document.getElementById(id),out=$('out');
const PY='https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
const NAMES={p:'Pseudo-code',c:'C',y:'Python'};
let lang=localStorage.getItem('lang')||'p',pyo=null,buf='',cur=-1;
const sv=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}},ld=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
const log=(t,c)=>{const s=document.createElement('span');if(c)s.className=c;s.textContent=t;out.appendChild(s)};
const prompt2=()=>{const v=prompt('Saisie demandée (zone Entrée vide) :');if(v===null)throw new Error('Saisie annulée');return v};
const io={log,
 tok(){buf=buf.replace(/^\s+/,'');while(!buf){buf=prompt2().replace(/^\s+/,'')}const t=buf.match(/^\S+/)[0];buf=buf.slice(t.length);return t},
 line(){if(buf==='')buf=prompt2()+'\n';const i=buf.indexOf('\n'),l=i<0?buf:buf.slice(0,i);buf=i<0?'':buf.slice(i+1);return l}};
function gut(){const n=$('code').value.split('\n').length;$('gut').textContent=Array.from({length:n},(_,i)=>i+1).join('\n')}
function setLang(l,keep){if(!keep)sv('code_'+lang,$('code').value);lang=l;sv('lang',l);$('lang').value=l;
 $('code').value=ld('code_'+l)??(l=='p'||l=='c'||l=='y'?EX[1][l]:'');$('stdin').value=ld('in_'+l)??EX[1].in;gut();clear();
 $('help').innerHTML=HELP[l]}
function clear(){out.textContent='';$('err').hidden=true;$('gen').hidden=true}
function showErr(raw,line,extra){const x=ENG.explain(raw);$('err').hidden=false;
 const q=encodeURIComponent(NAMES[lang]+' '+raw.replace(/^§\d+§/,'').slice(0,90));
 $('err').innerHTML=`<b>❌ ${x.t}</b>${line?` <small>(ligne ${line})</small>`:''}<p>${x.w}</p><p>🔓 <b>Pour débloquer :</b> ${x.f}</p><pre></pre>`+
  (navigator.onLine?`<a target="_blank" rel="noopener" href="https://www.google.com/search?q=${q}">🔎 Chercher cette erreur en ligne</a>`:'<small>📴 Hors ligne : explication intégrée uniquement.</small>');
 $('err').querySelector('pre').textContent=extra||raw.replace(/^§\d+§/,'')}
const parse=m=>{const r=String(m).match(/^§(\d+)§([\s\S]*)/);return r?[+r[1],r[2]]:[0,String(m)]};
async function runPy(code,compileMode){
 if(!pyo){log('⏳ Chargement de Python (Pyodide)…\n','dim');
  if(!window.loadPyodide)await new Promise((ok,ko)=>{const s=document.createElement('script');s.src=PY+'pyodide.js';s.onload=ok;s.onerror=()=>ko(new Error('Pyodide indisponible (Failed to fetch) : connecte-toi une première fois'));document.head.appendChild(s)});
  pyo=await loadPyodide({indexURL:PY});out.textContent=''}
 pyo.setStdout({batched:s=>log(s+'\n')});pyo.setStderr({batched:s=>log(s+'\n','err')});pyo.setStdin({stdin:()=>io.line()});
 if(compileMode){pyo.globals.set('__src',code);pyo.runPython("compile(__src,'<programme>','exec')");log('✔ Compilation réussie (bytecode généré)\n','ok')}
 await pyo.runPythonAsync(code)}
async function run(){
 clear();buf=$('stdin').value;const code=$('code').value,cm=$('mode').value=='c';sv('code_'+lang,code);sv('in_'+lang,buf);
 try{
  if(lang=='y'){await runPy(code,cm);return}
  const r=lang=='p'?ENG.compileP(code):ENG.compileC(code);
  $('gen').hidden=false;$('gen').querySelector('pre').textContent=r.js;
  if(cm){if(r.errs.length){log(`✖ Compilation échouée : ${r.errs.length} erreur(s), rien n'est exécuté.\n`,'err');
    showErr('§'+r.errs[0].line+'§'+r.errs[0].msg,r.errs[0].line,r.errs.map(e=>(e.line?`ligne ${e.line} : `:'')+e.msg).join('\n'));return}
   log('✔ Compilation réussie\n','ok')}
  ENG.execute(r.js,ENG.mkEnv(io));log('\n✔ Programme terminé\n','ok')
 }catch(e){const raw=String(e.message||e);let [ln,m]=parse(raw);
  if(lang=='y'){const t=raw.trim().split('\n').filter(Boolean),g=raw.match(/line (\d+)/g);ln=g?+g[g.length-1].slice(5):0;m=t[t.length-1];showErr(m,ln,raw)}
  else{log('\n✖ '+(cm?'Erreur à l\'exécution : ':'Interprétation arrêtée : ')+m+'\n','err');showErr(raw,ln)}}}
function openEx(i){cur=i;const x=EX[i];$('exd').innerHTML=`<h3></h3><small>${x.l}</small><p></p><button id="ld">📝 Charger le modèle</button> <button id="sol">👁 Voir la solution (${NAMES[lang]})</button>`;
 $('exd').querySelector('h3').textContent=x.t;$('exd').querySelector('p').textContent=x.e;
 $('ld').onclick=()=>{const sk={p:`// ${x.e}\nNom : \nRôle : \nEntrée : \nSortie : \nDéclaration : -\ndébut\n    \nfin`,c:`#include <stdio.h>\n\n/* ${x.e} */\nint main() {\n    \n    return 0;\n}`,y:`# ${x.e}\n`}[lang];
  $('code').value=sk;$('stdin').value=x.in;gut();clear();$('drawer').hidden=true};
 $('sol').onclick=()=>{if(!confirm('Afficher la solution ? Essaie d\'abord seul(e) !'))return;$('code').value=x[lang];$('stdin').value=x.in;gut();clear();$('drawer').hidden=true}}
const HELP={p:`<b>Pseudo-code (cours)</b><pre>Nom : … / Rôle : … / Entrée : a : entier
Déclaration : i : entier
début
  x ← a + 1          (ou &lt;-- )
  ecrire("x=", x)    lire(a)
  si c alors … sinon … fin si
  cas v de 1 : … autre : … fin cas
  pour i ← 1 à n [pas 2] faire … fin pour
  tant que c faire … fin tant que
  répéter … jusqu'à ce que c
fin
fonction f(a : entier) : entier  … début … retourner … fin
Classe C [hérite de P] / Constructeur(…) / Méthode m(…)
ceci.x  nouveau C(…)  fin classe
Types : Tableau[1..n] de …, Constante N = 5
Opérateurs : et ou non ≠ ≤ ≥ mod div</pre>`,
c:`<b>C (sous-ensemble)</b><br>int/float/double/char, tableaux, struct, fonctions, if/else, for/while/do, switch, printf/scanf, strlen, math.<br><small>Non géré : pointeurs, malloc, fichiers. Les entiers sont tronqués à la division (int/int).</small>`,
y:`<b>Python 3</b> (Pyodide complet). Chargé une fois avec Internet puis disponible hors ligne. input() lit la zone Entrée ligne par ligne.`};
document.addEventListener('DOMContentLoaded',()=>{
 $('lang').onchange=e=>setLang(e.target.value);$('run').onclick=run;$('clr').onclick=clear;
 $('code').oninput=()=>{gut();sv('code_'+lang,$('code').value)};$('code').onscroll=()=>$('gut').scrollTop=$('code').scrollTop;
 $('code').onkeydown=e=>{if(e.key=='Tab'){e.preventDefault();const t=e.target,s=t.selectionStart;t.setRangeText('    ',s,t.selectionEnd,'end');gut()}if((e.ctrlKey||e.metaKey)&&e.key=='Enter'){e.preventDefault();run()}};
 $('exb').onclick=()=>{$('drawer').hidden=false};$('xx').onclick=()=>{$('drawer').hidden=true};
 let lv='';$('exl').innerHTML=EX.map((x,i)=>{const h=x.l!=lv?(lv=x.l,`<h4>${x.l}</h4>`):'';return h+`<button data-i="${i}">${i+1}. ${x.t}</button>`}).join('');
 $('exl').onclick=e=>{const i=e.target.dataset.i;if(i!==undefined)openEx(+i)};
 $('new').onclick=()=>{if(confirm('Vider l\'éditeur ?')){$('code').value='';gut()}};
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();const b=$('inst');b.hidden=false;b.onclick=()=>{e.prompt();b.hidden=true}});
 const on=()=>$('net').textContent=navigator.onLine?'🟢 en ligne':'📴 hors ligne';on();addEventListener('online',on);addEventListener('offline',on);
 if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
 setLang(lang,true)});
