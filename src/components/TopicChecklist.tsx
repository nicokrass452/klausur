import type { Topic } from "../types";

interface TopicChecklistProps {
  topics: Topic[];
  onToggle: (id: string) => void;
  disabled?: boolean;
}

export function TopicChecklist({ topics, onToggle, disabled }: TopicChecklistProps) {
  if (!topics.length) {
    return <p className="text-sm text-slate-500">Noch keine Themen angelegt.</p>;
  }

  return (
    <div className="space-y-3">
      {topics.map((topic) => (
        <label key={topic.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 px-4 py-3 dark:border-slate-800">
          <div>
            <p className="font-medium text-slate-900 dark:text-white">{topic.name}</p>
            <p className="text-sm text-slate-500">Schwierigkeit {topic.difficulty} · {topic.estimatedMinutes} min</p>
          </div>
          <input
            type="checkbox"
            checked={topic.completed}
            onChange={() => onToggle(topic.id)}
            disabled={disabled}
            className="h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
        </label>
      ))}
    </div>
  );
}
