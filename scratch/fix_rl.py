# -*- coding: utf-8 -*-
with open('/tmp/research-live.js', 'r', encoding='utf-8') as f:
    content = f.read()

old = """async function begin(){
  const consent=document.getElementById('consent');
  if(!consent?.checked)return;
  const r=await rpc('research_open',{p_token:token,p_consent:true});
  revision=r.revision;completedAt=r.completed_at;
  let draft=null;try{draft=JSON.parse(localStorage.getItem(cacheKey)||'null');}catch{}
  state={screen:r.completed_at?'summary':'survey',method:r.current_test_index-1,offset:Math.floor((r.current_question-1)/5)*5,answers:r.answers||{},notes:r.notes||{},code:r.user_code,save:false,startedAt:r.started_at,updatedAt:null};
  if(draft?.dirty){if(draft.revision===revision){state.answers=draft.answers;state.notes=draft.notes;state.method=draft.method;state.offset=draft.offset;dirty=true;}else if(JSON.stringify(draft.answers)!==JSON.stringify(r.answers)){locked=true;state.answers=draft.answers;state.notes=draft.notes;toast('Есть несинхронизированный черновик и новая серверная версия. Сохранение остановлено для сверки.');}}
  active=true;render();focusTop();if(dirty)flush();setInterval(()=>{if(active&&!dirty&&!busy)rpc('research_heartbeat',{p_token:token,p_visible:!document.hidden}).then(()=>{lastError='';decorate();}).catch(e=>{lastError=e.message;decorate();});},20000);
}"""

new = """async function begin(){
  const consent=document.getElementById('consent');
  if(!consent?.checked)return;
  const r=await rpc('research_open',{p_token:token,p_consent:true});
  revision=r.revision;completedAt=r.completed_at;
  let draft=null;try{draft=JSON.parse(localStorage.getItem(cacheKey)||'null');}catch{}
  state={screen:r.completed_at?'summary':'survey',method:r.current_test_index-1,offset:Math.floor((r.current_question-1)/5)*5,answers:r.answers||{},notes:r.notes||{},code:r.user_code,save:false,startedAt:r.started_at,updatedAt:null};
  if(draft?.dirty){if(draft.revision===revision){state.answers=draft.answers;state.notes=draft.notes;state.method=draft.method;state.offset=draft.offset;dirty=true;}else if(JSON.stringify(draft.answers)!==JSON.stringify(r.answers)){locked=true;state.answers=draft.answers;state.notes=draft.notes;toast('Есть несинхронизированный черновик и новая серверная версия. Сохранение остановлено для сверки.');}}
  active=true;render();focusTop();
  if(dirty)flush();
  // ПОКАЗ ПРОГРЕССА ДЛЯ respondent 001
  const prog=document.getElementById('progress-bar');
  const progLabel=document.getElementById('progress-label');
  const progVal=document.getElementById('progress-value');
  if(progLabel){progLabel.textContent=`Этап: ${state.method+1} / 10 | Вопрос: ${state.offset+1} / 240 | Ответов: ${completed()}`;}
  if(progVal){progVal.textContent=`${completed()} / 240`;}
  if(prog){prog.style.width=(100*completed()/ALL.length)+'%';}
  setInterval(()=>{
    if(active&&!dirty&&!busy){
      rpc('research_heartbeat',{p_token:token,p_visible:!document.hidden}).then(async()=>{
        lastError='';decorate();
        const r2=await rpc('research_open',{p_token:token,p_consent:false});
        if(progLabel){progLabel.textContent=`Этап: ${r2.current_test_index} / 10 | Вопрос: ${r2.current_question} / 240 | Ответов: ${completed()}`;}
        if(progVal){progVal.textContent=`${completed()} / 240`;}
        if(prog){prog.style.width=(100*completed()/ALL.length)+'%';}
      }).catch(e=>{lastError=e.message;decorate();});
    }
  },10000);
}"""

if old in content:
    content = content.replace(old, new)
    with open('/tmp/research-live-fixed.js','w',encoding='utf-8') as f:
        f.write(content)
    print('OK: replaced')
else:
    print('FAIL: old block not found')
PYEOF
python3 /tmp/fix_rl.py
if [ -f /tmp/research-live-fixed.js ]; then
  cp /tmp/research-live-fixed.js public/research-live.js
  node --check public/research-live.js && echo "LOCAL: SYNTAX_OK"
fi