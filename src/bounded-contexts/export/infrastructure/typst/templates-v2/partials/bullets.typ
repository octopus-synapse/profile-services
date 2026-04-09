// Bullets partial — renders a list of bullet items.
// Marker, spacing, and indent are read from theme tokens (t.bullets.*).

#let render-bullets(items, t) = {
  let bt = t.bullets

  set list(
    indent: bt.indent * 1pt,
    body-indent: bt.bodyIndent * 1pt,
    marker: bt.marker,
    spacing: bt.spacing * 1pt,
  )

  for item in items {
    list[#item]
  }
}
