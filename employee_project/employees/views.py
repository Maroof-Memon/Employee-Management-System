"""
Views for Employee Management System.

Implements ModelViewSet to provide standard CRUD operations:
- GET /api/employees/        -> list all employees
- POST /api/employees/       -> create new employee
- GET /api/employees/{id}/   -> retrieve specific employee
- PUT /api/employees/{id}/   -> full update employee record
- PATCH /api/employees/{id}/ -> partial update employee record
- DELETE /api/employees/{id}/-> delete employee record
"""
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Employee
from .serializers import EmployeeSerializer
import csv
import io

class EmployeeViewSet(viewsets.ModelViewSet):
    """
    A viewset that provides default `create()`, `retrieve()`, `update()`,
    `partial_update()`, `destroy()` and `list()` actions for Employee model.
    Also provides `bulk_create` and `upload_csv` endpoints.
    """
    queryset = Employee.objects.all().order_by('-date_joined')
    serializer_class = EmployeeSerializer

    # Server-side search and filtering capabilities
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['first_name', 'last_name', 'department', 'designation', 'email']
    ordering_fields = ['first_name', 'last_name', 'salary', 'date_joined']

    @action(detail=False, methods=['post'], url_path='bulk_create')
    def bulk_create_employees(self, request):
        """
        Bulk creates multiple employees from a JSON array: POST /api/employees/bulk_create/
        Supports mode="replace" to wipe existing records and replace cleanly, or mode="append" (default).
        """
        raw_data = request.data
        mode = 'append'
        if isinstance(raw_data, dict):
            mode = raw_data.get('mode', 'replace' if raw_data.get('replace') else 'append')
            data = raw_data.get('employees', [])
        else:
            data = raw_data

        # If replace mode requested, wipe prior records to avoid confusing duplicates/200 total records
        if mode == 'replace':
            Employee.objects.all().delete()

        created = []
        errors = []
        for index, item in enumerate(data):
            serializer = self.get_serializer(data=item)
            if serializer.is_valid():
                serializer.save()
                created.append(serializer.data)
            else:
                errors.append({'row': index + 1, 'errors': serializer.errors})

        return Response(
            {'created_count': len(created), 'created': created, 'errors': errors, 'mode': mode},
            status=status.HTTP_201_CREATED if created else status.HTTP_400_BAD_REQUEST
        )

    @action(detail=False, methods=['post', 'delete'], url_path='bulk_delete')
    def bulk_delete_employees(self, request):
        """
        Bulk deletes selected employees by list of IDs: POST or DELETE /api/employees/bulk_delete/
        Body: {"ids": [1, 2, 3]} or {"all": True}
        """
        ids = request.data.get('ids', [])
        delete_all = request.data.get('all', False)

        if delete_all:
            deleted_count, _ = Employee.objects.all().delete()
        elif ids:
            deleted_count, _ = Employee.objects.filter(id__in=ids).delete()
        else:
            return Response({'error': 'No employee IDs provided for deletion.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'deleted': deleted_count,
            'deleted_count': deleted_count,
            'message': f'Successfully deleted {deleted_count} employee record(s).'
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='upload-csv')
    def upload_csv(self, request):
        """
        Parses an uploaded CSV spreadsheet file directly: POST /api/employees/upload-csv/
        """
        csv_file = request.FILES.get('file')
        if not csv_file or not csv_file.name.endswith('.csv'):
            return Response({'error': 'Please provide a valid .csv file.'}, status=status.HTTP_400_BAD_REQUEST)

        decoded_file = csv_file.read().decode('utf-8')
        io_string = io.StringIO(decoded_file)
        reader = csv.DictReader(io_string)

        created = []
        for row in reader:
            serializer = self.get_serializer(data=row)
            if serializer.is_valid():
                serializer.save()
                created.append(serializer.data)

        return Response({'created_count': len(created), 'created': created}, status=status.HTTP_201_CREATED)

