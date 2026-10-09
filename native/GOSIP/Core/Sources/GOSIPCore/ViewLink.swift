import Foundation

public enum ViewLinkError: LocalizedError {
  case invalid(String)
  public var errorDescription: String? {
    switch self {
    case .invalid(let message): message
    }
  }
}

/// Pure, offline conversion. Strict import validation precedes any state change.
/// Names and value semantics follow src/state/explorer.ts and src/data/history.ts.
public enum ViewLink {
  public static let base = "https://sebastienlato.github.io/G.O.S.I.P/"
  public static let privacy =
    "Links include search text and place filters. Avoid personal information. Copying puts the link on your system clipboard; sharing sends it to the destination you choose. Opening it on the web can expose it to browser history and host logs."

  private static func fail(_ message: String) -> ViewLinkError { .invalid(message) }
  private static func safe(_ value: String, limit: Int) -> Bool {
    value.utf16.count <= limit
      && !value.unicodeScalars.contains {
        $0.value < 32 || (127...159).contains($0.value)
          || (0x202a...0x202e).contains($0.value) || (0x2066...0x2069).contains($0.value)
      }
  }

  public static func parse(_ text: String) throws -> Filters {
    guard safe(text, limit: 8192),
      let parts = URLComponents(string: text), parts.string == text
    else {
      throw fail(
        "Invalid link. Use a complete URL without control or directional characters (maximum 8,192 characters)."
      )
    }
    guard text.hasPrefix(base), parts.scheme == "https", parts.host == "sebastienlato.github.io",
      parts.percentEncodedPath == "/G.O.S.I.P/", parts.user == nil, parts.password == nil,
      parts.port == nil, parts.fragment == nil
    else {
      throw fail(
        "Unsupported address. Use https://sebastienlato.github.io/G.O.S.I.P/ with view filters only."
      )
    }
    let query = parts.percentEncodedQuery ?? ""
    guard query.utf16.count <= 4096 else { throw fail("The link query exceeds 4,096 characters.") }
    var values: [String: String] = [:]
    for pair in query.split(separator: "&", omittingEmptySubsequences: true) {
      let pieces = pair.split(separator: "=", maxSplits: 1, omittingEmptySubsequences: false)
      func decode(_ value: Substring) -> String? {
        String(value).replacingOccurrences(of: "+", with: " ").removingPercentEncoding
      }
      guard let key = decode(pieces[0]), let value = decode(pieces.count == 2 ? pieces[1] : ""),
        safe(key, limit: 100), safe(value, limit: 4096), values[key] == nil
      else { throw fail("Invalid encoding, duplicate parameter, or unsafe text in link.") }
      values[key] = value
    }
    var result = Filters()
    let source = values["source"] ?? "demo"
    guard Snapshot.sourceIDs.contains(source) else {
      throw fail(
        "Unsupported source. Native views support seven bundled simulations only; live sources cannot be imported."
      )
    }
    result.selectSource(source)
    func choice(_ key: String, _ choices: [String], default fallback: String = "") throws -> String
    {
      guard let value = values[key] else { return fallback }
      guard choices.contains(value) else { throw fail("Unsupported \(key) filter.") }
      return value
    }
    result.hours = Int(try choice("hours", ["6", "24", "72", "168"], default: "24"))!
    result.map = try choice("view", ["map", "list"], default: "map") == "map"
    _ = try choice("map", ["static", "interactive"])
    if let at = values["at"] {
      guard let date = Clock.parse(at), date >= Clock.start, date <= Clock.snapshot,
        date.timeIntervalSince(Clock.start).truncatingRemainder(dividingBy: 3600) == 0
      else {
        throw fail(
          "Cursor must be an exact UTC hour from 1 October 2026 16:00 through 8 October 2026 16:00, ending in :00:00.000Z."
        )
      }
      result.at = date
    }
    for key in ["q", "country", "region"] {
      guard safe(values[key] ?? "", limit: key == "q" ? 200 : 300) else {
        throw fail(
          "Search is limited to 200 characters; country and region to 300. Control and directional characters are not allowed."
        )
      }
    }
    result.query = values["q"] ?? ""
    result.country = (values["country"] ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    result.region = (values["region"] ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    if let layers = values["layers"] {
      let keys = layers.isEmpty ? [] : layers.components(separatedBy: ",")
      guard keys.allSatisfy(Filters.categoryKeys.contains) else {
        throw fail("Unsupported category in layers.")
      }
      result.selectedCategories = Set(keys)
    }
    // Like the web contract, content filters are scoped to their source.
    if source == "reports-demo" {
      result.language = try choice("lang", ["en", "fr", "es", "ar"])
      result.correctedOnly = try choice("reports", ["corrected"]) == "corrected"
    }
    if source == "digital-demo" {
      result.family = try choice("digital", ["outage", "interference"])
      result.result = try choice("result", ["anomaly", "no-anomaly", "no-samples", "inconclusive"])
    }
    return result
  }

  public static func serialize(_ filters: Filters) throws -> String {
    var pairs: [(String, String)] = [("at", Clock.iso(filters.at))]
    func add(_ key: String, _ value: String) { if !value.isEmpty { pairs.append((key, value)) } }
    add("country", filters.country)
    add("region", filters.region)
    if filters.sourceID != "demo" { add("source", filters.sourceID) }
    if filters.sourceID == "reports-demo" {
      add("lang", filters.language)
      if filters.correctedOnly { add("reports", "corrected") }
    }
    if filters.sourceID == "digital-demo" {
      add("digital", filters.family)
      add("result", filters.result)
    }
    add("q", filters.query)
    if filters.hours != 24 { add("hours", String(filters.hours)) }
    guard filters.selectedCategories.isSubset(of: Set(Filters.categoryKeys)) else {
      throw fail("Unsupported category in layers.")
    }
    if filters.selectedCategories != Set(Filters.categoryKeys) {
      pairs.append(
        (
          "layers",
          Filters.categoryKeys.filter(filters.selectedCategories.contains).joined(separator: ",")
        ))
    }
    if !filters.map { add("view", "list") }
    let allowed = CharacterSet(
      charactersIn: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789*-._")
    func encode(_ value: String) -> String {
      value.addingPercentEncoding(withAllowedCharacters: allowed)!.replacingOccurrences(
        of: "%20", with: "+")
    }
    let link = base + "?" + pairs.map { encode($0.0) + "=" + encode($0.1) }.joined(separator: "&")
    _ = try parse(link)
    return link
  }
}
