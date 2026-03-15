"""Statistics API — dashboard summary and trend data."""

from fastapi import APIRouter

from config.settings import get_effective_supabase

router = APIRouter()


def _get_db():
    from supabase import create_client
    url, key = get_effective_supabase()
    return create_client(url, key)


@router.get("/summary")
async def get_summary():
    """Get dashboard summary statistics."""
    db = _get_db()

    resumes = db.table("resumes").select("id, status, result").execute().data or []
    sessions = db.table("mock_sessions").select("id, overall_score, status").execute().data or []
    reports = (
        db.table("feedback_reports")
        .select("structure_score, content_score, expression_score, strategy_score")
        .execute().data or []
    )

    total_resumes = len(resumes)
    submitted = [r for r in resumes if r.get("status") == "submitted"]
    passed = [r for r in submitted if r.get("result") == "pass"]
    pass_rate = (len(passed) / len(submitted) * 100) if submitted else 0

    completed_sessions = [s for s in sessions if s.get("status") == "completed"]
    scores = [s["overall_score"] for s in completed_sessions if s.get("overall_score")]
    avg_mock_score = sum(scores) / len(scores) if scores else 0

    avg_feedback = {"structure": 0, "content": 0, "expression": 0, "strategy": 0}
    if reports:
        for axis in avg_feedback:
            vals = [r.get(f"{axis}_score", 0) for r in reports if r.get(f"{axis}_score")]
            avg_feedback[axis] = round(sum(vals) / len(vals), 1) if vals else 0

    return {
        "total_resumes": total_resumes,
        "total_submitted": len(submitted),
        "total_passed": len(passed),
        "pass_rate": round(pass_rate, 1),
        "total_mock_sessions": len(completed_sessions),
        "avg_mock_score": round(avg_mock_score, 1),
        "recent_feedback_avg": avg_feedback,
    }


@router.get("/trends")
async def get_trends():
    """Get trend data for charts."""
    db = _get_db()

    # Mock interview score trends (recent 10)
    sessions = (
        db.table("mock_sessions")
        .select("created_at, overall_score, evaluation")
        .eq("status", "completed")
        .not_.is_("overall_score", "null")
        .order("created_at", desc=True)
        .limit(10)
        .execute().data or []
    )
    mock_scores = [
        {
            "date": s["created_at"][:10],
            "score": s.get("overall_score", 0),
            "grade": s.get("evaluation", {}).get("grade", "-") if s.get("evaluation") else "-",
        }
        for s in reversed(sessions)
    ]

    # Feedback score trends (recent 10)
    reports = (
        db.table("feedback_reports")
        .select("created_at, structure_score, content_score, expression_score, strategy_score")
        .order("created_at", desc=True)
        .limit(10)
        .execute().data or []
    )
    feedback_scores = [
        {
            "date": r["created_at"][:10],
            "structure": r.get("structure_score", 0),
            "content": r.get("content_score", 0),
            "expression": r.get("expression_score", 0),
            "strategy": r.get("strategy_score", 0),
        }
        for r in reversed(reports)
    ]

    # Resumes by month (recent 6 months)
    resumes = (
        db.table("resumes")
        .select("created_at")
        .order("created_at", desc=True)
        .limit(100)
        .execute().data or []
    )
    month_counts: dict[str, int] = {}
    for r in resumes:
        month = r["created_at"][:7]  # YYYY-MM
        month_counts[month] = month_counts.get(month, 0) + 1
    resumes_by_month = [
        {"month": m, "count": c}
        for m, c in sorted(month_counts.items())[-6:]
    ]

    return {
        "mock_scores": mock_scores,
        "feedback_scores": feedback_scores,
        "resumes_by_month": resumes_by_month,
    }


@router.get("/export/resumes")
async def export_resumes_csv():
    """Export resumes as CSV."""
    import csv
    import io
    from fastapi.responses import Response

    db = _get_db()
    resumes = (
        db.table("resumes")
        .select("id, title, status, result, created_at, company_analyses(company_name)")
        .order("created_at", desc=True)
        .execute().data or []
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "제목", "기업명", "상태", "결과", "생성일"])
    for r in resumes:
        company = r.get("company_analyses", {}).get("company_name", "") if r.get("company_analyses") else ""
        writer.writerow([
            r["id"],
            r.get("title", ""),
            company,
            r.get("status", ""),
            r.get("result", ""),
            r.get("created_at", "")[:10],
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv; charset=utf-8-sig",
        headers={"Content-Disposition": 'attachment; filename="resumes.csv"'},
    )


@router.get("/export/interviews")
async def export_interviews_csv():
    """Export mock interview sessions as CSV."""
    import csv
    import io
    from fastapi.responses import Response

    db = _get_db()
    sessions = (
        db.table("mock_sessions")
        .select("id, mode, status, overall_score, evaluation, created_at")
        .order("created_at", desc=True)
        .execute().data or []
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "모드", "상태", "종합점수", "등급", "생성일"])
    for s in sessions:
        grade = s.get("evaluation", {}).get("grade", "-") if s.get("evaluation") else "-"
        writer.writerow([
            s["id"],
            s.get("mode", ""),
            s.get("status", ""),
            s.get("overall_score", ""),
            grade,
            s.get("created_at", "")[:10],
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv; charset=utf-8-sig",
        headers={"Content-Disposition": 'attachment; filename="interviews.csv"'},
    )
