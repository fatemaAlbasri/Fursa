// "Showing 1–10 of 24 job seekers" + Prev / Next
export default function Pager({ data, noun, onPage }) {
  const { page, page_size: size, total, total_pages: pages } = data
  const from = (page - 1) * size + 1
  const to = Math.min(page * size, total)

  return (
    <div className="admin-pager">
      <span>{total === 0 ? `No ${noun}` : `Showing ${from}–${to} of ${total} ${noun}`}</span>
      {pages > 1 && (
        <div className="admin-pager__btns">
          <button type="button" disabled={page === 1} onClick={() => onPage(page - 1)}>
            ← Prev
          </button>
          <span>
            Page {page} of {pages}
          </span>
          <button type="button" disabled={page === pages} onClick={() => onPage(page + 1)}>
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
