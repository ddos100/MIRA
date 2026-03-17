from decimal import Decimal

from django.utils import timezone
from rest_framework import permissions, serializers, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import Assessment, AssessmentResponse, AssessmentTemplate, Question
from .serializers import (
    AssessmentResponseSerializer,
    AssessmentSerializer,
    AssessmentTemplateSerializer,
    QuestionSerializer,
)


# ─── Authenticated CRUD viewsets ──────────────────────────────────────────────

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


# ─── External assessment portal (no auth required) ────────────────────────────

@api_view(["GET"])
@permission_classes([AllowAny])
def portal_assessment_detail(request, token: str):
    """
    Return the assessment header plus all questions for a given token.
    No authentication required – intended for external respondents.
    """
    try:
        assessment = Assessment.objects.select_related("template").get(token=token)
    except Assessment.DoesNotExist:
        return Response({"detail": "Assessment not found."}, status=status.HTTP_404_NOT_FOUND)

    if assessment.status == Assessment.AssessmentStatus.EXPIRED:
        return Response(
            {"detail": "This assessment has expired."},
            status=status.HTTP_410_GONE,
        )
    if assessment.status == Assessment.AssessmentStatus.COMPLETED:
        return Response(
            {"detail": "This assessment has already been completed."},
            status=status.HTTP_200_OK,
            data={
                "id": str(assessment.id),
                "title": assessment.title,
                "status": assessment.status,
                "completed_at": assessment.completed_at,
                "total_score": str(assessment.total_score) if assessment.total_score else None,
                "questions": [],
            },
        )

    questions = (
        assessment.template.questions.all().order_by("order")
    )

    # Mark as in-progress when first opened
    if assessment.status == Assessment.AssessmentStatus.SENT:
        assessment.status = Assessment.AssessmentStatus.IN_PROGRESS
        assessment.save(update_fields=["status"])

    return Response({
        "id": str(assessment.id),
        "title": assessment.title,
        "description": assessment.template.description,
        "respondent_name": assessment.respondent_name,
        "respondent_email": assessment.respondent_email,
        "due_date": assessment.due_date,
        "status": assessment.status,
        "questions": [
            {
                "id": str(q.id),
                "text": q.text,
                "question_type": q.question_type,
                "options": q.options,
                "is_required": q.is_required,
                "order": q.order,
            }
            for q in questions
        ],
    })


@api_view(["POST"])
@permission_classes([AllowAny])
def portal_assessment_submit(request, token: str):
    """
    Submit all responses for an assessment and mark it as completed.

    Expected payload:
    {
        "responses": [
            {"question_id": "<uuid>", "answer_text": "...", "answer_data": null},
            ...
        ]
    }
    """
    try:
        assessment = Assessment.objects.select_related("template").get(token=token)
    except Assessment.DoesNotExist:
        return Response({"detail": "Assessment not found."}, status=status.HTTP_404_NOT_FOUND)

    if assessment.status in (
        Assessment.AssessmentStatus.COMPLETED,
        Assessment.AssessmentStatus.EXPIRED,
    ):
        return Response(
            {"detail": "This assessment cannot accept new responses."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    raw_responses = request.data.get("responses", [])
    if not isinstance(raw_responses, list):
        return Response(
            {"detail": "Invalid payload: 'responses' must be a list."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    question_ids = {str(q.id): q for q in assessment.template.questions.all()}
    saved_count = 0
    total_score = Decimal("0")
    total_weight = Decimal("0")

    for item in raw_responses:
        qid = str(item.get("question_id", ""))
        question = question_ids.get(qid)
        if not question:
            continue  # silently skip unknown questions

        answer_text = str(item.get("answer_text") or "")
        answer_data = item.get("answer_data")

        # Simple auto-scoring for YES_NO and SCALE questions
        score = None
        if question.question_type == Question.QuestionType.YES_NO:
            score = Decimal("1") if answer_text.lower() in ("yes", "true", "1") else Decimal("0")
        elif question.question_type == Question.QuestionType.SCALE:
            try:
                score = Decimal(str(answer_data or answer_text or 0)) / Decimal("5")
            except Exception:
                score = None

        AssessmentResponse.objects.update_or_create(
            assessment=assessment,
            question=question,
            defaults={
                "answer_text": answer_text,
                "answer_data": answer_data,
                "score": score,
            },
        )
        saved_count += 1

        if score is not None:
            total_score += score * question.weight
            total_weight += question.weight

    # Calculate final score as a percentage
    if total_weight > 0:
        assessment.total_score = (total_score / total_weight * 100).quantize(Decimal("0.01"))
    assessment.status = Assessment.AssessmentStatus.COMPLETED
    assessment.completed_at = timezone.now()
    assessment.save(update_fields=["status", "completed_at", "total_score"])

    return Response(
        {
            "status": "completed",
            "responses_saved": saved_count,
            "total_score": str(assessment.total_score) if assessment.total_score else None,
            "completed_at": assessment.completed_at,
        },
        status=status.HTTP_200_OK,
    )
