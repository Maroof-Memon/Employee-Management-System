"""
Admin site configuration for Employee Management System.
"""
from django.contrib import admin
from .models import Employee

@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    """
    Custom admin configuration for managing Employee records.
    """
    list_display = (
        'id',
        'first_name',
        'last_name',
        'email',
        'department',
        'designation',
        'salary',
        'date_joined',
    )
    list_filter = ('department', 'date_joined')
    search_fields = ('first_name', 'last_name', 'email', 'department', 'designation')
    ordering = ('-date_joined',)
