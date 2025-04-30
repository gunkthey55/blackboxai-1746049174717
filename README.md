
Built by https://www.blackbox.ai

---

```markdown
# Admin Dashboard Application

## Project Overview
The Admin Dashboard Application is a responsive web application built with Vue.js and Tailwind CSS. It features a user login interface and a main dashboard for managing customers, displaying analytics, and providing an overview of recent activities. 

## Installation
To run the application locally, follow these steps:

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   ```

2. **Open the project directory:**
   ```bash
   cd <project-directory>
   ```

3. **Run a local server:**
   You can use any local server. For example, use the following command with Python:
   ```bash
   python -m http.server 8000
   ```
   Navigate to `http://localhost:8000` in your browser to access the application.

## Usage
1. Open the application in your web browser.
2. To log in, use the static credentials:
   - Email: `admin@admin.com`
   - Password: `admin123`
3. Upon successful login, you will be redirected to the dashboard where you can manage customers and view statistics.
4. Use the customer management section to add, edit, or delete customer records.

## Features
- Login functionality with static credentials.
- Dashboard with overview statistics and recent activities.
- Customer management interface for adding, editing, and deleting customer information.
- Responsive design utilizing Tailwind CSS for a modern look and feel.

## Dependencies
The project relies on the following libraries:
- Vue.js: For building the user interface.
- Axios: For making HTTP requests.
- Tailwind CSS: For styling and responsive design.
- Font Awesome: For icons.

## Project Structure
The project consists of several HTML files structured as follows:

```
/AdminDashboard
│
├── index.html              # Login page
├── dashboard.html          # Main dashboard after login
└── customer-management.html # Customer management page
```

Each page is built using Vue.js and incorporates Tailwind CSS for styling. The application is designed for ease of use while providing a comprehensive interface for admin functionalities.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
```