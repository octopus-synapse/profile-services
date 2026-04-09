// Item Fields - Generic field extraction by priority lists
// Same logic as default template — field extraction is data-driven.

/// Extract the first non-empty string field from content using a list of candidate keys.
#let extract-field(content, keys) = {
  let result = none
  for key in keys {
    let val = content.at(key, default: none)
    if val != none and type(val) == str and val.trim() != "" {
      result = val
      break
    }
  }
  result
}

/// Priority lists for generic field extraction
#let title-keys = ("role", "position", "degree", "name", "title")
#let subtitle-keys = ("company", "institution", "organization")
#let description-keys = ("description", "summary", "details")
#let item-name-keys = ("name", "skill", "language")
#let level-keys = ("level", "proficiency")
#let url-keys = ("url", "link", "website")

/// Extract title field from item content
#let extract-title(content) = extract-field(content, title-keys)

/// Extract subtitle field from item content
#let extract-subtitle(content) = extract-field(content, subtitle-keys)

/// Extract description field from item content
#let extract-description(content) = extract-field(content, description-keys)

/// Extract item name (for simple list items like skills)
#let extract-item-name(content) = extract-field(content, item-name-keys)

/// Extract level/proficiency
#let extract-level(content) = extract-field(content, level-keys)

/// Format a date string to "Mon Year" format.
#let format-date(date-str) = {
  if date-str == none or date-str == "" { return "" }
  let s = str(date-str)
  if s.len() <= 10 {
    return s
  }
  let parts = s.split("T").at(0, default: s).split("-")
  if parts.len() >= 2 {
    let months = ("Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez")
    let month-idx = int(parts.at(1)) - 1
    if month-idx >= 0 and month-idx < 12 {
      return months.at(month-idx) + " " + parts.at(0)
    }
  }
  s
}

/// Build a date range string from content fields.
#let build-date-range(content) = {
  let start = content.at("startDate", default: none)
  let end = content.at("endDate", default: none)
  let is-current = content.at("isCurrent", default: false)

  let start-str = if start != none { format-date(str(start)) } else { "" }
  let end-str = if is-current == true {
    "Presente"
  } else if end != none {
    format-date(str(end))
  } else if start-str != "" {
    "Presente"
  } else {
    ""
  }

  if start-str != "" and end-str != "" {
    start-str + " - " + end-str
  } else if start-str != "" {
    start-str
  } else if end-str != "" {
    end-str
  } else {
    ""
  }
}
