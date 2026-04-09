// Column Layout - ATS version
// Always single-column. Multi-column layouts hurt ATS parsing.

/// Render all sections in a single column, sorted by order.
/// Ignores column assignments — everything goes into one flow.
#let render-columns(sections, columns, column-gap-mm, render-fn, global-styles) = {
  let sorted = sections.sorted(key: s => s.order)

  for section in sorted {
    render-fn(section, global-styles)
  }
}
