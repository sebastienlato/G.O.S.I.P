import Foundation
import Testing

@testable import GOSIPCore

struct ExplorerTests {
  @Test func allWebWindowsAndHourlyCursorsMatch() throws {
    struct Oracle: Decodable {
      struct Case: Decodable {
        let at: String
        let hours: Int
        let ids: [String]
      }
      let source: String
      let cases: [Case]
    }
    let snapshot = try Snapshot.load()
    let oracle = try JSONDecoder().decode(
      [Oracle].self, from: Snapshot.resource("parity", extension: "json"))
    var checked = 0
    for source in oracle {
      for example in source.cases {
        var filters = Filters()
        filters.selectSource(source.source)
        filters.at = Clock.parse(example.at)!
        filters.hours = example.hours
        #expect(filters.records(in: snapshot).map(\.id) == example.ids)
        checked += 1
      }
    }
    #expect(checked == 4732)
  }
  @Test func canonicalCountsAndSeparateSources() throws {
    let snapshot = try Snapshot.load()
    #expect(snapshot.sources.map { $0.records.count } == [18, 4, 6, 6, 4, 4, 4])
    let dayCounts = [12, 2, 4, 3, 2, 2, 2]
    for (index, source) in snapshot.sources.enumerated() {
      var filter = Filters()
      filter.selectSource(source.id)
      #expect(filter.records(in: snapshot).count == dayCounts[index])
      filter.hours = 168
      #expect(filter.records(in: snapshot).count == source.records.count)
    }
  }
  @Test func unknownCountryIsIndependentOfPosition() throws {
    let snapshot = try Snapshot.load()
    var filters = Filters()
    filters.selectSource("reports-demo")
    filters.hours = 168
    filters.country = "~unknown"
    let matches = filters.records(in: snapshot)
    #expect(matches.contains { $0.coordinates != nil })
    #expect(matches.contains { $0.coordinates == nil })
    #expect(matches.allSatisfy { $0.country.isEmpty })
  }
  @Test func searchTranslationLanguageAndCorrection() throws {
    let snapshot = try Snapshot.load()
    var filters = Filters()
    filters.selectSource("reports-demo")
    filters.hours = 168
    filters.query = "regional dialogue on water"
    #expect(filters.records(in: snapshot).map(\.id) == ["report-demo-water"])
    filters.query = ""
    filters.language = "ar"
    #expect(filters.records(in: snapshot).count == 1)
    filters.language = ""
    filters.correctedOnly = true
    let corrected = filters.records(in: snapshot)
    #expect(corrected.map(\.id) == ["report-demo-forum"])
    #expect(corrected.first!.original!.contains("fictional"))
    #expect(corrected.first!.details.contains { $0.title.contains("prior version") })
  }
  @Test func digitalBoundariesAndMissingValues() throws {
    let snapshot = try Snapshot.load()
    var filters = Filters()
    filters.selectSource("digital-demo")
    filters.hours = 168
    filters.result = "no-samples"
    let gap = try #require(filters.records(in: snapshot).first)
    #expect(gap.coordinates == nil)
    filters.result = ""
    filters.at = Clock.parse("2026-10-08T12:00:00.000Z")!
    #expect(!filters.records(in: snapshot).contains { $0.id == "digital-demo-drop" })
    filters.at = Clock.parse("2026-10-08T13:00:00.000Z")!
    #expect(filters.records(in: snapshot).contains { $0.id == "digital-demo-drop" })
    filters.hours = 6
    filters.at = Clock.parse("2026-10-08T02:00:00.000Z")!
    #expect(!filters.records(in: snapshot).contains { $0.id == gap.id })
  }
  @Test func sourceChangeAndRelatedNavigationResetFilters() {
    var filters = Filters()
    filters.hours = 72
    filters.map = false
    filters.country = "Canada"
    filters.query = "test"
    filters.at = Clock.start
    filters.correctedOnly = true
    filters.selectSource("digital-demo")
    #expect(filters.hours == 72 && !filters.map && filters.at == Clock.snapshot)
    #expect(filters.country.isEmpty && filters.query.isEmpty && !filters.correctedOnly)
    filters.result = "anomaly"
    filters.showRelationship()
    #expect(filters.hours == 168 && filters.result.isEmpty && filters.sourceID == "digital-demo")
    filters.setHour(-10)
    #expect(filters.at == Clock.start)
    filters.setHour(999)
    #expect(filters.at == Clock.snapshot)
    filters.setHour(.nan)
    #expect(filters.at == Clock.snapshot)
  }
  @Test func rejectInvalidBundleAndUnsafeInput() throws {
    let data = try Snapshot.resource("fixtures", extension: "json")
    let original = try #require(JSONSerialization.jsonObject(with: data) as? [String: Any])
    for mutation in ["version", "coordinates", "time", "id", "label"] {
      var json = original
      var sources = json["sources"] as! [[String: Any]]
      var records = sources[0]["records"] as! [[String: Any]]
      switch mutation {
      case "version": json["version"] = 9
      case "coordinates": records[0]["coordinates"] = [0, 91]
      case "time": records[0]["time"] = "2026-02-30T00:00:00.000Z"
      case "id": records[0]["id"] = records[1]["id"]
      default: records[0]["title"] = "Unsafe\u{202e}text"
      }
      sources[0]["records"] = records
      json["sources"] = sources
      let changed = try JSONSerialization.data(withJSONObject: json)
      #expect(throws: (any Error).self) { try Snapshot.decode(changed) }
    }
    #expect(throws: (any Error).self) { try Snapshot.decode(Data(repeating: 32, count: 1_000_001)) }
    #expect(Filters.cleanQuery("bonjour\u{202e}\nمرحبا") == "bonjourمرحبا")
    #expect(Filters.cleanQuery(String(repeating: "x", count: 400)).count == 200)
  }
  @Test func relationshipsAndLocalMapAreIntact() throws {
    let snapshot = try Snapshot.load()
    #expect(snapshot.relationships.count == 2)
    let rings = try JSONDecoder().decode(
      [[[Double]]].self, from: Snapshot.resource("world", extension: "json"))
    #expect(!rings.isEmpty)
    #expect(
      rings.allSatisfy {
        $0.allSatisfy {
          $0.count == 2 && $0[0].isFinite && abs($0[0]) <= 180.001 && abs($0[1]) <= 90.001
        }
      })
    let notices = String(data: try Snapshot.resource("notices", extension: "txt"), encoding: .utf8)!
    #expect(notices.contains("Apache License") && notices.contains("Natural Earth"))
  }
}
