"""
Database models for Employee Management System.

Defines the Employee entity with personal, contact, and employment details.
"""
from django.db import models

class Employee(models.Model):
    """
    Employee Model representing staff member records in the system.
    """
    first_name = models.CharField(
        max_length=100,
        help_text="Employee's given first name."
    )
    last_name = models.CharField(
        max_length=100,
        help_text="Employee's family or last name."
    )
    email = models.EmailField(
        unique=True,
        help_text="Unique corporate or personal email address."
    )
    phone = models.CharField(
        max_length=20,
        help_text="Primary contact phone number."
    )
    department = models.CharField(
        max_length=100,
        help_text="Department name (e.g., Engineering, Human Resources, Design)."
    )
    designation = models.CharField(
        max_length=100,
        help_text="Job title or role (e.g., Senior Software Engineer, Product Manager)."
    )
    salary = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Annual compensation in USD or local currency."
    )
    date_joined = models.DateField(
        auto_now_add=True,
        help_text="Date when the employee joined the organization."
    )

    class Meta:
        ordering = ['-date_joined']
        verbose_name = "Employee"
        verbose_name_plural = "Employees"

    def __str__(self):
        """String representation of an Employee."""
        return f"{self.first_name} {self.last_name} ({self.designation} - {self.department})"
