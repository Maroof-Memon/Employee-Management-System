"""
Main URL configuration for employee_project.

Routes:
- /admin/         -> Django built-in administration portal
- /api/           -> Handled by employees app via DefaultRouter
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    # Mount the employees REST API endpoints at /api/
    path('api/', include('employees.urls')),
]
