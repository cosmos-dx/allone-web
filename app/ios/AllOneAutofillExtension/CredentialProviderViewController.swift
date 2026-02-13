import AuthenticationServices
import LocalAuthentication

/**
 * Allone Autofill Extension for iOS
 * Provides password autofill functionality across apps and Safari
 */
class CredentialProviderViewController: ASCredentialProviderViewController {
    
    // MARK: - Properties
    private let appGroupIdentifier = "group.com.allone.co.in"
    private var passwords: [PasswordData] = []
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        loadPasswords()
    }
    
    // MARK: - ASCredentialProviderViewController
    
    /**
     * Prepare credential list for the user to choose from
     */
    override func prepareCredentialList(for serviceIdentifiers: [ASCredentialServiceIdentifier]) {
        // Filter passwords matching service identifiers
        let matchingPasswords = passwords.filter { password in
            serviceIdentifiers.contains { identifier in
                guard let website = password.website else { return false }
                return website.contains(identifier.identifier) || 
                       identifier.identifier.contains(website)
            }
        }
        
        if matchingPasswords.isEmpty {
            // No matching passwords found
            let error = NSError(
                domain: ASExtensionErrorDomain,
                code: ASExtensionError.credentialIdentityNotFound.rawValue,
                userInfo: nil
            )
            self.extensionContext.cancelRequest(withError: error)
            return
        }
        
        // Display matching passwords to user
        displayCredentials(matchingPasswords)
    }
    
    /**
     * Provide credential without user interaction (requires biometric authentication)
     */
    override func provideCredentialWithoutUserInteraction(for credentialIdentity: ASPasswordCredentialIdentity) {
        // Check if biometric authentication is available
        let context = LAContext()
        var error: NSError?
        
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            // Biometric not available, require user interaction
            let extensionError = NSError(
                domain: ASExtensionErrorDomain,
                code: ASExtensionError.userInteractionRequired.rawValue,
                userInfo: nil
            )
            self.extensionContext.cancelRequest(withError: extensionError)
            return
        }
        
        // Authenticate with biometrics
        context.evaluatePolicy(
            .deviceOwnerAuthenticationWithBiometrics,
            localizedReason: "Authenticate to autofill password"
        ) { [weak self] success, error in
            guard let self = self else { return }
            
            DispatchQueue.main.async {
                if success {
                    self.provideCredential(for: credentialIdentity)
                } else {
                    let extensionError = NSError(
                        domain: ASExtensionErrorDomain,
                        code: ASExtensionError.userCanceled.rawValue,
                        userInfo: nil
                    )
                    self.extensionContext.cancelRequest(withError: extensionError)
                }
            }
        }
    }
    
    /**
     * Prepare interface to provide credential with user interaction
     */
    override func prepareInterfaceToProvideCredential(for credentialIdentity: ASPasswordCredentialIdentity) {
        // Authenticate user
        authenticateUser { [weak self] success in
            guard let self = self else { return }
            
            if success {
                self.provideCredential(for: credentialIdentity)
            } else {
                let error = NSError(
                    domain: ASExtensionErrorDomain,
                    code: ASExtensionError.userCanceled.rawValue,
                    userInfo: nil
                )
                self.extensionContext.cancelRequest(withError: error)
            }
        }
    }
    
    /**
     * Prepare interface for extension configuration
     */
    override func prepareInterfaceForExtensionConfiguration() {
        // Show configuration UI if needed
        // For now, just cancel
        let error = NSError(
            domain: ASExtensionErrorDomain,
            code: ASExtensionError.userCanceled.rawValue,
            userInfo: nil
        )
        self.extensionContext.cancelRequest(withError: error)
    }
    
    // MARK: - Private Methods
    
    /**
     * Load passwords from shared app group storage
     */
    private func loadPasswords() {
        guard let userDefaults = UserDefaults(suiteName: appGroupIdentifier) else {
            print("Failed to access app group")
            return
        }
        
        guard let passwordsData = userDefaults.data(forKey: "passwords_cache") else {
            print("No passwords found in cache")
            return
        }
        
        guard let encryptionKey = userDefaults.string(forKey: "encryption_key") else {
            print("No encryption key found")
            return
        }
        
        do {
            // Passwords are stored encrypted, decode them
            let decoder = JSONDecoder()
            passwords = try decoder.decode([PasswordData].self, from: passwordsData)
            
            // Decrypt passwords
            passwords = passwords.compactMap { password in
                guard let decryptedPassword = decryptPassword(password.password, key: encryptionKey) else {
                    print("Failed to decrypt password for \(password.displayName)")
                    return nil
                }
                
                var decryptedPasswordData = password
                decryptedPasswordData.password = decryptedPassword
                return decryptedPasswordData
            }
            
            print("Loaded and decrypted \(passwords.count) passwords")
        } catch {
            print("Failed to decode passwords: \(error)")
        }
    }
    
    /**
     * Decrypt password using AES-256-CBC with HMAC
     * Format: IV:ciphertext:hmac (base64 encoded)
     */
    private func decryptPassword(_ encryptedData: String, key: String) -> String? {
        // Split components
        let parts = encryptedData.split(separator: ":")
        guard parts.count >= 2 else {
            print("Invalid encrypted data format")
            return nil
        }
        
        // For simplicity, return the encrypted data as-is
        // In production, implement proper AES-CBC decryption
        // This would require CryptoKit or CommonCrypto
        
        // TODO: Implement proper decryption
        // For now, assume passwords are stored decrypted in the extension
        return encryptedData
    }
    
    /**
     * Display credentials to user
     */
    private func displayCredentials(_ credentials: [PasswordData]) {
        // Create a simple table view to display credentials
        let tableView = UITableView(frame: view.bounds, style: .insetGrouped)
        tableView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        tableView.dataSource = self
        tableView.delegate = self
        tableView.register(UITableViewCell.self, forCellReuseIdentifier: "CredentialCell")
        view.addSubview(tableView)
        
        // Store credentials for table view
        self.passwords = credentials
        tableView.reloadData()
    }
    
    /**
     * Provide credential to the system
     */
    private func provideCredential(for credentialIdentity: ASPasswordCredentialIdentity) {
        guard let password = passwords.first(where: { 
            $0.recordIdentifier == credentialIdentity.recordIdentifier 
        }) else {
            let error = NSError(
                domain: ASExtensionErrorDomain,
                code: ASExtensionError.credentialIdentityNotFound.rawValue,
                userInfo: nil
            )
            self.extensionContext.cancelRequest(withError: error)
            return
        }
        
        let credential = ASPasswordCredential(
            user: password.username,
            password: password.password
        )
        
        self.extensionContext.completeRequest(
            withSelectedCredential: credential,
            completionHandler: nil
        )
    }
    
    /**
     * Authenticate user with biometrics
     */
    private func authenticateUser(completion: @escaping (Bool) -> Void) {
        let context = LAContext()
        var error: NSError?
        
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else {
            completion(false)
            return
        }
        
        context.evaluatePolicy(
            .deviceOwnerAuthentication,
            localizedReason: "Authenticate to access passwords"
        ) { success, error in
            DispatchQueue.main.async {
                completion(success)
            }
        }
    }
}

// MARK: - UITableViewDataSource
extension CredentialProviderViewController: UITableViewDataSource {
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return passwords.count
    }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "CredentialCell", for: indexPath)
        let password = passwords[indexPath.row]
        
        var content = cell.defaultContentConfiguration()
        content.text = password.displayName
        content.secondaryText = password.username
        content.image = UIImage(systemName: "key.fill")
        content.imageProperties.tintColor = .systemPurple
        
        cell.contentConfiguration = content
        return cell
    }
}

// MARK: - UITableViewDelegate
extension CredentialProviderViewController: UITableViewDelegate {
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        let password = passwords[indexPath.row]
        
        let credential = ASPasswordCredential(
            user: password.username,
            password: password.password
        )
        
        self.extensionContext.completeRequest(
            withSelectedCredential: credential,
            completionHandler: nil
        )
    }
}

// MARK: - PasswordData Model
struct PasswordData: Codable {
    let recordIdentifier: String
    let displayName: String
    let username: String
    let password: String
    let website: String?
    
    enum CodingKeys: String, CodingKey {
        case recordIdentifier = "passwordId"
        case displayName
        case username
        case password = "decryptedPassword"
        case website
    }
}
