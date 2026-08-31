from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings


@shared_task
def send_notice_email(notice_id, recipient_emails):
    """Background task so posting a notice doesn't block the API response."""
    from .models import Notice
    try:
        notice = Notice.objects.get(pk=notice_id)
    except Notice.DoesNotExist:
        return
    send_mail(
        subject=f"[College ERP] {notice.title}",
        message=notice.body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=recipient_emails,
        fail_silently=True,
    )
