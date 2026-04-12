// Header partial — renders name, jobTitle, and contact items.
// All visual values read from theme tokens (t.header.*).

#let render-header(header, t) = {
  let ht = t.header

  if header == none { return }

  if "fullName" in header and header.fullName != none {
    let nt = ht.name
    set text(
      size: nt.fontSize * 1pt,
      weight: nt.fontWeight,
      fill: rgb(nt.color),
    )
    let alignment = if nt.at("alignment", default: "center") == "left" { left } else { center }
    align(alignment)[#header.fullName]
    v(nt.at("marginBottom", default: 2) * 1pt)
  }

  if "jobTitle" in header and header.jobTitle != none {
    let jt = ht.jobTitle
    set text(
      size: jt.fontSize * 1pt,
      weight: jt.at("fontWeight", default: 400),
      fill: rgb(jt.color),
    )
    let alignment = if jt.at("alignment", default: "center") == "left" { left } else { center }
    align(alignment)[#header.jobTitle]
    v(jt.at("marginBottom", default: 4) * 1pt)
  }

  if "contact" in header and header.contact != none and header.contact.len() > 0 {
    let ct = ht.contact
    let sep = ht.divider.at("separator", default: " | ")
    let sep-color = rgb(ht.divider.at("color", default: "#999999"))

    set text(
      size: ct.fontSize * 1pt,
      fill: rgb(ct.color),
    )

    let alignment = if ct.at("alignment", default: "center") == "left" { left } else { center }

    let items = header.contact.map(item => {
      if type(item) == str { item } else if "value" in item { item.value } else { "" }
    }).filter(item => item != "")

    align(alignment)[
      #for (i, item) in items.enumerate() {
        item
        if i < items.len() - 1 {
          text(fill: sep-color)[#sep]
        }
      }
    ]
    v(ct.at("marginBottom", default: 6) * 1pt)
  }
}
