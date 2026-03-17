from rest_framework import viewsets, permissions

from .models import AssessmentTemplate, Question, Assessment, AssessmentResponse
from .serializers import (
    AssessmentTemplateSerializer,
    QuestionSerializer,
    AssessmentSerializer,
    AssessmentResponseSerializer,
)


class AssessmentTemplateViewSet(viewsets.ModelViewSet):
    queryset = AssessmentTemplate.objects.all()
    serializer_class = AssessmentTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["is_active"]
    search_fields = ["title", "description"]
    ordering_fields = ["title", "created_at"]


class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.select_related("template").all()
    serializer_class = QuestionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["template", "question_type", "is_required"]
    search_fields = ["text", "template__title"]
    ordering_fields = ["template", "order", "created_at"]


class AssessmentViewSet(viewsets.ModelViewSet):
    queryset = Assessment.objects.select_related(
        "template", "respondent_user", "third_party"
    ).all()
    serializer_class = AssessmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["template", "status", "third_party"]
    search_fields = ["title", "respondent_name", "respondent_email"]
    ordering_fields = ["title", "status", "due_date", "completed_at", "created_at"]


class AssessmentResponseViewSet(viewsets.ModelViewSet):
    queryset = AssessmentResponse.objects.select_related("assessment", "question").all()
    serializer_class = AssessmentResponseSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["assessment", "question"]
    search_fields = ["answer_text", "assessment__title"]
    ordering_fields = ["assessment", "question", "score", "created_at"]
