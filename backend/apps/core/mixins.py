"""Reusable DRF viewset mixins for the MIRA platform."""
import csv
import io

from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import StreamingHttpResponse


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
