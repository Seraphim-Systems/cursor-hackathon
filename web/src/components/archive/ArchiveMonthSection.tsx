import type { ArchiveMonthSection as ArchiveMonthSectionType } from "../../utils/archiveGroups";
import { ArchiveDayGroup } from "./ArchiveDayGroup";

type Props = {
  section: ArchiveMonthSectionType;
  openDayKeys: Set<string>;
  toggleDay: (key: string) => void;
  onRemoveEntry: (id: string) => void;
};

export function ArchiveMonthSection({ section, openDayKeys, toggleDay, onRemoveEntry }: Props) {
  return (
    <section className="archive-month" aria-labelledby={`archive-month-${section.key}`}>
      <h2 id={`archive-month-${section.key}`} className="archive-month__heading">
        {section.heading}
      </h2>
      <div className="archive-month__days">
        {section.days.map((day) => {
          const dKey = `${section.key}|${day.dateYmd}`;
          return (
            <ArchiveDayGroup
              key={dKey}
              group={day}
              groupId={`adg-${dKey.replace(/\|/g, "-")}`}
              open={openDayKeys.has(dKey)}
              onToggle={() => toggleDay(dKey)}
              onRemoveEntry={onRemoveEntry}
            />
          );
        })}
      </div>
    </section>
  );
}
