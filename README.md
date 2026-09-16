# Gather live meeting poll

A static, GitHub Pages-ready meeting poll with four answer buttons and a live bar chart. Visitors first choose to join as a participant or sign in as host. Hosts enter `123456` once per browser, then can reset polls, edit rounds, publish a six-line question (question, four options, and correct answer), hide results, and reveal the answer.

## Publish on GitHub Pages

1. Put these files in a GitHub repository and push them to the `main` branch: `index.html`, `participant.html`, `host.html`, `styles.css`, and `app.js`.
2. In the repository, open **Settings → Pages**, choose **Deploy from a branch**, then select `main` and the `/ (root)` folder.
3. Open the URL GitHub provides.

## Turn on the shared live poll (Firebase)

Without setup, the site operates in demo mode: its state is shared between tabs in the same browser only. For a real meeting-wide poll:

1. Create a Firebase project, add a **Web app**, and create a **Realtime Database**.
2. Copy its web configuration values into `firebaseConfig` in [app.js](app.js), replacing every `YOUR_...` placeholder. The site automatically switches to Firebase mode.
3. In **Realtime Database → Rules**, publish these rules so the public website can share votes:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

4. Deploy the repository to GitHub Pages. Every visitor to its Pages URL will now use the same live poll.

Firebase configuration values identify the project but are not a secret. The client-side host code is a convenience control, not strong security: anyone who can read the published JavaScript can find it. Use proper Firebase Authentication/Cloud Functions if resets require real access control.

The data lives at `meetings/default-poll`. Change `POLL_PATH` in `app.js` if you want a separate poll per meeting.
