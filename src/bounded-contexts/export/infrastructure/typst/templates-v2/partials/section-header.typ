// Section header partial — renders section title with optional accent bar and divider.
// All visual values read from theme tokens (t.sectionHeader.*).

#let render-section-header(title, t) = {
  let sh = t.sectionHeader

  let transformed-title = if sh.at("textTransform", default: "none") == "uppercase" {
    upper(title)
  } else if sh.at("textTransform", default: "none") == "lowercase" {
    lower(title)
  } else {
    title
  }

  v(sh.at("marginTop", default: 12) * 1pt)

  let has-accent-bar = sh.at("accentBar", default: none) != none and sh.accentBar.at("enabled", default: false)

  if has-accent-bar {
    let ab = sh.accentBar
    let bar-width = ab.at("width", default: 3) * 1pt
    let bar-color = rgb(ab.at("color", default: "#3B82F6"))
    let bar-gap = ab.at("gap", default: 6) * 1pt

    block(inset: (left: bar-width + bar-gap))[
      #place(left + horizon, dx: -(bar-width + bar-gap))[
        #rect(width: bar-width, height: sh.fontSize * 1pt + 4pt, fill: bar-color)
      ]
      #text(
        size: sh.fontSize * 1pt,
        weight: sh.fontWeight,
        fill: rgb(sh.color),
      )[#transformed-title]
    ]
  } else {
    text(
      size: sh.fontSize * 1pt,
      weight: sh.fontWeight,
      fill: rgb(sh.color),
    )[#transformed-title]
  }

  let has-divider = sh.at("divider", default: none) != none and sh.divider.at("enabled", default: false)

  if has-divider {
    let dv = sh.divider
    v(dv.at("gap", default: 4) * 1pt)
    line(
      length: 100%,
      stroke: dv.at("thickness", default: 0.5) * 1pt + rgb(dv.at("color", default: "#E2E8F0")),
    )
  }

  v(sh.at("marginBottom", default: 6) * 1pt)
}
