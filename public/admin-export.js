'use strict';
function buildResearchWorkbook(all,scope='completed'){
 const full=s=>Boolean(s.completed_at)&&QUESTIONNAIRE_DATA.every(m=>m.questions.every(q=>q.open?typeof s.answers[q.id]==='string'&&s.answers[q.id].trim()&&s.answers[q.id]!=='skip':Number.isInteger(s.answers[q.id])&&(q.options||m.options).some(o=>o.value===s.answers[q.id])));
 const list=all.filter(s=>full(s)&&!s.is_test);
 const wb=XLSX.utils.book_new(),questions=QUESTIONNAIRE_DATA.flatMap(m=>m.questions);
 const wide=[['Код','Начало','Завершение','Ответов','Пропусков',...questions.map(q=>q.id)]];
 const long=[['Код','Методика','Номер','Вопрос','Статус','Значение','Ответ','Примечание']];
 const results=[['Код','MSPSS общий','MSPSS средний','Значимый другой','Семья','Друзья','Статус расчёта']];
 for(const s of list){wide.push([s.user_code,s.started_at||'',s.completed_at||'',s.answered_count,s.skipped_count,...questions.map(q=>s.answers[q.id]===undefined?'':s.answers[q.id]==='skip'?'ПРОПУСК':s.answers[q.id])]);
 for(const m of QUESTIONNAIRE_DATA)for(const q of m.questions){const v=s.answers[q.id],valid=v!==undefined&&v!=='skip';long.push([s.user_code,m.id,q.number,q.text,v===undefined?'Без ответа':v==='skip'?'Пропущен':'Ответ дан',valid?v:'',valid?(q.open?v:(q.options||m.options).find(o=>o.value===v)?.label||''):'',s.notes?.[q.id]||'']);}
 const full=QUESTIONNAIRE_DATA[0].questions.every(q=>Number.isInteger(s.answers[q.id])&&s.answers[q.id]>=1&&s.answers[q.id]<=7);
 if(full){const sum=ns=>ns.reduce((a,n)=>a+s.answers['MSPSS-'+n],0),total=sum(Array.from({length:12},(_,i)=>i+1));results.push([s.user_code,total,total/12,sum([1,2,5,10]),sum([3,4,8,11]),sum([6,7,9,12]),'По предоставленному ключу; без категорий']);}else results.push([s.user_code,'','','','','','MSPSS неполная']);
 }
 const dictionary=[['ID вопроса','Методика','Название','Номер','Текст','Варианты ответа']];for(const m of QUESTIONNAIRE_DATA)for(const q of m.questions)dictionary.push([q.id,m.id,m.title,q.number,q.text,q.open?'Свободный текст':(q.options||m.options).map(o=>o.value+' — '+o.label).join('; ')]);
 const meta=[['Параметр','Значение'],['Сформировано',new Date().toISOString()],['Выборка','Завершённые реальные'],['Количество анкет',list.length],['Источник','Снимок серверной базы на момент скачивания'],['Полнота','В выгрузку включены только завершённые анкеты с ответами на все обязательные вопросы'],['Обработка','Другие шкалы не рассчитаны: требуется сверка ключей'],['Ответственная','Мамаладзе Лана'],['Хранение','Срок год сообщён заказчиком; начало отсчёта и процедура удаления требуют уточнения'],['Доступ','Файл содержит чувствительные данные. Не публиковать и не пересылать посторонним.']];
 for(const [name,rows]of[['Участницы',wide],['Ответы',long],['Результаты',results],['Словарь',dictionary],['Описание',meta]]){const ws=XLSX.utils.aoa_to_sheet(rows);ws['!autofilter']={ref:XLSX.utils.encode_range({s:{r:0,c:0},e:{r:rows.length-1,c:rows[0].length-1}})};ws['!cols']=rows[0].map((_,i)=>({wch:name==='Участницы'?i<5?24:16:name==='Ответы'&&i===3?85:28}));XLSX.utils.book_append_sheet(wb,ws,name);}
 return wb;
}
el('export-all').onclick=async()=>{try{const list=await rpc('research_admin_export'),scope=el('export-scope').value;XLSX.writeFile(buildResearchWorkbook(list,scope),'research-'+scope+'-'+new Date().toISOString().slice(0,10)+'.xlsx',{compression:true});message('Скачан актуальный снимок серверных данных. Ранее скачанные файлы не изменяются.');}catch(e){message(e.message);}};
