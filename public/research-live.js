'use strict';
const ResearchLive=(()=>{
 const cfg=window.RESEARCH_CONFIG;const hash=new URLSearchParams(location.hash.slice(1));const token=hash.get('invite');
 if(!token)return {enabled:false};
 history.replaceState(null,'',location.pathname+'#invite='+encodeURIComponent(token));
 const client=supabase.createClient(cfg.url,cfg.key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const cacheKey='research-draft-'+token.slice(0,16);let revision=0,active=false,locked=false,dirty=false,busy=false,timer=null,lastError='',savedAt='',completedAt=null,activity=false;
 const localPersist=persist;
 async function rpc(name,args){const r=await client.rpc(name,args);if(r.error)throw Error(r.error.message);return r.data;}
 function cache(){try{localStorage.setItem(cacheKey,JSON.stringify({answers:state.answers,notes:state.notes,method:state.method,offset:state.offset,revision,dirty}));}catch{toast('Локальный черновик недоступен. Не закрывайте страницу при отсутствии связи.');}}
 function label(){if(locked)return 'Конфликт версий — сохранение остановлено';if(lastError)return 'Нет подтверждения сервера — черновик на устройстве';if(busy||dirty)return 'Сохраняем ответы…';return completedAt?'Завершение подтверждено сервером':savedAt?'Сохранено на сервере':'Подключено к исследованию';}
 function decorate(){let bar=document.getElementById('server-state');if(!bar){bar=document.createElement('div');bar.id='server-state';bar.className='server-state';bar.setAttribute('role','status');main.before(bar);}bar.textContent=label();bar.dataset.warning=String(Boolean(lastError||locked));
 if(state.screen==='summary'){
  const intro=document.querySelector('.summary-intro');if(intro)intro.textContent=`Ответов: ${completed()}. Без ответа: ${ALL.length-completed()}. ${completedAt?'Завершение сохранено на сервере.':'Ответы сохраняются на сервере; завершение нужно подтвердить отдельно.'}`;
  if(completedAt){document.querySelector('.summary h1').textContent='Спасибо за участие';intro.textContent='Спасибо за участие, Ваши ответы сохранены. Завершение подтверждено сервером.';}
  if(!document.getElementById('finish-research')){const btn=document.createElement('button');btn.id='finish-research';btn.className='button';document.querySelector('.summary-actions')?.prepend(btn);}
  const finish=document.getElementById('finish-research');finish.textContent=completedAt?'Анкета завершена':busy?'Сохранение…':'Завершить';finish.disabled=Boolean(completedAt)||completed()!==ALL.length||busy||locked;finish.onclick=()=>flush(true);
 }
 if(completedAt)document.querySelectorAll('[data-answer],[data-open],[data-note],[data-clear],[data-skip]').forEach(e=>e.disabled=true);
 document.querySelectorAll('.sidebar-note').forEach(e=>{const n=e.firstChild;if(n?.nodeType===Node.TEXT_NODE)n.textContent='Черновик на устройстве и серверное сохранение. ';});
 }
 async function flush(complete=false){if(!active||busy||locked)return;if(completedAt&&!complete)return;busy=true;decorate();
 const snapshot={answers:JSON.parse(JSON.stringify(state.answers)),notes:JSON.parse(JSON.stringify(state.notes)),method:state.method,offset:state.offset};dirty=false;
 try{const result=await rpc('research_save',{p_token:token,p_revision:revision,p_answers:snapshot.answers,p_notes:snapshot.notes,p_test_index:snapshot.method+1,p_question:snapshot.offset+1,p_visible:!document.hidden,p_activity:activity,p_complete:complete});revision=result.revision;savedAt=result.saved_at;completedAt=result.completed_at;lastError='';activity=false;cache();}
 catch(e){dirty=true;lastError=e.message;if(e.message.includes('REVISION_CONFLICT')){const remote=await rpc('research_open',{p_token:token,p_consent:false});if(JSON.stringify(remote.answers)===JSON.stringify(snapshot.answers)&&JSON.stringify(remote.notes)===JSON.stringify(snapshot.notes)){revision=remote.revision;dirty=false;lastError='';cache();}else{locked=true;toast('Анкета изменена в другой вкладке. Не закрывайте страницу; скачайте локальные ответы и обновите анкету после сверки.');}}else if(complete)toast('Завершение не подтверждено: '+e.message);}
 finally{busy=false;decorate();if(dirty&&!locked){clearTimeout(timer);timer=setTimeout(()=>flush(),lastError?10000:700);}}
 }
 persist=function(){if(!active){localPersist();return;}state.updatedAt=new Date().toISOString();dirty=true;cache();clearTimeout(timer);timer=setTimeout(()=>flush(),150);decorate();};
 const originalRender=render;render=function(){originalRender();if(active)decorate();};
 document.addEventListener('change',()=>{if(active)activity=true;},true);document.addEventListener('input',()=>{if(active)activity=true;},true);document.addEventListener('click',()=>{if(active)activity=true;},true);
 window.addEventListener('online',()=>{if(active)flush();});document.addEventListener('visibilitychange',()=>{if(active)rpc('research_heartbeat',{p_token:token,p_visible:!document.hidden}).catch(()=>{});});
 async function begin(){const consent=document.getElementById('consent');if(!consent?.checked)return;const r=await rpc('research_open',{p_token:token,p_consent:true});revision=r.revision;completedAt=r.completed_at;
 let draft=null;try{draft=JSON.parse(localStorage.getItem(cacheKey)||'null');}catch{}
 state={screen:r.completed_at?'summary':'survey',method:r.current_test_index-1,offset:Math.floor((r.current_question-1)/5)*5,answers:r.answers||{},notes:r.notes||{},code:r.user_code,save:false,startedAt:r.started_at,updatedAt:null};
 if(draft?.dirty){if(draft.revision===revision){state.answers=draft.answers;state.notes=draft.notes;state.method=draft.method;state.offset=draft.offset;dirty=true;}else if(JSON.stringify(draft.answers)!==JSON.stringify(r.answers)){locked=true;state.answers=draft.answers;state.notes=draft.notes;toast('Есть несинхронизированный черновик и новая серверная версия. Сохранение остановлено для сверки.');}}
 active=true;render();focusTop();if(dirty)flush();setInterval(()=>{if(active&&!dirty&&!busy)rpc('research_heartbeat',{p_token:token,p_visible:!document.hidden}).then(()=>{lastError='';decorate();}).catch(e=>{lastError=e.message;decorate();});},20000);
 }
 async function init(){try{const r=await rpc('research_open',{p_token:token,p_consent:false});const setup=document.getElementById('setup');setup.insertAdjacentHTML('afterbegin',`<div class="notice"><strong>${r.is_test?'Тестовая сессия — не для реальных ответов':'Индивидуальное приглашение'}</strong>Код: ${escapeHTML(r.user_code)}. После подтверждения условия ответы и сведения о прогрессе сохраняются в Supabase (Ирландия) и доступны авторизованному исследователю. Черновик хранится также на этом устройстве без шифрования. Ссылка предоставляет доступ к этой анкете; не передавайте её другим.</div>`);
 const code=document.getElementById('participant-code');code.value=r.user_code;code.disabled=true;
 const save=document.getElementById('save-draft');save.closest('label').hidden=true;
 const consent=document.getElementById('consent');consent.closest('label').querySelector('span').textContent='Я понимаю и разрешаю сохранение моих тестовых ответов и прогресса в Supabase, доступ исследователю и локальный черновик на этом устройстве. Я могу остановить заполнение.';
 document.querySelectorAll('#resume,#delete-draft').forEach(e=>e.remove());document.getElementById('start').onclick=()=>begin().catch(e=>toast(e.message));
 const fact=document.querySelector('.facts .fact:last-child span');if(fact)fact.textContent='По этой ссылке ответы сохраняются исследователю';const micro=document.querySelector('.hero-actions .micro');if(micro)micro.textContent='Индивидуальная серверная сессия';
 document.querySelector('.header-tag').textContent='Тестовый мониторинг';
 const pd=document.getElementById('privacy-dialog');pd.insertAdjacentHTML('afterbegin','<p><strong>Режим индивидуального приглашения:</strong> ответы передаются в отдельный проект Supabase в Ирландии; доступ ограничен кабинетом исследователя. Общие положения о локальном режиме ниже относятся только к странице без приглашения.</p>');
 }catch(e){document.getElementById('setup').innerHTML=`<h2>Приглашение недоступно</h2><p>${escapeHTML(e.message)}</p>`;}}
 init();return {enabled:true,client,flush,label};
})();
