/**
 * @file server.ts
 * @description Full-stack Node.js / Express server for Employee Management System.
 * Serves the Django REST Framework compatible endpoints at /api/employees/
 * and mounts the frontend client.
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// In-memory data store for employee records matching Django Employee model
interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  salary: string;
  date_joined: string;
}

let employees: Employee[] = [
  {
    id: 1,
    first_name: "Eleanor",
    last_name: "Vance",
    email: "eleanor.vance@company.com",
    phone: "+1 (555) 234-5678",
    department: "Engineering",
    designation: "Staff Software Engineer",
    salary: "135000.00",
    date_joined: "2024-01-15",
  },
  {
    id: 2,
    first_name: "Marcus",
    last_name: "Sterling",
    email: "marcus.sterling@company.com",
    phone: "+1 (555) 345-6789",
    department: "Product",
    designation: "Principal Product Manager",
    salary: "142000.00",
    date_joined: "2024-02-01",
  },
  {
    id: 3,
    first_name: "Sophia",
    last_name: "Chen",
    email: "sophia.chen@company.com",
    phone: "+1 (555) 456-7890",
    department: "Design",
    designation: "Lead UI/UX Designer",
    salary: "118000.00",
    date_joined: "2024-03-10",
  },
  {
    id: 4,
    first_name: "David",
    last_name: "Okafor",
    email: "david.okafor@company.com",
    phone: "+1 (555) 567-8901",
    department: "Engineering",
    designation: "DevOps Architect",
    salary: "128000.00",
    date_joined: "2024-04-20",
  },
  {
    id: 5,
    first_name: "Sarah",
    last_name: "Jenkins",
    email: "sarah.jenkins@company.com",
    phone: "+1 (555) 678-9012",
    department: "Human Resources",
    designation: "People Operations Lead",
    salary: "92000.00",
    date_joined: "2024-05-12",
  },
];

let nextId = 6;

// CORS Middleware (matching django-cors-headers CORS_ALLOW_ALL_ORIGINS = True)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// =============================================================================
// Django REST Framework Compatible API Endpoints
// =============================================================================

// GET /api/employees/ - List all employees
app.get('/api/employees', (req, res) => {
  res.json(employees);
});
app.get('/api/employees/', (req, res) => {
  res.json(employees);
});

// GET /api/employees/:id/ - Retrieve single employee
app.get(['/api/employees/:id', '/api/employees/:id/'], (req, res) => {
  const id = parseInt(req.params.id, 10);
  const emp = employees.find((e) => e.id === id);
  if (!emp) {
    return res.status(404).json({ detail: 'Not found.' });
  }
  res.json(emp);
});

// POST /api/employees/bulk_create/ - Bulk create employees from CSV
app.post(['/api/employees/bulk_create', '/api/employees/bulk_create/'], (req, res) => {
  const list = Array.isArray(req.body) ? req.body : (req.body.employees || []);
  const shouldReplace = req.body && (req.body.mode === 'replace' || req.body.replace === true);

  if (shouldReplace) {
    employees = [];
    nextId = 1;
  }

  const created: Employee[] = [];

  for (const item of list) {
    if (!item.first_name || !item.email) continue;
    if (employees.some((e) => e.email.toLowerCase() === String(item.email).toLowerCase())) {
      continue;
    }

    const newEmp: Employee = {
      id: nextId++,
      first_name: String(item.first_name || '').trim(),
      last_name: String(item.last_name || '').trim(),
      email: String(item.email || '').trim(),
      phone: String(item.phone || '').trim(),
      department: String(item.department || 'General').trim(),
      designation: String(item.designation || 'Staff').trim(),
      salary: Number(item.salary || 0).toFixed(2),
      date_joined: new Date().toISOString().split('T')[0],
    };

    employees.unshift(newEmp);
    created.push(newEmp);
  }

  res.status(201).json(created);
});

// POST & DELETE /api/employees/bulk_delete/ - Bulk delete selected employees
const handleBulkDelete = (req: express.Request, res: express.Response) => {
  const body = req.body || {};
  const targetIds: number[] = Array.isArray(body)
    ? body.map(Number)
    : Array.isArray(body.ids)
    ? body.ids.map(Number)
    : [];

  const deleteAll = body.all === true;
  let deletedCount = 0;

  if (deleteAll) {
    deletedCount = employees.length;
    employees = [];
  } else if (targetIds.length > 0) {
    const idSet = new Set(targetIds);
    const beforeLen = employees.length;
    employees = employees.filter((e) => !idSet.has(e.id));
    deletedCount = beforeLen - employees.length;
  }

  res.status(200).json({
    deleted: deletedCount,
    deleted_count: deletedCount,
    message: `Successfully deleted ${deletedCount} employee records.`,
    remaining: employees.length,
  });
};

app.post(['/api/employees/bulk_delete', '/api/employees/bulk_delete/'], handleBulkDelete);
app.delete(['/api/employees/bulk_delete', '/api/employees/bulk_delete/'], handleBulkDelete);

// POST /api/employees/ - Create employee
app.post(['/api/employees', '/api/employees/'], (req, res) => {
  if (Array.isArray(req.body)) {
    const list = req.body;
    const created: Employee[] = [];
    for (const item of list) {
      if (!item.first_name || !item.email) continue;
      if (employees.some((e) => e.email.toLowerCase() === String(item.email).toLowerCase())) continue;
      const newEmp: Employee = {
        id: nextId++,
        first_name: String(item.first_name || '').trim(),
        last_name: String(item.last_name || '').trim(),
        email: String(item.email || '').trim(),
        phone: String(item.phone || '').trim(),
        department: String(item.department || 'General').trim(),
        designation: String(item.designation || 'Staff').trim(),
        salary: Number(item.salary || 0).toFixed(2),
        date_joined: new Date().toISOString().split('T')[0],
      };
      employees.unshift(newEmp);
      created.push(newEmp);
    }
    return res.status(201).json(created);
  }

  const { first_name, last_name, email, phone, department, designation, salary } = req.body;

  if (!first_name || !last_name || !email) {
    return res.status(400).json({
      first_name: first_name ? [] : ['This field is required.'],
      last_name: last_name ? [] : ['This field is required.'],
      email: email ? [] : ['This field is required.'],
    });
  }

  // Check email uniqueness
  if (employees.some((e) => e.email.toLowerCase() === String(email).toLowerCase())) {
    return res.status(400).json({
      email: ['employee with this email address already exists.'],
    });
  }

  const newEmp: Employee = {
    id: nextId++,
    first_name: String(first_name).trim(),
    last_name: String(last_name).trim(),
    email: String(email).trim(),
    phone: String(phone || '').trim(),
    department: String(department || 'General').trim(),
    designation: String(designation || 'Staff').trim(),
    salary: Number(salary || 0).toFixed(2),
    date_joined: new Date().toISOString().split('T')[0],
  };

  employees.unshift(newEmp);
  res.status(201).json(newEmp);
});

// PUT /api/employees/:id/ - Full update
app.put(['/api/employees/:id', '/api/employees/:id/'], (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = employees.findIndex((e) => e.id === id);
  if (index === -1) {
    return res.status(404).json({ detail: 'Not found.' });
  }

  const { first_name, last_name, email, phone, department, designation, salary } = req.body;

  if (email && employees.some((e) => e.id !== id && e.email.toLowerCase() === String(email).toLowerCase())) {
    return res.status(400).json({
      email: ['employee with this email address already exists.'],
    });
  }

  const updated: Employee = {
    id,
    first_name: String(first_name || employees[index].first_name).trim(),
    last_name: String(last_name || employees[index].last_name).trim(),
    email: String(email || employees[index].email).trim(),
    phone: String(phone || employees[index].phone).trim(),
    department: String(department || employees[index].department).trim(),
    designation: String(designation || employees[index].designation).trim(),
    salary: Number(salary !== undefined ? salary : employees[index].salary).toFixed(2),
    date_joined: employees[index].date_joined,
  };

  employees[index] = updated;
  res.json(updated);
});

// PATCH /api/employees/:id/ - Partial update
app.patch(['/api/employees/:id', '/api/employees/:id/'], (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = employees.findIndex((e) => e.id === id);
  if (index === -1) {
    return res.status(404).json({ detail: 'Not found.' });
  }

  const body = req.body;
  if (body.email && employees.some((e) => e.id !== id && e.email.toLowerCase() === String(body.email).toLowerCase())) {
    return res.status(400).json({
      email: ['employee with this email address already exists.'],
    });
  }

  const existing = employees[index];
  const updated: Employee = {
    id,
    first_name: body.first_name !== undefined ? String(body.first_name).trim() : existing.first_name,
    last_name: body.last_name !== undefined ? String(body.last_name).trim() : existing.last_name,
    email: body.email !== undefined ? String(body.email).trim() : existing.email,
    phone: body.phone !== undefined ? String(body.phone).trim() : existing.phone,
    department: body.department !== undefined ? String(body.department).trim() : existing.department,
    designation: body.designation !== undefined ? String(body.designation).trim() : existing.designation,
    salary: body.salary !== undefined ? Number(body.salary).toFixed(2) : existing.salary,
    date_joined: existing.date_joined,
  };

  employees[index] = updated;
  res.json(updated);
});

// DELETE /api/employees/:id/ - Destroy
app.delete(['/api/employees/:id', '/api/employees/:id/'], (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = employees.findIndex((e) => e.id === id);
  if (index === -1) {
    return res.status(404).json({ detail: 'Not found.' });
  }

  employees.splice(index, 1);
  res.sendStatus(204);
});

// Serve static frontend assets
app.use(express.static(__dirname));
app.use('/frontend', express.static(path.join(__dirname, 'frontend')));

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Express server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

export default app;
