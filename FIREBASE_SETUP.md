# NotesHub Firebase setup

## 1. Create the Firebase project

1. Create a project in the [Firebase Console](https://console.firebase.google.com/).
2. Add a Web app and copy its config into `js/firebase.js`, replacing every `YOUR_...` value.
3. Enable **Authentication > Sign-in method > Email/Password**.
4. Create a **Firestore Database** in production mode.
5. Create a **Storage** bucket.

## 2. Add the security rules

Paste the contents of `firestore.rules` into Firestore Database > Rules and the contents of `storage.rules` into Storage > Rules. These rules allow signed-in users to upload notes and read public note metadata while preventing users from changing another user's account.

## 3. Run the site

Serve the folder through a local web server. ES modules and Firebase will not work reliably when opened directly as a `file://` page.

```powershell
python -m http.server 5500
```

Open `http://localhost:5500/` in a browser. Until the Firebase config is filled in, the app continues using its existing local browser storage fallback.

## Collections

- `users/{uid}` stores the display name, email, role, and creation timestamp.
- `notes/{noteId}` stores note metadata and the Storage download URL.
- `notes/{uid}/{timestamp}-{filename}` stores the uploaded file in Cloud Storage.