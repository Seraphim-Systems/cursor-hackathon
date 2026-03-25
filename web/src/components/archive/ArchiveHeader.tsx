type Props = {
  timeZone: string;
};

export function ArchiveHeader({ timeZone }: Props) {
  return (
    <header className="archive-header">
      <h2 className="archive-header__title page-title">History</h2>
      <p className="archive-header__subtitle muted">
        Your voice notes, grouped by day. Times use <strong className="archive-header__tz">{timeZone}</strong>.
      </p>
    </header>
  );
}
