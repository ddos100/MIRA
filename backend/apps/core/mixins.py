"""Reusable DRF viewset mixins for the MIRA platform."""

import csv
import io

from django.http import StreamingHttpResponse
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response


class CsvExportMixin:
    """
    Mixin that adds a `GET /export-csv/` action to any ModelViewSet.

    The action respects the viewset's existing filter and search backends so
    the exported file always matches what the user sees in the UI.

    Usage:
        class MyViewSet(CsvExportMixin, viewsets.ModelViewSet):
            csv_export_fields = ["id", "title", "status"]   # optional whitelist
            csv_filename = "my-export"                       # optional filename
    """

    csv_export_fields: list[str] | None = None
    csv_filename: str = "export"

    @action(detail=False, methods=["get"], url_path="export-csv")
    def export_csv(self, request):
        """Stream the filtered queryset as a CSV file."""
        queryset = self.filter_queryset(self.get_queryset())

        # Use the viewset's serializer to obtain field names and data
        serializer = self.get_serializer(queryset, many=True)
        data = serializer.data

        if not data:
            # Return empty CSV with headers
            fields = self.csv_export_fields or []
        else:
            fields = self.csv_export_fields or list(data[0].keys())

        buffer = io.StringIO()
        writer = csv.DictWriter(
            buffer,
            fieldnames=fields,
            extrasaction="ignore",
            lineterminator="\r\n",
        )
        writer.writeheader()
        for row in data:
            writer.writerow({f: row.get(f, "") for f in fields})

        buffer.seek(0)
        response = StreamingHttpResponse(
            buffer,
            content_type="text/csv",
        )
        response["Content-Disposition"] = (
            f'attachment; filename="{self.csv_filename}.csv"'
        )
        return response


class CsvImportMixin:
    """
    Mixin that adds a `POST /import-csv/` action to any ModelViewSet.

    Expects a multipart/form-data upload with a `file` field containing a CSV.
    The first row must be a header row matching the serializer's writable fields.

    Usage:
        class MyViewSet(CsvImportMixin, viewsets.ModelViewSet):
            csv_import_fields = ["title", "status", "description"]  # optional whitelist
    """

    csv_import_fields: list[str] | None = None

    @action(detail=False, methods=["post"], url_path="import-csv")
    def import_csv(self, request):
        """Parse an uploaded CSV and bulk-create records via the serializer."""
        upload = request.FILES.get("file")
        if not upload:
            return Response(
                {"error": "No file uploaded. Send a CSV in the 'file' field."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not upload.name.lower().endswith(".csv"):
            return Response(
                {"error": "Only CSV files are supported."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            text = upload.read().decode("utf-8-sig")  # handle BOM
        except UnicodeDecodeError:
            return Response(
                {"error": "File encoding not supported. Please use UTF-8."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reader = csv.DictReader(io.StringIO(text))
        allowed_fields = set(self.csv_import_fields or [])

        created = []
        errors = []

        for line_num, row in enumerate(reader, start=2):  # 1-based, row 1 = header
            # Strip whitespace from keys and values
            row = {
                k.strip(): (v.strip() if isinstance(v, str) else v)
                for k, v in row.items()
            }

            # Filter to only allowed fields if whitelist is set
            if allowed_fields:
                row = {k: v for k, v in row.items() if k in allowed_fields}

            # Remove empty-string values so they fall back to model defaults
            row = {k: v for k, v in row.items() if v != ""}

            serializer = self.get_serializer(data=row)
            if serializer.is_valid():
                try:
                    instance = serializer.save()
                    created.append(str(instance.pk))
                except Exception as exc:
                    errors.append({"row": line_num, "error": str(exc), "data": row})
            else:
                errors.append(
                    {"row": line_num, "errors": serializer.errors, "data": row}
                )

        return Response(
            {
                "created": len(created),
                "errors": errors,
                "ids": created,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_400_BAD_REQUEST,
        )
