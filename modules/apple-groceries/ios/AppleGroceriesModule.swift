import ExpoModulesCore
import MapKit
import CoreLocation
import UIKit

public class AppleGroceriesModule: Module {
  private var itemsById: [String: MKMapItem] = [:]

  public func definition() -> ModuleDefinition {
    Name("AppleGroceries")

    AsyncFunction("searchNearby") { (latitude: Double, longitude: Double, radiusMeters: Double, typeIds: [String]) -> [[String: Any]] in
      let kinds = typeIds.compactMap(PlaceKind.init(rawValue:))
      if kinds.isEmpty {
        return []
      }
      let center = CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
      let radius = min(max(radiusMeters, 200), 10_000)
      var merged: [[String: Any]] = []
      for kind in kinds {
        let queryRows = try await self.searchQueries(kind.queries, kind: kind, center: center, radius: radius)
        if queryRows.isEmpty {
          merged.append(contentsOf: try await self.searchPointsOfInterest(kind: kind, center: center, radius: radius))
        } else {
          merged.append(contentsOf: queryRows)
        }
      }
      return Self.dedupe(merged)
    }

    AsyncFunction("presentPlaceCard") { (id: String, name: String, latitude: Double, longitude: Double, identifier: String) in
      let item = try await self.resolveMapItem(
        id: id,
        name: name,
        latitude: latitude,
        longitude: longitude,
        identifier: identifier
      )
      let rich = await self.enrich(item)
      await MainActor.run {
        self.presentDetail(rich)
      }
    }
  }

  private func searchQueries(
    _ queries: [String],
    kind: PlaceKind,
    center: CLLocationCoordinate2D,
    radius: CLLocationDistance
  ) async throws -> [[String: Any]] {
    var rows: [[String: Any]] = []
    for query in queries {
      rows.append(contentsOf: try await self.searchQuery(query, kind: kind, center: center, radius: radius))
    }
    return Self.dedupe(rows)
  }

  private func searchPointsOfInterest(
    kind: PlaceKind,
    center: CLLocationCoordinate2D,
    radius: CLLocationDistance
  ) async throws -> [[String: Any]] {
    let request = MKLocalPointsOfInterestRequest(center: center, radius: radius)
    request.pointOfInterestFilter = kind.poiFilter
    return try await run(request, kind: kind)
  }

  private func searchQuery(
    _ query: String,
    kind: PlaceKind,
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
    request.pointOfInterestFilter = kind.poiFilter
    return try await run(request, kind: kind)
  }

  private func run(_ request: MKLocalSearch.Request, kind: PlaceKind) async throws -> [[String: Any]] {
    try await withCheckedThrowingContinuation { continuation in
      MKLocalSearch(request: request).start { response, error in
        if let error {
          continuation.resume(throwing: error)
          return
        }
        continuation.resume(returning: self.serialize(response?.mapItems ?? [], kind: kind))
      }
    }
  }

  private func run(_ request: MKLocalPointsOfInterestRequest, kind: PlaceKind) async throws -> [[String: Any]] {
    try await withCheckedThrowingContinuation { continuation in
      MKLocalSearch(request: request).start { response, error in
        if let error {
          continuation.resume(throwing: error)
          return
        }
        continuation.resume(returning: self.serialize(response?.mapItems ?? [], kind: kind))
      }
    }
  }

  private func serialize(_ items: [MKMapItem], kind: PlaceKind) -> [[String: Any]] {
    var seen = Set<String>()
    var rows: [[String: Any]] = []
    for item in items {
      guard kind.matches(item) else { continue }
      let coordinate = item.placemark.coordinate
      guard CLLocationCoordinate2DIsValid(coordinate) else { continue }
      let id = String(format: "s%.5f_%.5f", coordinate.latitude, coordinate.longitude)
      if seen.contains(id) { continue }
      seen.insert(id)
      itemsById[id] = item
      var row: [String: Any] = [
        "id": id,
        "name": item.name ?? kind.fallbackName,
        "latitude": coordinate.latitude,
        "longitude": coordinate.longitude,
        "typeId": kind.rawValue,
      ]
      if let phone = item.phoneNumber, !phone.isEmpty {
        row["phone"] = phone
      }
      if let url = item.url?.absoluteString {
        row["url"] = url
      }
      if let address = Self.address(from: item), !address.isEmpty {
        row["address"] = address
      }
      if let category = item.pointOfInterestCategory?.rawValue {
        row["category"] = category
      }
      if #available(iOS 18.0, *) {
        if let identifier = item.identifier?.rawValue {
          row["identifier"] = identifier
        }
      }
      rows.append(row)
    }
    return rows
  }

  private func resolveMapItem(
    id: String,
    name: String,
    latitude: Double,
    longitude: Double,
    identifier: String
  ) async throws -> MKMapItem {
    if #available(iOS 18.0, *), !identifier.isEmpty {
      if let mapIdentifier = MKMapItem.Identifier(rawValue: identifier) {
        let request = MKMapItemRequest(mapItemIdentifier: mapIdentifier)
        if let item = try? await request.mapItem {
          return item
        }
      }
    }
    if let cached = itemsById[id] {
      return cached
    }
    let placemark = MKPlacemark(coordinate: CLLocationCoordinate2D(latitude: latitude, longitude: longitude))
    let item = MKMapItem(placemark: placemark)
    item.name = name
    return item
  }

  private func enrich(_ item: MKMapItem) async -> MKMapItem {
    if #available(iOS 18.0, *), let identifier = item.identifier {
      let request = MKMapItemRequest(mapItemIdentifier: identifier)
      if let fresh = try? await request.mapItem {
        return fresh
      }
    }
    guard let name = item.name, !name.isEmpty else { return item }
    let request = MKLocalSearch.Request()
    request.naturalLanguageQuery = name
    request.resultTypes = .pointOfInterest
    request.region = MKCoordinateRegion(
      center: item.placemark.coordinate,
      latitudinalMeters: 400,
      longitudinalMeters: 400
    )
    let response: MKLocalSearch.Response? = try? await withCheckedThrowingContinuation { continuation in
      MKLocalSearch(request: request).start { response, error in
        if let error {
          continuation.resume(throwing: error)
          return
        }
        continuation.resume(returning: response)
      }
    }
    guard let matches = response?.mapItems, !matches.isEmpty else { return item }
    let origin = CLLocation(latitude: item.placemark.coordinate.latitude, longitude: item.placemark.coordinate.longitude)
    return matches.min { left, right in
      let leftDistance = CLLocation(latitude: left.placemark.coordinate.latitude, longitude: left.placemark.coordinate.longitude)
        .distance(from: origin)
      let rightDistance = CLLocation(latitude: right.placemark.coordinate.latitude, longitude: right.placemark.coordinate.longitude)
        .distance(from: origin)
      return leftDistance < rightDistance
    } ?? item
  }

  private func presentDetail(_ item: MKMapItem) {
    guard let presenter = Self.topViewController() else { return }
    if #available(iOS 18.0, *) {
      let detail = MKMapItemDetailViewController(mapItem: item, displaysMap: true)
      detail.modalPresentationStyle = .pageSheet
      detail.view.backgroundColor = CrumpChrome.page
      detail.view.tintColor = CrumpChrome.forest
      if let sheet = detail.sheetPresentationController {
        sheet.detents = [.large()]
        sheet.selectedDetentIdentifier = .large
        sheet.prefersGrabberVisible = true
        sheet.prefersScrollingExpandsWhenScrolledToEdge = true
        sheet.preferredCornerRadius = 24
      }
      presenter.present(detail, animated: true) {
        CrumpChrome.apply(to: detail.view)
      }
    } else {
      item.openInMaps()
    }
  }

  private static func address(from item: MKMapItem) -> String? {
    let mark = item.placemark
    let parts = [mark.subThoroughfare, mark.thoroughfare, mark.locality, mark.administrativeArea, mark.postalCode]
      .compactMap { $0 }
      .filter { !$0.isEmpty }
    if !parts.isEmpty {
      return parts.joined(separator: " ")
    }
    return mark.title
  }

  private static func dedupe(_ rows: [[String: Any]]) -> [[String: Any]] {
    var seen = Set<String>()
    var unique: [[String: Any]] = []
    for row in rows {
      guard let id = row["id"] as? String, !seen.contains(id) else { continue }
      seen.insert(id)
      unique.append(row)
    }
    return unique
  }

  private static func topViewController() -> UIViewController? {
    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    let window = scenes.flatMap(\.windows).first(where: \.isKeyWindow) ?? scenes.flatMap(\.windows).first
    var top = window?.rootViewController
    while let presented = top?.presentedViewController {
      top = presented
    }
    return top
  }
}

private enum PlaceKind: String {
  case grocery
  case gas
  case pharmacy
  case bakery

  var queries: [String] {
    switch self {
    case .grocery: return ["grocery", "supermarket"]
    case .gas: return ["gas station"]
    case .pharmacy: return ["pharmacy"]
    case .bakery: return ["bakery"]
    }
  }

  var fallbackName: String {
    switch self {
    case .grocery: return "Grocery"
    case .gas: return "Gas station"
    case .pharmacy: return "Pharmacy"
    case .bakery: return "Bakery"
    }
  }

  var category: MKPointOfInterestCategory {
    switch self {
    case .grocery: return .foodMarket
    case .gas: return .gasStation
    case .pharmacy: return .pharmacy
    case .bakery: return .bakery
    }
  }

  var poiFilter: MKPointOfInterestFilter {
    MKPointOfInterestFilter(including: [category])
  }

  func matches(_ item: MKMapItem) -> Bool {
    guard let found = item.pointOfInterestCategory else { return true }
    return found == category
  }
}

private enum CrumpChrome {
  static let page = UIColor(red: 239 / 255, green: 232 / 255, blue: 220 / 255, alpha: 1)
  static let forest = UIColor(red: 28 / 255, green: 58 / 255, blue: 44 / 255, alpha: 1)

  static func apply(to root: UIView) {
    if root is MKMapView { return }
    if let table = root as? UITableView {
      table.backgroundColor = page
    } else if let collection = root as? UICollectionView {
      collection.backgroundColor = page
    } else if let scroll = root as? UIScrollView {
      scroll.backgroundColor = page
    }
    root.tintColor = forest
    for child in root.subviews where !(child is MKMapView) {
      apply(to: child)
    }
  }
}
