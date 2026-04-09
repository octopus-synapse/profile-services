// Item Section - ATS version
// Clean, linear rendering. No grids, no decorative elements.
// Uses safe bullets only (-, *).

#import "global-styles.typ": parse-color, map-weight
#import "section-header.typ": render-section-header
#import "item-fields.typ": extract-title, extract-subtitle, extract-description, extract-item-name, extract-level, build-date-range

/// Render a simple list section (skills, languages, etc.)
/// ATS-safe: comma-separated, no special characters.
#let render-simple-list(items, ats-font) = {
  let entries = ()
  for item in items {
    let content = item.content
    let name = extract-item-name(content)
    let level = extract-level(content)
    if name != none {
      if level != none {
        entries.push(name + " (" + level + ")")
      } else {
        entries.push(name)
      }
    }
  }

  if entries.len() > 0 {
    text(font: ats-font, size: 10pt, fill: black, entries.join(", "))
  }
}

/// Translate employment type to pt-BR
#let translate-employment-type(et) = {
  if et == "Full-time" { "Tempo integral" }
  else if et == "Part-time" { "Meio período" }
  else if et == "Contract" { "Contrato" }
  else if et == "Internship" { "Estágio" }
  else if et == "Freelance" { "Voluntário" }
  else { et }
}

/// Render a timeline-style entry (experience, education, projects, etc.)
/// ATS-safe: plain text layout, no grid for title/date — uses inline format.
#let render-entry-item(item, ats-font) = {
  let content = item.content
  let title = extract-title(content)
  let subtitle = extract-subtitle(content)
  let description = extract-description(content)
  let date-range = build-date-range(content)
  let employment-type = content.at("employmentType", default: none)

  block(width: 100%, {
    // Title and date on same line
    if title != none {
      let title-line = {
        text(font: ats-font, size: 11pt, weight: "bold", fill: black, title)
        if date-range != "" {
          text(font: ats-font, size: 10pt, fill: luma(80), [ | #date-range])
        }
      }
      title-line
      linebreak()
    }

    // Subtitle (company, institution) with employment type
    if subtitle != none {
      let subtitle-text = if employment-type != none and type(employment-type) == str and employment-type.trim() != "" {
        [#subtitle · #translate-employment-type(employment-type)]
      } else {
        subtitle
      }
      let location = content.at("location", default: none)
      if location != none and type(location) == str and location.trim() != "" {
        text(font: ats-font, size: 10pt, fill: luma(60), [#subtitle-text, #location])
      } else {
        text(font: ats-font, size: 10pt, fill: luma(60), subtitle-text)
      }
      linebreak()
    }

    // Description as bullet points
    if description != none {
      v(2pt)
      let lines = str(description).split("\n").filter(l => l.trim() != "")
      for line in lines {
        let clean = line.trim()
        if clean.starts-with("- ") { clean = clean.slice(2) }
        text(font: ats-font, size: 10pt, fill: black, [- #clean])
        linebreak()
      }
    }

    // Achievements / skills tags
    let achievements = content.at("achievements", default: none)
    if achievements != none and type(achievements) == array and achievements.len() > 0 {
      v(2pt)
      text(font: ats-font, size: 9pt, fill: luma(60), [*Tecnologias:* #achievements.join(", ")])
    }
  })
}

/// Render a generic item section.
#let render-item-section(section, global-styles, ats-font) = {
  let data = section.data
  let styles = section.styles
  let items = data.at("items", default: ())

  if items.len() == 0 { return }

  render-section-header(data.title, styles.title, ats-font)

  // Detect if this is a "simple list" section (skills, languages)
  // Simple list = items have no company/institution (subtitle) AND no description
  let first-content = items.at(0).content
  let has-subtitle-fields = extract-subtitle(first-content) != none
  let has-description-fields = extract-description(first-content) != none
  let is-simple-list = not has-subtitle-fields and not has-description-fields

  if is-simple-list {
    render-simple-list(items, ats-font)
  } else {
    for (idx, item) in items.enumerate() {
      render-entry-item(item, ats-font)
      if idx < items.len() - 1 {
        v(6pt)
      }
    }
  }

  v(8pt)
}
