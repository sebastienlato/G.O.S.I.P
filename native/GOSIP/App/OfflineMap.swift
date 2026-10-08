import SwiftUI

struct OfflineMap: View {
  let records: [Record]
  let select: (Record) -> Void
  private static let rings: [[[Double]]] =
    (try? JSONDecoder().decode(
      [[[Double]]].self, from: Snapshot.resource("world", extension: "json"))) ?? []
  var body: some View {
    GeometryReader { geometry in
      Canvas { context, size in
        context.fill(
          Path(CGRect(origin: .zero, size: size)),
          with: .color(Color(red: 0.06, green: 0.13, blue: 0.16)))
        var land = Path()
        for ring in Self.rings {
          guard let first = ring.first, first.count == 2 else { continue }
          land.move(to: point(first, size))
          for coordinate in ring.dropFirst() where coordinate.count == 2 {
            land.addLine(to: point(coordinate, size))
          }
          land.closeSubpath()
        }
        context.fill(
          land, with: .color(Color(red: 0.19, green: 0.32, blue: 0.34)),
          style: FillStyle(eoFill: true))
        context.stroke(land, with: .color(.white.opacity(0.22)), lineWidth: 0.5)
        for record in records {
          guard let coordinate = record.coordinates else { continue }
          let p = point(coordinate, size)
          let circle = Path(ellipseIn: CGRect(x: p.x - 5, y: p.y - 5, width: 10, height: 10))
          context.fill(circle, with: .color(.orange))
          context.stroke(circle, with: .color(.white), lineWidth: 1.5)
        }
      }
      .contentShape(Rectangle())
      .onTapGesture { position in
        let candidates = records.compactMap { record -> (Record, Double)? in
          guard let coordinate = record.coordinates else { return nil }
          let p = point(coordinate, geometry.size)
          return (record, hypot(position.x - p.x, position.y - p.y))
        }.sorted { $0.1 < $1.1 }
        if let closest = candidates.first, closest.1 <= 22 { select(closest.0) }
      }
    }.aspectRatio(2, contentMode: .fit)
      .accessibilityElement(children: .ignore)
      .accessibilityLabel("Illustrative world map. All examples are available in the list below.")
      .accessibilityIdentifier("offlineMap")
  }
  private func point(_ coordinate: [Double], _ size: CGSize) -> CGPoint {
    CGPoint(
      x: (coordinate[0] + 180) / 360 * size.width, y: (90 - coordinate[1]) / 180 * size.height)
  }
}
