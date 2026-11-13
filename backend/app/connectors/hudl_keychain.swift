// Native Keychain bridge: secrets travel over stdin/stdout, never arguments.
import Foundation
import Security

let arguments = CommandLine.arguments
let operation = arguments.last ?? ""
// Spec 250: one item per service. Hudl's call has no service argument (unchanged).
let service = arguments.count == 3 ? arguments[1] : "Hudl"
if !["Hudl", "Veo"].contains(service) { exit(1) }
let query: [String: Any] = [
    kSecClass as String: kSecClassGenericPassword,
    kSecAttrService as String: "FootballMemories.\(service)",
    kSecAttrAccount as String: "saved-account"
]
func finish(_ status: OSStatus) {
    if status != errSecSuccess { exit(status == errSecItemNotFound ? 3 : 1) }
}
if operation == "save" {
    let bytes = FileHandle.standardInput.readDataToEndOfFile()
    guard let value = try? JSONSerialization.jsonObject(with: bytes) as? [String: String],
          value["username"] != nil, value["password"] != nil else { exit(1) }
    let attrs = [kSecValueData as String: bytes]
    let status = SecItemUpdate(query as CFDictionary, attrs as CFDictionary)
    if status == errSecItemNotFound {
        var item = query
        item[kSecValueData as String] = bytes
        item[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        finish(SecItemAdd(item as CFDictionary, nil))
    } else { finish(status) }
} else if operation == "load" {
    var request = query
    request[kSecReturnData as String] = true
    var result: CFTypeRef?
    finish(SecItemCopyMatching(request as CFDictionary, &result))
    guard let bytes = result as? Data else { exit(1) }
    FileHandle.standardOutput.write(bytes)
} else if operation == "exists" {
    var request = query
    request[kSecReturnAttributes as String] = true
    finish(SecItemCopyMatching(request as CFDictionary, nil))
} else { exit(1) }
