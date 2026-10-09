import XCTest

@MainActor
final class ExplorerUITests: XCTestCase {
  let app = XCUIApplication()
  override func setUp() async throws {
    continueAfterFailure = false
    app.launch()
  }
  private func source(_ title: String) {
    app.buttons["sourcePicker"].tap()
    app.buttons[title].tap()
  }
  private func list() { app.segmentedControls["viewPicker"].buttons["List"].tap() }
  private func reveal(_ element: XCUIElement) {
    for _ in 0..<12 {
      if element.exists && element.isHittable { return }
      app.swipeUp()
    }
    XCTAssertTrue(element.exists)
  }
  private func capture(_ name: String) {
    let attachment = XCTAttachment(screenshot: app.screenshot())
    attachment.name = name
    attachment.lifetime = .keepAlways
    add(attachment)
  }
  private let linkBase = "https://sebastienlato.github.io/G.O.S.I.P/"
  private func reviewLink(_ link: String) {
    app.buttons["viewLinks"].tap()
    app.segmentedControls["linkAction"].buttons["Import link"].tap()
    let input = app.textFields["importLinkInput"]
    reveal(input)
    input.tap()
    input.typeText(link)
    let review = app.buttons["reviewLink"]
    reveal(review)
    review.tap()
  }
  private func restoreReviewedLink() {
    let restore = app.buttons["restoreLink"]
    reveal(restore)
    restore.tap()
  }
  func testViewLinkReviewRestoreAndShareRoundTrip() {
    reviewLink(linkBase + "?source=reports-demo&country=~unknown&hours=168&view=list")
    XCTAssertTrue(app.staticTexts["Review simulation view"].waitForExistence(timeout: 3))
    capture("links-iphone-review")
    restoreReviewedLink()
    let count = app.staticTexts["resultCount"]
    reveal(count)
    XCTAssertTrue(count.label.contains("3 simulated"))
    capture("links-iphone-restored")
    app.buttons["viewLinks"].tap()
    let url = app.staticTexts["currentViewURL"]
    reveal(url)
    let shared = url.value as! String
    XCTAssertTrue(shared.contains("source=reports-demo"))
    XCTAssertTrue(shared.contains("country=%7Eunknown"))
    app.buttons["copyViewLink"].tap()
    XCTAssertTrue(app.buttons["Copied view link"].exists)
    capture("links-iphone-share")
    app.buttons["closeViewLinks"].tap()
    reviewLink(shared)
    restoreReviewedLink()
    reveal(count)
    XCTAssertTrue(count.label.contains("3 simulated"))
  }
  func testInvalidLinkDoesNotChangeViewAndReviewExpiresOnEdit() {
    reviewLink(linkBase + "?source=usgs")
    XCTAssertTrue(
      app.otherElements["importLinkError"].exists || app.staticTexts["importLinkError"].exists)
    XCTAssertFalse(app.buttons["restoreLink"].exists)
    capture("links-iphone-rejected")
    app.buttons["closeViewLinks"].tap()
    reveal(app.buttons["event-demo-001"])
    XCTAssertTrue(app.buttons["event-demo-001"].exists)
    reviewLink(linkBase + "?source=digital-demo&result=no-samples&hours=168&view=list")
    let restore = app.buttons["restoreLink"]
    reveal(restore)
    XCTAssertTrue(restore.exists)
    for _ in 0..<3 { app.swipeDown() }
    let input = app.textFields["importLinkInput"]
    reveal(input)
    input.tap()
    input.typeText("&source=nws")
    XCTAssertFalse(restore.exists)
    app.buttons["closeViewLinks"].tap()
    reveal(app.buttons["event-demo-001"])
    XCTAssertTrue(app.buttons["event-demo-001"].exists)
  }
  func testImportAndNavigationLeavePlaybackPaused() {
    reviewLink(linkBase + "?at=2026-10-01T16:00:00.000Z&view=list")
    restoreReviewedLink()
    app.buttons["Explore simulation time"].tap()
    XCTAssertEqual(app.buttons["playHistory"].label, "Play")
    app.buttons["playHistory"].tap()
    app.buttons["viewLinks"].tap()
    app.buttons["closeViewLinks"].tap()
    XCTAssertEqual(app.buttons["playHistory"].label, "Play")
    let pausedCursor = app.staticTexts["cursorTime"].label
    let remainsPaused = NSPredicate(format: "label != %@", pausedCursor)
    let noTick = expectation(for: remainsPaused, evaluatedWith: app.staticTexts["cursorTime"])
    noTick.isInverted = true
    waitForExpectations(timeout: 2.6)
    reviewLink(
      linkBase
        + "?source=digital-demo&digital=outage&result=anomaly&hours=168&view=list&at=2026-10-08T13:00:00.000Z"
    )
    restoreReviewedLink()
    XCTAssertEqual(app.buttons["playHistory"].label, "Play")
    let drop = app.buttons["event-digital-demo-drop"]
    reveal(drop)
    XCTAssertTrue(drop.exists)
    capture("links-iphone-paused")
  }
  func testLargeTextLinkReview() {
    app.terminate()
    app.launchArguments += [
      "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL",
    ]
    app.launch()
    reviewLink(linkBase + "?source=reports-demo&lang=en&reports=corrected&hours=168&view=list")
    let restore = app.buttons["restoreLink"]
    reveal(restore)
    capture("links-large-text-review")
    restore.tap()
    let event = app.buttons["event-report-demo-forum"]
    reveal(event)
    XCTAssertTrue(event.exists)
    capture("links-large-text-restored")
  }
  func testMapMarkerOpensCorrespondingExample() {
    let map = app.otherElements["offlineMap"]
    XCTAssertTrue(map.waitForExistence(timeout: 5))
    // Canonical demo-001 is [142, 38] in the bundled equirectangular map.
    map.coordinate(withNormalizedOffset: CGVector(dx: 322.0 / 360, dy: 52.0 / 180)).tap()
    XCTAssertTrue(app.staticTexts["detailTitle"].waitForExistence(timeout: 3))
    XCTAssertEqual(app.staticTexts["detailTitle"].label, "Seismic activity scenario")
  }
  func testMapAndListDetails() {
    XCTAssertTrue(app.staticTexts["SIMULATED · OFFLINE"].waitForExistence(timeout: 10))
    capture("phase11-iphone-start")
    app.swipeUp()
    capture("phase11-iphone-map")
    let event = app.buttons["event-demo-001"]
    reveal(event)
    event.tap()
    XCTAssertTrue(app.staticTexts["detailTitle"].waitForExistence(timeout: 3))
    XCTAssertTrue(app.staticTexts["Seismic activity scenario"].exists)
    capture("phase11-iphone-detail")
    app.buttons["closeDetails"].tap()
    XCTAssertFalse(app.staticTexts["detailTitle"].exists)
  }
  func testReportsFiltersAndFeedOnly() {
    source("Global reports")
    list()
    app.segmentedControls["windowPicker"].buttons["7d"].tap()
    app.buttons["filters"].tap()
    app.buttons["countryPicker"].tap()
    app.buttons["Not supplied / withheld"].tap()
    app.buttons["Done"].tap()
    let count = app.staticTexts["resultCount"]
    reveal(count)
    XCTAssertTrue(count.label.contains("3 simulated"))
    capture("phase11-iphone-feed-only")
    let unknown = app.buttons["event-report-demo-unknown"]
    reveal(unknown)
    unknown.tap()
    XCTAssertTrue(app.staticTexts["detailTitle"].waitForExistence(timeout: 3))
  }
  func testCorrectionAndSourceReset() {
    source("Global reports")
    list()
    let forum = app.buttons["event-report-demo-forum"]
    reveal(forum)
    forum.tap()
    let correction = app.staticTexts["Supplied correction · one prior version"]
    reveal(correction)
    capture("phase11-iphone-correction")
    app.buttons["closeDetails"].tap()
    for _ in 0..<3 { app.swipeDown() }
    source("Digital world")
    app.segmentedControls["windowPicker"].buttons["7d"].tap()
    let drop = app.buttons["event-digital-demo-drop"]
    reveal(drop)
    drop.tap()
    let related = app.buttons["related-reachability-contrast"]
    reveal(related)
    related.tap()
    XCTAssertTrue(app.staticTexts["detailTitle"].label.contains("baseline"))
    capture("phase11-iphone-related")
  }
  func testHistoryPlaybackAndSourceChange() {
    list()
    app.buttons["Explore simulation time"].tap()
    app.buttons["Back 6h"].tap()
    XCTAssertTrue(app.staticTexts["cursorTime"].label.contains("10:00"))
    app.buttons["playHistory"].tap()
    XCTAssertTrue(app.staticTexts["cursorTime"].waitForExistence(timeout: 3))
    let atEnd = NSPredicate(format: "label CONTAINS '16:00'")
    expectation(for: atEnd, evaluatedWith: app.staticTexts["cursorTime"])
    waitForExpectations(timeout: 5)
    XCTAssertFalse(app.buttons["playHistory"].isEnabled)
    app.buttons["Explore simulation time"].tap()
    source("Space")
    let count = app.staticTexts["resultCount"]
    reveal(count)
    XCTAssertTrue(count.label.contains("2 simulated"))
    capture("phase11-iphone-space")
  }
  func testSearchAndEmptyRecovery() {
    list()
    let search = app.searchFields.firstMatch
    search.tap()
    search.typeText("zzzznonexistent\n")
    let empty = app.staticTexts["No matching examples"]
    reveal(empty)
    XCTAssertTrue(empty.exists)
    capture("phase11-iphone-empty")
    app.buttons["Reset filters"].tap()
    let first = app.buttons["event-demo-001"]
    reveal(first)
    XCTAssertTrue(first.exists)
  }
}
