import path from 'path';
import { defineConfig, type Plugin } from 'vite';

// In-memory / persistent mock for Django REST Framework EmployeeViewSet
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

let employeesDB: Employee[] = [
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

function drfApiPlugin(): Plugin {
  return {
    name: 'django-rest-framework-api-mock',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';
        if (!url.startsWith('/api/employees')) {
          return next();
        }

        // Parse method and path
        const method = req.method || 'GET';
        const cleanUrl = url.split('?')[0];

        // Bulk create & bulk delete endpoints
        const isBulkCreate = cleanUrl === '/api/employees/bulk_create' || cleanUrl === '/api/employees/bulk_create/';
        const isBulkDelete = cleanUrl === '/api/employees/bulk_delete' || cleanUrl === '/api/employees/bulk_delete/';
        const match = (isBulkCreate || isBulkDelete) ? null : cleanUrl.match(/^\/api\/employees(?:\/(\d+))?\/?$/);

        if (!isBulkCreate && !isBulkDelete && !match) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ detail: 'Not found.' }));
          return;
        }

        const idParam = match && match[1] ? parseInt(match[1], 10) : null;

        // Helper to read JSON body
        const readBody = (): Promise<any> => {
          return new Promise((resolve) => {
            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', () => {
              try {
                resolve(body ? JSON.parse(body) : {});
              } catch {
                resolve({});
              }
            });
          });
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');

        if (method === 'OPTIONS') {
          res.statusCode = 200;
          res.end();
          return;
        }

        // Bulk Delete endpoint: POST or DELETE /api/employees/bulk_delete/
        if (isBulkDelete && (method === 'POST' || method === 'DELETE')) {
          const body = await readBody();
          const targetIds: number[] = Array.isArray(body)
            ? body.map(Number)
            : Array.isArray(body.ids)
            ? body.ids.map(Number)
            : [];

          const deleteAll = body.all === true;
          let deletedCount = 0;

          if (deleteAll) {
            deletedCount = employeesDB.length;
            employeesDB = [];
          } else if (targetIds.length > 0) {
            const idSet = new Set(targetIds);
            const beforeLen = employeesDB.length;
            employeesDB = employeesDB.filter((e) => !idSet.has(e.id));
            deletedCount = beforeLen - employeesDB.length;
          }

          res.statusCode = 200;
          res.end(JSON.stringify({
            deleted: deletedCount,
            deleted_count: deletedCount,
            message: `Successfully deleted ${deletedCount} employee records.`,
            remaining: employeesDB.length,
          }));
          return;
        }

        // 1. GET /api/employees/ - List
        if (method === 'GET' && idParam === null && !isBulkDelete && !isBulkCreate) {
          res.statusCode = 200;
          res.end(JSON.stringify(employeesDB));
          return;
        }

        // 2. GET /api/employees/{id}/ - Retrieve
        if (method === 'GET' && idParam !== null) {
          const emp = employeesDB.find((e) => e.id === idParam);
          if (!emp) {
            res.statusCode = 404;
            res.end(JSON.stringify({ detail: 'Not found.' }));
            return;
          }
          res.statusCode = 200;
          res.end(JSON.stringify(emp));
          return;
        }

        // 3. POST /api/employees/ or /api/employees/bulk_create/ - Create
        if (method === 'POST' && idParam === null && !isBulkDelete) {
          const body = await readBody();

          // Check if bulk array creation
          if (isBulkCreate || Array.isArray(body)) {
            const list = Array.isArray(body) ? body : (body.employees || []);
            const shouldReplace = body && (body.mode === 'replace' || body.replace === true);

            // If Replace mode selected, clear previous records so total count doesn't merge/double to 200
            if (shouldReplace) {
              employeesDB = [];
              nextId = 1;
            }

            const created: Employee[] = [];

            for (const item of list) {
              if (!item.first_name || !item.email) continue;
              // Skip if email exists in DB
              if (employeesDB.some((e) => e.email.toLowerCase() === String(item.email).toLowerCase())) {
                continue;
              }

              const newEmployee: Employee = {
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

              employeesDB.unshift(newEmployee);
              created.push(newEmployee);
            }

            res.statusCode = 201;
            res.end(JSON.stringify(created));
            return;
          }

          // Single record validation
          if (!body.first_name || !body.last_name || !body.email) {
            res.statusCode = 400;
            res.end(JSON.stringify({
              first_name: body.first_name ? [] : ['This field is required.'],
              last_name: body.last_name ? [] : ['This field is required.'],
              email: body.email ? [] : ['This field is required.'],
            }));
            return;
          }

          // Email uniqueness check (matches DRF unique=True)
          if (employeesDB.some((e) => e.email.toLowerCase() === body.email.toLowerCase())) {
            res.statusCode = 400;
            res.end(JSON.stringify({
              email: ['employee with this email address already exists.'],
            }));
            return;
          }

          const newEmployee: Employee = {
            id: nextId++,
            first_name: String(body.first_name || '').trim(),
            last_name: String(body.last_name || '').trim(),
            email: String(body.email || '').trim(),
            phone: String(body.phone || '').trim(),
            department: String(body.department || 'General').trim(),
            designation: String(body.designation || 'Staff').trim(),
            salary: Number(body.salary || 0).toFixed(2),
            date_joined: new Date().toISOString().split('T')[0],
          };

          employeesDB.unshift(newEmployee);
          res.statusCode = 201;
          res.end(JSON.stringify(newEmployee));
          return;
        }

        // 4. PUT /api/employees/{id}/ - Full Update
        if (method === 'PUT' && idParam !== null) {
          const index = employeesDB.findIndex((e) => e.id === idParam);
          if (index === -1) {
            res.statusCode = 404;
            res.end(JSON.stringify({ detail: 'Not found.' }));
            return;
          }

          const body = await readBody();
          // Check email uniqueness on other records
          if (body.email && employeesDB.some((e) => e.id !== idParam && e.email.toLowerCase() === body.email.toLowerCase())) {
            res.statusCode = 400;
            res.end(JSON.stringify({
              email: ['employee with this email address already exists.'],
            }));
            return;
          }

          const updated: Employee = {
            id: idParam,
            first_name: String(body.first_name || employeesDB[index].first_name).trim(),
            last_name: String(body.last_name || employeesDB[index].last_name).trim(),
            email: String(body.email || employeesDB[index].email).trim(),
            phone: String(body.phone || employeesDB[index].phone).trim(),
            department: String(body.department || employeesDB[index].department).trim(),
            designation: String(body.designation || employeesDB[index].designation).trim(),
            salary: Number(body.salary !== undefined ? body.salary : employeesDB[index].salary).toFixed(2),
            date_joined: employeesDB[index].date_joined,
          };

          employeesDB[index] = updated;
          res.statusCode = 200;
          res.end(JSON.stringify(updated));
          return;
        }

        // 5. PATCH /api/employees/{id}/ - Partial Update
        if (method === 'PATCH' && idParam !== null) {
          const index = employeesDB.findIndex((e) => e.id === idParam);
          if (index === -1) {
            res.statusCode = 404;
            res.end(JSON.stringify({ detail: 'Not found.' }));
            return;
          }

          const body = await readBody();
          if (body.email && employeesDB.some((e) => e.id !== idParam && e.email.toLowerCase() === body.email.toLowerCase())) {
            res.statusCode = 400;
            res.end(JSON.stringify({
              email: ['employee with this email address already exists.'],
            }));
            return;
          }

          const existing = employeesDB[index];
          const updated: Employee = {
            id: idParam,
            first_name: body.first_name !== undefined ? String(body.first_name).trim() : existing.first_name,
            last_name: body.last_name !== undefined ? String(body.last_name).trim() : existing.last_name,
            email: body.email !== undefined ? String(body.email).trim() : existing.email,
            phone: body.phone !== undefined ? String(body.phone).trim() : existing.phone,
            department: body.department !== undefined ? String(body.department).trim() : existing.department,
            designation: body.designation !== undefined ? String(body.designation).trim() : existing.designation,
            salary: body.salary !== undefined ? Number(body.salary).toFixed(2) : existing.salary,
            date_joined: existing.date_joined,
          };

          employeesDB[index] = updated;
          res.statusCode = 200;
          res.end(JSON.stringify(updated));
          return;
        }

        // 6. DELETE /api/employees/{id}/ - Destroy
        if (method === 'DELETE' && idParam !== null) {
          const index = employeesDB.findIndex((e) => e.id === idParam);
          if (index === -1) {
            res.statusCode = 404;
            res.end(JSON.stringify({ detail: 'Not found.' }));
            return;
          }

          employeesDB.splice(index, 1);
          res.statusCode = 204;
          res.end();
          return;
        }

        res.statusCode = 405;
        res.end(JSON.stringify({ detail: 'Method not allowed.' }));
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [drfApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
