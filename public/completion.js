'use strict';
function showCompletion(server=false){
 const heading=document.querySelector('.summary h1');if(heading)heading.textContent='Спасибо за участие';
 const intro=document.querySelector('.summary-intro');if(intro)intro.textContent=server?'Ваши ответы сохранены. Завершение анкеты подтверждено сервером.':'Ваши ответы сохранены на этом устройстве. Исследователю они не отправлены. Вы можете скачать Excel ниже.';
 const banner=document.getElementById('completion-success')||document.createElement('div');banner.id='completion-success';banner.className='notice';banner.setAttribute('role','status');banner.textContent=server?'Спасибо за участие, Ваши ответы сохранены.':'Спасибо за участие, Ваши ответы сохранены на этом устройстве.';if(!banner.isConnected)intro.after(banner);
 const button=document.getElementById('finish-local');if(button){button.textContent='Анкета завершена';button.disabled=true;}
}
function addLocalFinish(){
 if(typeof ResearchLive!=='undefined'&&ResearchLive.enabled)return;
 if(state.screen!=='summary')return;
 if(!document.getElementById('finish-local')){const button=document.createElement('button');button.id='finish-local';button.className='button';button.textContent='Завершить';button.disabled=completed()!==ALL.length;button.onclick=()=>{try{state.localCompleted=true;state.save=true;localStorage.setItem(KEY,JSON.stringify({version:VERSION,state}));const stored=JSON.parse(localStorage.getItem(KEY));if(!stored?.state?.localCompleted)throw Error('Сохранение не подтверждено');showCompletion(false);}catch{state.localCompleted=false;toast('Не удалось сохранить на устройстве. Не закрывайте страницу; скачайте Excel.');}};document.querySelector('.summary-actions')?.prepend(button);}
 if(state.localCompleted&&completed()===ALL.length)showCompletion(false);
}
const finishObserver=new MutationObserver(()=>addLocalFinish());finishObserver.observe(main,{childList:true});
