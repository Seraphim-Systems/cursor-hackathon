import type { ArchiveDayGroup as ArchiveDayGroupType } from "../../utils/archiveGroups";
import type { JournalEntry } from "../../api/types";
import { RecordingCard } from "./RecordingCard";

type Props = {
  group: ArchiveDayGroupType;
  open: boolean;
  onToggle: () => void;
  groupId: string;
  onRemoveEntry: (id: string) => void;
};

export function ArchiveDayGroup({ group, open, onToggle, groupId, onRemoveEntry }: Props) {
  const n = group.entries.length;
  const countPhrase = n === 1 ? "1 recording" : `${n} recordings`;

  return (
    <div className="archive-day-group">
      <button
        type="button"
        id={`${groupId}-btn`}
        className="archive-day-group__trigger"
        aria-expanded={open}
        aria-controls={`${groupId}-panel`}
        onClick={onToggle}
      >
        <span className={`archive-day-group__chev${open ? " archive-day-group__chev--open" : ""}`} aria-hidden />
        <span className="archive-day-group__label">{group.dayLabel}</span>
        <span className="archive-day-group__count muted">{countPhrase}</span>
      </button>
      <div
        id={`${groupId}-panel`}
        role="region"
        aria-labelledby={`${groupId}-btn`}
        className={`archive-day-group__panel${open ? " archive-day-group__panel--open" : ""}`}
        hidden={!open}
      >
        <div className="archive-day-group__cards">
          {group.entries.map((entry: JournalEntry) => (
            <RecordingCard key={entry.id} entry={entry} onRemoved={() => onRemoveEntry(entry.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}
