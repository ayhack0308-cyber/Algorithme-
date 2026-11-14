/* Moteur : pseudo-code (syntaxe du cours) -> JS, mini-C -> JS. Aucune dépendance. */
(function(G){
const strRe=/("(?:[^"\\\n]|\\.)*")/;
const splitTop=(s,sep=',')=>{const r=[];let d=0,q=0,c='';for(const ch of s){if(ch=='"')q=!q;if(!q){if('([{'.includes(ch))d++;if(')]}'.includes(ch))d--;if(ch==sep&&!d){r.push(c);c='';continue}}c+=ch}r.push(c);return r};
const norm=l=>l.split(strRe).map((p,i)=>i%2?p:p.replace(/≠/g,'<>').normalize('NFD').replace(/[\u0300-\u036f]/g,'')).join('');
const OPD='(?:\\w+\\b(?:\\.\\w+)*(?:\\[[^\\]]*\\])?(?!\\s*[.(])|\\([^()]*\\))';
const OPL='(?:(?<![\\w.])\\w+\\b(?:\\[[^\\]]*\\])?|(?<![\\w])\\([^()]*\\))';
const ex=e=>e.split(strRe).map((p,i)=>i%2?p:p
 .replace(/≠|<>/g,'!==').replace(/(?<![<>!=])=(?!=)/g,'===').replace(/≤/g,'<=').replace(/≥/g,'>=')
 .replace(new RegExp('('+OPL+')\\s+div\\s+('+OPD+')','gi'),'Math.trunc($dv($1,$2))')
 .replace(new RegExp('('+OPL+')\\s+mod\\s+('+OPD+')','gi'),'$md($1,$2)')
 .replace(new RegExp('('+OPL+')\\s*\\/\\s*('+OPD+')','g'),'$dv($1,$2)')
 .replace(/\bet\b/gi,'&&').replace(/\bou\b/gi,'||').replace(/\bnon\b/gi,'!').replace(/\bmod\b/gi,'%')
 .replace(/\bvrai\b/gi,'true').replace(/\bfaux\b/gi,'false').replace(/\bceci\b/gi,'this')
 .replace(/\bnouveau\s+/gi,'new ').replace(/\bparent\b/gi,'super')).join('');
const TY={I:'si',W:'tant que',F:'fonction / méthode',C:'classe',S:'cas',P:'pour',R:'répéter'};

function compileP(src){
 const js=[],st=[],errs=[],al={};let pre=true,sid=0,sc=new Set();
 const E=(n,m)=>{errs.push({line:n,msg:m});js.push(`throw new Error(${JSON.stringify('§'+n+'§'+m)});`)};
 const pop=(n,t,w)=>{const o=st.pop();if(!o||o.t!==t){E(n,`« ${w} » inattendu`+(o?` : le bloc ouvert est « ${TY[o.t]} » (il manque sa fin)`:' : aucun bloc ouvert'));if(o)st.push(o);return null}return o};
 const simple=l=>{let q;
  if(q=l.match(/^ecrire\s*\((.*)\)$/i))return `$w(${ex(q[1])});`;
  if(q=l.match(/^lire\s*\((.*)\)$/i))return splitTop(q[1]).map(v=>`${ex(v)}=$r();`).join('');
  if(q=l.match(/^retourn(?:er|e)\s+(.+)$/i))return `return ${ex(q[1])};`;
  if(q=l.match(/^(.+?)\s*(?:←|<-+|:=)\s*(.+)$/))return `${ex(q[1])}=${ex(q[2])};`;
  if(/^[\w.]+\(.*\)$/.test(l))return ex(l)+';';
  return null};
 const D=(l,top)=>{const q=l.match(/^(\w+(?:\s*,\s*\w+)*)\s*:\s*(.+)$/);if(!q)return false;if(top&&top.t==='C')return true;
  const t=q[2].trim(),R=/^tableau\s*\[\s*(-?\w+)\s*\.\.\s*(\w+)\s*\]/i;const a=t.match(R)||(al[t]&&al[t].match(R));
  const init=a?null:'undefined';const ns=q[1].split(',').map(x=>x.trim()).filter(x=>!sc.has(x));
  if(ns.length){ns.forEach(x=>sc.add(x));js.push('let '+ns.map(x=>x+'='+(a?`$T(${a[1]},${a[2]})`:init)).join(',')+';')}return true};
 const lines=src.split('\n');
 lines.forEach(r=>{const m=norm(r).trim().match(/^type\s+(\w+)\s*=\s*(.+)$/i);if(m)al[m[1]]=m[2]});
 lines.forEach((raw,i)=>{const n=i+1;let l=norm(raw.replace(/\/\/.*$/,'')).trim();if(!l)return;let m;const top=st[st.length-1];
  if(/^(nom|role)\s*:/i.test(l)||/^attributs?\b/i.test(l))return;
  if(m=l.match(/^(?:entree|sortie|declaration)\s*:\s*(.*)$/i)){if(m[1]&&m[1]!='-')D(m[1],top);return}
  if(top&&top.t==='S'){let c;
   if(c=l.match(/^(?:autre|autrement|sinon)\s*:\s*(.+)$/i)){const s=simple(c[1]);if(s===null)E(n,'Instruction non reconnue : '+raw.trim());else js.push((top.first?'':'else ')+'{'+s+'}');top.first=false;return}
   if(c=l.match(/^([^:]+?)\s*:\s*(.+)$/)&&!/^fin\b/i.test(l)){c=l.match(/^([^:]+?)\s*:\s*(.+)$/);const s=simple(c[2]);if(s===null)E(n,'Instruction non reconnue : '+raw.trim());else js.push((top.first?'':'else ')+`if([${splitTop(c[1]).map(ex)}].includes($c${top.id})){${s}}`);top.first=false;return}}
  if(pre&&D(l,top))return;
  if(m=l.match(/^constante\s+(\w+)\s*=\s*(.+)$/i)){js.push(`const ${m[1]}=${ex(m[2])};`);sc.add(m[1]);return}
  if(m=l.match(/^type\s+(\w+)\s*=\s*(.+)$/i)){al[m[1]]=m[2];return}
  if(m=l.match(/^classe\s+(\w+)(?:\s+herite\s+de\s+(\w+))?$/i)){js.push(`class ${m[1]}${m[2]?' extends '+m[2]:''}{`);st.push({t:'C'});return}
  if(/^fin\s*classe$/i.test(l)){if(pop(n,'C','fin classe'))js.push('}');return}
  if(m=l.match(/^(?:(fonction|procedure|methode)\s+(\w+)|(constructeur))\s*\((.*)\)\s*(?::.*)?$/i)){
   const ps=m[4].replace(/\s*:\s*[^,]+/g,'').trim();js.push((top&&top.t==='C'?'':'function ')+(m[3]?'constructor':m[2])+`(${ps}){`);
   st.push({t:'F',prev:sc});sc=new Set(ps.split(',').map(s=>s.trim()));pre=true;return}
  if(/^debut$/i.test(l)){pre=false;return}
  if(/^fin$/i.test(l)){if(!st.length)return;const o=pop(n,'F','fin');if(o){js.push('}');sc=o.prev}return}
  const close=[[/^fin\s*si$/i,'I','fin si'],[/^fin\s*pour$/i,'P','fin pour'],[/^fin\s*tant\s*que$/i,'W','fin tant que'],[/^fin\s*(?:cas|selon)$/i,'S','fin cas']];
  for(const [re,t,w] of close)if(re.test(l)){if(pop(n,t,w))js.push('}');return}
  if(m=l.match(/^si\s+(.+?)\s+alors$/i)){js.push(`if(${ex(m[1])}){`);st.push({t:'I'});return}
  if(m=l.match(/^sinon\s+si\s+(.+?)\s+alors$/i)){if(!top||top.t!=='I')E(n,'« sinon si » sans « si » ouvert');else js.push(`}else if(${ex(m[1])}){`);return}
  if(/^sinon$/i.test(l)){if(!top||top.t!=='I')E(n,'« sinon » sans « si » ouvert');else js.push('}else{');return}
  if(m=l.match(/^(?:cas|selon)\s+(.+?)(?:\s+(?:de|parmi|faire))?\s*:?$/i)){const id=++sid;js.push(`{const $c${id}=${ex(m[1])};`);st.push({t:'S',id,first:true});return}
  if(m=l.match(/^pour\s+(\w+)\s*(?:←|<-+|:=)\s*(.+?)\s+a\s+(.+?)(?:\s+pas\s+(.+?))?\s+faire$/i)){const id=++sid,v=m[1];
   js.push(`for(let ${sc.has(v)?`$e${id}=${ex(m[3])},$s${id}=${m[4]?ex(m[4]):1},$z${id}=(${v}=${ex(m[2])})`:`${v}=${ex(m[2])},$e${id}=${ex(m[3])},$s${id}=${m[4]?ex(m[4]):1}`};$g()&&($s${id}>0?${v}<=$e${id}:${v}>=$e${id});${v}+=$s${id}){`);st.push({t:'P'});return}
  if(m=l.match(/^tant\s*que\s+(.+?)\s+faire$/i)){js.push(`while($g()&&(${ex(m[1])})){`);st.push({t:'W'});return}
  if(/^repeter$/i.test(l)){js.push('do{$g();');st.push({t:'R'});return}
  if(m=l.match(/^jusqu['’ ]?a\s+ce\s+que\s+(.+)$/i)){if(pop(n,'R','jusqu\'à ce que'))js.push(`}while(!(${ex(m[1])}));`);return}
  const s=simple(l);if(s===null)E(n,'Instruction non reconnue : '+raw.trim());else js.push(s)});
 if(st.length)E(lines.length,`Bloc « ${TY[st[st.length-1].t]} » jamais fermé (il manque sa fin)`);
 return{js:js.join('\n'),errs}}

function compileC(src){
 const errs=[],E=(n,m)=>errs.push({line:n,msg:m});
 let s=src.replace(/\/\*[\s\S]*?\*\//g,m=>m.replace(/[^\n]/g,'')).replace(/\/\/.*$/gm,'');
 const L=s.split('\n');
 L.forEach((ln,i)=>{const t=ln.trim();if(!t||t[0]=='#')return;const nx=(L.slice(i+1).find(x=>x.trim())||'').trim();
  if(/[\w"'\])]$/.test(t)&&!/^(if|for|while|else|switch|do|case|default)\b/.test(t)&&!/(^|\})\s*(else|do)$/.test(t)&&!/^(?:\w+\s+)+\**\w+\s*\([^;]*\)$/.test(t)&&!nx.startsWith('{'))E(i+1,'Il manque probablement un « ; » à la fin de cette ligne : '+t)});
 const ns=s.replace(/"(?:[^"\\\n]|\\.)*"/g,'""').replace(/'(?:\\.|[^'\\])'/g,'0');
 const cnt=c=>ns.split(c).length-1;
 if(cnt('{')!=cnt('}'))E(0,'Accolades { } non équilibrées : '+cnt('{')+' ouvrante(s) pour '+cnt('}')+' fermante(s)');
 if(cnt('(')!=cnt(')'))E(0,'Parenthèses ( ) non équilibrées : '+cnt('(')+' ouvrante(s) pour '+cnt(')')+' fermante(s)');
 if(!/\bmain\s*\(/.test(ns))E(0,'Fonction main() introuvable : tout programme C commence par main');
 const pm=ns.match(/\b(?:int|float|double|void)\s*\*/);if(pm)E(ns.slice(0,pm.index).split('\n').length,'Pointeurs non supportés par ce mini-compilateur (utilise les tableaux)');
 const strs=[];s=s.replace(/"(?:[^"\\\n]|\\.)*"/g,m=>(strs.push(m),`"§${strs.length-1}§"`));
 s=s.replace(/^\s*#include.*$/gm,'').replace(/^\s*#define\s+(\w+)\s+(.+)$/gm,'const $1=$2;');
 const names=[];
 s=s.replace(/(?:typedef\s+)?struct\s*(\w*)\s*\{[^}]*\}\s*(\w*)\s*;/g,(m,a,b)=>{[a,b].forEach(x=>x&&names.push(x));return ''});
 s=s.replace(/\bstruct\s+(\w+)/g,'$1').replace(/\b(?:unsigned|signed|const|static|extern)\s+/g,'').replace(/\b(?:long|short)\s+(?=long|int|double)/g,'');
 const T='int|float|double|char|void|long|short|bool'+(names.length?'|'+names.join('|'):'');
 s=s.replace(new RegExp('\\b(?:'+T+')\\s+\\w+\\s*\\([^)]*\\)\\s*;','g'),'');
 const ints=new Set();
 s.replace(/\b(?:int|long|short)\s+([^;(){}]+);/g,(m,d)=>{splitTop(d).forEach(x=>{const q=x.trim().match(/^(\w+)/);q&&ints.add(q[1])});return m});
 s.replace(/\bint\s+(\w+)\s*[,)=]/g,(m,a)=>{ints.add(a);return m});
 const isI=o=>!/\./.test(o)&&(o.match(/[A-Za-z_]\w*/g)||[]).every(w=>ints.has(w));
 s=s.replace(new RegExp('\\b(?:'+T+')\\s+(\\w+)\\s*\\(([^)]*)\\)\\s*\\{','g'),(m,nm,p)=>`function ${nm}(${p.replace(new RegExp('\\b(?:'+T+')\\b\\s*\\**\\s*','g'),'').replace(/\[\s*\w*\s*\]/g,'')}){`);
 if(names.length)s=s.replace(new RegExp('\\b(?:'+names.join('|')+')\\s+(\\w+)\\s*;','g'),'let $1=$S();');
 s=s.replace(/\bchar\s+(?:\*\s*(\w+)|(\w+)\s*\[[^\]]*\])\s*(?:=\s*("§\d+§"))?/g,(m,a,b,v)=>`let ${a||b}=${v||'""'}`);
 s=s.replace(new RegExp('\\b(?:'+T+')\\s+(\\w+)\\s*\\[\\s*(\\w*)\\s*\\]\\s*(?:=\\s*\\{([^}]*)\\})?','g'),(m,a,n,i)=>`let ${a}=$A(${n||0},[${i||''}])`);
 s=s.replace(new RegExp('\\b(?:'+T+')\\s+(?=\\w)','g'),'let ');
 s=s.replace(/\bstrcpy\s*\(\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/g,'$1=$2');
 s=s.replace(/'(\\.|[^'\\])'/g,(m,c)=>c.length>1?({n:10,t:9,0:0,'\\':92,"'":39,'"':34,r:13}[c[1]]??c.charCodeAt(1)):c.charCodeAt(0));
 s=s.replace(/\bscanf\s*\(([^;]*)\)\s*;/g,(m,a)=>{const p=splitTop(a);return 'scanf('+p[0]+(p.length>1?',':'')+p.slice(1).map(x=>`v=>${x.trim().replace(/^&\s*/,'')}=v`).join(',')+');'});
 s=s.replace(new RegExp('('+OPL+')\\s*\\/\\s*('+OPD+')','g'),(m,a,b)=>`${isI(a)&&isI(b)?'$idv':'$dv'}(${a},${b})`);
 const re=/\b(while|for)\s*\(/g;let o='',i=0,mm;
 while(mm=re.exec(s)){let j=mm.index+mm[0].length,d=1;while(j<s.length&&d){if(s[j]=='(')d++;else if(s[j]==')')d--;j++}
  const inner=s.slice(mm.index+mm[0].length,j-1);let r;
  if(mm[1]=='while')r=`while($g()&&(${inner}))`;else{const p=splitTop(inner,';');r=`for(${p[0]};$g()&&(${(p[1]||'').trim()||'true'});${p[2]||''})`}
  o+=s.slice(i,mm.index)+r;i=j;re.lastIndex=j}
 s=(o+s.slice(i)).replace(/"§(\d+)§"/g,(m,k)=>strs[k]);
 return{js:s+'\nmain();',errs}}

function mkEnv(io){let steps=0;
 const fmt=v=>{if(v===undefined)throw new Error('Variable non initialisée utilisée');return v===true?'Vrai':v===false?'Faux':String(v)};
 const chk=(lo,hi,k)=>{if(k<lo||k>hi)throw new Error(`Indice hors bornes : ${k} (indices valides ${lo}..${hi})`)};
 const isK=k=>typeof k=='string'&&k!==''&&!isNaN(k);
 const T=(lo,hi)=>new Proxy({},{get:(o,k)=>{if(isK(k))chk(lo,hi,+k);return o[k]},set:(o,k,v)=>{if(isK(k))chk(lo,hi,+k);o[k]=v;return true}});
 const A=(n,init)=>{const a=new Array(Math.max(n,init.length)).fill(0);init.forEach((v,i)=>a[i]=v);return new Proxy(a,{get:(o,k)=>{if(isK(k))chk(0,o.length-1,+k);return o[k]},set:(o,k,v)=>{if(isK(k))chk(0,o.length-1,+k);o[k]=v;return true}})};
 const S=()=>new Proxy({},{get:(o,k)=>(k in o||typeof k=='symbol')?o[k]:(o[k]=S())});
 const num=t=>/^[-+]?\d+(\.\d+)?$/.test(t)?+t:t;
 const zero=()=>{throw new Error('Division par zéro')};
 return{$w:(...a)=>io.log(a.map(fmt).join('')+'\n'),$r:()=>num(io.tok()),
  $g:()=>{if(++steps>3e6)throw new Error("Boucle infinie suspectée (plus de 3 millions d'itérations)");return true},
  $dv:(a,b)=>b===0?zero():a/b,$idv:(a,b)=>b===0?zero():Math.trunc(a/b),$md:(a,b)=>b===0?zero():a%b,$T:T,$A:A,$S:S,
  longueur:s=>String(s).length,car:(s,i)=>String(s)[i-1],racine:Math.sqrt,abs:Math.abs,tronque:Math.trunc,arrondi:Math.round,
  aleatoire:n=>Math.floor(Math.random()*n),ord:c=>String(c).charCodeAt(0),chr:n=>String.fromCharCode(n),creerTableau:T,
  printf:(f,...a)=>{let i=0;io.log(String(f).replace(/%(-?\d+)?(?:\.(\d+))?(?:ll|l|h)?([dicfsu%])/g,(m,w,p,t)=>{if(t=='%')return'%';const v=a[i++];let r;
   if(t=='f')r=Number(v).toFixed(p===undefined?6:+p);else if(t=='c')r=typeof v=='number'?String.fromCharCode(v):String(v);else if(t=='s')r=String(v);else r=String(Math.trunc(Number(v)));
   if(w){const W=Math.abs(w);r=w<0?r.padEnd(W):r.padStart(W)}return r}))},
  puts:s=>io.log(s+'\n'),
  scanf:(f,...set)=>{const ts=[...String(f).matchAll(/%(?:l|h)?([dfcsiu])/g)].map(x=>x[1]);let ok=0;
   set.forEach((fn,i)=>{const t=io.tok(),ty=ts[i]||'d';fn(ty=='c'?t.charCodeAt(0):ty=='s'?t:ty=='f'?parseFloat(t):parseInt(t));ok++});return ok},
  strlen:s=>String(s).length,strcmp:(a,b)=>a<b?-1:a>b?1:0,sqrt:Math.sqrt,pow:Math.pow,fabs:Math.abs,floor:Math.floor,ceil:Math.ceil,
  rand:()=>Math.floor(Math.random()*32768),srand:()=>0,toupper:c=>String(c).toUpperCase().charCodeAt(0),tolower:c=>String(c).toLowerCase().charCodeAt(0),
  isdigit:c=>c>=48&&c<=57,isalpha:c=>/[a-z]/i.test(String.fromCharCode(c))}}

function execute(code,env){const k=Object.keys(env);new Function(...k,'"use strict";'+code)(...k.map(x=>env[x]))}

const RULES=[
[/Instruction non reconnue/,'Instruction non reconnue',"L'interpréteur ne comprend pas cette ligne : mot-clé mal écrit, flèche ← oubliée ou parenthèse manquante.","Vérifie l'orthographe (ecrire, lire, si…alors, pour…faire…), affecte avec ← et compare avec =."],
[/Pointeurs/,'Pointeurs non supportés',"Ce mini-compilateur C ne gère pas les pointeurs (*, &p, malloc).","Utilise des tableaux et des variables simples pour cet exercice. Les pointeurs se testent avec gcc sur ton PC."],
[/(?:Il manque|« ; »)/,'Point-virgule manquant',"En C chaque instruction se termine par « ; ». Sans lui le compilateur lit deux instructions comme une seule.","Ajoute « ; » à la fin de la ligne indiquée (pas après if, for, while ni après une accolade)."],
[/Accolades|Parenthèses|jamais fermé|inattendu|sans « si »/,'Bloc mal fermé / mal ouvert',"Un bloc (accolade, parenthèse, si / pour / tant que / fonction…) est ouvert sans être fermé, ou l'inverse.","Compte les ouvertures et fermetures ; en pseudo-code chaque « si » veut son « fin si », chaque « pour » son « fin pour », etc. Indente pour mieux voir."],
[/main\(\) introuvable/,'main() absent',"Un programme C démarre toujours à la fonction main.","Ajoute : int main() { ... return 0; }"],
[/already been declared|redeclar/i,'Variable déclarée deux fois',"Le même nom est déclaré deux fois dans la même portée.","Supprime la seconde déclaration (garde seulement l'affectation) ou change le nom."],
[/(\w+) is not defined|NameError: name '(\w+)'/,'Nom inconnu : « $1 »',"Tu utilises « $1 » sans l'avoir déclarée, ou bien faute de frappe / majuscule différente (les noms sont sensibles à la casse), ou #include / import oublié pour une fonction.","Déclare-la d'abord (Déclaration en pseudo-code, int x; en C, x = … en Python) ou corrige l'orthographe."],
[/Division par z|ZeroDivisionError/,'Division par zéro',"Le diviseur vaut 0 au moment du calcul : impossible mathématiquement.","Teste le diviseur avant : si b ≠ 0 alors … sinon afficher une erreur."],
[/Indice hors bornes|IndexError/,'Indice hors du tableau',"Tu accèdes à une case qui n'existe pas (indice trop grand ou trop petit).","Vérifie les bornes de ta boucle : tableau[1..n] en pseudo-code, 0..n-1 en C et Python."],
[/non initialis|UnboundLocalError/,'Variable non initialisée',"Tu lis une variable avant de lui avoir donné une valeur.","Affecte une valeur de départ (somme ← 0) ou lis-la avec lire() avant de t'en servir."],
[/Boucle infinie/,'Boucle infinie',"La condition d'arrêt n'est jamais vraie, la boucle tourne sans fin.","Vérifie que la variable testée change dans la boucle (i ← i + 1) et que la condition peut devenir fausse."],
[/Assignment to constant/,'Constante modifiée',"Une constante ne peut pas changer de valeur après sa définition.","Utilise une variable à la place, ou ne réaffecte pas la constante."],
[/IndentationError/,'Erreur d’indentation',"Python repère les blocs avec l'indentation (espaces au début de ligne).","Après « : » indente la ligne suivante de 4 espaces, et garde la même indentation dans tout le bloc."],
[/SyntaxError|Unexpected|Invalid or unexpected|missing \)|Unterminated|expected/i,'Erreur de syntaxe',"Une ligne ne respecte pas la grammaire du langage : parenthèse, guillemet, deux-points ou opérateur mal placé ou oublié.","Regarde la ligne indiquée et celle d'avant : guillemets fermés ? parenthèses équilibrées ? « : » après if / for / def en Python ?"],
[/is not a function|TypeError/,'Type ou appel incorrect',"Tu appelles quelque chose qui n'est pas une fonction, ou tu mélanges des types (ex. texte + nombre).","Vérifie les noms de fonctions et convertis les types : int(), str(), float() en Python."],
[/ValueError/,'Valeur invalide',"La conversion a échoué (ex. int('abc')).","Entre une valeur du bon type dans la zone Entrée, ou vérifie-la avec isdigit()."],
[/EOFError|Saisie annulée/,'Plus de données à lire',"Le programme attend une saisie mais la zone « Entrée » est vide ou épuisée.","Écris les valeurs (une par ligne ou séparées par des espaces) dans la zone Entrée avant d'exécuter."],
[/Cannot read prop|AttributeError/,'Objet non créé',"Tu utilises un objet ou un attribut qui n'existe pas encore.","Crée l'objet avec « nouveau Classe(...) » et vérifie le nom de l'attribut."],
[/Pyodide indisponible|Failed to fetch|NetworkError|loadPyodide/,'Python pas encore téléchargé',"L'interpréteur Python (Pyodide) doit être téléchargé une première fois avec Internet, puis il reste en cache.","Connecte-toi, lance un programme Python une fois, et il marchera ensuite hors ligne."]];
function explain(raw){for(const [re,t,w,f] of RULES){const m=raw.match(re);if(m){const g=m[1]||m[2]||'';return{t:t.replace('$1',g),w:w.replace(/\$1/g,g),f}}}
 return{t:'Erreur',w:"Message brut ci-dessous.",f:'Relis la ligne concernée et exécute pas à pas dans ta tête.'}}

G.ENG={compileP,compileC,mkEnv,execute,explain};
})(typeof window!=='undefined'?window:globalThis);
