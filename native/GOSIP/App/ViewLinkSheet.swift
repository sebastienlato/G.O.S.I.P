import SwiftUI

struct ViewLinkSheet: View {
  let current: Filters
  let snapshot: Snapshot
  let restore: (Filters) -> Void
  @Environment(\.dismiss) private var dismiss
  @State private var importing = false
  @State private var input = ""
  @State private var reviewed: Filters?
  @State private var error: String?
  @State private var copied = false
  @FocusState private var editing: Bool
  @AccessibilityFocusState private var reviewFocused: Bool
  @AccessibilityFocusState private var errorFocused: Bool

  var body: some View {
    NavigationStack {
      Form {
        Section {
          Picker("Link action", selection: $importing) {
            Text("Share current").tag(false)
            Text("Import link").tag(true)
          }.pickerStyle(.segmented).accessibilityIdentifier("linkAction")
          Text(ViewLink.privacy).font(.caption)
          Text(
            "Simulation filters only. Latest fixtures, not an archive. No selected example, camera or raw records. Playback stays paused."
          )
          .font(.caption).foregroundStyle(.secondary)
        }
        if importing {
          Section("Paste a web view link") {
            TextField("https://sebastienlato.github.io/G.O.S.I.P/…", text: $input, axis: .vertical)
              .lineLimit(3...6).keyboardType(.URL).textInputAutocapitalization(.never)
              .autocorrectionDisabled().focused($editing)
              .accessibilityLabel("View link to import").accessibilityIdentifier("importLinkInput")
            Button("Review link") {
              editing = false
              do {
                reviewed = try ViewLink.parse(input)
                error = nil
                reviewFocused = true
              } catch {
                reviewed = nil
                self.error = error.localizedDescription
                errorFocused = true
              }
            }.disabled(input.isEmpty).accessibilityIdentifier("reviewLink")
            Text(
              "Read locally without opening or fetching the URL. Only the public GOSIP address is accepted. Web map preferences and unrelated parameters are omitted; content filters apply only to their source."
            )
            .font(.caption).foregroundStyle(.secondary)
          }
          if let error {
            Section {
              Label(error, systemImage: "exclamationmark.triangle")
                .accessibilityIdentifier("importLinkError").accessibilityFocused($errorFocused)
            }
          }
          if let reviewed {
            Section {
              Text("Review simulation view").font(.headline)
                .accessibilityAddTraits(.isHeader).accessibilityFocused($reviewFocused)
              ViewLinkSummary(filters: reviewed, snapshot: snapshot)
              Button("Restore this view · paused") {
                restore(reviewed)
                dismiss()
              }.accessibilityIdentifier("restoreLink")
            }
          }
        } else {
          Section("Current simulation view") {
            ViewLinkSummary(filters: current, snapshot: snapshot)
          }
          Section("Share filters") {
            switch Result(catching: { try ViewLink.serialize(current) }) {
            case .success(let link):
              Button(copied ? "Copied view link" : "Copy view link") {
                UIPasteboard.general.string = link
                copied = true
              }.accessibilityIdentifier("copyViewLink")
              ShareLink("Share view link…", item: link)
              Text(link).font(.caption.monospaced()).textSelection(.enabled)
                .accessibilityLabel("Current view URL").accessibilityValue(link)
                .accessibilityIdentifier("currentViewURL")
            case .failure(let error):
              Text(error.localizedDescription)
            }
          }
        }
      }
      .navigationTitle("View links").navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .confirmationAction) {
          Button("Done") { dismiss() }.accessibilityIdentifier("closeViewLinks")
        }
      }
      .onChange(of: input) { _, value in
        // Bound UI memory as well as the parser; never restore a truncated URL.
        if value.utf16.count > 8192 {
          input = ""
          error = "Link exceeds 8,192 characters. Paste a shorter view link."
          errorFocused = true
        } else if !value.isEmpty {
          error = nil
        }
        reviewed = nil
      }
    }
  }
}

private struct ViewLinkSummary: View {
  let filters: Filters
  let snapshot: Snapshot
  var body: some View {
    let source = snapshot.sources.first { $0.id == filters.sourceID }!
    VStack(alignment: .leading, spacing: 8) {
      Text("\(source.title) · SIMULATED").font(.headline)
      Text("Source ID: \(filters.sourceID)").font(.caption.monospaced())
      Text("\(filters.hours)h window · \(filters.map ? "Map + list" : "List")")
      Text(Clock.display(filters.at)).monospacedDigit()
      Text("Search: \(filters.query.isEmpty ? "None" : filters.query)")
      Text(
        "Country: \(filters.country == "~unknown" ? "Not supplied / withheld" : filters.country.isEmpty ? "All" : filters.country)"
      )
      Text("Region: \(filters.region.isEmpty ? "All" : filters.region)")
      Text(
        "Categories: \(filters.selectedCategories.isEmpty ? "None" : Filters.categoryKeys.filter(filters.selectedCategories.contains).map { Filters.categories[$0]! }.joined(separator: ", "))"
      )
      if filters.sourceID == "reports-demo" {
        Text(
          "Language: \(filters.language.isEmpty ? "All" : filters.language) · \(filters.correctedOnly ? "Supplied correction only" : "All reports")"
        )
      }
      if filters.sourceID == "digital-demo" {
        Text(
          "Measurement: \(filters.family.isEmpty ? "All" : filters.family) · Result: \(filters.result.isEmpty ? "All" : filters.result)"
        )
      }
      Text(
        "\(filters.records(in: snapshot).count) matching simulated examples. Empty results do not establish absence of activity."
      )
      .foregroundStyle(.secondary)
    }.font(.subheadline).accessibilityElement(children: .contain)
  }
}
