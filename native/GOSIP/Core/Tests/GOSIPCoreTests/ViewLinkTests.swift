import Foundation
import Testing

@testable import GOSIPCore

struct ViewLinkTests {
  @Test func webParserSerializerAndFilterParity() throws {
    struct Example: Decodable {
      let search: String
      let canonical: String
      let ids: [String]
    }
    let examples = try JSONDecoder().decode(
      [Example].self, from: Snapshot.resource("links", extension: "json"))
    let snapshot = try Snapshot.load()
    #expect(examples.count == 133)
    for example in examples {
      let filters = try ViewLink.parse(ViewLink.base + example.search)
      let link = try ViewLink.serialize(filters)
      #expect(link == ViewLink.base + example.canonical)
      #expect(try ViewLink.parse(link) == filters)
      #expect(filters.records(in: snapshot).map(\.id) == example.ids)
    }
  }

  @Test func unsafeAddressesAndSourcesFailClosed() throws {
    for link in [
      "", "not a URL", "//sebastienlato.github.io/G.O.S.I.P/",
      "http://sebastienlato.github.io/G.O.S.I.P/", "https://example.org/G.O.S.I.P/",
      "https://sebastienlato.github.io.evil.test/G.O.S.I.P/",
      "https://user@sebastienlato.github.io/G.O.S.I.P/", ViewLink.base + "#fragment",
      "https://sebastienlato.github.io:443/G.O.S.I.P/", "https://sebastienlato.github.io/",
      "https://sebastienlato.github.io/G.O.S.I.P/../G.O.S.I.P/",
      "https://sebastienlato.github.io/%47.O.S.I.P/", ViewLink.base + "reports/test.txt",
      "https://sebastienlato.github.io:999999999999999999999/G.O.S.I.P/",
      "https://%73ebastienlato.github.io/G.O.S.I.P/",
      "http://localhost:5173/", "file:///G.O.S.I.P/", "javascript:alert(1)",
      ViewLink.base + "?source=usgs", ViewLink.base + "?source=nws",
      ViewLink.base + "?source=Demo", ViewLink.base + "?source=", ViewLink.base + "?source=space",
      ViewLink.base + "?source=demo&source=reports-demo",
      ViewLink.base + "?q=%", ViewLink.base + "?q=%GG", ViewLink.base + "?q=%FF",
      ViewLink.base + "?q=raw space", ViewLink.base + "\n",
    ] {
      #expect(throws: ViewLinkError.self) { try ViewLink.parse(link) }
    }
    for source in Snapshot.sourceIDs {
      #expect(try ViewLink.parse(ViewLink.base + "?source=" + source).sourceID == source)
    }
  }

  @Test func boundedTextAndCanonicalHour() throws {
    for query in [
      "q=" + String(repeating: "x", count: 201),
      "q=" + String(repeating: "%F0%9F%8C%8D", count: 101),
      "country=" + String(repeating: "x", count: 301),
      "region=" + String(repeating: "x", count: 301),
      "unused=" + String(repeating: "x", count: 4090),
      "q=" + String(repeating: "x", count: 8193),
      "hours=25", "view=other", "layers=unknown", "layers=civic,",
      "at=2026-10-01T15:00:00.000Z", "at=2026-10-08T17:00:00.000Z",
      "at=2026-10-08T15:30:00.000Z", "at=2026-10-08T15:00:00.001Z",
      "at=2026-10-08T15:00:00Z", "at=2026-02-30T15:00:00.000Z",
      "at=2026-10-08T15:00:00.000%2B00:00",
      "source=reports-demo&lang=de", "source=digital-demo&result=confirmed",
    ] { #expect(throws: ViewLinkError.self) { try ViewLink.parse(ViewLink.base + "?" + query) } }
    for code in ["%00", "%0A", "%7F", "%C2%85", "%E2%80%AE", "%E2%81%A6"] {
      for key in ["q", "country", "region", "unrelated"] {
        #expect(throws: ViewLinkError.self) {
          try ViewLink.parse(ViewLink.base + "?" + key + "=" + code)
        }
      }
    }
    for hour in 0...168 {
      var filters = Filters()
      filters.setHour(Double(hour))
      #expect(try ViewLink.parse(ViewLink.serialize(filters)).at == filters.at)
    }
    var filters = Filters()
    filters.query = String(repeating: "🌍", count: 100)
    #expect(try ViewLink.parse(ViewLink.serialize(filters)).query == filters.query)
    #expect(Filters.cleanQuery(String(repeating: "🌍", count: 101)).utf16.count == 200)
    #expect(Filters.cleanQuery("a\u{85}b\u{2066}c") == "abc")
    filters.country = String(repeating: "x", count: 300)
    #expect(try ViewLink.parse(ViewLink.serialize(filters)).country == filters.country)
  }

  @Test func scopeResetUnknownCountryAndSafeExport() throws {
    let filters = try ViewLink.parse(
      ViewLink.base
        + "?source=reports-demo&country=~unknown&hours=168&digital=outage&result=anomaly&selected=report-demo-forum&camera=1"
    )
    #expect(filters.family.isEmpty && filters.result.isEmpty)
    let records = filters.records(in: try Snapshot.load())
    #expect(records.count == 3 && records.allSatisfy { $0.country.isEmpty })
    #expect(
      records.contains { $0.coordinates == nil } && records.contains { $0.coordinates != nil })
    let link = try ViewLink.serialize(filters)
    #expect(!link.contains("selected") && !link.contains("camera") && !link.contains("digital="))
    var digital = try ViewLink.parse(
      ViewLink.base + "?source=digital-demo&lang=ar&reports=corrected&layers=&hours=168&view=list")
    #expect(
      digital.language.isEmpty && !digital.correctedOnly && digital.selectedCategories.isEmpty)
    #expect(digital.records(in: try Snapshot.load()).isEmpty)
    digital.selectSource("reports-demo")
    #expect(
      digital.hours == 168 && !digital.map
        && digital.selectedCategories == Set(Filters.categoryKeys))
    #expect(digital.at == Clock.snapshot)
  }
}
