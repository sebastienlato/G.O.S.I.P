"""Regenerate the small, dependency-free Xcode project. Run from any directory."""
from pathlib import Path
import hashlib
root = Path(__file__).resolve().parent
objects = []
def key(name):
    return hashlib.sha256(name.encode()).hexdigest()[:24].upper()
def obj(name, content):
    objects.append(f'{key(name)} = {{ {content} }};')
    return key(name)
def refs(names):
    return '(' + ', '.join(key(name) for name in names) + ',)'
app_files = ['App/GOSIPApp.swift', 'App/OfflineMap.swift', 'Core/Sources/GOSIPCore/Explorer.swift']
resources = [f'Core/Sources/GOSIPCore/Resources/{f}' for f in ['fixtures.json', 'world.json', 'notices.txt']]
tests = ['UITests/ExplorerUITests.swift']
for file in app_files + resources + tests:
    kind = 'sourcecode.swift' if file.endswith('.swift') else 'text.json' if file.endswith('.json') else 'text'
    obj(file, f'isa = PBXFileReference; lastKnownFileType = {kind}; path = "{file}"; sourceTree = "<group>";')
    obj('build:' + file, f'isa = PBXBuildFile; fileRef = {key(file)};')
obj('appProduct', 'isa = PBXFileReference; explicitFileType = wrapper.application; path = GOSIP.app; sourceTree = BUILT_PRODUCTS_DIR;')
obj('testProduct', 'isa = PBXFileReference; explicitFileType = wrapper.cfbundle; path = GOSIPUITests.xctest; sourceTree = BUILT_PRODUCTS_DIR;')
obj('products', f'isa = PBXGroup; children = {refs(["appProduct", "testProduct"])}; name = Products; sourceTree = "<group>";')
obj('main', f'isa = PBXGroup; children = {refs(app_files + resources + tests + ["products"])}; sourceTree = "<group>";')
for prefix, files in [('app', app_files), ('test', tests)]:
    obj(prefix+'Sources', f'isa = PBXSourcesBuildPhase; buildActionMask = 2147483647; files = {refs(["build:" + f for f in files])}; runOnlyForDeploymentPostprocessing = 0;')
    obj(prefix+'Frameworks', 'isa = PBXFrameworksBuildPhase; buildActionMask = 2147483647; files = (); runOnlyForDeploymentPostprocessing = 0;')
    resource_refs = refs(['build:' + f for f in resources]) if prefix == 'app' else '()'
    obj(prefix+'Resources', f'isa = PBXResourcesBuildPhase; buildActionMask = 2147483647; files = {resource_refs}; runOnlyForDeploymentPostprocessing = 0;')
obj('proxy', f'isa = PBXContainerItemProxy; containerPortal = {key("project")}; proxyType = 1; remoteGlobalIDString = {key("appTarget")}; remoteInfo = GOSIP;')
obj('dependency', f'isa = PBXTargetDependency; target = {key("appTarget")}; targetProxy = {key("proxy")};')
for prefix, name in [('app', 'GOSIP'), ('test', 'GOSIPUITests')]:
    deps = refs(['dependency']) if prefix == 'test' else '()'
    product_type = 'com.apple.product-type.application' if prefix == 'app' else 'com.apple.product-type.bundle.ui-testing'
    obj(prefix+'Target', f'isa = PBXNativeTarget; buildConfigurationList = {key(prefix+"Config")}; buildPhases = {refs([prefix+"Sources", prefix+"Frameworks", prefix+"Resources"])}; buildRules = (); dependencies = {deps}; name = {name}; productName = {name}; productReference = {key(prefix+"Product")}; productType = "{product_type}";')
common = 'SDKROOT = iphoneos; IPHONEOS_DEPLOYMENT_TARGET = 17.0; SWIFT_VERSION = 6.0; CLANG_ENABLE_MODULES = YES;'
for group in ['project', 'app', 'test']:
    for mode in ['Debug', 'Release']:
        settings = common
        if mode == 'Debug': settings += ' SWIFT_OPTIMIZATION_LEVEL = "-Onone"; DEBUG_INFORMATION_FORMAT = dwarf;'
        else: settings += ' SWIFT_OPTIMIZATION_LEVEL = "-O"; DEBUG_INFORMATION_FORMAT = "dwarf-with-dsym";'
        if group != 'project':
            settings += ' GENERATE_INFOPLIST_FILE = YES; TARGETED_DEVICE_FAMILY = "1,2"; PRODUCT_NAME = "$(TARGET_NAME)"; CODE_SIGNING_ALLOWED = NO; MARKETING_VERSION = 0.1.0; CURRENT_PROJECT_VERSION = 1;'
            settings += f' PRODUCT_BUNDLE_IDENTIFIER = org.gosip.{"explorer" if group == "app" else "uitests"};'
        if group == 'app':
            settings += ' INFOPLIST_KEY_UIApplicationSceneManifest_Generation = YES; INFOPLIST_KEY_UILaunchScreen_Generation = YES; INFOPLIST_KEY_UISupportedInterfaceOrientations = "UIInterfaceOrientationPortrait UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight"; INFOPLIST_KEY_UISupportedInterfaceOrientations_iPad = "UIInterfaceOrientationPortrait UIInterfaceOrientationPortraitUpsideDown UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight"; INFOPLIST_KEY_CFBundleDisplayName = GOSIP;'
        if group == 'test': settings += ' TEST_TARGET_NAME = GOSIP;'
        obj(group+mode, f'isa = XCBuildConfiguration; buildSettings = {{ {settings} }}; name = {mode};')
    obj(group+'Config', f'isa = XCConfigurationList; buildConfigurations = {refs([group+"Debug", group+"Release"])}; defaultConfigurationIsVisible = 0; defaultConfigurationName = Release;')
obj('project', f'isa = PBXProject; attributes = {{ BuildIndependentTargetsInParallel = YES; LastUpgradeCheck = 2700; }}; buildConfigurationList = {key("projectConfig")}; compatibilityVersion = "Xcode 14.0"; developmentRegion = en; hasScannedForEncodings = 0; knownRegions = (en, Base, fr, es, ar); mainGroup = {key("main")}; productRefGroup = {key("products")}; projectDirPath = ""; projectRoot = ""; targets = {refs(["appTarget", "testTarget"])};')
(root / 'GOSIP.xcodeproj/project.pbxproj').write_text('// !$*UTF8*$!\n{ archiveVersion = 1; classes = {}; objectVersion = 56; objects = {\n' + '\n'.join(objects) + f'\n}}; rootObject = {key("project")}; }}\n')
def buildref(target, name):
    return f'<BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="{key(target)}" BuildableName="{name}" BlueprintName="{name.split(".")[0]}" ReferencedContainer="container:GOSIP.xcodeproj"/>'
scheme = f'''<?xml version="1.0" encoding="UTF-8"?>
<Scheme LastUpgradeVersion="2700" version="1.3">
<BuildAction parallelizeBuildables="YES" buildImplicitDependencies="YES"><BuildActionEntries><BuildActionEntry buildForTesting="YES" buildForRunning="YES" buildForProfiling="YES" buildForArchiving="YES" buildForAnalyzing="YES">{buildref('appTarget', 'GOSIP.app')}</BuildActionEntry></BuildActionEntries></BuildAction>
<TestAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" shouldUseLaunchSchemeArgsEnv="YES"><Testables><TestableReference skipped="NO">{buildref('testTarget', 'GOSIPUITests.xctest')}</TestableReference></Testables></TestAction>
<LaunchAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" launchStyle="0" useCustomWorkingDirectory="NO" ignoresPersistentStateOnLaunch="NO" debugDocumentVersioning="YES" allowLocationSimulation="NO"><BuildableProductRunnable runnableDebuggingMode="0">{buildref('appTarget', 'GOSIP.app')}</BuildableProductRunnable></LaunchAction>
<ProfileAction buildConfiguration="Release" shouldUseLaunchSchemeArgsEnv="YES" savedToolIdentifier="" useCustomWorkingDirectory="NO" debugDocumentVersioning="YES"><BuildableProductRunnable runnableDebuggingMode="0">{buildref('appTarget', 'GOSIP.app')}</BuildableProductRunnable></ProfileAction><AnalyzeAction buildConfiguration="Debug"/><ArchiveAction buildConfiguration="Release" revealArchiveInOrganizer="YES"/>
</Scheme>'''
(root / 'GOSIP.xcodeproj/xcshareddata/xcschemes/GOSIP.xcscheme').write_text(scheme + '\n')
