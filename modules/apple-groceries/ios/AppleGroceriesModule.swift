import ExpoModulesCore
import MapKit
import CoreLocation

public class AppleGroceriesModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AppleGroceries")

    AsyncFunction("searchNearby") { (latitude: Double, longitude: Double, radiusMeters: Double) -> [[String: Any]] in
      let center = CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
      let radius = min(max(radiusMeters, 200), 10_000)
      let grocery = try await self.searchQuery("grocery", center: center, radius: radius)
      let supermarket = try await self.searchQuery("supermarket", center: center, radius: radius)
      let merged = Self.merge(grocery, supermarket)
      if !merged.isEmpty {
        return merged
      }
      return try await self.searchPointsOfInterest(center: center, radius: radius)
    }
  }

  private func searchPointsOfInterest(
    center: CLLocationCoordinate2D,
    radius: CLLocationDistance
  ) async throws -> [[String: Any]] {
    let request = MKLocalPointsOfInterestRequest(center: center, radius: radius)
    request.pointOfInterestFilter = Self.groceryFilter
    return try await run(request)
  }

  private func searchQuery(
    _ query: String,
    center: CLLocationCoordinate2D,
    radius: CLLocationDistance
  ) async throws -> [[String: Any]] {
    let request = MKLocalSearch.Request()
    request.naturalLanguageQuery = query
    request.resultTypes = .pointOfInterest
    request.region = MKCoordinateRegion(
      center: center,
      latitudinalMeters: radius * 2,
      longitudinalMeters: radius * 2
    )
    request.pointOfInterestFilter = Self.groceryFilter
    return try await run(request)
  }

  private func run(_ request: MKLocalSearch.Request) async throws -> [[String: Any]] {
    try await withCheckedThrowingContinuation { continuation in
      MKLocalSearch(request: request).start { response, error in
        if let error {
          continuation.resume(throwing: error)
          return
        }
        continuation.resume(returning: Self.serialize(response?.mapItems ?? []))
      }
    }
  }

  private func run(_ request: MKLocalPointsOfInterestRequest) async throws -> [[String: Any]] {
    try await withCheckedThrowingContinuation { continuation in
      MKLocalSearch(request: request).start { response, error in
        if let error {
          continuation.resume(throwing: error)
          return
        }
        continuation.resume(returning: Self.serialize(response?.mapItems ?? []))
      }
    }
  }

  private static var groceryFilter: MKPointOfInterestFilter {
    if #available(iOS 18.0, *) {
      return MKPointOfInterestFilter(including: [.foodMarket])
    }
    return MKPointOfInterestFilter.includingAll
  }

  private static func isGrocery(_ item: MKMapItem) -> Bool {
    if #available(iOS 18.0, *) {
      if let category = item.pointOfInterestCategory {
        return category == .foodMarket
      }
    }
    return true
  }

  private static func merge(_ left: [[String: Any]], _ right: [[String: Any]]) -> [[String: Any]] {
    var seen = Set<String>()
    var rows: [[String: Any]] = []
    for row in left + right {
      guard let id = row["id"] as? String, !seen.contains(id) else { continue }
      seen.insert(id)
      rows.append(row)
    }
    return rows
  }

  private static func serialize(_ items: [MKMapItem]) -> [[String: Any]] {
    var seen = Set<String>()
    var rows: [[String: Any]] = []
    for item in items {
      guard isGrocery(item) else { continue }
      let coordinate = item.placemark.coordinate
      guard CLLocationCoordinate2DIsValid(coordinate) else { continue }
      let id = String(format: "s%.5f_%.5f", coordinate.latitude, coordinate.longitude)
      if seen.contains(id) { continue }
      seen.insert(id)
      rows.append([
        "id": id,
        "name": item.name ?? "Grocery",
        "latitude": coordinate.latitude,
        "longitude": coordinate.longitude,
      ])
    }
    return rows
  }
}
