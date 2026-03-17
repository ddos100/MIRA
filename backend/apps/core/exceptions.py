from django.core.exceptions import PermissionDenied
from django.http import Http404
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    """Wrap DRF exceptions in a consistent JSON envelope."""
    response = exception_handler(exc, context)

    if response is None:
        if isinstance(exc, Http404):
            response = Response(
                {"error": "Not found."}, status=status.HTTP_404_NOT_FOUND
            )
        elif isinstance(exc, PermissionDenied):
            response = Response(
                {"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN
            )

    if response is not None:
        if isinstance(exc, ValidationError):
            response.data = {"errors": response.data}
        else:
            if "detail" in response.data:
                response.data = {"error": response.data["detail"]}

    return response
