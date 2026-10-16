# EduShare — Student Notes Sharing Platform

**Learn. Share. Grow.**

EduShare is a student-focused web application designed to make sharing and accessing academic notes easier. It provides a platform where students can explore study materials, upload notes, and organize resources by branch, semester, and category.

## Features

-**User Authentication** — Sign in and register using Firebase Authentication.
-**My Profile** — View account details and sign-in information.
-**Upload Notes** — Add academic notes with relevant details.
-**Browse Notes** — Explore available study materials.
-**Branch and Semester Filters** — Find resources based on your academic branch and semester.
-**Category Filters** — Organize notes, question papers, lab manuals, and assignments.
-**My Uploads** — View and manage your uploaded notes.
-**Responsive Interface** — A clean interface designed for different screen sizes.
-**Cloud Database Integration** — Cloud Firestore is configured for storing application data.

## Tech Stack

| Technology | Purpose |
|---|---|
| HTML5 | Page structure |
| CSS3 | Styling and responsive layouts |
| JavaScript | Application logic and interactions |
| Firebase Authentication | User authentication |
| Cloud Firestore | Cloud database |
| localStorage | Local note storage in the existing implementation |

> **Development note:** The project is being migrated from `localStorage` to Cloud Firestore. Until the migration is completed, note data may remain browser-local. Firebase Storage is not currently used for file uploads.

## Project Structure

```text
EduShare/
├── index.html
├── register.html
├── login.html
├── dashboard.html
├── upload.html
├── notes.html
├── my-uploads.html
├── profile.html
├── style.css
├── app.js
├── firebase.js
├── auth.js
└── google-signin.js
```

*The structure above lists expected project files. Include only the files that exist in your repository.*

## Getting Started

### Prerequisites

- A web browser
- A code editor such as Visual Studio Code
- A Firebase project

### 1. Clone the repository

```bash
git clone https://github.com/YOUR-USERNAME/EduShare.git
```

Replace `YOUR-USERNAME` with your GitHub username.

### 2. Open the project

```bash
cd EduShare
```

### 3. Configure Firebase

1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Select your Firebase project.
3. Register a web app if you haven't already.
4. Copy its web app configuration into `firebase.js`.
5. Enable the authentication providers your app uses.
6. Set up Cloud Firestore and configure security rules.

**Security reminder:** Never commit service-account private keys or other server-side secrets. Restrict database access using appropriate Firebase Security Rules.

### 4. Run the application

Because the project uses JavaScript modules, run it through a local development server rather than opening HTML files directly.

For example, in Visual Studio Code, install the **Live Server** extension, right-click your entry HTML file, and select **Open with Live Server**.

## Security

- Firebase Authentication is used to identify signed-in users.
- Firestore access should be restricted through security rules.
- Client-side validation should not be treated as a substitute for database security.
- Do not store sensitive credentials in frontend code.
- Review your Firestore rules before deploying the application publicly.

## Future Improvements

- [ ] Complete the migration of notes from `localStorage` to Cloud Firestore.
- [ ] Add Firebase Storage for sharing downloadable note files.
- [ ] Add note previews and improved search.
- [ ] Add likes, ratings, or bookmarks.
- [ ] Deploy the application using Firebase Hosting.
- [ ] Improve accessibility and automated testing.

## Project Goal

EduShare aims to make academic collaboration simpler by helping students discover, organize, and share useful learning resources in one place.

## Contributing

Suggestions and contributions are welcome!

1. Fork the repository.
2. Create a feature branch.
3. Commit your changes.
4. Open a pull request describing your improvements.


---
