"""
Serializers for Employee Management System.

Serializes Employee model instances into JSON format and validates
incoming request data for create and update operations.
"""
from rest_framework import serializers
from .models import Employee

class EmployeeSerializer(serializers.ModelSerializer):
    """
    ModelSerializer for Employee instances.
    Exposes all model fields and sets date_joined as read-only.
    """
    class Meta:
        model = Employee
        fields = [
            'id',
            'first_name',
            'last_name',
            'email',
            'phone',
            'department',
            'designation',
            'salary',
            'date_joined',
        ]
        read_only_fields = ['id', 'date_joined']

    def validate_salary(self, value):
        """Validate that salary is positive."""
        if value < 0:
            raise serializers.ValidationError("Salary must be a positive number.")
        return value
