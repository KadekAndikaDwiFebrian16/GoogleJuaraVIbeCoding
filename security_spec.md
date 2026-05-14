# Security Specification - Dapur Sehat AI

## Data Invariants
1. Resep hanya bisa dibuat dan dihapus oleh pengguna dengan peran 'admin'.
2. Pengguna hanya bisa memberikan ulasan jika sudah terautentikasi (Google Login).
3. Ulasan harus menyertakan rating antara 1-5.
4. Saran resep hanya bisa dilihat oleh admin.
5. Pengguna tidak bisa mengubah peran (role) mereka sendiri setelah dibuat (kecuali lewat admin).

## Identity, Integrity, and State Payloads (Dirty Dozen)
1. **Privilege Escalation**: Attempt to create a recipe as a standard user. -> DENIED
2. **Identity Spoofing**: Attempt to comment using another user's UID. -> DENIED
3. **Ghost Field Injection**: Attempt to add `isExpert: true` to a user profile. -> DENIED
4. **Rating Overdrive**: Attempt to post a comment with `rating: 99`. -> DENIED
5. **Admin Access Leak**: Attempt to read all `suggestions` as a standard user. -> DENIED
6. **Immutable Field Change**: Attempt to change `createdAt` of a recipe. -> DENIED
7. **Resource Poisoning**: Attempt to use a 1MB string as a recipe ID. -> DENIED
8. **PII Leak**: Attempt to read someone else's user profile directly. -> DENIED (only public info or admin)
9. **Spam Attack**: Attempt to write comments without `email_verified: true`. -> DENIED
10. **State Corruption**: Attempt to update another user's comment. -> DENIED
11. **Self-Promotion**: User trying to change their own role to 'admin'. -> DENIED
12. **Orphaned Writes**: Attempt to add a comment to a non-existent recipe. -> DENIED

## Test Plan
- Run ESLint on rules.
- Manually verify admin vs user permissions in the app.
