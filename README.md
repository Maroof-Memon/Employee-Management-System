# Employee Management System

An Employee Management System with a **Django REST Framework** backend and a modern vanilla **HTML, CSS, JavaScript** frontend. Features full CRUD operations, multi-currency conversion, CSV import/export, advanced search & filters, bulk operations, and card/table views.

---

## 📁 Project Structure

```text
├── employee_project/                  # Django backend project directory
│   ├── manage.py                      # Django administrative management script
│   ├── db.sqlite3                     # SQLite database
│   ├── employee_project/              # Project configuration package
│   │   ├── settings.py                # Installed apps, middleware, CORS setup
│   │   ├── urls.py                    # Root URL router
│   │   └── wsgi.py/asgi.py
│   └── employees/                     # Employee management app
│       ├── models.py                  # Employee model schema
│       ├── serializers.py             # DRF serializers
│       ├── views.py                   # API views/ViewSets
│       └── urls.py                    # API routes
├── frontend/                          # Frontend files
│   ├── index.html                     # Main UI
│   ├── style.css                      # Styles
│   └── app.js                         # Frontend logic
├── requirements.txt                   # Python dependencies
└── README.md
```

---

## 🚀 Setup & Run Instructions

### 1. Prerequisites
Ensure you have **Python 3.10+** and **pip** installed.

```bash
python --version
pip --version
```

### 2. Create and Activate Virtual Environment

**On macOS / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

**On Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run Migrations
```bash
cd employee_project
python manage.py makemigrations
python manage.py migrate
```

### 5. (Optional) Create Admin Superuser
```bash
python manage.py createsuperuser
```

### 6. Run the Development Server
```bash
python manage.py runserver
```

The REST API will be running at:
`http://127.0.0.1:8000/api/employees/`

### 7. Run the Frontend

**Option A: Direct Browser Opening**
- Open `frontend/index.html` directly in your browser.

**Option B: Python HTTP Server**
```bash
cd frontend
python -m http.server 3000
```
Open `http://localhost:3000` in your browser.

---

## 📬 REST API Endpoint Documentation

Base API URL: `http://localhost:3000/api/employees/`

All endpoints return JSON responses. Include header `Content-Type: application/json` for POST, PUT, and PATCH.

### 1. List All Employees
- **Method:** `GET`
- **URL:** `http://127.0.0.1:8000/api/employees/`
- **Response:** `200 OK`
```json
[
  {
    "id": 1,
    "first_name": "Eleanor",
    "last_name": "Vance",
    "email": "eleanor.vance@company.com",
    "phone": "+1 (555) 234-5678",
    "department": "Engineering",
    "designation": "Staff Software Engineer",
    "salary": "135000.00",
    "date_joined": "2024-01-15"
  }
]
```

---

### 2. Create a New Employee
- **Method:** `POST`
- **URL:** `http://127.0.0.1:8000/api/employees/`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "first_name": "Marcus",
  "last_name": "Sterling",
  "email": "marcus.sterling@company.com",
  "phone": "+1 (555) 345-6789",
  "department": "Product",
  "designation": "Principal Product Manager",
  "salary": "142000.00"
}
```
- **Response:** `201 Created`
```json
{
  "id": 2,
  "first_name": "Marcus",
  "last_name": "Sterling",
  "email": "marcus.sterling@company.com",
  "phone": "+1 (555) 345-6789",
  "department": "Product",
  "designation": "Principal Product Manager",
  "salary": "142000.00",
  "date_joined": "2024-10-26"
}
```

---

### 3. Retrieve Single Employee
- **Method:** `GET`
- **URL:** `http://127.0.0.1:8000/api/employees/1/`
- **Response:** `200 OK`
```json
{
  "id": 1,
  "first_name": "Eleanor",
  "last_name": "Vance",
  "email": "eleanor.vance@company.com",
  "phone": "+1 (555) 234-5678",
  "department": "Engineering",
  "designation": "Staff Software Engineer",
  "salary": "135000.00",
  "date_joined": "2024-01-15"
}
```

---

### 4. Full Update Employee (PUT)
- **Method:** `PUT`
- **URL:** `http://127.0.0.1:8000/api/employees/1/`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "first_name": "Eleanor",
  "last_name": "Vance",
  "email": "eleanor.vance@company.com",
  "phone": "+1 (555) 234-9999",
  "department": "Engineering",
  "designation": "VP of Engineering",
  "salary": "165000.00"
}
```
- **Response:** `200 OK`

---

### 5. Partial Update Employee (PATCH)
- **Method:** `PATCH`
- **URL:** `http://127.0.0.1:8000/api/employees/1/`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "salary": "172000.00"
}
```
- **Response:** `200 OK`

---

### 6. Delete Employee
- **Method:** `DELETE`
- **URL:** `http://127.0.0.1:8000/api/employees/1/`
- **Response:** `204 No Content`

---

### 7. Bulk Create Employees (CSV Import with Replace / Append Mode)
- **Method:** `POST`
- **URL:** `http://127.0.0.1:8000/api/employees/bulk_create/`
- **Headers:** `Content-Type: application/json`
- **Request Body (Replace Mode - clears old records and loads new CSV):**
```json
{
  "mode": "replace",
  "employees": [
    {
      "first_name": "Liam",
      "last_name": "Taylor",
      "email": "liam.taylor@company.com",
      "phone": "+1 (555) 789-1020",
      "department": "Engineering",
      "designation": "Backend Developer",
      "salary": "95000.00"
    }
  ]
}
```
- **Response:** `201 Created`

---

### 8. Bulk Delete Selected Employees
- **Method:** `POST` or `DELETE`
- **URL:** `http://127.0.0.1:8000/api/employees/bulk_delete/`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "ids": [1, 2, 3]
}
```
- **Response:** `200 OK`
```json
{
  "deleted": 3,
  "deleted_count": 3,
  "message": "Successfully deleted 3 employee records."
}
```

---

## 📊 CSV File Format Specification

The CSV spreadsheet file should be formatted with standard comma delimiters:

```csv
first_name,last_name,email,phone,department,designation,salary
Liam,Taylor,liam.taylor@company.com,+1 (555) 789-1020,Engineering,Backend Developer,95000.00
Emma,Watson,emma.watson@company.com,+1 (555) 890-2131,Marketing,Growth Marketing Manager,88000.00
Noah,Miller,noah.miller@company.com,+1 (555) 901-3242,Product,Product Designer,102000.00
Olivia,Brown,olivia.brown@company.com,+1 (555) 012-4353,Finance,Senior Financial Analyst,110000.00
James,Wilson,james.wilson@company.com,+1 (555) 123-5464,Human Resources,HR Generalist,78000.00
```

---

## Frontend
Built with plain HTML, CSS, and JavaScript. Includes card and table views, search and department filters, CSV upload, add/edit/delete modals, and bulk delete.
