'use strict';
function downloadExcel(){
 if(completed()!==ALL.length){toast('Excel доступен после ответов на все вопросы.');return;}
 const data=exportData();
 const wb=XLSX.utils.book_new();
 const summary=[['Параметр','Значение'],['Код участницы',data.participantCode],['Начало',data.startedAt||''],['Выгрузка',data.exportedAt],['Ответов',data.answered],['Пропущено',data.skipped],['Без ответа',data.unanswered],['Версия',data.schemaVersion],['Обработка','Не диагностический результат. Подсчёт только полной MSPSS.']];
 const statuses={answered:'Ответ дан',skipped:'Пропущен',unanswered:'Без ответа'};
 const rows=[['Код участницы','Методика','Раздел','Номер','Вопрос','Статус','Значение','Ответ','Дополнительная запись']];
 for(const m of data.methods)for(const q of m.questions)rows.push([data.participantCode,m.id,m.title,q.number,q.text,statuses[q.status],q.value??'',q.label??'',q.note??'']);
 const scores=[['Методика','Показатель','Балл','Максимум']];
 if(data.scores.MSPSS){const s=data.scores.MSPSS; scores.push(['MSPSS','Общий',s.total,84],['MSPSS','Средний',s.mean,7],['MSPSS','Значимый другой',s.specialPerson,28],['MSPSS','Семья',s.family,28],['MSPSS','Друзья',s.friends,28]);}
 else scores.push(['MSPSS','Не рассчитан: есть пропуски','','']);
 function sheet(name,values,widths){const ws=XLSX.utils.aoa_to_sheet(values);ws['!cols']=widths.map(w=>({wch:w}));ws['!autofilter']={ref:XLSX.utils.encode_range({s:{r:0,c:0},e:{r:values.length-1,c:values[0].length-1}})};XLSX.utils.book_append_sheet(wb,ws,name);}
 sheet('Сведения',summary,[25,85]);sheet('Ответы',rows,[20,14,34,10,90,18,14,60,50]);sheet('MSPSS',scores,[16,48,15,15]);
 XLSX.writeFile(wb,`berezhno-answers-${new Date().toISOString().slice(0,10)}.xlsx`,{compression:true});
 toast('Excel-файл скачан. Ответы не отправлены на сервер.');
}
const excelObserver=new MutationObserver(()=>{const json=document.getElementById('download-json');if(json&&!document.getElementById('download-excel')){const button=document.createElement('button');button.id='download-excel';button.className='button';button.textContent='Скачать Excel (.xlsx) ↓';button.onclick=downloadExcel;json.before(button);json.className='button secondary';}});
excelObserver.observe(document.getElementById('main'),{childList:true,subtree:true});
