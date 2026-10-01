# Security Specification (`security_spec.md`)

## 1. Data Invariants

1. **Zero-Trust Default Deny**: Every unmatched path is denied (`allow read, write: if false;`).
2. **Verified Identity**: All write operations require `request.auth != null` and `request.auth.token.email_verified == true`.
3. **Profile Ownership & Isolation (`/userProfiles/{userId}`)**:
   - A `UserProfile` document ID `{userId}` must match `^[a-zA-Z0-9_\-]+$` (max 128 chars) and strictly equal `request.auth.uid`.
   - `uid` inside the document payload must equal `request.auth.uid` and `userId`.
   - `allow list` is strictly forbidden (`false`) on `/userProfiles` to prevent user enumeration.
4. **Relational Consistency & Ownership (`/repoConfigs/{configId}`)**:
   - A `RepoConfig` cannot be created unless the owner has a valid existing profile at `/databases/$(database)/documents/userProfiles/$(request.auth.uid)` (`exists()` check).
   - `ownerId` must strictly equal `request.auth.uid` on `create` and is immutable on `update` (`incoming().ownerId == existing().ownerId`).
   - `createdAt` is immutable on `update` (`incoming().createdAt == existing().createdAt`) and must equal `request.time` on `create`.
   - `updatedAt` must equal `request.time` on both `create` and `update`.
   - Terminal State Lock: Once `existing().status == 'archived'`, no further updates are permitted.
   - Secure List Queries: `allow list` on `/repoConfigs` strictly enforces `resource.data.ownerId == request.auth.uid`.

## 2. The "Dirty Dozen" Payloads

1. **Shadow Field Injection (`isVerified: true`)**: Sending an undeclared field on `RepoConfig` creation or update.
2. **Unverified Email Spoofing (`email_verified: false`)**: Attempting to write a `UserProfile` or `RepoConfig` without a verified email token.
3. **Cross-Tenant Ownership Spoofing (`ownerId: "victim_uid"`)**: Authenticated user attempting to create a `RepoConfig` assigned to another user's UID.
4. **Orphaned RepoConfig Creation**: Creating a `RepoConfig` when `/userProfiles/$(request.auth.uid)` does not exist.
5. **ID Poisoning Attack**: Creating a `RepoConfig` with a 2,000-character or special-character document ID (`../../admin`).
6. **Short Name Boundary Violation**: Setting `manifestShortName` to a 50-character string (exceeding `maxLength: 12`).
7. **Invalid Regex Repo Format**: Setting `repoFullName` to `"invalid_repo_without_slash"`.
8. **Client Timestamp Forgery**: Providing a past or future timestamp instead of `request.time` for `createdAt` or `updatedAt`.
9. **Immutable Field Mutation**: Attempting to mutate `ownerId` or `createdAt` during an `update` on `/repoConfigs/{configId}`.
10. **Terminal State Bypass**: Attempting to update `manifestName` on a `RepoConfig` whose `status` is already `'archived'`.
11. **Unauthorized Profile Enumeration**: Executing a `list` query across `/userProfiles` or reading another user's `/userProfiles/{otherUid}`.
12. **Unfiltered RepoConfig List Scraping**: Executing a `list` query on `/repoConfigs` without filtering by `ownerId == request.auth.uid`.
