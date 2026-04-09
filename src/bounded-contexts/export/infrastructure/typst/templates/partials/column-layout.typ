// Column Layout - Handles single-column, two-column, sidebar layouts

/// Build column layout from page config and render sections into columns.
/// sections: array of placed sections
/// columns: array of { id, widthPercentage, order }
/// columnGapMm: gap between columns in mm
/// render-fn: function(section, global-styles) to render each section
/// global-styles: the globalStyles object
#let render-columns(sections, columns, column-gap-mm, render-fn, global-styles) = {
  // Sort columns by order
  let sorted-cols = columns.sorted(key: col => col.order)

  if sorted-cols.len() <= 1 {
    // Single column layout
    let col-sections = sections
      .filter(s => true)
      .sorted(key: s => s.order)

    for section in col-sections {
      render-fn(section, global-styles)
    }
  } else {
    // Multi-column layout
    let col-widths = sorted-cols.map(col => {
      (col.widthPercentage / 100) * 1fr
    })

    let col-contents = sorted-cols.map(col => {
      let col-sections = sections
        .filter(s => s.columnId == col.id)
        .sorted(key: s => s.order)
      col-sections
    })

    grid(
      columns: col-widths,
      column-gutter: column-gap-mm * 1mm,
      ..col-contents.map(col-sections => {
        block({
          for section in col-sections {
            render-fn(section, global-styles)
          }
        })
      })
    )
  }
}
