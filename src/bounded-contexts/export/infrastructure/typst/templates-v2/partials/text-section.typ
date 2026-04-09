// Text section partial — renders plain text content (summary, objective, etc).
// All visual values read from theme tokens (t.textSection.*).

#let render-text-section(content, t) = {
  let ts = t.textSection

  set text(
    size: ts.fontSize * 1pt,
    fill: rgb(ts.color),
  )
  set par(
    leading: ts.at("lineHeight", default: t.global.lineHeight) * ts.fontSize * 0.5pt,
    justify: ts.at("justify", default: t.global.justify),
  )

  [#content]

  v(ts.at("marginBottom", default: 6) * 1pt)
}
