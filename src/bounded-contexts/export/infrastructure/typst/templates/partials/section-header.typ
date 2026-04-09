// Section Header

#import "global-styles.typ": parse-color, map-weight, apply-transform

#let render-section-header(title-text, title-style, accent-color) = {
  let transformed = apply-transform(title-text, title-style.textTransform)

  block(width: 100%, above: 16pt, below: 4pt, {
    grid(
      columns: (3pt, 1fr),
      column-gutter: 7pt,
      rect(width: 3pt, height: 12pt, fill: rgb("#1a1a1a"), radius: 1pt),
      align(left + horizon, text(
        size: 10pt,
        weight: "bold",
        fill: rgb("#0f0f0f"),
        tracking: 0.5pt,
        upper(transformed),
      )),
    )
    v(2pt)
    line(length: 100%, stroke: 0.4pt + rgb("#dddddd"))
  })
}
