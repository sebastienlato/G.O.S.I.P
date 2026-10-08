import SwiftUI

@main
struct GOSIPApp: App {
  private let snapshot = Result { try Snapshot.load() }
  var body: some Scene {
    WindowGroup {
      switch snapshot {
      case .success(let data): ExplorerView(snapshot: data)
      case .failure:
        ContentUnavailableView(
          "Examples unavailable", systemImage: "exclamationmark.triangle",
          description: Text(
            "The bundled fixture data could not be validated. Rebuild the native resources. No online fallback is used."
          ))
      }
    }
  }
}

struct ExplorerView: View {
  let snapshot: Snapshot
  @Environment(\.scenePhase) private var scenePhase
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var filters = Filters()
  @State private var selected: Record?
  @State private var showFilters = false
  @State private var showAbout = false
  @State private var showHistory = false
  @State private var playing = false
  private var source: Source { snapshot.sources.first { $0.id == filters.sourceID }! }
  private var records: [Record] { filters.records(in: snapshot) }
  private var mapped: [Record] { records.filter { $0.coordinates != nil } }

  var body: some View {
    NavigationStack {
      List {
        Section {
          VStack(alignment: .leading, spacing: 8) {
            Label("SIMULATED · OFFLINE", systemImage: "circle.dotted.circle")
              .font(.caption.weight(.bold)).foregroundStyle(.primary)
            Text("Explore a world of examples").font(.title2.weight(.semibold))
            Text("Invented data. No live monitoring.").font(.subheadline).foregroundStyle(
              .secondary)
          }.padding(.vertical, 4)
          Picker("Source", selection: sourceBinding) {
            ForEach(snapshot.sources) { Text($0.title).tag($0.id) }
          }.accessibilityIdentifier("sourcePicker")
          Picker("Window", selection: paused(\Filters.hours)) {
            Text("6h").tag(6)
            Text("24h").tag(24)
            Text("3d").tag(72)
            Text("7d").tag(168)
          }.pickerStyle(.segmented).accessibilityIdentifier("windowPicker")
          Picker("View", selection: $filters.map) {
            Text("Map + list").tag(true)
            Text("List").tag(false)
          }.pickerStyle(.segmented).accessibilityIdentifier("viewPicker")
        }
        Section {
          Text(Clock.display(filters.at)).font(.subheadline.monospacedDigit())
            .accessibilityIdentifier("cursorTime")
          DisclosureGroup("Explore simulation time", isExpanded: $showHistory) {
            Text(
              "Latest corrections and full totals, not what was known then. Plans can extend beyond the cursor."
            ).font(.caption).foregroundStyle(.secondary)
            Slider(
              value: Binding(
                get: { filters.at.timeIntervalSince(Clock.start) / 3600 },
                set: {
                  playing = false
                  filters.setHour($0)
                }), in: 0...168, step: 1
            )
            .accessibilityLabel("Simulation hour").accessibilityValue(Clock.display(filters.at))
            HStack {
              Button {
                step(-6)
              } label: {
                Label("Back 6h", systemImage: "backward.end")
              }.disabled(filters.at == Clock.start)
              Spacer()
              Button {
                playing.toggle()
              } label: {
                Label(playing ? "Pause" : "Play", systemImage: playing ? "pause.fill" : "play.fill")
              }
              .disabled(reduceMotion || filters.at == Clock.snapshot).accessibilityIdentifier(
                "playHistory")
              Spacer()
              Button {
                step(6)
              } label: {
                Label("Next 6h", systemImage: "forward.end")
              }.disabled(filters.at == Clock.snapshot)
            }.buttonStyle(.borderless).font(.caption)
            Button("Return to snapshot") {
              playing = false
              filters.at = Clock.snapshot
            }
            if reduceMotion {
              Text("Reduce Motion is on. Use manual time controls.").font(.caption)
            }
          }
        } header: {
          Text("Fixed fixture clock · UTC")
        }
        if filters.map {
          Section {
            OfflineMap(records: mapped) {
              selected = $0
              playing = false
            }
            .listRowInsets(EdgeInsets())
            Text(
              "\(mapped.count) broad markers · \(records.count - mapped.count) feed-only. Tap a marker or open any example below."
            ).font(.caption).foregroundStyle(.secondary)
            Text("Natural Earth · illustrative historical borders. Local map; no tile service.")
              .font(.caption2).foregroundStyle(.secondary)
          }
        }
        Section {
          if records.isEmpty {
            ContentUnavailableView(
              "No matching examples", systemImage: "line.3.horizontal.decrease.circle",
              description: Text("An empty view is not evidence that nothing happened."))
            Button("Reset filters") {
              playing = false
              filters.selectSource(filters.sourceID)
              filters.hours = 24
            }
          }
          ForEach(records) { record in
            Button {
              selected = record
              playing = false
            } label: {
              VStack(alignment: .leading, spacing: 7) {
                HStack {
                  Text(record.badge).font(.caption2.weight(.bold)).foregroundStyle(.primary)
                  Spacer()
                  Image(systemName: "chevron.right").font(.caption).foregroundStyle(.tertiary)
                }
                Text(record.title).font(.headline).foregroundStyle(.primary)
                  .environment(
                    \.layoutDirection, record.language == "ar" ? .rightToLeft : .leftToRight)
                Text(
                  record.region
                    + (record.country.isEmpty ? " · Country not supplied" : " · \(record.country)")
                )
                .font(.caption).foregroundStyle(.secondary)
                Text("\(record.timeBasis) · \(Clock.display(record.date))").font(.caption2)
                  .foregroundStyle(.secondary)
                if record.coordinates == nil {
                  Label("Feed-only · position unknown or withheld", systemImage: "list.bullet")
                    .font(.caption).foregroundStyle(.secondary)
                }
              }.padding(.vertical, 5).frame(maxWidth: .infinity, alignment: .leading).contentShape(
                Rectangle())
            }.buttonStyle(.plain).accessibilityIdentifier("event-\(record.id)")
          }
        } header: {
          Text("\(records.count) simulated examples").accessibilityIdentifier("resultCount")
        } footer: {
          Text(source.note + " No marker does not mean no activity.")
        }
      }
      .navigationTitle("G.O.S.I.P.")
      .searchable(
        text: Binding(
          get: { filters.query },
          set: {
            filters.query = Filters.cleanQuery($0)
            playing = false
          }), prompt: "Search examples"
      )
      .toolbar {
        ToolbarItem(placement: .topBarLeading) {
          Button {
            playing = false
            showAbout = true
          } label: {
            Label("About & licenses", systemImage: "info.circle")
          }.accessibilityIdentifier("about")
        }
        ToolbarItem(placement: .topBarTrailing) {
          Button {
            playing = false
            showFilters = true
          } label: {
            Label("Filters", systemImage: "line.3.horizontal.decrease")
          }.accessibilityIdentifier("filters")
        }
      }
      .sheet(isPresented: $showFilters) { FilterSheet(source: source, filters: $filters) }
      .sheet(isPresented: $showAbout) { AboutView() }
      .sheet(item: $selected) { record in
        DetailView(
          record: record, cursor: filters.at,
          relationships: snapshot.relationships.filter {
            $0.from == record.id || $0.to == record.id
          }
        ) { target in
          filters.showRelationship()
          selected = source.records.first { $0.id == target }
        }
      }
      .onChange(of: scenePhase) { _, value in if value != .active { playing = false } }
      .onChange(of: reduceMotion) { _, _ in playing = false }
      .onChange(of: showHistory) { _, open in if !open { playing = false } }
      .task(id: playing) {
        guard playing else { return }
        while !Task.isCancelled && playing {
          do { try await Task.sleep(for: .milliseconds(1200)) } catch { return }
          guard playing, scenePhase == .active, !reduceMotion, selected == nil, !showFilters,
            !showAbout
          else {
            playing = false
            return
          }
          filters.setHour(filters.at.timeIntervalSince(Clock.start) / 3600 + 6)
          if filters.at == Clock.snapshot { playing = false }
        }
      }
    }.tint(.teal)
  }
  private var sourceBinding: Binding<String> {
    Binding(
      get: { filters.sourceID },
      set: {
        playing = false
        selected = nil
        filters.selectSource($0)
      })
  }
  private func paused<T>(_ key: WritableKeyPath<Filters, T>) -> Binding<T> {
    Binding(
      get: { filters[keyPath: key] },
      set: {
        playing = false
        filters[keyPath: key] = $0
      })
  }
  private func step(_ hours: Double) {
    playing = false
    filters.setHour(filters.at.timeIntervalSince(Clock.start) / 3600 + hours)
  }
}

struct FilterSheet: View {
  let source: Source
  @Binding var filters: Filters
  @Environment(\.dismiss) private var dismiss
  var body: some View {
    NavigationStack {
      Form {
        Section("Exact supplied place") {
          Picker("Country", selection: $filters.country) {
            Text("All countries").tag("")
            ForEach(
              Array(Set(source.records.map(\.country).filter { !$0.isEmpty })).sorted(), id: \.self
            ) { Text($0).tag($0) }
            if source.records.contains(where: { $0.country.isEmpty }) {
              Text("Not supplied / withheld").tag("~unknown")
            }
          }.accessibilityIdentifier("countryPicker")
          Picker("Region", selection: $filters.region) {
            Text("All regions").tag("")
            ForEach(Array(Set(source.records.map(\.region))).sorted(), id: \.self) {
              Text($0).tag($0)
            }
          }
          Text("Country is independent of mapping. No geocoding or nationality inference.").font(
            .caption)
        }
        Section("Content") {
          Picker("Category", selection: $filters.category) {
            Text("All categories").tag("")
            ForEach(Array(Set(source.records.map(\.category))).sorted(), id: \.self) {
              Text(Filters.categories[$0]!).tag($0)
            }
          }
          if source.id == "reports-demo" {
            Picker("Language", selection: $filters.language) {
              Text("All languages").tag("")
              Text("English").tag("en")
              Text("Français").tag("fr")
              Text("Español").tag("es")
              Text("العربية").tag("ar")
            }
            Toggle("Supplied correction only", isOn: $filters.correctedOnly)
          }
          if source.id == "digital-demo" {
            Picker("Measurement", selection: $filters.family) {
              Text("All measurements").tag("")
              Text("Outage signals").tag("outage")
              Text("Censorship measurements").tag("interference")
            }
            Picker("Result", selection: $filters.result) {
              Text("All results").tag("")
              Text("Measurement anomaly").tag("anomaly")
              Text("No anomaly in sample").tag("no-anomaly")
              Text("No samples").tag("no-samples")
              Text("Inconclusive").tag("inconclusive")
            }
          }
        }
        Button("Clear place and content filters") {
          let at = filters.at
          filters.selectSource(filters.sourceID)
          filters.at = at
        }
      }.navigationTitle("Filters")
        .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
    }
  }
}

struct DetailView: View {
  let record: Record
  let cursor: Date
  let relationships: [Relationship]
  let navigate: (String) -> Void
  @Environment(\.dismiss) private var dismiss
  var body: some View {
    NavigationStack {
      List {
        Section {
          Text(record.badge).font(.caption.weight(.bold)).foregroundStyle(.primary)
          Text(record.title).font(.title2.bold()).accessibilityIdentifier("detailTitle")
            .environment(\.layoutDirection, record.language == "ar" ? .rightToLeft : .leftToRight)
          Text(record.summary)
            .environment(\.layoutDirection, record.language == "ar" ? .rightToLeft : .leftToRight)
          if cursor != Clock.snapshot {
            Text("Latest fixture version at an earlier cursor. Not what was known then.").font(
              .caption
            ).foregroundStyle(.secondary)
          }
          if let end = record.intervalEnd.flatMap(Clock.parse), end > cursor {
            Text(
              "Interval extends beyond cursor. Full totals or plans shown, not partial observations."
            ).font(.caption).foregroundStyle(.secondary)
          }
        }
        ForEach(Array(record.details.enumerated()), id: \.offset) { _, section in
          Section(section.title) {
            ForEach(Array(section.rows.enumerated()), id: \.offset) { _, row in
              VStack(alignment: .leading, spacing: 5) {
                Text(row.label).font(.caption).foregroundStyle(.secondary)
                Text(row.value).textSelection(.enabled)
              }.accessibilityElement(children: .combine)
            }
          }
        }
        if let original = record.original {
          Section("Bundled original · fictional publisher") {
            DisclosureGroup("Read original fixture") {
              Text(original).font(.body.monospaced()).textSelection(.enabled)
            }
          }
        }
        Section("Evidence & relationships") {
          if relationships.isEmpty {
            Text(
              record.corrected
                ? "The supplied correction above is one version relationship, not a second independent report."
                : "No supplied relationship evidence. Absence is not proof of no relationship.")
          }
          ForEach(relationships) { link in
            Text(link.evidence)
            Text(link.author).font(.caption).foregroundStyle(.secondary)
            Button("Open related example · full 7-day snapshot") {
              navigate(link.from == record.id ? link.to : link.from)
            }.accessibilityIdentifier("related-\(link.id)")
          }
          if !relationships.isEmpty {
            Text(
              "Related navigation clears search, place and content filters and returns to the full seven-day snapshot. No cause, recovery or corroboration is inferred."
            ).font(.caption)
          }
        }
        Section("Canonical fixture ID") { Text(record.id).font(.caption.monospaced()) }
      }.navigationTitle("Example details").navigationBarTitleDisplayMode(.inline)
        .toolbar {
          ToolbarItem(placement: .confirmationAction) {
            Button("Done") { dismiss() }.accessibilityIdentifier("closeDetails")
          }
        }
    }
  }
}

struct AboutView: View {
  @Environment(\.dismiss) private var dismiss
  var body: some View {
    NavigationStack {
      List {
        Section("Simulation explorer") {
          Text(
            "46 original examples · seven separate sources. Fixed 8 October 2026 snapshot. No live feeds, global monitoring, emergency guidance or historical archive."
          )
          Text(
            "The installed app reads bundled resources only. No network client, map service, location permission, analytics, accounts, payments or saved searches. No automatic upgrade or paid fallback."
          )
          Text(
            "Free local simulator build. App Store or device distribution is not included. Web beta hosting has separate limits."
          )
        }
        Section("Map & accessibility") {
          Text(
            "Local Natural Earth geography, generalized historical borders. Markers are broad illustrative context. Use the accessible list for every record, including unknown and withheld positions. The map does not pan or zoom."
          )
        }
        Section("Licenses & notices") {
          Text(
            (try? Snapshot.resource("notices", extension: "txt")).flatMap {
              String(data: $0, encoding: .utf8)
            } ?? "Notices unavailable"
          )
          .font(.caption).textSelection(.enabled)
        }
      }.navigationTitle("About GOSIP")
        .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
    }
  }
}
