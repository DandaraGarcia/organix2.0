/* ORGANIX - núcleo compartilhado por todas as páginas.
   Todos os registros ficam salvos no navegador (localStorage), com o prefixo "ox_". */
const L=localStorage,P=()=>L.plano==='premium';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const pad=n=>String(n).padStart(2,'0');
const key=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const hoje=()=>key(new Date());
const dt=k=>new Date(k+'T00:00:00');
const fmt=k=>dt(k).toLocaleDateString('pt-BR');
const diasAte=k=>Math.round((dt(k)-dt(hoje()))/864e5);
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const br=n=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const litros=n=>n.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:2})+' L';
const cap=s=>s?s[0].toUpperCase()+s.slice(1):'';
const diaLongo=k=>cap(dt(k).toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}));
const load=(k,d)=>{try{const v=JSON.parse(L['ox_'+k]);return v==null?d:v}catch(e){return d}};
const save=(k,v)=>{try{L['ox_'+k]=JSON.stringify(v)}catch(e){toast('Não foi possível salvar: o armazenamento do navegador está cheio ou bloqueado')}};
const toast=m=>{const t=document.createElement('div');t.className='toast';t.setAttribute('role','status');t.textContent=m;document.body.append(t);setTimeout(()=>t.remove(),2400)};

/* chama fn quando a data muda (meia-noite) com a página aberta ou ao voltar para a aba */
const novoDia=fn=>{let d=hoje();const v=()=>{if(hoje()!==d){d=hoje();fn()}};setInterval(v,15000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)v()})};

/* modal e caixa de pergunta */
function modal(html,grande,aoFechar){
  const m=document.createElement('div');m.className='modal';
  m.innerHTML=`<div class="modal-box${grande?' grande':''}" role="dialog" aria-modal="true"><button class="x fechar" aria-label="Fechar">×</button>${html}</div>`;
  const tecla=e=>{if(e.key==='Escape')m.fecha()};
  m.fecha=()=>{if(!m.isConnected)return;m.remove();document.removeEventListener('keydown',tecla);if(aoFechar)aoFechar()};
  document.addEventListener('keydown',tecla);
  m.addEventListener('mousedown',e=>{if(e.target===m)m.fecha()});
  $('.fechar',m).onclick=m.fecha;document.body.append(m);return m;
}
const ask=(msg,sim='Sim',nao='Não')=>new Promise(r=>{
  let res=false;
  const m=modal(`<h2>${esc(msg)}</h2><div class="acoes"><button class="btn" data-r="0">${nao}</button><button class="btn verde" data-r="1">${sim}</button></div>`,false,()=>r(res));
  m.addEventListener('click',e=>{const b=e.target.closest('[data-r]');if(b){res=b.dataset.r==='1';m.fecha()}});
  $('[data-r="0"]',m).focus();
});

/* itens somente leitura (usados em resumos e galerias) */
const liRo=(ok,t,h)=>`<li class="${ok?'feito':''}"><span class="t">${esc(t)}</span>${h?`<span class="h">${esc(h)}</span>`:''}</li>`;
const ulRo=(a,c='')=>a.length?`<ul class="lista ro ${c}">${a.join('')}</ul>`:'';

/* login e menu */
if('app' in document.body.dataset&&L.logado!=='1')location.href='entrar.html';
const itens=[['app.html','Início'],['agenda.html','Agenda de entregas'],['perguntas.html','Perguntas'],['rotina.html','Registro do dia',1],['financas.html','Finanças',1],['trabalho.html','Trabalho',1],['alimentacao.html','Alimentação',1],['academia.html','Academia',1]];
const atual=location.pathname.split('/').pop();
const menu=document.getElementById('menu');
if(menu){
  menu.innerHTML='<a class="logo" href="app.html">Organix</a>'+itens.map(([h,n,pr])=>`<a href="${h}" class="${h===atual?'on':''}">${n}${pr&&!P()?'<small>Premium</small>':''}</a>`).join('')+
  `<div class="rodape-menu"><span>Plano: <b>${P()?'Premium':'Gratuito'}</b></span>${P()?'<button class="btn" id="teste">Voltar ao gratuito (teste)</button>':'<a class="btn rosa" href="pagamento.html">Assinar Premium</a>'}<button class="btn" id="sair">Sair</button></div>`;
  const t=document.getElementById('teste');if(t)t.onclick=()=>{L.plano='gratuito';location.reload()};
  document.getElementById('sair').onclick=()=>{L.removeItem('logado');location.href='index.html'};
}
if('premium' in document.body.dataset&&!P()){
  const c=document.querySelector('main');c.classList.add('bloq');
  const cont=c.querySelector('.conteudo');if(cont)cont.inert=true;
  c.insertAdjacentHTML('beforeend','<div class="cadeado"><div class="card"><div class="cad-ico"></div><h2>Esta função é Premium</h2><p class="mut" style="margin-bottom:16px">Assine para registrar seus dias, finanças, trabalho, alimentação e treinos.</p><a class="btn rosa" href="pagamento.html">Ver planos</a></div></div>');
}
const av=document.getElementById('aviso');if(av&&P())av.remove();

/* RESUMO DO DIA: reúne os registros de todas as seções em uma data */
function resumo(d){
  const vz=m=>`<p class="mut">${m}</p>`;
  const sec=(t,x)=>`<div class="card rs-sec"><h3>${t}</h3>${x}</div>`;
  const tile=(t,v,c)=>`<div class="card ${c}"><span class="mut">${t}</span><div class="num">${v}</div></div>`;
  const ok=a=>a.filter(x=>x.ok).length;
  const md=(load('meudia',{}).snap||{})[d]||[];
  const dia=load('dias',{})[d]||{},tf=load('tarefas',[]).filter(x=>x.d===d);
  const F=load('fin',{}),fr=[...(F.reg||[]),...(F.gal||[]).flatMap(g=>g.reg||[])].filter(x=>x.data===d);
  const soma=t=>fr.filter(x=>x.tipo===t).reduce((a,x)=>a+x.valor,0),rec=soma('r'),gas=soma('g');
  const T=load('trab',{}),tb=(T.snap||{})[d]||[],fo=(T.foco||{})[d];
  const A=load('alim',{}),al=(A.dias||{})[d]||(A.hoje&&A.hoje.data===d&&(A.hoje.itens.length||A.hoje.agua)?A.hoje:null);
  const tr=(load('treino',{}).gal||{})[d],trI=tr?[...tr.ex,...tr.ca]:[];
  const cor=(CORES_RESUMO[dia.cor]||[])[0];
  const sMd=md.length?ulRo(md.map(x=>liRo(x.ok,x.n,x.h))):vz('Nenhuma atividade registrada neste dia.');
  const sDia=(dia.nome||dia.cor?`<p><b>${esc(dia.nome||'Sem nome')}</b> ${cor?`<span class="tag" style="background:${cor};color:#111;border-color:transparent">${esc(dia.cor)}</span>`:''}</p>`:'')+(tf.length?ulRo(tf.map(x=>`<li class="${x.ok?'feito':''}"><span class="t">${esc(x.t)}${x.desc?`<small style="display:block;margin:2px 0 0">${esc(x.desc)}</small>`:''}</span></li>`)):vz('Nenhuma atividade neste dia.'));
  const sFin=fr.length?`<p class="mut" style="margin-bottom:8px">Receitas ${br(rec)} · Gastos ${br(gas)} · Saldo ${br(rec-gas)}</p>`+ulRo(fr.map(x=>`<li><span class="t">${esc(x.nome)}${x.desc?` <small>${esc(x.desc)}</small>`:''}</span><span class="h" style="color:${x.tipo==='r'?'#A78BFA':'#F9A8D4'}">${x.tipo==='r'?'+':'-'}${br(x.valor)}</span></li>`),'nb'):vz('Nenhum lançamento neste dia.');
  const sTb=(fo?`<p class="mut" style="margin-bottom:8px">${fo.n} bloco${fo.n>1?'s':''} de foco · ${fo.min} min</p>`:'')+(tb.length?ulRo(tb.map(x=>liRo(x.ok,x.t,x.h))):vz('Nenhuma tarefa de trabalho registrada.'));
  const sAl=al?(al.itens.length?ulRo(al.itens.map(x=>liRo(x.ok,x.n,x.h))):'')+`<p class="mut">Água: ${litros(al.agua||0)} de ${litros(al.meta||A.meta||2)}${al.itens.length&&!(A.dias||{})[d]?' · rotina ainda não salva':''}</p>`:vz('Nenhum registro alimentar neste dia.');
  const sTr=tr?`<p class="mut" style="margin-bottom:8px">${esc(tr.pastas.join(', '))}</p>`+ulRo([...tr.ex.map(e=>liRo(e.ok,e.n,`${e.s} × ${e.r}${e.p!=null&&e.p!==''?' · '+e.p+' kg':''}`)),...tr.ca.map(c=>liRo(c.ok,'Cardio: '+c.n,c.min+' min'))]):vz('Nenhum treino registrado neste dia.');
  return `<h2>Resumo de ${esc(diaLongo(d))}</h2>
  <div class="grid g3" style="margin-top:14px">${tile('Meu dia',ok(md)+'/'+md.length,'c1')}${tile('Atividades do dia',ok(tf)+'/'+tf.length,'c2')}${tile('Saldo do dia',br(rec-gas),'c3')}${tile('Trabalho',ok(tb)+'/'+tb.length,'c4')}${tile('Água',litros(al?al.agua||0:0),'c1')}${tile('Treino',ok(trI)+'/'+trI.length,'c2')}</div>
  <div class="grid g2">${sec('Meu dia',sMd)}${sec('Registro do dia',sDia)}${sec('Finanças',sFin)}${sec('Trabalho',sTb)}${sec('Alimentação',sAl)}${sec('Academia',sTr)}</div>`;
}
const CORES_RESUMO={vermelho:['#DC2626'],azul:['#2563EB'],amarelo:['#FACC15'],rosa:['#F9A8D4'],verde:['#16A34A'],roxo:['#7C3AED'],laranja:['#F97316'],cinza:['#6B7280'],branco:['#FFFFFF']};
