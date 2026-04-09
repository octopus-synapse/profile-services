// Item Section

#import "global-styles.typ": parse-color, map-weight
#import "section-header.typ": render-section-header
#import "item-fields.typ": extract-title, extract-subtitle, extract-description, extract-item-name, extract-level, extract-url, extract-single-date, build-date-range

// ─── Level translation ───
#let translate-level(l) = {
  if l == "BASIC" { "Básico" }
  else if l == "INTERMEDIATE" { "Intermediário" }
  else if l == "FLUENT" { "Avançado (C1)" }
  else if l == "NATIVE" { "Nativo" }
  else { l }
}

// ─── Simple list (skills, languages) ───
#let render-simple-list(items) = {
  let entries = ()
  for item in items {
    let content = item.content
    let name = extract-item-name(content)
    let level = extract-level(content)
    if name != none {
      if level != none { entries.push(name + " (" + translate-level(level) + ")") }
      else { entries.push(name) }
    }
  }
  if entries.len() > 0 {
    par(justify: true, text(size: 9pt, fill: rgb("#222222"), entries.join(text(fill: rgb("#bbbbbb"), "  ·  "))))
  }
}

// ─── Employment type translation ───
#let translate-employment-type(et) = {
  if et == "Full-time" { "Tempo integral" }
  else if et == "Part-time" { "Meio período" }
  else if et == "Contract" { "Contrato" }
  else if et == "Internship" { "Estágio" }
  else if et == "Freelance" { "Voluntário" }
  else { et }
}

// ─── Entry item ───
#let render-entry-item(item) = {
  let content = item.content
  let raw-title = extract-title(content)
  let field = content.at("field", default: none)
  let title = if raw-title != none and field != none and type(field) == str and field.trim() != "" {
    raw-title + " em " + field
  } else { raw-title }
  let subtitle = extract-subtitle(content)
  let description = extract-description(content)
  let date-range = build-date-range(content)
  let date-display = if date-range != "" { date-range } else { extract-single-date(content) }
  let employment-type = content.at("employmentType", default: none)
  let item-url = extract-url(content)

  block(width: 100%, below: 14pt, {
    // Title ←→ Date
    if title != none {
      grid(
        columns: (1fr, auto),
        align: (left, right),
        text(size: 9.5pt, weight: "semibold", fill: rgb("#111111"), title),
        if date-display != "" {
          text(size: 8.5pt, fill: rgb("#666666"), date-display)
        },
      )
    }

    // Company · Type + link
    if subtitle != none {
      let et-str = if employment-type != none and type(employment-type) == str and employment-type.trim() != "" {
        " · " + translate-employment-type(employment-type)
      } else { "" }
      v(0.5pt)
      {
        text(size: 8.5pt, weight: "medium", fill: rgb("#444444"), [#subtitle#et-str])
        if item-url != none {
          text(size: 8.5pt, fill: rgb("#444444"), [ · ])
          link(item-url, text(size: 8.5pt, weight: "medium", fill: rgb("#2563eb"), [Ver credencial ↗]))
        }
      }
    }

    // Description
    if description != none {
      v(1.5pt)
      let lines = str(description).split("\n").filter(l => l.trim() != "")
      let clean-lines = lines.map(l => {
        let c = l.trim()
        if c.starts-with("- ") { c.slice(2) }
        else if c.starts-with("• ") { c.slice(2) }
        else { c }
      })
      list(..clean-lines.map(l => text(size: 8.5pt, fill: rgb("#222222"), l)))
    }

    // Technologies
    let achievements = content.at("achievements", default: none)
    let technologies = content.at("technologies", default: none)
    let techs = if achievements != none and type(achievements) == array { achievements }
      else if technologies != none and type(technologies) == array { technologies }
      else { none }
    if techs != none and techs.len() > 0 {
      v(1pt)
      text(size: 7.5pt, fill: rgb("#777777"), [#text(weight: "semibold")[Tecnologias:] #techs.join(", ")])
    }
  })
}

// ─── Section renderer ───
#let render-item-section(section, global-styles) = {
  let data = section.data
  let styles = section.styles
  let items = data.at("items", default: ())
  if items.len() == 0 { return }

  render-section-header(data.title, styles.title, global-styles.accent)

  let first-content = items.at(0).content
  let has-subtitle = extract-subtitle(first-content) != none
  let has-description = extract-description(first-content) != none
  let is-simple-list = not has-subtitle and not has-description

  if is-simple-list {
    render-simple-list(items)
  } else {
    for item in items {
      render-entry-item(item)
    }
  }
}
