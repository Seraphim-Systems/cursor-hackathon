type Props = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filtersActive: boolean;
  filterModalOpen: boolean;
  onOpenFilter: () => void;
  onRestart: () => void;
};

export function ArchiveSearchFilterBar({
  searchQuery,
  onSearchChange,
  filtersActive,
  filterModalOpen,
  onOpenFilter,
  onRestart,
}: Props) {
  return (
    <div className="archive-toolbar">
      <label className="archive-toolbar__search-wrap">
        <span className="visually-hidden">Search by keywords</span>
        <input
          type="search"
          className="archive-toolbar__search"
          placeholder="Search by keywords…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          autoComplete="off"
          enterKeyHint="search"
        />
      </label>
      <div className="archive-toolbar__actions">
        <button
          type="button"
          className="btn-ghost archive-toolbar__restart"
          disabled={!filtersActive}
          aria-label="Restart — clear search and filters"
          onClick={onRestart}
        >
          Restart
        </button>
        <button
          type="button"
          className="btn-gold btn-gold--outline archive-toolbar__filter"
          aria-haspopup="dialog"
          aria-expanded={filterModalOpen}
          aria-controls="history-filter-dialog"
          aria-label={filtersActive ? "Filters (active)" : "Filters"}
          onClick={onOpenFilter}
        >
          <span>Filter</span>
          {filtersActive ? <span className="archive-toolbar__filter-dot" aria-hidden /> : null}
        </button>
      </div>
    </div>
  );
}
