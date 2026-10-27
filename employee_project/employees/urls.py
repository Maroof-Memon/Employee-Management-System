"""
URL routing for employees app.

Registers EmployeeViewSet with DefaultRouter to automatically generate:
- /api/employees/          [GET, POST]
- /api/employees/<pk>/     [GET, PUT, PATCH, DELETE]
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmployeeViewSet

# Initialize DefaultRouter
router = DefaultRouter()
router.register(r'employees', EmployeeViewSet, basename='employee')

# The API URLs are now determined automatically by the router
urlpatterns = [
    path('', include(router.urls)),
]
