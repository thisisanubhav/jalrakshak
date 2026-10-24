import { useState } from 'react';
import type { Translate } from '@/field/i18n';
import type { FieldTask } from '@/field/tasks';
export function FieldTasks({ tasks, t, worker, onOpen }: { tasks: FieldTask[]; t: Translate; worker: boolean; onOpen: (task: FieldTask) => void }) {
  const [expanded,setExpanded] = useState(false);
  return <section className="field-card field-task-panel" aria-label={t('taskTitle')}>
    <div className="field-task-heading"><h2>{t(worker ? 'myWork' : 'taskTitle')}</h2><span>{tasks.length} · {t('taskCount')}</span></div>
    <p>{t(worker ? 'workerTaskHelp' : 'taskHelp')}</p>
    {!tasks.length && <p>{t('tasksClear')}</p>}
    <ul className="field-task-list">{(expanded ? tasks : tasks.slice(0,5)).map(task => <li key={task.id}>
      <div><strong>{task.source.code} · {task.source.name}</strong><p>{task.source.village} · {t(task.kind === 'retest' ? 'taskRetest' : task.kind === 'followup' ? 'taskReview' : 'taskFirst')}</p><small>{t('taskSince')}: {new Date(task.since).toLocaleString()}</small></div>
      <button type="button" onClick={() => onOpen(task)} aria-label={`${t('openTask')} · ${task.source.code} · ${t(task.kind === 'retest' ? 'taskRetest' : task.kind === 'followup' ? 'taskReview' : 'taskFirst')} · ${task.id}`}>{t(task.kind === 'followup' ? 'taskReviewAction' : 'taskMeasureAction')}</button>
    </li>)}</ul>
    {tasks.length > 5 && <button type="button" onClick={() => setExpanded(!expanded)}>{t(expanded ? 'showFewerTasks' : 'showAllTasks')}</button>}
  </section>;
}
