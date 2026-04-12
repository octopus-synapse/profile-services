// Global Styles - Color and font setup from ResumeAst globalStyles

/// Parse a hex color string to a Typst color.
#let parse-color(hex-str) = {
  if hex-str == none or hex-str == "" or hex-str == "transparent" {
    return rgb(0, 0, 0, 0)
  }
  rgb(hex-str)
}

/// Map font weight number to Typst weight keyword.
#let map-weight(w) = {
  if w <= 100 { "thin" }
  else if w <= 200 { "extralight" }
  else if w <= 300 { "light" }
  else if w <= 400 { "regular" }
  else if w <= 500 { "medium" }
  else if w <= 600 { "semibold" }
  else if w <= 700 { "bold" }
  else if w <= 800 { "extrabold" }
  else { "black" }
}

/// Apply text transform to a string.
#let apply-transform(text-str, transform) = {
  if transform == "uppercase" { upper(text-str) }
  else if transform == "lowercase" { lower(text-str) }
  else { text-str }
}
