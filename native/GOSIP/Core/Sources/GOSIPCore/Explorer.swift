import Foundation

public enum FixtureError: Error { case invalidBundle }

public struct DetailRow: Decodable, Sendable {
  public let label: String
  public let value: String
}
public struct DetailSection: Decodable, Sendable {
  public let title: String
  public let rows: [DetailRow]
}
public struct Record: Decodable, Identifiable, Sendable {
  public let id: String
  public let title: String
  public let summary: String
  public let category: String
  public let country: String
  public let region: String
  public let coordinates: [Double]?
  public let time: String
  public let timeBasis: String
  public let intervalStart: String?
  public let intervalEnd: String?
  public let language: String?
  public let corrected: Bool
  public let family: String?
  public let result: String?
  public let badge: String
  public let searchText: String
  public let details: [DetailSection]
  public let original: String?
  public var date: Date { Clock.parse(time)! }  // validated at the bundle boundary
}
public struct Source: Decodable, Identifiable, Sendable {
  public let id: String
  public let title: String
  public let note: String
  public let records: [Record]
}
public struct Relationship: Decodable, Identifiable, Sendable {
  public let id: String
  public let from: String
  public let to: String
  public let kind: String
  public let evidence: String
  public let author: String
}
public enum Clock {
  public static let snapshot = parse("2026-10-08T16:00:00.000Z")!
  public static let start = snapshot.addingTimeInterval(-168 * 3600)
  public static func parse(_ value: String) -> Date? {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    guard value.count == 24, let date = f.date(from: value), f.string(from: date) == value else {
      return nil
    }
    return date
  }
  public static func iso(_ date: Date) -> String {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return f.string(from: date)
  }
  public static func display(_ date: Date) -> String {
    let f = DateFormatter()
    f.locale = Locale(identifier: "en_GB")
    f.timeZone = TimeZone(secondsFromGMT: 0)
    f.dateFormat = "dd MMM yyyy, HH:mm 'UTC'"
    return f.string(from: date)
  }
}

public struct Snapshot: Decodable, Sendable {
  public let version: Int
  public let snapshot: String
  public let sources: [Source]
  public let relationships: [Relationship]
  public static let sourceIDs = [
    "demo", "fire-demo", "reports-demo", "digital-demo", "space-demo", "aviation-demo",
    "maritime-demo",
  ]
  public static var resourceBundle: Bundle {
    #if SWIFT_PACKAGE
      .module
    #else
      .main
    #endif
  }
  public static func resource(_ name: String, extension ext: String) throws -> Data {
    guard let url = resourceBundle.url(forResource: name, withExtension: ext) else {
      throw FixtureError.invalidBundle
    }
    return try Data(contentsOf: url)
  }
  public static func load() throws -> Snapshot {
    try decode(resource("fixtures", extension: "json"))
  }
  public static func decode(_ data: Data) throws -> Snapshot {
    guard data.count <= 1_000_000 else { throw FixtureError.invalidBundle }
    let value = try JSONDecoder().decode(Snapshot.self, from: data)
    guard value.version == 1, value.snapshot == Clock.iso(Clock.snapshot),
      value.sources.map(\.id) == sourceIDs, value.relationships.count <= 50
    else { throw FixtureError.invalidBundle }
    var ids = Set<String>()
    for source in value.sources {
      guard source.records.count <= 50, valid(source.title, max: 100), valid(source.note, max: 2000)
      else { throw FixtureError.invalidBundle }
      for record in source.records {
        guard record.id.range(of: "^[a-z0-9-]{1,80}$", options: .regularExpression) != nil,
          ids.insert(record.id).inserted, record.badge.hasPrefix("SIMULATED"),
          Filters.categories.keys.contains(record.category), valid(record.title, max: 300),
          valid(record.summary, max: 2000),
          valid(record.country, max: 300, empty: true), valid(record.region, max: 300),
          valid(record.searchText, max: 10000), valid(record.timeBasis, max: 100),
          let time = Clock.parse(record.time), time >= Clock.start, time <= Clock.snapshot,
          record.details.count <= 12, (record.original?.utf8.count ?? 0) <= 20000
        else { throw FixtureError.invalidBundle }
        if let coordinates = record.coordinates {
          guard coordinates.count == 2, coordinates.allSatisfy(\.isFinite),
            abs(coordinates[0]) <= 180, abs(coordinates[1]) <= 90
          else { throw FixtureError.invalidBundle }
          if ["reports-demo", "digital-demo", "space-demo", "aviation-demo", "maritime-demo"]
            .contains(source.id)
          {
            guard coordinates.allSatisfy({ $0.truncatingRemainder(dividingBy: 5) == 0 }) else {
              throw FixtureError.invalidBundle
            }
          }
        }
        if source.id == "digital-demo" {
          guard let start = record.intervalStart.flatMap(Clock.parse),
            let end = record.intervalEnd.flatMap(Clock.parse), start < end,
            record.time == record.intervalEnd,
            ["outage", "interference"].contains(record.family),
            ["anomaly", "no-anomaly", "no-samples", "inconclusive"].contains(record.result)
          else { throw FixtureError.invalidBundle }
        } else if record.intervalStart != nil || record.family != nil || record.result != nil {
          throw FixtureError.invalidBundle
        }
        if let end = record.intervalEnd {
          guard Clock.parse(end) != nil else { throw FixtureError.invalidBundle }
        }
        if source.id == "reports-demo" {
          guard ["en", "fr", "es", "ar"].contains(record.language) else {
            throw FixtureError.invalidBundle
          }
        } else if record.language != nil || record.corrected || record.original != nil {
          throw FixtureError.invalidBundle
        }
        for section in record.details {
          guard valid(section.title, max: 150), section.rows.count <= 30,
            section.rows.allSatisfy({ valid($0.label, max: 150) && valid($0.value, max: 5000) })
          else { throw FixtureError.invalidBundle }
        }
      }
    }
    var relationshipIDs = Set<String>()
    let digitalIDs = Set(value.sources.first { $0.id == "digital-demo" }!.records.map(\.id))
    for link in value.relationships {
      guard relationshipIDs.insert(link.id).inserted, digitalIDs.contains(link.from),
        digitalIDs.contains(link.to), link.from != link.to,
        link.kind == "teaching-comparison", link.author == "GOSIP fixture authors",
        valid(link.evidence, max: 600)
      else { throw FixtureError.invalidBundle }
    }
    return value
  }
  static func valid(_ string: String, max: Int, empty: Bool = false) -> Bool {
    (empty || !string.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
      && string.utf16.count <= max
      && !string.unicodeScalars.contains { scalar in
        scalar.value < 32 || scalar.value == 127 || (0x202a...0x202e).contains(scalar.value)
          || (0x2066...0x2069).contains(scalar.value)
      }
  }
}

public struct Filters: Sendable, Equatable {
  public static let categories = [
    "environment": "Environment", "physical": "Earth & activity", "digital": "Digital world",
    "science": "Science & space", "civic": "Global affairs",
  ]
  public var sourceID = "demo"
  public var hours = 24
  public var country = ""
  public var region = ""
  public var query = ""
  public static let categoryKeys = ["environment", "physical", "digital", "science", "civic"]
  public var selectedCategories = Set(categoryKeys)
  public var language = ""
  public var correctedOnly = false
  public var family = ""
  public var result = ""
  public var at = Clock.snapshot
  public var map = true
  public init() {}
  public mutating func selectSource(_ id: String) {
    guard Snapshot.sourceIDs.contains(id) else { return }
    let window = hours
    let view = map
    self = Filters()
    sourceID = id
    hours = window
    map = view
  }
  public mutating func setHour(_ offset: Double) {
    guard offset.isFinite else { return }
    at = Clock.start.addingTimeInterval(min(168, max(0, offset.rounded())) * 3600)
  }
  public static func cleanQuery(_ value: String) -> String {
    let clean = String(
      value.unicodeScalars.filter { scalar in
        scalar.value >= 32 && !(127...159).contains(scalar.value)
          && !(0x202a...0x202e).contains(scalar.value)
          && !(0x2066...0x2069).contains(scalar.value)
      })
    var bounded = ""
    for character in clean {
      guard bounded.utf16.count + String(character).utf16.count <= 200 else { break }
      bounded.append(character)
    }
    return bounded
  }
  public func records(in snapshot: Snapshot) -> [Record] {
    guard [6, 24, 72, 168].contains(hours), at >= Clock.start, at <= Clock.snapshot,
      let source = snapshot.sources.first(where: { $0.id == sourceID })
    else { return [] }
    let cutoff = at.addingTimeInterval(-Double(hours) * 3600)
    let q = Self.cleanQuery(query).trimmingCharacters(in: .whitespaces).lowercased()
    return source.records.filter { record in
      let inWindow: Bool
      if let start = record.intervalStart.flatMap(Clock.parse) {
        inWindow = record.date > cutoff && start < at
      } else {
        inWindow = record.date >= cutoff && record.date <= at
      }
      return inWindow
        && (country.isEmpty
          || (country == "~unknown" ? record.country.isEmpty : record.country == country))
        && (region.isEmpty || record.region == region)
        && selectedCategories.contains(record.category)
        && (language.isEmpty || record.language == language) && (!correctedOnly || record.corrected)
        && (family.isEmpty || record.family == family)
        && (result.isEmpty || record.result == result)
        && (q.isEmpty || record.searchText.lowercased().contains(q))
    }.sorted { $0.date > $1.date }
  }
  public mutating func showRelationship() {
    let source = sourceID
    selectSource(source)
    hours = 168
  }
}
